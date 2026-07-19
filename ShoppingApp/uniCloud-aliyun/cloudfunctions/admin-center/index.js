'use strict'

const db = uniCloud.database()
const _ = db.command
const uniID = require('xc-auth')

const DEMO_ADMIN_MOBILE = '13800138000'
const ADMIN_ROLES = ['admin', 'operator']

const CORE_COLLECTIONS = [
  'home_banner',
  'goods_category',
  'goods',
  'goods_sku',
  'coupon',
  'user_coupon',
  'message',
  'goods_evaluate',
  'user_address',
  'order',
  'after_sale',
  'uni-id-users',
  'operation_log'
]

const LIGHT_COLLECTIONS = [
  'goods',
  'goods_sku',
  'coupon',
  'message',
  'order',
  'after_sale',
  'uni-id-users',
  'operation_log'
]

const CORE_FUNCTIONS = [
  'init-data',
  'user-center',
  'goods-center',
  'cart-center',
  'order-center',
  'address-center',
  'service-center',
  'admin-center'
]

const COMPLIANCE_PAGES = [
  { key: 'agreement', label: '用户协议', path: '/pages/legal/agreement', version: '2026.06.24' },
  { key: 'privacy', label: '隐私政策', path: '/pages/legal/privacy', version: '2026.06.24' },
  { key: 'account-security', label: '账号与安全', path: '/pages/account/security', version: '0.9.0' },
  { key: 'privacy-settings', label: '隐私设置', path: '/pages/account/privacy', version: '0.9.0' },
  { key: 'account-cancel', label: '账号注销', path: '/pages/account/cancel', version: '0.9.0' }
]

const RELEASE_CHECKS = [
  { key: 'app-device', label: 'App 真机运行', status: 'manual' },
  { key: 'mp-weixin', label: '微信小程序编译', status: 'manual' },
  { key: 'cloud-space', label: 'uniCloud 服务空间关联', status: 'auto' },
  { key: 'cloud-functions', label: '云函数上传', status: 'mixed' },
  { key: 'schemas', label: '数据库 schema 上传', status: 'mixed' },
  { key: 'demo-data', label: '演示数据初始化', status: 'auto' },
  { key: 'demo-login', label: '体验账号登录', status: 'auto' },
  { key: 'order-flow', label: '订单与售后闭环', status: 'manual' },
  { key: 'account-security', label: '账号安全与注销申请', status: 'mixed' },
  { key: 'privacy-settings', label: '隐私授权设置', status: 'mixed' },
  { key: 'diagnostics', label: '运行诊断无阻断项', status: 'auto' },
  { key: 'ops-maintenance', label: '运营中心商品券消息维护', status: 'mixed' },
  { key: 'coupon-lifecycle', label: '优惠券领取使用恢复闭环', status: 'mixed' },
  { key: 'operation-log', label: '运营操作日志', status: 'auto' },
  { key: 'goods-sku-edit', label: '商品与 SKU 编辑', status: 'mixed' },
  { key: 'ops-report', label: '运营报表与发布回归中心', status: 'mixed' },
  { key: 'cloud-upload', label: '云存储图片上传', status: 'manual' },
  { key: 'order-idempotency', label: '订单幂等与补偿', status: 'mixed' }
]

const ORDER_STATUS = {
  pendingPay: 0,
  pendingShip: 1,
  pendingReceive: 2,
  pendingReview: 3,
  completed: 4,
  refunding: 5,
  canceled: 6
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
const fail = (msg = '操作失败', code = 400, extra = {}) => ({ code, msg, data: null, ...extra })
const getUniIdToken = (event = {}) =>
  event.uniIdToken || event.token || event.params?.uniIdToken || event.params?.token || ''
const sleep = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms))

const isTransientDbError = (error = {}) => {
  const message = error.message || error.errMsg || ''
  return /resource exhausted|resource busy|too many|timeout|temporarily/i.test(message)
}

async function withDbRetry(runner, retries = 2) {
  let lastError = null
  for (let index = 0; index <= retries; index += 1) {
    try {
      return await runner()
    } catch (error) {
      lastError = error
      if (!isTransientDbError(error) || index === retries) break
      await sleep(180 * (index + 1))
    }
  }
  throw lastError
}

exports.main = async (event, context) => {
  const { action, params = {} } = event || {}
  if (action === 'getHealthCheck') return getHealthCheck(event, context)
  if (action === 'getDeepHealthCheck') return getDeepHealthCheck(event, context)

  const auth = await requireAdmin(event, context)
  if (auth.code) return auth

  const handlers = {
    getDashboard: () => getDashboard(),
    getOpsReport: () => getOpsReport(params),
    getGoodsList: () => getGoodsList(params),
    createGoods: () => createGoods(auth, params),
    updateGoods: () => updateGoods(auth, params),
    deleteGoodsDraft: () => deleteGoodsDraft(auth, params),
    updateSkuList: () => updateSkuList(auth, params),
    updateGoodsStatus: () => updateGoodsStatus(auth, params),
    updateGoodsStock: () => updateGoodsStock(auth, params),
    getCouponList: () => getCouponList(params),
    createCoupon: () => createCoupon(auth, params),
    updateCoupon: () => updateCoupon(auth, params),
    getCouponStats: () => getCouponStats(params),
    updateCouponStatus: () => updateCouponStatus(auth, params),
    getMessageList: () => getMessageList(params),
    publishMessage: () => publishMessage(auth, params),
    updateMessage: () => updateMessage(auth, params),
    getMessageStats: () => getMessageStats(params),
    getOrderList: () => getOrderList(params),
    shipOrder: () => shipOrder(auth, params),
    addOrderRemark: () => addOrderRemark(auth, params),
    updateShipment: () => updateShipment(auth, params),
    getAfterSaleList: () => getAfterSaleList(params),
    auditAfterSale: () => auditAfterSale(auth, params),
    completeAfterSale: () => completeAfterSale(auth, params),
    addAfterSaleRemark: () => addAfterSaleRemark(auth, params),
    getOperationLogs: () => getOperationLogs(params)
  }

  const handler = handlers[action]
  if (!handler) return fail('接口不存在', 404)
  return handler()
}

async function requireAdmin(event, context) {
  const uniIDIns = uniID.createInstance({ context })
  const tokenResult = await withDbRetry(() => uniIDIns.checkToken(getUniIdToken(event)))
  if (tokenResult.code !== 0) return fail(tokenResult.msg || '请先登录', 401, { errCode: tokenResult.errCode || 'TOKEN_INVALID' })

  const user = tokenResult.userInfo || {}
  const isAdmin = hasAdminRole(user)
  if (!isAdmin) return fail('当前账号没有运营权限', 403)
  return { uid: tokenResult.uid, userInfo: user }
}

function normalizeRoles(role) {
  if (Array.isArray(role)) return role.filter(Boolean)
  if (typeof role === 'string' && role) return [role]
  return []
}

function hasAdminRole(user = {}) {
  const roles = normalizeRoles(user.role || user.roles)
  return roles.some(role => ADMIN_ROLES.includes(role)) || user.mobile === DEMO_ADMIN_MOBILE || user.username === DEMO_ADMIN_MOBILE
}

function pickSummary(value = {}) {
  const summary = {}
  const keys = [
    '_id', 'name', 'title', 'status', 'stock', 'price', 'amount', 'threshold',
    'order_no', 'aftersale_no', 'tracking_no', 'logistics_company', 'admin_remark'
  ]
  for (const key of keys) {
    if (value[key] !== undefined) summary[key] = value[key]
  }
  return summary
}

async function writeOperationLog(auth = {}, action, target, targetId, beforeData = null, afterData = null, remark = '') {
  try {
    const user = auth.userInfo || {}
    await db.collection('operation_log').add({
      operator_id: auth.uid || '',
      operator_name: user.nickname || user.username || user.mobile || '运营人员',
      operator_mobile: user.mobile || '',
      action,
      target,
      target_id: targetId || '',
      before: beforeData ? pickSummary(beforeData) : null,
      after: afterData ? pickSummary(afterData) : null,
      remark: String(remark || '').slice(0, 160),
      create_date: Date.now()
    })
  } catch (error) {
    // 审计日志不能阻断主业务操作。
  }
}

function normalizeBoolFlag(value) {
  return value === true || value === 1 || value === '1'
}

function normalizeGoodsPayload(params = {}, partial = false) {
  const data = {}
  const stringKeys = ['name', 'subtitle', 'brand', 'category_id', 'sub_category_id', 'image', 'detail']
  for (const key of stringKeys) {
    if (params[key] !== undefined) data[key] = String(params[key] || '').trim()
  }
  if (Array.isArray(params.images)) data.images = params.images.filter(Boolean).slice(0, 8)
  const numberKeys = ['price', 'original_price', 'stock', 'sort', 'sales']
  for (const key of numberKeys) {
    if (params[key] !== undefined && params[key] !== '') data[key] = Number(params[key])
  }
  if (params.status !== undefined && params.status !== '') data.status = Number(params.status)
  if (params.is_recommend !== undefined) data.is_recommend = normalizeBoolFlag(params.is_recommend) ? 1 : 0
  if (params.is_new !== undefined) data.is_new = normalizeBoolFlag(params.is_new)
  if (params.is_hot !== undefined) data.is_hot = normalizeBoolFlag(params.is_hot)
  if (!partial) {
    if (!data.name) return { error: '请填写商品名称' }
    if (!Number.isFinite(data.price) || data.price < 0) return { error: '商品价格不正确' }
    if (!Number.isFinite(data.stock) || data.stock < 0) data.stock = 0
    if (![0, 1].includes(data.status)) data.status = 0
  }
  for (const key of ['price', 'original_price', 'stock', 'sort', 'sales']) {
    if (data[key] !== undefined && (!Number.isFinite(data[key]) || data[key] < 0)) {
      return { error: `${key} 不能小于 0` }
    }
  }
  data.update_date = Date.now()
  return { data }
}

function normalizeCouponPayload(params = {}, partial = false) {
  const data = {}
  for (const key of ['title', 'expire']) {
    if (params[key] !== undefined) data[key] = String(params[key] || '').trim()
  }
  for (const key of ['amount', 'threshold', 'sort', 'total_quantity', 'per_user_limit']) {
    if (params[key] !== undefined && params[key] !== '') data[key] = Number(params[key])
  }
  if (params.status !== undefined) data.status = params.status
  if (params.start_time !== undefined) data.start_time = params.start_time
  if (params.end_time !== undefined) data.end_time = params.end_time
  if (!partial) {
    if (!data.title) return { error: '请填写优惠券名称' }
    if (!Number.isFinite(data.amount) || data.amount <= 0) return { error: '优惠金额必须大于 0' }
    if (!Number.isFinite(data.threshold) || data.threshold < 0) data.threshold = 0
    if (!['available', 'expired'].includes(data.status)) data.status = 'available'
  }
  for (const key of ['amount', 'threshold', 'sort', 'total_quantity', 'per_user_limit']) {
    if (data[key] !== undefined && (!Number.isFinite(data[key]) || data[key] < 0)) {
      return { error: `${key} 不能小于 0` }
    }
  }
  data.update_date = Date.now()
  return { data }
}

async function count(collection, where = {}) {
  const res = await withDbRetry(() => db.collection(collection).where(where).count())
  return res.total || 0
}

async function safeCount(collection) {
  try {
    const total = await count(collection)
    return { ok: true, count: total }
  } catch (error) {
    return { ok: false, count: 0, msg: error.message || '读取失败' }
  }
}

async function findDemoAccount() {
  try {
    const usernameRes = await db.collection('uni-id-users').where({ username: DEMO_ADMIN_MOBILE }).limit(1).get()
    const user = usernameRes.data?.[0]
    if (user) return formatDemoAccount(user)

    const mobileRes = await db.collection('uni-id-users').where({ mobile: DEMO_ADMIN_MOBILE }).limit(1).get()
    const mobileUser = mobileRes.data?.[0]
    return mobileUser ? formatDemoAccount(mobileUser) : { exists: false, username: DEMO_ADMIN_MOBILE, isAdmin: false }
  } catch (error) {
    return { exists: false, username: DEMO_ADMIN_MOBILE, isAdmin: false, msg: error.message || '账号检查失败' }
  }
}

function formatDemoAccount(user = {}) {
  const roles = normalizeRoles(user.role || user.roles)
  return {
    exists: true,
    uid: user._id,
    username: user.username || '',
    mobile: user.mobile || '',
    nickname: user.nickname || '',
    hasPassword: Boolean(user.password_hash && user.password_salt),
    status: user.status,
    accountStatus: user.account_status || 'active',
    cancelRequested: Boolean(user.account_cancel_request?.requested),
    role: roles,
    isAdmin: hasAdminRole(user)
  }
}

async function checkOptionalAuth(event, context) {
  const token = getUniIdToken(event)
  if (!token) return { ok: false, status: 'guest', msg: '未登录' }
  try {
    const uniIDIns = uniID.createInstance({ context })
    const tokenResult = await withDbRetry(() => uniIDIns.checkToken(token))
    if (tokenResult.code !== 0) {
      return {
        ok: false,
        status: 'invalid',
        code: tokenResult.code,
        errCode: tokenResult.errCode || 'TOKEN_INVALID',
        msg: tokenResult.msg || '登录状态无效'
      }
    }

    const user = tokenResult.userInfo || {}
    return {
      ok: true,
      status: 'authenticated',
      uid: tokenResult.uid,
      tokenExpired: tokenResult.tokenExpired || 0,
      role: normalizeRoles(user.role || user.roles),
      isAdmin: hasAdminRole(user),
      msg: hasAdminRole(user) ? '已登录，具备运营权限' : '已登录，但没有运营权限'
    }
  } catch (error) {
    return {
      ok: false,
      status: 'cloud_busy',
      code: 503,
      errCode: 'AUTH_CHECK_BUSY',
      msg: isTransientDbError(error) ? '账号校验暂时繁忙，请稍后重试' : (error.message || '账号校验失败')
    }
  }
}

const runtimeInfo = (diagnosticMode, viewerIsAdmin = false) => ({
  cloudFunction: 'admin-center',
  provider: 'aliyun',
  mode: 'demo',
  version: '0.9.1',
  diagnosticMode,
  // token 密钥模式属敏感信息,仅对管理员暴露
  ...(viewerIsAdmin ? { authSecret: uniID.USING_DEMO_TOKEN_SECRET ? 'demo-secret' : 'env-secret' } : {})
})

// 非管理员只看到集合连通性,不暴露具体文档数量
const redactCollections = (collections = {}) => {
  const out = {}
  for (const key of Object.keys(collections)) {
    out[key] = { ok: Boolean(collections[key]?.ok), restricted: true }
  }
  return out
}

// 非管理员不暴露体验账号明细
const publicDemoAccount = () => ({ restricted: true, isAdmin: false })

const complianceStatus = () => COMPLIANCE_PAGES.map(item => ({
  ...item,
  ok: true,
  status: '已配置'
}))

const functionStatus = (fallback = false) => CORE_FUNCTIONS.map(name => ({
  name,
  ok: name === 'admin-center',
  status: name === 'admin-center'
    ? (fallback ? '当前函数已返回兜底诊断' : '当前函数可访问')
    : '需通过上传记录或页面流程确认'
}))

async function buildHealthCheck(event, context, options = {}) {
  const deep = Boolean(options.deep)
  const diagnosticMode = deep ? 'deep' : 'light'
  try {
    const collections = {}
    const collectionList = deep ? CORE_COLLECTIONS : LIGHT_COLLECTIONS
    for (const collection of collectionList) {
      collections[collection] = await safeCount(collection)
      await sleep(deep ? 60 : 20)
    }

    const auth = await checkOptionalAuth(event, context)
    const viewerIsAdmin = Boolean(auth && auth.isAdmin)

    return ok({
      checked_at: Date.now(),
      source: 'cloud',
      runtime: runtimeInfo(diagnosticMode, viewerIsAdmin),
      auth,
      demoAccount: viewerIsAdmin ? await findDemoAccount() : publicDemoAccount(),
      collections: viewerIsAdmin ? collections : redactCollections(collections),
      compliance: complianceStatus(),
      recentErrors: [],
      cloudFunctions: functionStatus(false),
      releaseChecks: RELEASE_CHECKS
    }, deep ? '深度诊断完成' : '轻量诊断完成')
  } catch (error) {
    return ok({
      checked_at: Date.now(),
      source: 'cloud-partial',
      runtime: runtimeInfo(diagnosticMode),
      auth: {
        ok: false,
        status: 'cloud_busy',
        errCode: 'HEALTH_CHECK_BUSY',
        msg: isTransientDbError(error) ? '云数据库资源暂时繁忙，请稍后重试' : (error.message || '诊断部分失败')
      },
      demoAccount: { exists: false, username: DEMO_ADMIN_MOBILE, isAdmin: false, msg: '本次诊断未完成账号检查' },
      collections: {},
      compliance: complianceStatus(),
      recentErrors: [{
        id: `health-${Date.now()}`,
        time: Date.now(),
        cloudFunction: 'admin-center',
        action: deep ? 'getDeepHealthCheck' : 'getHealthCheck',
        category: isTransientDbError(error) ? 'resource_busy' : 'server',
        code: 503,
        msg: isTransientDbError(error) ? '云数据库资源暂时繁忙，请稍后重试' : (error.message || '诊断部分失败')
      }],
      cloudFunctions: functionStatus(true),
      releaseChecks: RELEASE_CHECKS
    }, deep ? '深度诊断部分完成' : '轻量诊断部分完成')
  }
}

async function getHealthCheck(event, context) {
  return buildHealthCheck(event, context, { deep: false })
}

async function getDeepHealthCheck(event, context) {
  return buildHealthCheck(event, context, { deep: true })
}

async function getDashboard() {
  const [
    goodsCount,
    orderCount,
    pendingPay,
    pendingShip,
    pendingReceive,
    pendingReview,
    refunding,
    completed,
    afterSalePending,
    afterSaleApproved,
    afterSaleCompleted,
    couponAvailable,
    messageTotal,
    unreadMessage,
    userCount
  ] = await Promise.all([
    count('goods', { status: 1 }),
    count('order'),
    count('order', { status: ORDER_STATUS.pendingPay }),
    count('order', { status: ORDER_STATUS.pendingShip }),
    count('order', { status: ORDER_STATUS.pendingReceive }),
    count('order', { status: ORDER_STATUS.pendingReview }),
    count('order', { status: ORDER_STATUS.refunding }),
    count('order', { status: ORDER_STATUS.completed }),
    count('after_sale', { status: AFTER_SALE_STATUS.pending }),
    count('after_sale', { status: AFTER_SALE_STATUS.approved }),
    count('after_sale', { status: AFTER_SALE_STATUS.completed }),
    count('coupon', { status: 'available' }),
    count('message'),
    count('message', { is_read: false }),
    count('uni-id-users')
  ])

  return ok({
    stats: {
      goods: goodsCount,
      orders: orderCount,
      users: userCount,
      afterSaleTodo: afterSalePending + afterSaleApproved,
      couponAvailable,
      messageTotal,
      unreadMessage
    },
    orderStatus: {
      pendingPay,
      pendingShip,
      pendingReceive,
      pendingReview,
      refunding,
      completed
    },
    afterSaleStatus: {
      pending: afterSalePending,
      approved: afterSaleApproved,
      completed: afterSaleCompleted
    }
  })
}

const REPORT_LOW_STOCK_THRESHOLD = 10
const REPORT_ORDER_LIMIT = 500
const REPORT_COLLECTION_STATUS = {
  ok: 'ok',
  warning: 'warning',
  action: 'action',
  blocked: 'blocked'
}

const toNumber = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

const roundMoney = (value) => Math.round(toNumber(value) * 100) / 100

const percent = (part, total) => {
  if (!total) return 0
  return Math.round((part / total) * 1000) / 10
}

const readCreateDate = (item = {}) => toNumber(item.create_date || item.createTime || item.create_time || 0)

const getOrderAmount = (order = {}) =>
  roundMoney(order.pay_amount ?? order.amount ?? order.total_amount ?? order.actual_amount ?? 0)

const isPaidOrder = (order = {}) =>
  [
    ORDER_STATUS.pendingShip,
    ORDER_STATUS.pendingReceive,
    ORDER_STATUS.pendingReview,
    ORDER_STATUS.completed,
    ORDER_STATUS.refunding
  ].includes(Number(order.status))

const formatReportDay = (timestamp) => {
  const date = new Date(timestamp)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}/${day}`
}

async function safeList(collection, options = {}) {
  const { where = null, orderField = 'create_date', orderType = 'desc', limit = 200 } = options
  try {
    const res = await withDbRetry(() => {
      let query = db.collection(collection)
      if (where) query = query.where(where)
      if (orderField) query = query.orderBy(orderField, orderType)
      return query.limit(limit).get()
    })
    return { ok: true, list: res.data || [] }
  } catch (error) {
    return { ok: false, list: [], msg: error.message || `${collection} 读取失败` }
  }
}

function groupBy(list = [], getKey) {
  return list.reduce((map, item) => {
    const key = getKey(item)
    if (!key) return map
    if (!map[key]) map[key] = []
    map[key].push(item)
    return map
  }, {})
}

function buildOrderTrend(orders = [], days = 7) {
  const oneDay = 24 * 60 * 60 * 1000
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const rows = Array.from({ length: days }).map((_, index) => {
    const timestamp = startOfToday.getTime() - (days - 1 - index) * oneDay
    return {
      key: formatReportDay(timestamp),
      label: formatReportDay(timestamp),
      count: 0,
      amount: 0
    }
  })
  const rowMap = rows.reduce((map, item) => {
    map[item.key] = item
    return map
  }, {})
  orders.forEach(order => {
    if (!isPaidOrder(order)) return
    const dayKey = formatReportDay(readCreateDate(order) || Date.now())
    if (!rowMap[dayKey]) return
    rowMap[dayKey].count += 1
    rowMap[dayKey].amount = roundMoney(rowMap[dayKey].amount + getOrderAmount(order))
  })
  return rows
}

function getOrderGoodsList(order = {}) {
  const list = order.goods_list || order.goodsList || order.items || []
  return Array.isArray(list) ? list : []
}

function buildTopGoods(orders = []) {
  const map = {}
  orders.filter(isPaidOrder).forEach(order => {
    getOrderGoodsList(order).forEach(item => {
      const goodsId = item.goods_id || item.goodsId || item._id || item.id || item.goods_name || item.name
      if (!goodsId) return
      if (!map[goodsId]) {
        map[goodsId] = {
          goods_id: goodsId,
          name: item.goods_name || item.name || item.title || '未命名商品',
          quantity: 0,
          amount: 0
        }
      }
      const quantity = toNumber(item.quantity || item.num || item.count, 1)
      const price = toNumber(item.price || item.pay_price || item.amount, 0)
      map[goodsId].quantity += quantity
      map[goodsId].amount = roundMoney(map[goodsId].amount + price * quantity)
    })
  })
  return Object.values(map)
    .sort((a, b) => b.amount - a.amount || b.quantity - a.quantity)
    .slice(0, 5)
}

function buildInventoryRisks(goodsList = [], skuList = [], threshold = REPORT_LOW_STOCK_THRESHOLD) {
  const skuGroups = groupBy(skuList, item => item.goods_id)
  const risks = []
  goodsList
    .filter(item => Number(item.status) === 1)
    .forEach(goods => {
      const rows = skuGroups[goods._id] || []
      const stock = rows.length
        ? rows.reduce((sum, item) => sum + toNumber(item.stock), 0)
        : toNumber(goods.stock)
      if (!rows.length) {
        risks.push({
          key: `${goods._id}-no-sku`,
          level: 'warning',
          title: goods.name || '未命名商品',
          desc: '缺少 SKU，买家端规格和库存校验不完整',
          value: '待补 SKU'
        })
      }
      if (stock <= threshold) {
        risks.push({
          key: `${goods._id}-low-stock`,
          level: stock <= 0 ? 'blocked' : 'warning',
          title: goods.name || '未命名商品',
          desc: stock <= 0 ? '库存为 0，建议下架或补货' : `库存低于 ${threshold}，建议补货`,
          value: `${stock} 件`
        })
      }
    })

  skuList
    .filter(item => Number(item.status ?? 1) === 1 && toNumber(item.stock) <= threshold)
    .slice(0, 8)
    .forEach(item => {
      risks.push({
        key: item._id || `${item.goods_id}-${item.spec_values}`,
        level: toNumber(item.stock) <= 0 ? 'blocked' : 'warning',
        title: item.spec_values || 'SKU 规格',
        desc: '单 SKU 库存偏低',
        value: `${toNumber(item.stock)} 件`
      })
    })

  return risks.slice(0, 10)
}

function buildReleaseReadiness(source = {}) {
  const {
    goodsList = [],
    skuList = [],
    orders = [],
    paidOrders = [],
    afterSaleList = [],
    coupons = [],
    userCoupons = [],
    operationLogs = [],
    collectionErrors = []
  } = source
  const pendingShip = orders.filter(item => Number(item.status) === ORDER_STATUS.pendingShip).length
  const pendingAfterSale = afterSaleList.filter(item => Number(item.status) === AFTER_SALE_STATUS.pending).length
  const lowStockCount = buildInventoryRisks(goodsList, skuList).length
  const usedCouponCount = userCoupons.filter(item => item.status === 'used').length

  return [
    {
      key: 'cloud-collections',
      label: '核心集合读取',
      status: collectionErrors.length ? REPORT_COLLECTION_STATUS.blocked : REPORT_COLLECTION_STATUS.ok,
      value: collectionErrors.length ? `${collectionErrors.length} 项异常` : '正常',
      desc: collectionErrors.length ? collectionErrors.join('、') : '商品、订单、售后、券和日志可读取'
    },
    {
      key: 'goods-sku',
      label: '商品与 SKU',
      status: goodsList.length && skuList.length ? REPORT_COLLECTION_STATUS.ok : REPORT_COLLECTION_STATUS.warning,
      value: `${goodsList.length}/${skuList.length}`,
      desc: '商品数 / SKU 数'
    },
    {
      key: 'order-flow',
      label: '交易闭环',
      status: paidOrders.length ? REPORT_COLLECTION_STATUS.ok : REPORT_COLLECTION_STATUS.warning,
      value: `${paidOrders.length} 单`,
      desc: paidOrders.length ? '已有支付后订单可回归' : '建议先完成一次下单支付'
    },
    {
      key: 'ship-todo',
      label: '待发货治理',
      status: pendingShip ? REPORT_COLLECTION_STATUS.action : REPORT_COLLECTION_STATUS.ok,
      value: `${pendingShip} 单`,
      desc: pendingShip ? '运营端需处理发货或物流' : '暂无发货积压'
    },
    {
      key: 'after-sale',
      label: '售后审核',
      status: pendingAfterSale ? REPORT_COLLECTION_STATUS.action : REPORT_COLLECTION_STATUS.ok,
      value: `${pendingAfterSale} 单`,
      desc: pendingAfterSale ? '有待审核售后申请' : '暂无待审核售后'
    },
    {
      key: 'inventory',
      label: '库存风险',
      status: lowStockCount ? REPORT_COLLECTION_STATUS.warning : REPORT_COLLECTION_STATUS.ok,
      value: `${lowStockCount} 项`,
      desc: lowStockCount ? '存在低库存或缺 SKU 项' : '库存风险暂未触发'
    },
    {
      key: 'coupon',
      label: '优惠券投放',
      status: coupons.length ? REPORT_COLLECTION_STATUS.ok : REPORT_COLLECTION_STATUS.warning,
      value: `${usedCouponCount}/${userCoupons.length}`,
      desc: '已使用 / 已领取'
    },
    {
      key: 'operation-log',
      label: '操作审计',
      status: operationLogs.length ? REPORT_COLLECTION_STATUS.ok : REPORT_COLLECTION_STATUS.warning,
      value: `${operationLogs.length} 条`,
      desc: operationLogs.length ? '运营动作已有记录' : '完成运营操作后会自动记录'
    }
  ]
}

async function getOpsReport(params = {}) {
  const days = Math.min(Math.max(Number(params.days || 7), 3), 14)
  const ordersResult = await safeList('order', { limit: REPORT_ORDER_LIMIT })
  await sleep(60)
  const afterSaleResult = await safeList('after_sale', { limit: 300 })
  await sleep(60)
  const goodsResult = await safeList('goods', { orderField: 'sort', orderType: 'asc', limit: 500 })
  await sleep(60)
  const skuResult = await safeList('goods_sku', { orderField: null, limit: 1000 })
  await sleep(60)
  const couponResult = await safeList('coupon', { orderField: 'sort', orderType: 'asc', limit: 200 })
  await sleep(60)
  const userCouponResult = await safeList('user_coupon', { limit: 500 })
  await sleep(60)
  const messageResult = await safeList('message', { limit: 300 })
  await sleep(60)
  const operationLogResult = await safeList('operation_log', { limit: 100 })

  const results = {
    order: ordersResult,
    after_sale: afterSaleResult,
    goods: goodsResult,
    goods_sku: skuResult,
    coupon: couponResult,
    user_coupon: userCouponResult,
    message: messageResult,
    operation_log: operationLogResult
  }
  const collectionErrors = Object.keys(results)
    .filter(key => !results[key].ok)
    .map(key => key)

  const orders = ordersResult.list
  const paidOrders = orders.filter(isPaidOrder)
  const revenue = paidOrders.reduce((sum, item) => sum + getOrderAmount(item), 0)
  const usedCouponCount = userCouponResult.list.filter(item => item.status === 'used').length
  const pendingAfterSale = afterSaleResult.list.filter(item => Number(item.status) === AFTER_SALE_STATUS.pending).length
  const activeGoods = goodsResult.list.filter(item => Number(item.status) === 1)
  const inventoryRisks = buildInventoryRisks(goodsResult.list, skuResult.list)

  return ok({
    checked_at: Date.now(),
    windowDays: days,
    summary: {
      revenue: roundMoney(revenue),
      orderCount: orders.length,
      paidOrderCount: paidOrders.length,
      avgOrderAmount: paidOrders.length ? roundMoney(revenue / paidOrders.length) : 0,
      goodsCount: activeGoods.length,
      skuCount: skuResult.list.length,
      couponUseRate: percent(usedCouponCount, userCouponResult.list.length),
      afterSaleRate: percent(afterSaleResult.list.length, paidOrders.length),
      pendingShipCount: orders.filter(item => Number(item.status) === ORDER_STATUS.pendingShip).length,
      pendingAfterSaleCount: pendingAfterSale,
      inventoryRiskCount: inventoryRisks.length,
      messageCount: messageResult.list.length
    },
    orderTrend: buildOrderTrend(orders, days),
    topGoods: buildTopGoods(orders),
    inventoryRisks,
    couponStats: {
      couponCount: couponResult.list.length,
      issued: userCouponResult.list.length,
      available: userCouponResult.list.filter(item => item.status === 'available').length,
      used: usedCouponCount,
      expired: userCouponResult.list.filter(item => item.status === 'expired').length
    },
    serviceRisks: [
      {
        key: 'pending-after-sale',
        label: '售后待审核',
        value: pendingAfterSale,
        status: pendingAfterSale ? 'action' : 'ok'
      },
      {
        key: 'pending-ship',
        label: '订单待发货',
        value: orders.filter(item => Number(item.status) === ORDER_STATUS.pendingShip).length,
        status: orders.some(item => Number(item.status) === ORDER_STATUS.pendingShip) ? 'action' : 'ok'
      },
      {
        key: 'pending-pay',
        label: '待付款订单',
        value: orders.filter(item => Number(item.status) === ORDER_STATUS.pendingPay).length,
        status: 'manual'
      }
    ],
    releaseReadiness: buildReleaseReadiness({
      goodsList: goodsResult.list,
      skuList: skuResult.list,
      orders,
      paidOrders,
      afterSaleList: afterSaleResult.list,
      coupons: couponResult.list,
      userCoupons: userCouponResult.list,
      operationLogs: operationLogResult.list,
      collectionErrors
    }),
    recentLogs: operationLogResult.list.slice(0, 5),
    collectionStatus: Object.keys(results).map(key => ({
      key,
      ok: results[key].ok,
      count: results[key].list.length,
      msg: results[key].msg || ''
    }))
  }, '运营报表已生成')
}

async function getGoodsList(params = {}) {
  const where = {}
  if (params.status !== undefined && params.status !== '' && params.status !== 'all') {
    where.status = Number(params.status)
  }
  if (params.keyword) {
    const page = Number(params.page || 1)
    const pageSize = Number(params.pageSize || 20)
    const keyword = String(params.keyword).toLowerCase()
    const res = await db.collection('goods').where(where).orderBy('sort', 'asc').limit(1000).get()
    const list = (res.data || []).filter(item =>
      `${item.name || ''}${item.subtitle || ''}${item.brand || ''}`.toLowerCase().includes(keyword)
    )
    return ok(await attachSkuList({
      list: list.slice((page - 1) * pageSize, page * pageSize),
      total: list.length,
      page,
      pageSize,
      hasMore: page * pageSize < list.length
    }))
  }
  return ok(await attachSkuList(await pageQuery('goods', where, params, 'sort', 'asc')))
}

async function attachSkuList(pageData = {}) {
  const list = Array.isArray(pageData.list) ? pageData.list : []
  const goodsIds = list.map(item => item._id).filter(Boolean)
  if (!goodsIds.length) return pageData
  const skuRes = await db.collection('goods_sku')
    .where({ goods_id: _.in(goodsIds) })
    .get()
  const groups = {}
  const skuRows = (skuRes.data || []).sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0))
  for (const item of skuRows) {
    if (!groups[item.goods_id]) groups[item.goods_id] = []
    groups[item.goods_id].push(item)
  }
  return {
    ...pageData,
    list: list.map(item => ({
      ...item,
      sku_list: groups[item._id] || [],
      sku_count: (groups[item._id] || []).length
    }))
  }
}

async function createGoods(auth, params = {}) {
  const normalized = normalizeGoodsPayload(params)
  if (normalized.error) return fail(normalized.error)
  const now = Date.now()
  const payload = {
    ...normalized.data,
    sales: normalized.data.sales || 0,
    images: normalized.data.images || (normalized.data.image ? [normalized.data.image] : []),
    create_date: now,
    update_date: now
  }
  const res = await db.collection('goods').add(payload)
  const goods = { _id: res.id, ...payload }
  await writeOperationLog(auth, 'createGoods', 'goods', res.id, null, goods, '创建商品')
  return ok({ goods_id: res.id, goods }, '商品已创建')
}

async function updateGoods(auth, params = {}) {
  const goodsId = params.goods_id || params.goodsId || params._id
  if (!goodsId) return fail('缺少商品 ID')
  const currentRes = await db.collection('goods').doc(goodsId).get()
  const current = currentRes.data?.[0]
  if (!current) return fail('商品不存在', 404)

  const normalized = normalizeGoodsPayload(params, true)
  if (normalized.error) return fail(normalized.error)
  const update = normalized.data
  delete update._id
  delete update.goods_id
  delete update.goodsId
  await db.collection('goods').doc(goodsId).update(update)
  const next = { ...current, ...update }
  await writeOperationLog(auth, 'updateGoods', 'goods', goodsId, current, next, '编辑商品')
  return ok({ goods_id: goodsId, goods: next }, '商品已保存')
}

async function deleteGoodsDraft(auth, params = {}) {
  const goodsId = params.goods_id || params.goodsId || params._id
  if (!goodsId) return fail('缺少商品 ID')
  const currentRes = await db.collection('goods').doc(goodsId).get()
  const current = currentRes.data?.[0]
  if (!current) return fail('商品不存在', 404)
  if (Number(current.status) !== 0 || Number(current.sales || 0) > 0) {
    return fail('只能删除未销售的下架草稿商品')
  }
  await db.collection('goods_sku').where({ goods_id: goodsId }).remove()
  await db.collection('goods').doc(goodsId).remove()
  await writeOperationLog(auth, 'deleteGoodsDraft', 'goods', goodsId, current, null, '删除商品草稿')
  return ok({}, '商品草稿已删除')
}

async function updateSkuList(auth, params = {}) {
  const goodsId = params.goods_id || params.goodsId
  const skuList = Array.isArray(params.sku_list || params.skuList) ? (params.sku_list || params.skuList) : []
  if (!goodsId) return fail('缺少商品 ID')
  const goodsRes = await db.collection('goods').doc(goodsId).get()
  const goods = goodsRes.data?.[0]
  if (!goods) return fail('商品不存在', 404)

  const now = Date.now()
  const nextSkuList = []
  for (const item of skuList.slice(0, 20)) {
    const price = Number(item.price)
    const stock = Number(item.stock)
    const status = item.status === undefined ? 1 : Number(item.status)
    if (!item.spec_values && !item.specValues) return fail('请填写 SKU 规格')
    if (!Number.isFinite(price) || price < 0) return fail('SKU 价格不正确')
    if (!Number.isFinite(stock) || stock < 0) return fail('SKU 库存不正确')
    if (![0, 1].includes(status)) return fail('SKU 状态不正确')
    nextSkuList.push({
      _id: item._id || item.id || '',
      goods_id: goodsId,
      spec_values: String(item.spec_values || item.specValues).trim(),
      price,
      stock,
      image: item.image || '',
      status,
      sort: Number(item.sort || 0),
      create_date: now,
      update_date: now
    })
  }

  const beforeRes = await db.collection('goods_sku').where({ goods_id: goodsId }).get()
  const beforeRows = beforeRes.data || []
  const beforeMap = beforeRows.reduce((map, item) => {
    if (item._id) map[item._id] = item
    return map
  }, {})
  const keptIds = []
  const savedSkuList = []

  for (const sku of nextSkuList) {
    const skuId = sku._id && beforeMap[sku._id]?.goods_id === goodsId ? sku._id : ''
    const payload = { ...sku }
    delete payload._id

    if (skuId) {
      delete payload.create_date
      await db.collection('goods_sku').doc(skuId).update(payload)
      keptIds.push(skuId)
      savedSkuList.push({ _id: skuId, ...beforeMap[skuId], ...payload })
    } else {
      const addRes = await db.collection('goods_sku').add({
        ...payload,
        create_date: now
      })
      keptIds.push(addRes.id)
      savedSkuList.push({ _id: addRes.id, ...payload, create_date: now })
    }
  }

  const removedIds = beforeRows
    .map(item => item._id)
    .filter(id => id && !keptIds.includes(id))
  for (const id of removedIds) {
    await db.collection('goods_sku').doc(id).remove()
  }

  const totalStock = savedSkuList.reduce((sum, item) => sum + Number(item.stock || 0), 0)
  await db.collection('goods').doc(goodsId).update({
    stock: totalStock,
    update_date: now
  })

  await writeOperationLog(
    auth,
    'updateSkuList',
    'goods',
    goodsId,
    { _id: goodsId, name: goods.name, stock: goods.stock, sku_count: beforeRes.data?.length || 0 },
    { _id: goodsId, name: goods.name, stock: totalStock, sku_count: savedSkuList.length },
    '编辑 SKU'
  )
  return ok({ list: savedSkuList, total: savedSkuList.length }, 'SKU 已保存')
}

async function updateGoodsStatus(auth, params = {}) {
  const goodsId = params.goods_id || params.goodsId
  const status = Number(params.status)
  if (!goodsId) return fail('缺少商品 ID')
  if (![0, 1].includes(status)) return fail('商品状态不正确')

  const res = await db.collection('goods').doc(goodsId).get()
  const goods = res.data?.[0]
  if (!goods) return fail('商品不存在', 404)

  await db.collection('goods').doc(goodsId).update({
    status,
    update_date: Date.now()
  })
  await writeOperationLog(auth, 'updateGoodsStatus', 'goods', goodsId, goods, { ...goods, status }, status === 1 ? '商品上架' : '商品下架')
  return ok({}, status === 1 ? '商品已上架' : '商品已下架')
}

async function updateGoodsStock(auth, params = {}) {
  const goodsId = params.goods_id || params.goodsId
  const stock = Number(params.stock)
  if (!goodsId) return fail('缺少商品 ID')
  if (!Number.isFinite(stock) || stock < 0) return fail('库存必须大于等于 0')

  const res = await db.collection('goods').doc(goodsId).get()
  const goods = res.data?.[0]
  if (!goods) return fail('商品不存在', 404)

  const now = Date.now()
  await db.collection('goods').doc(goodsId).update({
    stock,
    update_date: now
  })

  const skuRes = await db.collection('goods_sku').where({ goods_id: goodsId }).get()
  const skuList = skuRes.data || []
  if (skuList.length === 1) {
    await db.collection('goods_sku').doc(skuList[0]._id).update({ stock, update_date: now })
  }

  await writeOperationLog(auth, 'updateGoodsStock', 'goods', goodsId, goods, { ...goods, stock }, '调整库存')
  return ok({}, '库存已更新')
}

async function getCouponList(params = {}) {
  const where = {}
  if (params.status && params.status !== 'all') where.status = params.status
  return ok(await pageQuery('coupon', where, params, 'sort', 'asc'))
}

async function createCoupon(auth, params = {}) {
  const normalized = normalizeCouponPayload(params)
  if (normalized.error) return fail(normalized.error)
  const now = Date.now()
  const payload = {
    ...normalized.data,
    total_quantity: normalized.data.total_quantity || 0,
    per_user_limit: normalized.data.per_user_limit || 1,
    received_count: 0,
    used_count: 0,
    create_date: now,
    update_date: now
  }
  const res = await db.collection('coupon').add(payload)
  const coupon = { _id: res.id, ...payload }
  await writeOperationLog(auth, 'createCoupon', 'coupon', res.id, null, coupon, '创建优惠券')
  return ok({ coupon_id: res.id, coupon }, '优惠券已创建')
}

async function updateCoupon(auth, params = {}) {
  const couponId = params.coupon_id || params.couponId || params._id
  if (!couponId) return fail('缺少优惠券 ID')
  const currentRes = await db.collection('coupon').doc(couponId).get()
  const current = currentRes.data?.[0]
  if (!current) return fail('优惠券不存在', 404)
  const normalized = normalizeCouponPayload(params, true)
  if (normalized.error) return fail(normalized.error)
  const update = normalized.data
  delete update._id
  delete update.coupon_id
  delete update.couponId
  await db.collection('coupon').doc(couponId).update(update)
  const next = { ...current, ...update }
  await writeOperationLog(auth, 'updateCoupon', 'coupon', couponId, current, next, '编辑优惠券')
  return ok({ coupon_id: couponId, coupon: next }, '优惠券已保存')
}

async function getCouponStats(params = {}) {
  const couponId = params.coupon_id || params.couponId
  const where = couponId ? { coupon_id: couponId } : {}
  const [available, used, expired] = await Promise.all([
    count('user_coupon', { ...where, status: 'available' }),
    count('user_coupon', { ...where, status: 'used' }),
    count('user_coupon', { ...where, status: 'expired' })
  ])
  return ok({ available, used, expired, total: available + used + expired })
}

async function updateCouponStatus(auth, params = {}) {
  const couponId = params.coupon_id || params.couponId
  const status = params.status
  if (!couponId) return fail('缺少优惠券 ID')
  if (!['available', 'expired'].includes(status)) return fail('优惠券状态不正确')

  const res = await db.collection('coupon').doc(couponId).get()
  const coupon = res.data?.[0]
  if (!coupon) return fail('优惠券不存在', 404)
  await db.collection('coupon').doc(couponId).update({
    status,
    update_date: Date.now()
  })
  await writeOperationLog(auth, 'updateCouponStatus', 'coupon', couponId, coupon, { ...coupon, status }, status === 'available' ? '启用优惠券' : '停用优惠券')
  return ok({}, status === 'available' ? '优惠券已启用' : '优惠券已停用')
}

async function getMessageList(params = {}) {
  const where = {}
  if (params.type && params.type !== 'all') where.type = params.type
  if (params.user_id) where.user_id = params.user_id
  return ok(await pageQuery('message', where, params))
}

async function publishMessage(auth, params = {}) {
  const title = String(params.title || '').trim()
  const content = String(params.content || '').trim()
  const type = params.type || 'system'
  const status = params.status || 'published'
  const userId = params.user_id || params.userId || 'all'
  if (!title) return fail('请填写消息标题')
  if (!content) return fail('请填写消息内容')
  if (!['order', 'promo', 'system'].includes(type)) return fail('消息类型不正确')
  if (!['published', 'draft', 'archived'].includes(status)) return fail('消息状态不正确')

  const now = Date.now()
  const payload = {
    user_id: userId,
    type,
    title: title.slice(0, 40),
    content: content.slice(0, 180),
    link: params.link || '',
    status,
    is_read: false,
    read: false,
    create_date: now,
    update_date: now
  }
  const res = await db.collection('message').add(payload)
  await writeOperationLog(auth, 'publishMessage', 'message', res.id, null, { _id: res.id, title, status }, userId === 'all' ? '发布全体消息' : '发布定向消息')
  return ok({ message_id: res.id }, status === 'published' ? '消息已发布' : '消息已保存')
}

async function updateMessage(auth, params = {}) {
  const messageId = params.message_id || params.messageId || params._id
  if (!messageId) return fail('缺少消息 ID')
  const currentRes = await db.collection('message').doc(messageId).get()
  const current = currentRes.data?.[0]
  if (!current) return fail('消息不存在', 404)
  const update = {}
  for (const key of ['title', 'content', 'link', 'type', 'status', 'user_id']) {
    if (params[key] !== undefined) update[key] = String(params[key] || '').trim()
  }
  if (update.type && !['order', 'promo', 'system'].includes(update.type)) return fail('消息类型不正确')
  if (update.status && !['published', 'draft', 'archived'].includes(update.status)) return fail('消息状态不正确')
  if (update.title !== undefined && !update.title) return fail('请填写消息标题')
  if (update.content !== undefined && !update.content) return fail('请填写消息内容')
  if (update.title !== undefined) update.title = update.title.slice(0, 40)
  if (update.content !== undefined) update.content = update.content.slice(0, 180)
  update.update_date = Date.now()
  await db.collection('message').doc(messageId).update(update)
  const next = { ...current, ...update }
  await writeOperationLog(auth, 'updateMessage', 'message', messageId, current, next, '编辑消息')
  return ok({ message_id: messageId, message: next }, '消息已保存')
}

async function getMessageStats(params = {}) {
  const where = params.user_id ? { user_id: params.user_id } : {}
  const [total, unread, system, promo, order] = await Promise.all([
    count('message', where),
    count('message', { ...where, is_read: false }),
    count('message', { ...where, type: 'system' }),
    count('message', { ...where, type: 'promo' }),
    count('message', { ...where, type: 'order' })
  ])
  return ok({ total, unread, system, promo, order })
}

async function getOrderList(params = {}) {
  const where = {}
  if (params.status !== undefined && params.status !== '' && params.status !== 'all') {
    where.status = Number(params.status)
  }
  return ok(await pageQuery('order', where, params))
}

async function shipOrder(auth, params = {}) {
  const orderId = params.order_id || params.orderId
  if (!orderId) return fail('缺少订单 ID')

  const res = await db.collection('order').doc(orderId).get()
  const order = res.data?.[0]
  if (!order) return fail('订单不存在', 404)
  if (order.status !== ORDER_STATUS.pendingShip) return fail('只有待发货订单可以发货')

  const update = {
    status: ORDER_STATUS.pendingReceive,
    logistics_company: params.company || '薪超优选配送',
    tracking_no: params.tracking_no || `XCEXP${Date.now()}`,
    ship_time: Date.now(),
    update_date: Date.now()
  }
  await db.collection('order').doc(orderId).update(update)
  await writeOperationLog(auth, 'shipOrder', 'order', orderId, order, { ...order, ...update }, '订单发货')

  return ok({}, '已发货')
}

async function updateShipment(auth, params = {}) {
  const orderId = params.order_id || params.orderId
  if (!orderId) return fail('缺少订单 ID')
  const res = await db.collection('order').doc(orderId).get()
  const order = res.data?.[0]
  if (!order) return fail('订单不存在', 404)
  if (![ORDER_STATUS.pendingShip, ORDER_STATUS.pendingReceive].includes(order.status)) {
    return fail('只有待发货或待收货订单可以编辑物流')
  }
  const now = Date.now()
  const update = {
    status: ORDER_STATUS.pendingReceive,
    logistics_company: params.company || params.logistics_company || order.logistics_company || '薪超优选配送',
    tracking_no: params.tracking_no || params.trackingNo || order.tracking_no || `XCEXP${now}`,
    ship_time: order.ship_time || now,
    update_date: now
  }
  await db.collection('order').doc(orderId).update(update)
  await writeOperationLog(auth, 'updateShipment', 'order', orderId, order, { ...order, ...update }, '编辑物流')
  return ok({}, '物流信息已保存')
}

async function addOrderRemark(auth, params = {}) {
  const orderId = params.order_id || params.orderId
  const remark = String(params.remark || '').trim()
  if (!orderId) return fail('缺少订单 ID')
  if (!remark) return fail('请填写备注')
  const res = await db.collection('order').doc(orderId).get()
  const order = res.data?.[0]
  if (!order) return fail('订单不存在', 404)
  const now = Date.now()
  const item = {
    operator_id: auth.uid,
    operator_name: auth.userInfo?.nickname || auth.userInfo?.mobile || '运营人员',
    remark: remark.slice(0, 160),
    create_date: now
  }
  const history = Array.isArray(order.admin_remarks) ? order.admin_remarks : []
  await db.collection('order').doc(orderId).update({
    admin_remark: item.remark,
    admin_remarks: [...history, item].slice(-20),
    update_date: now
  })
  await writeOperationLog(auth, 'addOrderRemark', 'order', orderId, order, { ...order, admin_remark: item.remark }, item.remark)
  return ok({ remark: item }, '备注已添加')
}

async function getAfterSaleList(params = {}) {
  const where = {}
  if (params.status !== undefined && params.status !== '' && params.status !== 'all') {
    where.status = Number(params.status)
  }
  return ok(await pageQuery('after_sale', where, params))
}

// 售后被拒绝时,把订单恢复到"申请售后前"的状态,而非一律置为已完成
function restoreOrderStatus(prev) {
  const allowed = [
    ORDER_STATUS.pendingShip, ORDER_STATUS.pendingReceive,
    ORDER_STATUS.pendingReview, ORDER_STATUS.completed
  ]
  const value = Number(prev)
  return allowed.includes(value) ? value : ORDER_STATUS.completed
}

async function auditAfterSale(auth, params = {}) {
  const afterSaleId = params.after_sale_id || params.afterSaleId
  if (!afterSaleId) return fail('缺少售后 ID')

  const res = await db.collection('after_sale').doc(afterSaleId).get()
  const afterSale = res.data?.[0]
  if (!afterSale) return fail('售后记录不存在', 404)
  if (afterSale.status !== AFTER_SALE_STATUS.pending) return fail('只有待审核售后可以审核')

  const approved = params.result !== 'reject'
  const now = Date.now()
  await db.collection('after_sale').doc(afterSaleId).update({
    status: approved ? AFTER_SALE_STATUS.approved : AFTER_SALE_STATUS.rejected,
    audit_result: approved ? 'approved' : 'rejected',
    audit_remark: params.remark || (approved ? '运营审核通过' : '运营审核拒绝'),
    audit_time: now,
    update_date: now
  })

  if (!approved && afterSale.order_id) {
    await db.collection('order').doc(afterSale.order_id).update({
      status: restoreOrderStatus(afterSale.prev_order_status),
      aftersale_reject_time: now,
      update_date: now
    })
  }

  await writeOperationLog(auth, 'auditAfterSale', 'after_sale', afterSaleId, afterSale, { ...afterSale, status: approved ? AFTER_SALE_STATUS.approved : AFTER_SALE_STATUS.rejected }, approved ? '同意售后' : '拒绝售后')
  return ok({}, approved ? '已同意售后申请' : '已拒绝售后申请')
}

async function completeAfterSale(auth, params = {}) {
  const afterSaleId = params.after_sale_id || params.afterSaleId
  if (!afterSaleId) return fail('缺少售后 ID')

  const res = await db.collection('after_sale').doc(afterSaleId).get()
  const afterSale = res.data?.[0]
  if (!afterSale) return fail('售后记录不存在', 404)
  if (![AFTER_SALE_STATUS.approved, AFTER_SALE_STATUS.returning].includes(afterSale.status)) {
    return fail('只有已同意或退货中的售后可以完成')
  }

  const now = Date.now()
  await db.collection('after_sale').doc(afterSaleId).update({
    status: AFTER_SALE_STATUS.completed,
    refund_no: params.refund_no || `RF${now}`,
    complete_time: now,
    update_date: now
  })

  if (afterSale.order_id) {
    await db.collection('order').doc(afterSale.order_id).update({
      status: ORDER_STATUS.completed,
      refund_time: now,
      update_date: now
    })
  }

  await writeOperationLog(auth, 'completeAfterSale', 'after_sale', afterSaleId, afterSale, { ...afterSale, status: AFTER_SALE_STATUS.completed }, '完成退款')
  return ok({}, '退款已完成')
}

async function addAfterSaleRemark(auth, params = {}) {
  const afterSaleId = params.after_sale_id || params.afterSaleId
  const remark = String(params.remark || '').trim()
  if (!afterSaleId) return fail('缺少售后 ID')
  if (!remark) return fail('请填写备注')
  const res = await db.collection('after_sale').doc(afterSaleId).get()
  const afterSale = res.data?.[0]
  if (!afterSale) return fail('售后记录不存在', 404)
  const now = Date.now()
  const item = {
    operator_id: auth.uid,
    operator_name: auth.userInfo?.nickname || auth.userInfo?.mobile || '运营人员',
    remark: remark.slice(0, 160),
    create_date: now
  }
  const history = Array.isArray(afterSale.admin_remarks) ? afterSale.admin_remarks : []
  await db.collection('after_sale').doc(afterSaleId).update({
    admin_remark: item.remark,
    admin_remarks: [...history, item].slice(-20),
    update_date: now
  })
  await writeOperationLog(auth, 'addAfterSaleRemark', 'after_sale', afterSaleId, afterSale, { ...afterSale, admin_remark: item.remark }, item.remark)
  return ok({ remark: item }, '备注已添加')
}

async function getOperationLogs(params = {}) {
  const where = {}
  if (params.action && params.action !== 'all') where.action = params.action
  if (params.target && params.target !== 'all') where.target = params.target
  return ok(await pageQuery('operation_log', where, params))
}

async function pageQuery(collection, where, params = {}, orderField = 'create_date', orderType = 'desc') {
  const page = Number(params.page || 1)
  const pageSize = Number(params.pageSize || 20)
  const countRes = await db.collection(collection).where(where).count()
  const listRes = await db.collection(collection)
    .where(where)
    .orderBy(orderField, orderType)
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
