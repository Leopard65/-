'use strict'
const db = uniCloud.database()
const _ = db.command
const uniID = require('xc-auth')

const getUniIdToken = (event = {}) =>
  event.uniIdToken || event.token || event.params?.uniIdToken || event.params?.token || ''

exports.main = async (event, context) => {
  const { action, params } = event
  const uniIDIns = uniID.createInstance({ context })

  const tokenResult = await uniIDIns.checkToken(getUniIdToken(event))
  if (tokenResult.code !== 0) {
    return { code: 401, msg: '请先登录' }
  }
  const userId = tokenResult.uid

  let result = {}

  switch (action) {
    case 'getAddressList':
      result = await getAddressList(userId)
      break
    case 'addAddress':
      result = await addAddress(userId, params)
      break
    case 'updateAddress':
      result = await updateAddress(userId, params)
      break
    case 'deleteAddress':
      result = await deleteAddress(userId, params)
      break
    case 'setDefault':
      result = await setDefault(userId, params)
      break
    case 'getDefault':
      result = await getDefault(userId)
      break
    default:
      result = { code: 404, msg: '接口不存在' }
  }

  return result
}

// 获取地址列表
async function getAddressList(userId) {
  const result = await db.collection('user_address')
    .where({ user_id: userId })
    .orderBy('is_default', 'desc')
    .orderBy('update_date', 'desc')
    .get()

  return {
    code: 0,
    msg: 'success',
    data: result.data
  }
}

// 添加地址
async function addAddress(userId, params) {
  const { name, phone, province, city, district, detail, is_default } = params

  if (!name || !phone || !province || !city || !district || !detail) {
    return { code: 400, msg: '请填写完整地址信息' }
  }

  // 检查地址数量限制
  const countRes = await db.collection('user_address')
    .where({ user_id: userId })
    .count()

  if (countRes.total >= 20) {
    return { code: 400, msg: '最多添加20个收货地址' }
  }

  // 如果设为默认，先取消其他默认
  if (is_default) {
    await db.collection('user_address').where({
      user_id: userId,
      is_default: true
    }).update({ is_default: false })
  }

  const result = await db.collection('user_address').add({
    user_id: userId,
    name,
    phone,
    province,
    city,
    district,
    detail,
    is_default: is_default || false,
    create_date: Date.now(),
    update_date: Date.now()
  })

  return {
    code: 0,
    msg: '添加成功',
    data: { address_id: result.id }
  }
}

// 更新地址
async function updateAddress(userId, params) {
  const { address_id, name, phone, province, city, district, detail, is_default } = params

  const addressRes = await db.collection('user_address').doc(address_id).get()
  if (addressRes.data.length === 0) {
    return { code: 404, msg: '地址不存在' }
  }

  if (addressRes.data[0].user_id !== userId) {
    return { code: 403, msg: '无权操作' }
  }

  // 如果设为默认，先取消其他默认
  if (is_default) {
    await db.collection('user_address').where({
      user_id: userId,
      is_default: true,
      _id: _.neq(address_id)
    }).update({ is_default: false })
  }

  await db.collection('user_address').doc(address_id).update({
    name,
    phone,
    province,
    city,
    district,
    detail,
    is_default: is_default || false,
    update_date: Date.now()
  })

  return { code: 0, msg: '更新成功' }
}

// 删除地址
async function deleteAddress(userId, params) {
  const { address_id } = params

  const addressRes = await db.collection('user_address').doc(address_id).get()
  if (addressRes.data.length === 0) {
    return { code: 404, msg: '地址不存在' }
  }

  if (addressRes.data[0].user_id !== userId) {
    return { code: 403, msg: '无权操作' }
  }

  await db.collection('user_address').doc(address_id).remove()

  return { code: 0, msg: '删除成功' }
}

// 设置默认地址
async function setDefault(userId, params) {
  const { address_id } = params

  const addressRes = await db.collection('user_address').doc(address_id).get()
  if (addressRes.data.length === 0) {
    return { code: 404, msg: '地址不存在' }
  }

  if (addressRes.data[0].user_id !== userId) {
    return { code: 403, msg: '无权操作' }
  }

  // 取消其他默认
  await db.collection('user_address').where({
    user_id: userId,
    is_default: true
  }).update({ is_default: false })

  // 设置当前为默认
  await db.collection('user_address').doc(address_id).update({
    is_default: true,
    update_date: Date.now()
  })

  return { code: 0, msg: '设置成功' }
}

// 获取默认地址
async function getDefault(userId) {
  const result = await db.collection('user_address').where({
    user_id: userId,
    is_default: true
  }).get()

  return {
    code: 0,
    msg: 'success',
    data: result.data.length > 0 ? result.data[0] : null
  }
}
