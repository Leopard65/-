'use strict'

const crypto = require('crypto')
const db = uniCloud.database()

const TOKEN_SECRET = process.env.XC_TOKEN_SECRET || 'xc-shopping-demo-token-secret'
const USING_DEMO_TOKEN_SECRET = !process.env.XC_TOKEN_SECRET
const TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000
const DEMO_ADMIN_MOBILE = '13800138000'

const USER_STATUS = {
  active: 0,
  cancelPending: 2,
  disabled: 3
}

const DEFAULT_PRIVACY_STATUS = {
  personalizedRecommend: true,
  activityMessage: true,
  diagnosticsLog: true
}

const now = () => Date.now()
const ok = (data = {}, msg = 'success') => ({ code: 0, msg, ...data })
const fail = (msg = '操作失败', code = 400, extra = {}) => ({ code, msg, ...extra })

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex')
}

function sign(value) {
  return crypto.createHmac('sha256', TOKEN_SECRET).update(value).digest('hex')
}

function toBase64Url(value) {
  return Buffer.from(value).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(normalized.length + (4 - normalized.length % 4) % 4, '=')
  return Buffer.from(padded, 'base64').toString()
}

function createPasswordHash(password, salt) {
  return sha256(`${salt}:${password}`)
}

function createToken(uid) {
  const payload = toBase64Url(JSON.stringify({ uid, exp: now() + TOKEN_MAX_AGE }))
  return `xc.${payload}.${sign(payload)}`
}

function normalizeRoles(role) {
  if (Array.isArray(role)) return role.filter(Boolean)
  if (typeof role === 'string' && role) return [role]
  return []
}

function sanitizeUser(user = {}) {
  const { password_hash, password_salt, ...safeUser } = user
  const role = normalizeRoles(safeUser.role || safeUser.roles)
  return {
    ...safeUser,
    role,
    roles: role,
    hasPassword: Boolean(password_hash && password_salt)
  }
}

function isDemoAccount(user = {}) {
  return user.mobile === DEMO_ADMIN_MOBILE || user.username === DEMO_ADMIN_MOBILE
}

function isDisabledUser(user = {}) {
  if (isDemoAccount(user)) return false
  return [USER_STATUS.cancelPending, USER_STATUS.disabled].includes(Number(user.status)) ||
    user.account_status === 'cancel_requested' ||
    user.account_status === 'disabled'
}

function normalizePrivacyStatus(value = {}) {
  return {
    ...DEFAULT_PRIVACY_STATUS,
    personalizedRecommend: value.personalizedRecommend !== false,
    activityMessage: value.activityMessage !== false,
    diagnosticsLog: value.diagnosticsLog !== false,
    updated_date: value.updated_date || now()
  }
}

async function findUserByAccount(account) {
  if (!account) return null
  const usernameRes = await db.collection('uni-id-users').where({ username: account }).limit(1).get()
  if (usernameRes.data && usernameRes.data[0]) return usernameRes.data[0]

  const mobileRes = await db.collection('uni-id-users').where({ mobile: account }).limit(1).get()
  return mobileRes.data && mobileRes.data[0] ? mobileRes.data[0] : null
}

async function findUserByUid(uid) {
  if (!uid) return null
  const res = await db.collection('uni-id-users').doc(uid).get()
  return res.data && res.data[0] ? res.data[0] : null
}

async function savePassword(uid, password) {
  const salt = crypto.randomBytes(8).toString('hex')
  await db.collection('uni-id-users').doc(uid).update({
    password_salt: salt,
    password_hash: createPasswordHash(password, salt),
    update_date: now()
  })
}

async function verifyToken(token) {
  if (!token || typeof token !== 'string') return fail('请先登录', 401, { errCode: 'TOKEN_MISSING' })
  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] !== 'xc') return fail('登录状态无效', 401, { errCode: 'TOKEN_INVALID' })
  const payload = parts[1]
  if (sign(payload) !== parts[2]) return fail('登录状态无效', 401, { errCode: 'TOKEN_INVALID' })

  let data
  try {
    data = JSON.parse(fromBase64Url(payload))
  } catch (error) {
    return fail('登录状态无效', 401, { errCode: 'TOKEN_INVALID' })
  }

  if (!data.uid) return fail('登录状态无效', 401, { errCode: 'TOKEN_INVALID' })
  if (Number(data.exp || 0) < now()) {
    return fail('登录已过期，请重新登录', 401, { errCode: 'TOKEN_EXPIRED', tokenExpired: Number(data.exp || 0) })
  }
  const user = await findUserByUid(data.uid)
  if (!user) return fail('用户不存在', 401, { errCode: 'USER_NOT_FOUND' })
  if (isDisabledUser(user)) return fail('账号已申请注销或已停用，请联系客服处理', 401, { errCode: 'ACCOUNT_DISABLED' })
  const userInfo = sanitizeUser(user)
  return ok({
    uid: data.uid,
    tokenExpired: Number(data.exp || 0),
    role: userInfo.role,
    userInfo
  })
}

function createInstance() {
  return {
    async register(params = {}) {
      const username = params.username || params.mobile
      const mobile = params.mobile || params.username
      const password = params.password
      if (!username || !password) return fail('请填写账号和密码')

      const existing = await findUserByAccount(username)
      if (existing) return fail('账号已存在', 422)

      const salt = crypto.randomBytes(8).toString('hex')
      const role = normalizeRoles(params.role)
      const user = {
        username,
        mobile,
        nickname: params.nickname || '薪超会员',
        avatar: params.avatar || '/static/default-avatar.png',
        role,
        roles: role,
        password_salt: salt,
        password_hash: createPasswordHash(password, salt),
        register_date: now(),
        create_date: now(),
        update_date: now(),
        status: USER_STATUS.active,
        account_status: 'active',
        account_cancel_request: { requested: false },
        privacy_settings: normalizePrivacyStatus()
      }
      const res = await db.collection('uni-id-users').add(user)
      const uid = res.id
      const savedUser = { _id: uid, ...user }
      const token = createToken(uid)
      return ok({ uid, token, tokenExpired: now() + TOKEN_MAX_AGE, userInfo: sanitizeUser(savedUser) }, '注册成功')
    },

    async loginByPassword(params = {}) {
      const account = params.username || params.mobile
      const user = await findUserByAccount(account)
      if (!user) return fail('账号不存在', 404)
      if (isDisabledUser(user)) return fail('账号已申请注销或已停用，请联系客服处理', 403, { errCode: 'ACCOUNT_DISABLED' })
      if (!user.password_hash || !user.password_salt) return fail('账号未设置密码', 422)
      if (createPasswordHash(params.password, user.password_salt) !== user.password_hash) {
        return fail('账号或密码不正确', 401)
      }
      const token = createToken(user._id)
      return ok({ token, tokenExpired: now() + TOKEN_MAX_AGE, userInfo: sanitizeUser(user) }, '登录成功')
    },

    async loginBySms(params = {}) {
      const user = await findUserByAccount(params.mobile)
      if (!user) return fail('账号不存在，请先注册', 404)
      if (isDisabledUser(user)) return fail('账号已申请注销或已停用，请联系客服处理', 403, { errCode: 'ACCOUNT_DISABLED' })
      const token = createToken(user._id)
      return ok({ token, tokenExpired: now() + TOKEN_MAX_AGE, userInfo: sanitizeUser(user) }, '登录成功')
    },

    async loginByWeixin() {
      return fail('微信登录暂未接入', 501)
    },

    async sendSmsCode() {
      return ok({}, '验证码已发送')
    },

    async setPassword(params = {}) {
      const tokenResult = await verifyToken(params.uniIdToken || params.token)
      if (tokenResult.code !== 0) return tokenResult
      if (params.uid && params.uid !== tokenResult.uid) return fail('不能修改其他账号密码', 403)
      if (!params.password) return fail('请填写新密码')
      const user = await findUserByUid(tokenResult.uid)
      if (isDemoAccount(user)) return fail('体验账号密码固定用于验收，请注册普通账号测试修改密码', 403)
      await savePassword(tokenResult.uid, params.password)
      return ok({}, '密码已更新')
    },

    async resetPasswordForSystem(params = {}) {
      if (!params.uid || !params.password) return fail('缺少用户或密码')
      const user = await findUserByUid(params.uid)
      if (!user) return fail('用户不存在', 404)
      await savePassword(params.uid, params.password)
      return ok({}, '密码已更新')
    },

    async changePassword(params = {}) {
      const tokenResult = await verifyToken(params.uniIdToken || params.token)
      if (tokenResult.code !== 0) return tokenResult
      if (!params.oldPassword || !params.newPassword) return fail('请填写原密码和新密码')
      if (String(params.newPassword).length < 6) return fail('新密码至少 6 位')

      const user = await findUserByUid(tokenResult.uid)
      if (!user) return fail('用户不存在', 404)
      if (isDemoAccount(user)) return fail('体验账号密码固定用于验收，请注册普通账号测试修改密码', 403)
      if (!user.password_hash || !user.password_salt) return fail('账号未设置密码', 422)
      if (createPasswordHash(params.oldPassword, user.password_salt) !== user.password_hash) {
        return fail('原密码不正确', 401)
      }

      await savePassword(tokenResult.uid, params.newPassword)
      return ok({}, '密码已更新')
    },

    async bindMobile(params = {}) {
      const tokenResult = await verifyToken(params.uniIdToken || params.token)
      if (tokenResult.code !== 0) return tokenResult
      if (params.uid && params.uid !== tokenResult.uid) return fail('不能修改其他账号手机号', 403)
      if (!params.mobile) return fail('请填写手机号')
      const user = await findUserByUid(tokenResult.uid)
      if (isDemoAccount(user)) return fail('体验账号手机号固定用于验收', 403)
      await db.collection('uni-id-users').doc(tokenResult.uid).update({
        mobile: params.mobile,
        update_date: now()
      })
      return ok({}, '手机号已绑定')
    },

    async getPrivacyStatus(params = {}) {
      const tokenResult = await verifyToken(params.uniIdToken || params.token)
      if (tokenResult.code !== 0) return tokenResult
      const user = await findUserByUid(tokenResult.uid)
      if (!user) return fail('用户不存在', 404)
      return ok({ privacyStatus: normalizePrivacyStatus(user.privacy_settings) })
    },

    async updatePrivacyStatus(params = {}) {
      const tokenResult = await verifyToken(params.uniIdToken || params.token)
      if (tokenResult.code !== 0) return tokenResult
      const next = normalizePrivacyStatus({
        personalizedRecommend: params.personalizedRecommend,
        activityMessage: params.activityMessage,
        diagnosticsLog: params.diagnosticsLog,
        updated_date: now()
      })
      await db.collection('uni-id-users').doc(tokenResult.uid).update({
        privacy_settings: next,
        update_date: now()
      })
      return ok({ privacyStatus: next }, '隐私设置已保存')
    },

    async requestAccountCancel(params = {}) {
      const tokenResult = await verifyToken(params.uniIdToken || params.token)
      if (tokenResult.code !== 0) return tokenResult
      const user = await findUserByUid(tokenResult.uid)
      if (!user) return fail('用户不存在', 404)

      const applyDate = now()
      const reason = String(params.reason || '用户主动申请注销').slice(0, 120)
      if (isDemoAccount(user)) {
        await db.collection('uni-id-users').doc(tokenResult.uid).update({
          account_cancel_request: {
            requested: true,
            demo: true,
            reason,
            apply_date: applyDate
          },
          account_status: 'demo_cancel_requested',
          update_date: applyDate
        })
        return ok({ disabled: false, demo: true }, '体验账号已记录注销申请，不会停用演示管理员')
      }

      await db.collection('uni-id-users').doc(tokenResult.uid).update({
        status: USER_STATUS.cancelPending,
        account_status: 'cancel_requested',
        account_cancel_request: {
          requested: true,
          reason,
          apply_date: applyDate
        },
        update_date: applyDate
      })
      return ok({ disabled: true }, '注销申请已提交，账号已退出并停止登录')
    },

    async checkToken(token) {
      return verifyToken(token)
    },

    async logout() {
      return ok({}, '已退出登录')
    }
  }
}

module.exports = { createInstance, USING_DEMO_TOKEN_SECRET }
