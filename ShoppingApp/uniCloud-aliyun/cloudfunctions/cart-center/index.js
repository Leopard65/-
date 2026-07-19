'use strict'
const db = uniCloud.database()
const _ = db.command
const uniID = require('xc-auth')

const getUniIdToken = (event = {}) =>
  event.uniIdToken || event.token || event.params?.uniIdToken || event.params?.token || ''

exports.main = async (event, context) => {
  const { action, params } = event
  const uniIDIns = uniID.createInstance({ context })

  // 验证登录状态
  const tokenResult = await uniIDIns.checkToken(getUniIdToken(event))
  if (tokenResult.code !== 0) {
    return { code: 401, msg: '请先登录' }
  }
  const userId = tokenResult.uid

  let result = {}

  switch (action) {
    case 'addToCart':
      result = await addToCart(userId, params)
      break
    case 'getCartList':
      result = await getCartList(userId)
      break
    case 'updateCartQuantity':
      result = await updateCartQuantity(userId, params)
      break
    case 'removeFromCart':
      result = await removeFromCart(userId, params)
      break
    case 'clearCart':
      result = await clearCart(userId)
      break
    case 'getCartCount':
      result = await getCartCount(userId)
      break
    default:
      result = { code: 404, msg: '接口不存在' }
  }

  return result
}

// 添加到购物车
async function addToCart(userId, params) {
  const { goods_id, sku_id, quantity = 1 } = params

  // 验证商品
  const goodsRes = await db.collection('goods').doc(goods_id).get()
  if (goodsRes.data.length === 0) {
    return { code: 400, msg: '商品不存在' }
  }
  const goods = goodsRes.data[0]
  if (goods.status !== 1) {
    return { code: 400, msg: '商品已下架' }
  }

  // 获取 SKU 信息
  let skuInfo = null
  let price = goods.price
  let stock = goods.stock
  let image = goods.image

  if (sku_id) {
    const skuRes = await db.collection('goods_sku').doc(sku_id).get()
    if (skuRes.data.length === 0) return { code: 400, msg: '商品规格不存在' }
    skuInfo = skuRes.data[0]
    if (skuInfo.goods_id !== goods._id) return { code: 400, msg: '商品规格不匹配' }
    if (skuInfo.status !== undefined && skuInfo.status !== 1) return { code: 400, msg: '商品规格已停用' }
    price = skuInfo.price
    stock = skuInfo.stock
    if (skuInfo.image) image = skuInfo.image
  }

  // 检查购物车中是否已存在
  const existRes = await db.collection('cart').where({
    user_id: userId,
    goods_id,
    sku_id: sku_id || ''
  }).get()

  if (existRes.data.length > 0) {
    // 已存在，更新数量
    const cartItem = existRes.data[0]
    const newQuantity = cartItem.quantity + quantity

    if (newQuantity > stock) {
      return { code: 400, msg: '库存不足' }
    }

    await db.collection('cart').doc(cartItem._id).update({
      quantity: newQuantity,
      update_date: Date.now()
    })

    return { code: 0, msg: '已更新购物车数量' }
  } else {
    // 不存在，新增
    if (quantity > stock) {
      return { code: 400, msg: '库存不足' }
    }

    await db.collection('cart').add({
      user_id: userId,
      goods_id,
      sku_id: sku_id || '',
      goods_name: goods.name,
      goods_image: image,
      price,
      quantity,
      stock,
      sku_info: skuInfo ? skuInfo.spec_values : '',
      checked: true,
      create_date: Date.now(),
      update_date: Date.now()
    })

    return { code: 0, msg: '已加入购物车' }
  }
}

// 获取购物车列表
async function getCartList(userId) {
  const result = await db.collection('cart')
    .where({ user_id: userId })
    .orderBy('create_date', 'desc')
    .get()

  const cartItems = result.data
  // 回查商品和 SKU，标记失效项（已下架 / 售罄 / 已删除 / 规格失效）。仅运行时计算，不写回 cart 表。
  const goodsIds = [...new Set(cartItems.map(item => item.goods_id).filter(Boolean))]
  const skuIds = [...new Set(cartItems.map(item => item.sku_id).filter(Boolean))]
  const goodsMap = {}
  const skuMap = {}
  if (goodsIds.length) {
    const goodsRes = await db.collection('goods').where({ _id: _.in(goodsIds) }).get()
    goodsRes.data.forEach(goods => { goodsMap[goods._id] = goods })
  }
  if (skuIds.length) {
    const skuRes = await db.collection('goods_sku').where({ _id: _.in(skuIds) }).get()
    skuRes.data.forEach(sku => { skuMap[sku._id] = sku })
  }

  const data = cartItems.map(item => {
    const goods = goodsMap[item.goods_id]
    const sku = item.sku_id ? skuMap[item.sku_id] : null
    let disabled = false
    let invalid_reason = ''
    let currentStock = Number(goods?.stock || item.stock || 0)
    if (!goods) {
      disabled = true
      invalid_reason = '商品已删除'
    } else if (goods.status !== 1) {
      disabled = true
      invalid_reason = '商品已下架'
    } else if (item.sku_id && !sku) {
      disabled = true
      invalid_reason = '规格已失效'
    } else if (sku && sku.goods_id !== item.goods_id) {
      disabled = true
      invalid_reason = '规格不匹配'
    } else if (sku && sku.status !== undefined && sku.status !== 1) {
      disabled = true
      invalid_reason = '规格已停用'
    } else {
      currentStock = Number(sku ? sku.stock : goods.stock)
    }

    if (!disabled && currentStock <= 0) {
      disabled = true
      invalid_reason = sku ? '规格已售罄' : '已售罄'
    }
    return {
      ...item,
      stock: currentStock,
      disabled,
      invalid_reason
    }
  })

  return {
    code: 0,
    msg: 'success',
    data
  }
}

// 更新购物车数量
async function updateCartQuantity(userId, params) {
  const { cart_id, quantity } = params

  if (quantity < 1) {
    return { code: 400, msg: '数量不能小于1' }
  }

  const cartRes = await db.collection('cart').doc(cart_id).get()
  if (cartRes.data.length === 0) {
    return { code: 404, msg: '购物车商品不存在' }
  }

  const cartItem = cartRes.data[0]
  if (cartItem.user_id !== userId) {
    return { code: 403, msg: '无权操作' }
  }

  const goodsRes = await db.collection('goods').doc(cartItem.goods_id).get()
  const goods = goodsRes.data[0]
  if (!goods || goods.status !== 1) return { code: 400, msg: '商品已失效，请刷新购物车' }

  let currentStock = Number(goods.stock || 0)
  if (cartItem.sku_id) {
    const skuRes = await db.collection('goods_sku').doc(cartItem.sku_id).get()
    const sku = skuRes.data[0]
    if (!sku || sku.goods_id !== cartItem.goods_id) return { code: 400, msg: '商品规格已失效，请刷新购物车' }
    if (sku.status !== undefined && sku.status !== 1) return { code: 400, msg: '商品规格已停用，请刷新购物车' }
    currentStock = Number(sku.stock || 0)
  }

  if (quantity > currentStock) {
    return { code: 400, msg: '库存不足' }
  }

  await db.collection('cart').doc(cart_id).update({
    quantity,
    stock: currentStock,
    update_date: Date.now()
  })

  return { code: 0, msg: '更新成功' }
}

// 从购物车删除
async function removeFromCart(userId, params) {
  const { cart_ids } = params

  if (!cart_ids || cart_ids.length === 0) {
    return { code: 400, msg: '参数错误' }
  }

  await db.collection('cart').where({
    _id: _.in(cart_ids),
    user_id: userId
  }).remove()

  return { code: 0, msg: '删除成功' }
}

// 清空购物车
async function clearCart(userId) {
  await db.collection('cart').where({
    user_id: userId
  }).remove()

  return { code: 0, msg: '已清空购物车' }
}

// 获取购物车数量
async function getCartCount(userId) {
  const result = await db.collection('cart')
    .where({ user_id: userId })
    .count()

  return {
    code: 0,
    msg: 'success',
    data: { count: result.total }
  }
}
