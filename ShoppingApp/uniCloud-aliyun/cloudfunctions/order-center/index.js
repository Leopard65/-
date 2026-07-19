'use strict'

const crypto = require('crypto')
const db = uniCloud.database()
const _ = db.command
const uniID = require('xc-auth')

const ORDER_STATUS = {
  pendingPay: 0,
  pendingShip: 1,
  pendingReceive: 2,
  pendingReview: 3,
  completed: 4,
  refunding: 5,
  canceled: 6
}

const ok = (data = {}, msg = 'success') => ({ code: 0, msg, data })
const fail = (msg = '操作失败', code = 400) => ({ code, msg, data: null })
const getUniIdToken = (event = {}) =>
  event.uniIdToken || event.token || event.params?.uniIdToken || event.params?.token || ''
const normalizeRequestId = (value = '') => String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
const createOrderDocId = (userId, requestId) => {
  if (!requestId) return ''
  return `ord-${crypto.createHash('sha1').update(`${userId}:${requestId}`).digest('hex')}`
}

exports.main = async (event, context) => {
  const { action, params = {} } = event || {}
  const uniIDIns = uniID.createInstance({ context })
  const tokenResult = await uniIDIns.checkToken(getUniIdToken(event))
  if (tokenResult.code !== 0) return fail('请先登录', 401)

  const userId = tokenResult.uid
  const handlers = {
    createOrder: () => createOrder(userId, params),
    getOrderList: () => getOrderList(userId, params),
    getOrderDetail: () => getOrderDetail(userId, params),
    payOrder: () => payOrder(userId, params),
    confirmReceive: () => confirmReceive(userId, params),
    cancelOrder: () => cancelOrder(userId, params),
    deleteOrder: () => deleteOrder(userId, params),
    getLogistics: () => getLogistics(userId, params)
  }

  const handler = handlers[action]
  if (!handler) return fail('接口不存在', 404)
  return handler()
}

async function createOrder(userId, params) {
  const { address_id, goods_list = [], coupon_id = '', remark = '' } = params
  const requestId = normalizeRequestId(params.request_id || params.requestId)
  const orderId = createOrderDocId(userId, requestId) || `ord-${crypto.randomBytes(10).toString('hex')}`

  if (requestId) {
    const existingRes = await db.collection('order').doc(orderId).get()
    const existing = existingRes.data?.[0]
    if (existing && existing.user_id === userId) {
      return ok({
        order_id: existing._id,
        order_no: existing.order_no,
        pay_amount: existing.pay_amount
      }, '下单成功')
    }
  }

  if (!address_id || !goods_list.length) return fail('请选择收货地址和商品')

  const addressRes = await db.collection('user_address').doc(address_id).get()
  const address = addressRes.data?.[0]
  if (!address || address.user_id !== userId) return fail('收货地址不存在')

  const orderGoodsList = []
  let totalAmount = 0

  for (const item of goods_list) {
    const quantity = Number(item.quantity || 1)
    if (quantity <= 0) return fail('商品数量不正确')

    const goodsRes = await db.collection('goods').doc(item.goods_id).get()
    const goods = goodsRes.data?.[0]
    if (!goods) return fail('商品不存在', 404)
    if (goods.status !== 1) return fail(`商品"${goods.name}"已下架`)

    let price = Number(goods.price || 0)
    let stock = Number(goods.stock || 0)
    let skuInfo = ''
    let goodsImage = goods.image

    if (item.sku_id) {
      const skuRes = await db.collection('goods_sku').doc(item.sku_id).get()
      const sku = skuRes.data?.[0]
      if (!sku || sku.goods_id !== goods._id) return fail(`商品"${goods.name}"规格不存在`)
      price = Number(sku.price || price)
      stock = Number(sku.stock || 0)
      skuInfo = sku.spec_values || ''
      goodsImage = sku.image || goods.image
    }

    if (stock < quantity || Number(goods.stock || 0) < quantity) return fail(`商品"${goods.name}"库存不足`)

    const subtotal = price * quantity
    totalAmount += subtotal
    orderGoodsList.push({
      goods_id: goods._id,
      sku_id: item.sku_id || '',
      goods_name: goods.name,
      name: goods.name,
      goods_image: goodsImage,
      image: goodsImage,
      price,
      quantity,
      subtotal,
      sku_info: skuInfo
    })
  }

  const freight = totalAmount >= 99 ? 0 : 10
  const coupon = await resolveCoupon(userId, coupon_id, totalAmount)
  if (coupon_id && !coupon.valid) return fail(coupon.msg)
  const discountAmount = coupon.amount || 0
  const payAmount = Math.max(totalAmount + freight - discountAmount, 0)
  const orderNo = generateOrderNo()
  const createDate = Date.now()

  const orderPayload = {
    _id: orderId,
    request_id: requestId,
    order_no: orderNo,
    user_id: userId,
    status: ORDER_STATUS.pendingPay,
    total_amount: totalAmount,
    freight,
    discount_amount: discountAmount,
    pay_amount: payAmount,
    address: {
      name: address.name,
      phone: address.phone,
      province: address.province,
      city: address.city,
      district: address.district,
      detail: address.detail
    },
    goods_list: orderGoodsList,
    coupon_id,
    user_coupon_id: coupon.userCouponId || '',
    remark,
    pay_method: params.pay_method || '',
    create_date: createDate,
    update_date: createDate,
    pay_expire_time: createDate + 30 * 60 * 1000
  }

  const deductedResources = []
  let couponLocked = false

  try {
    if (coupon.userCouponId) {
      await lockCoupon(userId, coupon.userCouponId, orderId, createDate, coupon.couponId)
      couponLocked = true
    }

    for (const item of orderGoodsList) {
      await deductStock(item, deductedResources)
    }

    await db.collection('order').add(orderPayload)

    const cartIds = goods_list.map(item => item.cart_id).filter(Boolean)
    if (cartIds.length) {
      try {
        await db.collection('cart').where({ _id: _.in(cartIds), user_id: userId }).remove()
      } catch (error) {
        await updateOrder(orderId, { cart_remove_error: String(error.message || error).slice(0, 120) })
      }
    }

    return ok({
      order_id: orderId,
      order_no: orderNo,
      pay_amount: payAmount
    }, '下单成功')
  } catch (error) {
    await restoreDeductedResources(deductedResources)
    if (couponLocked) await restoreCoupon({ _id: orderId, user_coupon_id: coupon.userCouponId })

    if (requestId) {
      const existingRes = await db.collection('order').doc(orderId).get()
      const existing = existingRes.data?.[0]
      if (existing && existing.user_id === userId) {
        return ok({
          order_id: existing._id,
          order_no: existing.order_no,
          pay_amount: existing.pay_amount
        }, '下单成功')
      }
    }

    return fail(`下单失败，已恢复库存和优惠券：${String(error.message || error).slice(0, 40)}`, 500)
  }
}

async function getOrderList(userId, params) {
  const where = { user_id: userId }
  if (params.status !== undefined && params.status !== '' && params.status !== 'all') {
    where.status = Number(params.status)
  }
  const result = await pageQuery('order', where, params)
  const list = []
  for (const order of result.list) {
    list.push(await expirePendingOrder(order))
  }
  // 按"待付款"筛选时,超时已取消的订单不再属于该筛选
  result.list = where.status === ORDER_STATUS.pendingPay
    ? list.filter(item => item.status === ORDER_STATUS.pendingPay)
    : list
  return ok(result)
}

async function getOrderDetail(userId, params) {
  const order = await getOwnedOrder(userId, params.order_id || params.orderId)
  if (order.code) return order
  return ok(await expirePendingOrder(order))
}

// 待付款订单超过 30 分钟未支付:就地取消并恢复库存/优惠券(无定时器时的惰性兜底)
async function expirePendingOrder(order) {
  if (!order || order.status !== ORDER_STATUS.pendingPay) return order
  if (Date.now() <= Number(order.pay_expire_time || 0)) return order
  await restoreStock(order)
  await restoreCoupon(order)
  const cancelTime = Date.now()
  await updateOrder(order._id, {
    status: ORDER_STATUS.canceled,
    cancel_reason: '支付超时',
    cancel_time: cancelTime
  })
  return { ...order, status: ORDER_STATUS.canceled, cancel_reason: '支付超时', cancel_time: cancelTime }
}

async function payOrder(userId, params) {
  const order = await getOwnedOrder(userId, params.order_id || params.orderId)
  if (order.code) return order
  if (order.status !== ORDER_STATUS.pendingPay) return fail('订单状态不允许支付')

  if (Date.now() > Number(order.pay_expire_time || 0)) {
    await restoreStock(order)
    await restoreCoupon(order)
    await updateOrder(order._id, {
      status: ORDER_STATUS.canceled,
      cancel_reason: '支付超时',
      cancel_time: Date.now()
    })
    return fail('订单已超时取消')
  }

  await updateOrder(order._id, {
    status: ORDER_STATUS.pendingShip,
    pay_method: params.pay_method || 'wechat',
    pay_time: Date.now()
  })
  return ok({ order_no: order.order_no }, '支付成功')
}

async function shipOrder() {
  // 发货为商家/运营动作,统一走 admin-center.shipOrder;用户侧不再暴露此能力。
  return fail('请通过运营中心发货', 403)
}

async function confirmReceive(userId, params) {
  const order = await getOwnedOrder(userId, params.order_id || params.orderId)
  if (order.code) return order
  if (order.status !== ORDER_STATUS.pendingReceive) return fail('只有待收货订单可以确认收货')

  await updateOrder(order._id, {
    status: ORDER_STATUS.pendingReview,
    confirm_time: Date.now()
  })
  return ok({}, '确认收货成功')
}

async function cancelOrder(userId, params) {
  const order = await getOwnedOrder(userId, params.order_id || params.orderId)
  if (order.code) return order
  if (order.status !== ORDER_STATUS.pendingPay) return fail('只能取消待付款订单')

  await restoreStock(order)
  await restoreCoupon(order)
  await updateOrder(order._id, {
    status: ORDER_STATUS.canceled,
    cancel_reason: params.reason || '用户取消',
    cancel_time: Date.now()
  })
  return ok({}, '取消成功')
}

async function deleteOrder(userId, params) {
  const order = await getOwnedOrder(userId, params.order_id || params.orderId)
  if (order.code) return order
  if (![ORDER_STATUS.completed, ORDER_STATUS.canceled].includes(order.status)) {
    return fail('只能删除已完成或已取消的订单')
  }

  await db.collection('order').doc(order._id).remove()
  return ok({}, '删除成功')
}

async function getLogistics(userId, params) {
  const order = await getOwnedOrder(userId, params.order_id || params.orderId)
  if (order.code) return order

  if (order.status === ORDER_STATUS.pendingPay) {
    return ok([{ time: order.create_date, text: '订单已创建，等待付款' }])
  }
  if (order.status === ORDER_STATUS.pendingShip) {
    return ok([
      { time: order.pay_time || order.update_date, text: '支付成功，商家正在备货' },
      { time: order.create_date, text: '订单已创建' }
    ])
  }

  return ok([
    { time: order.confirm_time || Date.now(), text: order.status >= ORDER_STATUS.pendingReview ? '商品已签收' : '包裹正在配送中' },
    { time: order.ship_time || order.update_date, text: `${order.logistics_company || '薪超优选配送'} 已揽收` },
    { time: order.pay_time || order.create_date, text: '支付成功，商家已开始处理订单' }
  ])
}

async function resolveCoupon(userId, couponId, totalAmount) {
  if (!couponId) return { valid: true, amount: 0, userCouponId: '' }
  const res = await db.collection('coupon').doc(couponId).get()
  const coupon = res.data?.[0]
  if (!coupon) return { valid: false, msg: '优惠券不存在' }
  if (coupon.status && coupon.status !== 'available') return { valid: false, msg: '优惠券不可用' }
  if (isCouponExpired(coupon)) return { valid: false, msg: '优惠券已过期' }

  const userCouponRes = await db.collection('user_coupon').where({ user_id: userId, coupon_id: couponId }).limit(1).get()
  const userCoupon = userCouponRes.data?.[0]
  if (!userCoupon) return { valid: false, msg: '请先领取该优惠券' }
  if (userCoupon.status !== 'available') return { valid: false, msg: '优惠券已使用或已失效' }

  const threshold = Number(coupon.threshold ?? coupon.min_amount ?? 0)
  if (totalAmount < threshold) return { valid: false, msg: `订单未满 ${threshold} 元，不能使用该优惠券` }

  return { valid: true, amount: Number(coupon.amount || 0), userCouponId: userCoupon._id, couponId: coupon._id }
}

function isCouponExpired(coupon = {}) {
  if (!coupon.expire) return false
  const endTime = new Date(`${coupon.expire} 23:59:59`).getTime()
  return Number.isFinite(endTime) && Date.now() > endTime
}

async function getOwnedOrder(userId, orderId) {
  if (!orderId) return fail('缺少订单 ID')
  const res = await db.collection('order').doc(orderId).get()
  const order = res.data?.[0]
  if (!order) return fail('订单不存在', 404)
  if (order.user_id !== userId) return fail('无权操作此订单', 403)
  return order
}

async function updateOrder(orderId, data) {
  await db.collection('order').doc(orderId).update({
    ...data,
    update_date: Date.now()
  })
}

async function restoreStock(order) {
  for (const item of order.goods_list || []) {
    await db.collection('goods').doc(item.goods_id).update({
      stock: _.inc(Number(item.quantity || 0)),
      sales: _.inc(-Number(item.quantity || 0)),
      update_date: Date.now()
    })
    if (item.sku_id) {
      await db.collection('goods_sku').doc(item.sku_id).update({
        stock: _.inc(Number(item.quantity || 0)),
        update_date: Date.now()
      })
    }
  }
}

async function lockCoupon(userId, userCouponId, orderId, time, couponId = '') {
  const res = await db.collection('user_coupon')
    .where({ _id: userCouponId, user_id: userId, status: 'available' })
    .update({
      status: 'used',
      use_time: time,
      order_id: orderId,
      update_date: time
    })
  if (!res.updated) throw new Error('优惠券已使用或已失效')
  if (couponId) {
    try {
      await db.collection('coupon').doc(couponId).update({
        used_count: _.inc(1),
        update_date: time
      })
    } catch (error) {
      // 使用统计不能阻断下单，真实券状态以 user_coupon 为准。
    }
  }
}

async function deductStock(item, deductedResources) {
  const quantity = Number(item.quantity || 0)
  const goodsRes = await db.collection('goods')
    .where({ _id: item.goods_id, stock: _.gte(quantity) })
    .update({
      stock: _.inc(-quantity),
      sales: _.inc(quantity),
      update_date: Date.now()
    })
  if (!goodsRes.updated) throw new Error(`商品"${item.goods_name || item.name}"库存不足`)
  deductedResources.push({ collection: 'goods', id: item.goods_id, quantity, sales: true })

  if (item.sku_id) {
    const skuRes = await db.collection('goods_sku')
      .where({ _id: item.sku_id, stock: _.gte(quantity) })
      .update({
        stock: _.inc(-quantity),
        update_date: Date.now()
      })
    if (!skuRes.updated) throw new Error(`商品"${item.goods_name || item.name}"规格库存不足`)
    deductedResources.push({ collection: 'goods_sku', id: item.sku_id, quantity, sales: false })
  }
}

async function restoreDeductedResources(resources = []) {
  for (const item of [...resources].reverse()) {
    const update = {
      stock: _.inc(Number(item.quantity || 0)),
      update_date: Date.now()
    }
    if (item.sales) update.sales = _.inc(-Number(item.quantity || 0))
    await db.collection(item.collection).doc(item.id).update(update)
  }
}

async function restoreCoupon(order) {
  if (!order.user_coupon_id) return
  const res = await db.collection('user_coupon').doc(order.user_coupon_id).get()
  const userCoupon = res.data?.[0]
  if (!userCoupon || userCoupon.status !== 'used') return
  if (userCoupon.order_id && userCoupon.order_id !== order._id) return

  await db.collection('user_coupon').doc(order.user_coupon_id).update({
    status: 'available',
    use_time: 0,
    order_id: '',
    update_date: Date.now()
  })
  if (userCoupon.coupon_id) {
    try {
      await db.collection('coupon').doc(userCoupon.coupon_id).update({
        used_count: _.inc(-1),
        update_date: Date.now()
      })
    } catch (error) {
      // 统计字段恢复失败不影响用户券重新可用。
    }
  }
}

async function pageQuery(collection, where, params = {}) {
  const page = Number(params.page || 1)
  const pageSize = Number(params.pageSize || 20)
  const totalRes = await db.collection(collection).where(where).count()
  const listRes = await db.collection(collection)
    .where(where)
    .orderBy('create_date', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  return {
    list: listRes.data || [],
    total: totalRes.total || 0,
    page,
    pageSize,
    hasMore: page * pageSize < totalRes.total
  }
}

function generateOrderNo() {
  const date = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  return `XC${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}${random}`
}
