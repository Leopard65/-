'use strict'
const uniID = require('xc-auth')
const db = uniCloud.database()

const getUniIdToken = (event = {}) =>
  event.uniIdToken || event.token || event.params?.uniIdToken || event.params?.token || ''

function normalizeRoles(role) {
  if (Array.isArray(role)) return role.filter(Boolean)
  if (typeof role === 'string' && role) return [role]
  return []
}

function sanitizeUser(user = {}) {
  const { password_hash, password_salt, token, uniIdToken, ...safeUser } = user
  const role = normalizeRoles(safeUser.role || safeUser.roles)
  return {
    ...safeUser,
    role,
    roles: role,
    hasPassword: Boolean(password_hash && password_salt)
  }
}

function buildProfileUpdate(params = {}) {
  const allowedKeys = ['nickname', 'avatar', 'gender', 'birthday']
  const update = {}
  for (const key of allowedKeys) {
    if (params[key] !== undefined) update[key] = params[key]
  }
  update.update_date = Date.now()
  return update
}

exports.main = async (event, context) => {
  const { action, params = {} } = event || {}
  const uniIdToken = getUniIdToken(event)

  // 初始化 uniID
  const uniIDIns = uniID.createInstance({
    context
  })

  let result = {}

  switch (action) {
    case 'loginBySms':
      // 手机验证码登录
      result = await uniIDIns.loginBySms(params)
      break

    case 'loginByWeixin':
      // 微信一键登录
      result = await uniIDIns.loginByWeixin(params)
      break

    case 'loginByPassword':
      // 密码登录
      result = await uniIDIns.loginByPassword(params)
      break

    case 'register':
      // 注册
      result = await uniIDIns.register(params)
      break

    case 'sendSmsCode':
      // 发送验证码
      result = await uniIDIns.sendSmsCode(params)
      break

    case 'setPassword':
      // 设置密码
      result = await uniIDIns.setPassword({ ...params, uniIdToken })
      break

    case 'changePassword':
      result = await uniIDIns.changePassword({ ...params, uniIdToken })
      break

    case 'requestAccountCancel':
      result = await uniIDIns.requestAccountCancel({ ...params, uniIdToken })
      break

    case 'getPrivacyStatus':
      result = await uniIDIns.getPrivacyStatus({ ...params, uniIdToken })
      break

    case 'updatePrivacyStatus':
      result = await uniIDIns.updatePrivacyStatus({ ...params, uniIdToken })
      break

    case 'bindMobile':
      // 绑定手机号
      result = await uniIDIns.bindMobile({ ...params, uniIdToken })
      break

    case 'checkToken':
      // 验证 token
      result = await uniIDIns.checkToken(uniIdToken)
      break

    case 'logout':
      // 登出
      result = await uniIDIns.logout(uniIdToken)
      break

    case 'getUserInfo':
      // 获取用户信息
      const tokenResult = await uniIDIns.checkToken(uniIdToken)
      if (tokenResult.code === 0) {
        const userRes = await db.collection('uni-id-users').doc(tokenResult.uid).get()
        result = {
          code: 0,
          msg: 'success',
          userInfo: sanitizeUser(userRes.data[0] || {})
        }
      } else {
        result = tokenResult
      }
      break

    case 'updateUserInfo':
      // 更新用户信息
      const updateTokenResult = await uniIDIns.checkToken(uniIdToken)
      if (updateTokenResult.code === 0) {
        await db.collection('uni-id-users').doc(updateTokenResult.uid).update(buildProfileUpdate(params))
        result = { code: 0, msg: '更新成功' }
      } else {
        result = updateTokenResult
      }
      break

    default:
      result = { code: 404, msg: '接口不存在' }
  }

  return normalizeUserResult(result)
}

// 统一页面出口结构为 { code, msg, data }:成功时把 token/userInfo/privacyStatus 等
// 顶层载荷收敛进 data(userInfo 恒在 data.userInfo、token 恒在 data.token)。
// 注意:这是 user-center 的对外出口归一化,xc-auth 内部 verifyToken 的返回结构不受影响。
function normalizeUserResult(result) {
  if (!result || typeof result !== 'object' || result.code !== 0) return result
  const { code, msg, data, ...rest } = result
  const baseData = (data && typeof data === 'object' && !Array.isArray(data)) ? { ...data } : {}
  const mergedData = { ...baseData, ...rest }
  return { code, msg: msg || 'success', data: mergedData }
}
