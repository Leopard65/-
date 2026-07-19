'use strict'

const db = uniCloud.database()
const _ = db.command
const uniID = require('xc-auth')

const ORDER_STATUS = {
  pendingShip: 1,
  pendingReceive: 2,
  pendingReview: 3,
  completed: 4,
  refunding: 5
}

const AFTER_SALE_STATUS = {
  pending: 0,
  approved: 1,
  rejected: 2,
  returning: 3,
  completed: 4,
  canceled: 5
}

const ok = (data = {}, msg = 'success') => ({ code: 0, msg, data })
const fail = (msg = '操作失败', code = 400) => ({ code, msg, data: null })
const getUniIdToken = (event = {}) =>
  event.uniIdToken || event.token || event.params?.uniIdToken || event.params?.token || ''

exports.main = async (event, context) => {
  const { action, params = {} } = event || {}
  const publicActions = ['getCouponList']
  let userId = ''

  if (publicActions.includes(action)) {
    userId = await getOptionalUserId(event, context)
  } else {
    const uniIDIns = uniID.createInstance({ context })
    const tokenResult = await uniIDIns.checkToken(getUniIdToken(event))
    if (tokenResult.code !== 0) return fail('请先登录', 401)
    userId = tokenResult.uid
  }

  const handlers = {
    getCouponList: () => getCouponList(userId, params),
    receiveCoupon: () => receiveCoupon(userId, params),
    getCollectList: () => getCollectList(userId, params),
    toggleCollect: () => toggleCollect(userId, params),
    cancelCollect: () => cancelCollect(userId, params),
    getMessageList: () => getMessageList(userId, params),
    markAsRead: () => markAsRead(userId, params),
    addEvaluate: () => addEvaluate(userId, params),
    applyAfterSale: () => applyAfterSale(userId, params),
    getAfterSaleList: () => getAfterSaleList(userId, params),
    cancelAfterSale: () => cancelAfterSale(userId, params)
  }

  const handler = handlers[action]
  if (!handler) return fail('接口不存在', 404)
  return handler()
}

async function getOptionalUserId(event, context) {
  const token = getUniIdToken(event)
  if (!token) return ''
  const uniIDIns = uniID.createInstance({ context })
  const tokenResult = await uniIDIns.checkToken(token)
  return tokenResult.code === 0 ? tokenResult.uid : ''
}

function isCouponExpired(coupon = {}) {
  if (coupon.status === 'expired') return true
  if (!coupon.expire) return false
  const endTime = new Date(`${coupon.expire} 23:59:59`).getTime()
  return Number.isFinite(endTime) && Date.now() > endTime
}

function mergeUserCoupon(coupon = {}, userCoupon = null) {
  const expired = isCouponExpired(coupon)
  const status = expired ? 'expired' : (userCoupon?.status || coupon.status || 'available')
  const totalQuantity = Number(coupon.total_quantity || 0)
  const receivedCount = Number(coupon.received_count || 0)
  const soldOut = totalQuantity > 0 && receivedCount >= totalQuantity
  return {
    ...coupon,
    _id: coupon._id,
    coupon_id: coupon._id,
    user_coupon_id: userCoupon?._id || '',
    user_coupon_status: userCoupon?.status || '',
    status,
    received: Boolean(userCoupon),
    can_receive: !userCoupon && status === 'available' && !soldOut,
    sold_out: soldOut,
    receive_time: userCoupon?.receive_time || 0,
    use_time: userCoupon?.use_time || 0,
    order_id: userCoupon?.order_id || ''
  }
}

function paginateArray(list, params = {}) {
  const page = Number(params.page || 1)
  const pageSize = Number(params.pageSize || 20)
  const start = (page - 1) * pageSize
  return {
    list: list.slice(start, start + pageSize),
    total: list.length,
    page,
    pageSize,
    hasMore: start + pageSize < list.length
  }
}

async function getCouponList(userId, params) {
  const scope = params.scope || (userId ? 'mine' : 'market')
  const status = params.status && params.status !== 'all' ? params.status : ''

  if (scope === 'mine') {
    if (!userId) return fail('请先登录', 401)
    const userCouponRes = await db.collection('user_coupon')
      .where({ user_id: userId })
      .orderBy('receive_time', 'desc')
      .limit(1000)
      .get()
    const userCoupons = userCouponRes.data || []
    const couponIds = userCoupons.map(item => item.coupon_id).filter(Boolean)
    if (!couponIds.length) return ok(paginateArray([], params))

    const couponRes = await db.collection('coupon').where({ _id: _.in(couponIds) }).get()
    const coupons = couponRes.data || []
    const list = userCoupons
      .map(userCoupon => {
        const coupon = coupons.find(item => item._id === userCoupon.coupon_id)
        return coupon ? mergeUserCoupon(coupon, userCoupon) : null
      })
      .filter(Boolean)
      .filter(item => !status || item.status === status)
    return ok(paginateArray(list, params))
  }

  const couponRes = await db.collection('coupon')
    .where({ status: 'available' })
    .orderBy('sort', 'desc')
    .limit(1000)
    .get()
  const coupons = couponRes.data || []
  let userCoupons = []
  if (userId && coupons.length) {
    const userCouponRes = await db.collection('user_coupon')
      .where({ user_id: userId, coupon_id: _.in(coupons.map(item => item._id)) })
      .get()
    userCoupons = userCouponRes.data || []
  }
  const list = coupons
    .map(coupon => mergeUserCoupon(coupon, userCoupons.find(item => item.coupon_id === coupon._id)))
    .filter(item => !status || item.status === status)
  return ok(paginateArray(list, params))
}

async function receiveCoupon(userId, params) {
  if (!userId) return fail('请先登录', 401)
  const couponId = params.coupon_id || params.couponId
  if (!couponId) return fail('缺少优惠券 ID')

  const couponRes = await db.collection('coupon').doc(couponId).get()
  const coupon = couponRes.data?.[0]
  if (!coupon) return fail('优惠券不存在', 404)
  if (coupon.status !== 'available' || isCouponExpired(coupon)) return fail('优惠券已失效')

  const userCouponRes = await db.collection('user_coupon').where({ user_id: userId, coupon_id: couponId }).limit(20).get()
  const userCoupons = userCouponRes.data || []
  const perUserLimit = Number(coupon.per_user_limit || 1)
  if (perUserLimit > 0 && userCoupons.length >= perUserLimit) {
    return ok(mergeUserCoupon(coupon, userCoupons[0]), '已达到该优惠券领取上限')
  }

  const now = Date.now()
  const totalQuantity = Number(coupon.total_quantity || 0)
  const couponUpdate = {
    received_count: _.inc(1),
    update_date: now
  }
  let couponLocked = false

  if (totalQuantity > 0) {
    const lockRes = await db.collection('coupon')
      .where({ _id: couponId, status: 'available', received_count: _.lt(totalQuantity) })
      .update(couponUpdate)
    if (!lockRes.updated) return fail('优惠券已领完')
    couponLocked = true
  } else {
    await db.collection('coupon').doc(couponId).update(couponUpdate)
    couponLocked = true
  }

  let res
  try {
    res = await db.collection('user_coupon').add({
      user_id: userId,
      coupon_id: couponId,
      status: 'available',
      receive_time: now,
      create_date: now,
      update_date: now
    })
  } catch (error) {
    if (couponLocked) {
      await db.collection('coupon').doc(couponId).update({
        received_count: _.inc(-1),
        update_date: now
      })
    }
    return fail('领取失败，已恢复优惠券库存', 500)
  }

  return ok(mergeUserCoupon(coupon, {
    _id: res.id,
    user_id: userId,
    coupon_id: couponId,
    status: 'available',
    receive_time: now
  }), '领取成功')
}

async function getCollectList(userId, params) {
  const collectData = await pageQuery('goods_collect', { user_id: userId }, params)
  const goodsIds = collectData.list.map(item => item.goods_id)
  if (!goodsIds.length) return ok({ ...collectData, list: [] })

  const goodsRes = await db.collection('goods').where({ _id: _.in(goodsIds) }).get()
  const list = collectData.list.map(collect => {
    const goods = goodsRes.data.find(item => item._id === collect.goods_id)
    return goods ? { ...goods, collect_id: collect._id, goods_id: goods._id } : null
  }).filter(Boolean)

  return ok({ ...collectData, list })
}

async function toggleCollect(userId, params) {
  const goodsId = params.goods_id || params.goodsId
  if (!goodsId) return fail('缺少商品 ID')

  const exists = await db.collection('goods_collect').where({ user_id: userId, goods_id: goodsId }).limit(1).get()
  if (exists.data.length) {
    await db.collection('goods_collect').doc(exists.data[0]._id).remove()
    return ok({ is_collect: false }, '已取消收藏')
  }

  await db.collection('goods_collect').add({
    user_id: userId,
    goods_id: goodsId,
    create_date: Date.now(),
    update_date: Date.now()
  })
  return ok({ is_collect: true }, '已收藏')
}

async function cancelCollect(userId, params) {
  const goodsId = params.goods_id || params.goodsId
  if (!goodsId) return fail('缺少商品 ID')
  await db.collection('goods_collect').where({ user_id: userId, goods_id: goodsId }).remove()
  return ok({}, '已取消收藏')
}

async function getMessageList(userId, params) {
  return ok(await pageQuery('message', { user_id: _.in([userId, 'all']), status: _.nin(['draft', 'archived']) }, params))
}

async function markAsRead(userId, params) {
  if (!params.message_id) return fail('缺少消息 ID')
  const msgRes = await db.collection('message').doc(params.message_id).get()
  const message = msgRes.data?.[0]
  if (!message) return fail('消息不存在', 404)
  if (message.user_id !== 'all' && message.user_id !== userId) return fail('无权操作此消息', 403)

  await db.collection('message').doc(params.message_id).update({
    is_read: true,
    read: true,
    update_date: Date.now()
  })
  return ok()
}

async function addEvaluate(userId, params) {
  const order = await getOwnedOrder(userId, params.order_id)
  if (order.code) return order
  if (order.status !== ORDER_STATUS.pendingReview) return fail('只有待评价订单可以提交评价')

  const now = Date.now()
  const goodsList = params.goods_list?.length ? params.goods_list : (order.goods_list || [])
  for (const item of goodsList) {
    await db.collection('goods_evaluate').add({
      user_id: userId,
      order_id: order._id,
      goods_id: item.goods_id,
      goods_list: [item],
      user_name: params.is_anonymous ? '匿名用户' : '薪超会员',
      score: Number(params.score || 5),
      star: Number(params.score || 5),
      content: params.content || '',
      images: params.images || [],
      is_anonymous: Boolean(params.is_anonymous),
      create_date: now,
      update_date: now
    })
  }

  await updateOrder(order._id, {
    status: ORDER_STATUS.completed,
    evaluate_time: now
  })
  return ok({}, '评价已提交')
}

async function applyAfterSale(userId, params) {
  const order = await getOwnedOrder(userId, params.order_id)
  if (order.code) return order
  if (![ORDER_STATUS.pendingShip, ORDER_STATUS.pendingReceive, ORDER_STATUS.pendingReview, ORDER_STATUS.completed].includes(order.status)) {
    return fail('当前订单状态不能申请售后')
  }
  if (!params.goods_ids?.length) return fail('请选择售后商品')
  if (!params.reason) return fail('请选择售后原因')

  const now = Date.now()
  const result = await db.collection('after_sale').add({
    user_id: userId,
    order_id: order._id,
    prev_order_status: Number(order.status),
    goods_ids: params.goods_ids,
    goods_list: params.goods_list || order.goods_list.filter(item => params.goods_ids.includes(item.goods_id)),
    type: params.type || 'refund',
    reason: params.reason,
    refund_amount: Number(params.refund_amount || 0),
    description: params.description || '',
    images: params.images || [],
    status: AFTER_SALE_STATUS.pending,
    aftersale_no: `AS${now}`,
    create_date: now,
    update_date: now
  })

  await updateOrder(order._id, {
    status: ORDER_STATUS.refunding,
    aftersale_time: now
  })
  return ok({ _id: result.id, aftersale_no: `AS${now}` }, '售后申请已提交')
}

async function getAfterSaleList(userId, params) {
  return ok(await pageQuery('after_sale', { user_id: userId }, params))
}

async function cancelAfterSale(userId, params) {
  const afterSale = await getOwnedAfterSale(userId, params.after_sale_id || params.afterSaleId)
  if (afterSale.code) return afterSale
  if (![AFTER_SALE_STATUS.pending, AFTER_SALE_STATUS.approved].includes(afterSale.status)) {
    return fail('当前售后状态不能取消')
  }

  const now = Date.now()
  await updateAfterSale(afterSale._id, {
    status: AFTER_SALE_STATUS.canceled,
    cancel_reason: params.reason || '用户取消',
    cancel_time: now
  })

  if (afterSale.order_id) {
    await updateOrder(afterSale.order_id, {
      status: restoreOrderStatus(afterSale.prev_order_status),
      aftersale_cancel_time: now
    })
  }

  return ok({}, '售后申请已取消')
}

// 售后被拒绝/取消时,把订单恢复到"申请售后前"的状态,而非一律置为已完成
function restoreOrderStatus(prev) {
  const allowed = [
    ORDER_STATUS.pendingShip, ORDER_STATUS.pendingReceive,
    ORDER_STATUS.pendingReview, ORDER_STATUS.completed
  ]
  const value = Number(prev)
  return allowed.includes(value) ? value : ORDER_STATUS.completed
}

async function getOwnedOrder(userId, orderId) {
  if (!orderId) return fail('缺少订单 ID')
  const res = await db.collection('order').doc(orderId).get()
  const order = res.data?.[0]
  if (!order) return fail('订单不存在', 404)
  if (order.user_id !== userId) return fail('无权操作此订单', 403)
  return order
}

async function getOwnedAfterSale(userId, afterSaleId) {
  if (!afterSaleId) return fail('缺少售后 ID')
  const res = await db.collection('after_sale').doc(afterSaleId).get()
  const afterSale = res.data?.[0]
  if (!afterSale) return fail('售后记录不存在', 404)
  if (afterSale.user_id !== userId) return fail('无权操作此售后记录', 403)
  return afterSale
}

async function updateOrder(orderId, data) {
  await db.collection('order').doc(orderId).update({
    ...data,
    update_date: Date.now()
  })
}

async function updateAfterSale(afterSaleId, data) {
  await db.collection('after_sale').doc(afterSaleId).update({
    ...data,
    update_date: Date.now()
  })
}

async function pageQuery(collection, where, params = {}, orderField = 'create_date') {
  const page = Number(params.page || 1)
  const pageSize = Number(params.pageSize || 20)
  const countRes = await db.collection(collection).where(where).count()
  const listRes = await db.collection(collection)
    .where(where)
    .orderBy(orderField, orderField === 'sort' ? 'desc' : 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  return {
    list: listRes.data || [],
    total: countRes.total || 0,
    page,
    pageSize,
    hasMore: page * pageSize < countRes.total
  }
}
