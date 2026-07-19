import {
  banners,
  categories,
  subCategories,
  goods,
  skus,
  coupons,
  defaultUserCoupons,
  defaultUser,
  seedStorage,
  createDemoOrder
} from './data'
import { ORDER_STATUS, STORAGE_KEYS } from '@/constants/status'
import runtimeConfig from '@/config/runtime'
import { readAuthToken, writeAuthSession, clearAuthSession } from '@/utils/auth'
import { readApiErrorLogs } from '@/utils/diagnostics'

const ok = (data = {}, msg = 'success') => ({ code: 0, msg, data })
const fail = (msg, code = 422) => ({ code, msg, data: null })

const read = (key, fallback) => {
  const value = uni.getStorageSync(key)
  return value || fallback
}

const write = (key, value) => {
  uni.setStorageSync(key, value)
  return value
}

const defaultPrivacyStatus = () => ({
  personalizedRecommend: true,
  activityMessage: true,
  diagnosticsLog: true,
  updated_date: Date.now()
})

const pickProfileUpdate = (params = {}) => {
  const allowedKeys = ['nickname', 'avatar', 'gender', 'birthday']
  const update = {}
  allowedKeys.forEach(key => {
    if (params[key] !== undefined) update[key] = params[key]
  })
  return update
}

// 仅体验账号映射为管理员;其他手机号/账号一律本地普通会员,避免"任意登录即管理员"
const resolveMockLoginUser = (params = {}) => {
  const account = String(params.mobile || params.username || '').trim()
  const isDemo = account === runtimeConfig.demoAccount.mobile ||
    account === runtimeConfig.demoAccount.username
  if (isDemo) return defaultUser
  return {
    _id: `mock-${account || 'guest'}`,
    mobile: account,
    nickname: account ? `会员${account.slice(-4)}` : '薪超会员',
    avatar: '/static/default-avatar.png',
    role: [],
    roles: []
  }
}

// 售后被拒绝/取消时,把订单恢复到"申请前"的状态,而非一律置为已完成
const restoreMockOrderStatus = (prev) => {
  const allowed = [
    ORDER_STATUS.pendingShip, ORDER_STATUS.pendingReceive,
    ORDER_STATUS.pendingReview, ORDER_STATUS.completed
  ]
  const value = Number(prev)
  return allowed.includes(value) ? value : ORDER_STATUS.completed
}

const readGoods = () => read(STORAGE_KEYS.goods, goods)
const writeGoods = (list) => write(STORAGE_KEYS.goods, list)

const readSkus = () => read(STORAGE_KEYS.goodsSkus, skus)

const writeSkus = (list) => write(STORAGE_KEYS.goodsSkus, list)

const readOperationLogs = () => read(STORAGE_KEYS.operationLogs, [])

const writeOperationLogs = (list) => write(STORAGE_KEYS.operationLogs, list)

const readUserCoupons = () => read(STORAGE_KEYS.userCoupons, defaultUserCoupons)

const writeUserCoupons = (list) => write(STORAGE_KEYS.userCoupons, list)

const isCouponExpired = (coupon = {}) => {
  if (coupon.status === 'expired') return true
  if (!coupon.expire) return false
  const endTime = new Date(`${coupon.expire} 23:59:59`).getTime()
  return Number.isFinite(endTime) && Date.now() > endTime
}

const mergeUserCoupon = (coupon = {}, userCoupon = null) => {
  const expired = isCouponExpired(coupon)
  const status = expired ? 'expired' : (userCoupon?.status || coupon.status || 'available')
  return {
    ...coupon,
    _id: coupon._id,
    coupon_id: coupon._id,
    user_coupon_id: userCoupon?._id || '',
    user_coupon_status: userCoupon?.status || '',
    status,
    received: Boolean(userCoupon),
    can_receive: !userCoupon && status === 'available',
    receive_time: userCoupon?.receive_time || 0,
    use_time: userCoupon?.use_time || 0,
    order_id: userCoupon?.order_id || ''
  }
}

const getCouponRows = (params = {}) => {
  const couponList = read(STORAGE_KEYS.coupons, coupons)
  const userRows = readUserCoupons()
  const scope = params.scope || 'mine'
  const rows = scope === 'market'
    ? couponList.map(coupon => mergeUserCoupon(coupon, userRows.find(row => row.coupon_id === coupon._id)))
    : userRows
      .map(row => {
        const coupon = couponList.find(item => item._id === row.coupon_id)
        return coupon ? mergeUserCoupon(coupon, row) : null
      })
      .filter(Boolean)

  if (params.status && params.status !== 'all') {
    return rows.filter(item => item.status === params.status)
  }
  return rows
}

const restoreUserCoupon = (order = {}) => {
  if (!order.user_coupon_id) return
  const next = readUserCoupons().map(item => item._id === order.user_coupon_id
    ? { ...item, status: 'available', use_time: 0, order_id: '', update_date: Date.now() }
    : item)
  writeUserCoupons(next)
}

// 待付款订单超过 30 分钟未支付:就地取消并恢复优惠券(mock 惰性兜底,与云端一致)
const expireMockPendingOrders = (orders = []) => {
  const now = Date.now()
  let changed = false
  const next = orders.map(order => {
    if (Number(order.status) === ORDER_STATUS.pendingPay && now > Number(order.pay_expire_time || 0)) {
      changed = true
      restoreUserCoupon(order)
      return { ...order, status: ORDER_STATUS.canceled, cancel_reason: '支付超时', cancel_time: now }
    }
    return order
  })
  if (changed) write(STORAGE_KEYS.orders, next)
  return next
}

const paginate = (list, page = 1, pageSize = 20) => {
  const current = Number(page) || 1
  const size = Number(pageSize) || 20
  const start = (current - 1) * size
  const data = list.slice(start, start + size)
  return {
    list: data,
    total: list.length,
    page: current,
    pageSize: size,
    hasMore: start + size < list.length
  }
}

const attachSkuList = (list = []) => {
  const skuList = readSkus()
  return list.map(item => {
    const rows = skuList.filter(sku => sku.goods_id === item._id)
    return {
      ...item,
      sku_list: rows,
      sku_count: rows.length
    }
  })
}

const writeOperationLog = (action, target, targetId, before = null, after = null, remark = '') => {
  const user = read(STORAGE_KEYS.userInfo, defaultUser)
  const item = {
    _id: `oplog-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    operator_id: user._id || user.uid || 'mock-user',
    operator_name: user.nickname || user.username || '运营人员',
    operator_mobile: user.mobile || '',
    action,
    target,
    target_id: targetId || '',
    before,
    after,
    remark,
    create_date: Date.now()
  }
  writeOperationLogs([item, ...readOperationLogs()].slice(0, 80))
}

const getGoodsList = (params = {}) => {
  const { keyword = '', categoryId = '', brand = '', sort = 'default', minPrice, maxPrice } = params
  let list = readGoods().filter(item => item.status === 1)
  if (keyword) {
    list = list.filter(item => `${item.name}${item.subtitle}${item.brand}`.toLowerCase().includes(String(keyword).toLowerCase()))
  }
  if (categoryId) {
    list = list.filter(item => item.category_id === categoryId || item.sub_category_id === categoryId)
  }
  if (brand) list = list.filter(item => item.brand === brand)
  if (minPrice !== undefined && minPrice !== '') list = list.filter(item => item.price >= Number(minPrice))
  if (maxPrice !== undefined && maxPrice !== '') list = list.filter(item => item.price <= Number(maxPrice))
  if (sort === 'sales') list = [...list].sort((a, b) => b.sales - a.sales)
  if (sort === 'price_asc') list = [...list].sort((a, b) => a.price - b.price)
  if (sort === 'price_desc') list = [...list].sort((a, b) => b.price - a.price)
  if (sort === 'new') list = [...list].sort((a, b) => Number(b.is_new) - Number(a.is_new))
  return paginate(list, params.page, params.pageSize)
}

const normalizeCartItem = ({ goods_id, sku_id, quantity = 1 }) => {
  const product = readGoods().find(item => item._id === goods_id)
  if (!product) return { error: '商品不存在' }
  if (product.status !== 1) return { error: '商品已下架' }
  const skuList = readSkus()
  const sku = sku_id ? skuList.find(item => item._id === sku_id) : skuList.find(item => item.goods_id === goods_id)
  if (sku_id && !sku) return { error: '商品规格不存在' }
  if (sku && sku.goods_id !== goods_id) return { error: '商品规格不匹配' }
  if (sku && sku.status !== undefined && Number(sku.status) !== 1) return { error: '商品规格已停用' }
  const stock = Number(sku?.stock ?? product.stock ?? 0)
  if (stock < Number(quantity || 1)) return { error: '库存不足' }
  return {
    _id: `cart-${goods_id}-${sku?._id || 'default'}`,
    goods_id,
    sku_id: sku?._id || '',
    goods_name: product.name,
    goods_image: sku?.image || product.image,
    price: sku?.price || product.price,
    quantity: Number(quantity),
    stock,
    sku_info: sku?.spec_values || '',
    checked: true,
    create_date: Date.now()
  }
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

const buildOrderTrend = (orders = [], days = 7) => {
  const oneDay = 24 * 60 * 60 * 1000
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const rows = Array.from({ length: days }).map((_, index) => {
    const timestamp = startOfToday.getTime() - (days - 1 - index) * oneDay
    return { key: formatReportDay(timestamp), label: formatReportDay(timestamp), count: 0, amount: 0 }
  })
  const rowMap = rows.reduce((map, item) => {
    map[item.key] = item
    return map
  }, {})
  orders.filter(isPaidOrder).forEach(order => {
    const dayKey = formatReportDay(order.create_date || Date.now())
    if (!rowMap[dayKey]) return
    rowMap[dayKey].count += 1
    rowMap[dayKey].amount = roundMoney(rowMap[dayKey].amount + getOrderAmount(order))
  })
  return rows
}

const buildTopGoods = (orders = []) => {
  const map = {}
  orders.filter(isPaidOrder).forEach(order => {
    const goodsList = order.goods_list || order.goodsList || []
    goodsList.forEach(item => {
      const goodsId = item.goods_id || item.goodsId || item._id || item.goods_name || item.name
      if (!goodsId) return
      if (!map[goodsId]) {
        map[goodsId] = {
          goods_id: goodsId,
          name: item.goods_name || item.name || '未命名商品',
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

const buildInventoryRisks = (goodsList = [], skuList = [], threshold = 10) => {
  const skuGroups = skuList.reduce((map, item) => {
    if (!map[item.goods_id]) map[item.goods_id] = []
    map[item.goods_id].push(item)
    return map
  }, {})
  const risks = []
  goodsList.filter(item => Number(item.status) === 1).forEach(item => {
    const rows = skuGroups[item._id] || []
    const stock = rows.length
      ? rows.reduce((sum, sku) => sum + toNumber(sku.stock), 0)
      : toNumber(item.stock)
    if (!rows.length) {
      risks.push({
        key: `${item._id}-no-sku`,
        level: 'warning',
        title: item.name || '未命名商品',
        desc: '缺少 SKU，买家端规格和库存校验不完整',
        value: '待补 SKU'
      })
    }
    if (stock <= threshold) {
      risks.push({
        key: `${item._id}-low-stock`,
        level: stock <= 0 ? 'blocked' : 'warning',
        title: item.name || '未命名商品',
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

const buildMockOpsReport = (params = {}) => {
  const days = Math.min(Math.max(Number(params.days || 7), 3), 14)
  const orderList = read(STORAGE_KEYS.orders, [])
  const afterSaleList = read(STORAGE_KEYS.afterSales, [])
  const goodsList = readGoods()
  const skuList = readSkus()
  const couponList = read(STORAGE_KEYS.coupons, coupons)
  const userCouponList = readUserCoupons()
  const messageList = read(STORAGE_KEYS.messages, [])
  const operationLogs = readOperationLogs()
  const paidOrders = orderList.filter(isPaidOrder)
  const revenue = paidOrders.reduce((sum, item) => sum + getOrderAmount(item), 0)
  const usedCouponCount = userCouponList.filter(item => item.status === 'used').length
  const pendingAfterSale = afterSaleList.filter(item => Number(item.status) === 0).length
  const inventoryRisks = buildInventoryRisks(goodsList, skuList)
  const pendingShip = orderList.filter(item => Number(item.status) === ORDER_STATUS.pendingShip).length

  return {
    checked_at: Date.now(),
    windowDays: days,
    summary: {
      revenue: roundMoney(revenue),
      orderCount: orderList.length,
      paidOrderCount: paidOrders.length,
      avgOrderAmount: paidOrders.length ? roundMoney(revenue / paidOrders.length) : 0,
      goodsCount: goodsList.filter(item => Number(item.status) === 1).length,
      skuCount: skuList.length,
      couponUseRate: percent(usedCouponCount, userCouponList.length),
      afterSaleRate: percent(afterSaleList.length, paidOrders.length),
      pendingShipCount: pendingShip,
      pendingAfterSaleCount: pendingAfterSale,
      inventoryRiskCount: inventoryRisks.length,
      messageCount: messageList.length
    },
    orderTrend: buildOrderTrend(orderList, days),
    topGoods: buildTopGoods(orderList),
    inventoryRisks,
    couponStats: {
      couponCount: couponList.length,
      issued: userCouponList.length,
      available: userCouponList.filter(item => item.status === 'available').length,
      used: usedCouponCount,
      expired: userCouponList.filter(item => item.status === 'expired').length
    },
    serviceRisks: [
      { key: 'pending-after-sale', label: '售后待审核', value: pendingAfterSale, status: pendingAfterSale ? 'action' : 'ok' },
      { key: 'pending-ship', label: '订单待发货', value: pendingShip, status: pendingShip ? 'action' : 'ok' },
      { key: 'pending-pay', label: '待付款订单', value: orderList.filter(item => Number(item.status) === ORDER_STATUS.pendingPay).length, status: 'manual' }
    ],
    releaseReadiness: [
      { key: 'cloud-collections', label: '核心集合读取', status: 'ok', value: '本地 mock', desc: '离线演示数据可读取' },
      { key: 'goods-sku', label: '商品与 SKU', status: goodsList.length && skuList.length ? 'ok' : 'warning', value: `${goodsList.length}/${skuList.length}`, desc: '商品数 / SKU 数' },
      { key: 'order-flow', label: '交易闭环', status: paidOrders.length ? 'ok' : 'warning', value: `${paidOrders.length} 单`, desc: paidOrders.length ? '已有支付后订单可回归' : '建议先完成一次下单支付' },
      { key: 'ship-todo', label: '待发货治理', status: pendingShip ? 'action' : 'ok', value: `${pendingShip} 单`, desc: pendingShip ? '运营端需处理发货或物流' : '暂无发货积压' },
      { key: 'after-sale', label: '售后审核', status: pendingAfterSale ? 'action' : 'ok', value: `${pendingAfterSale} 单`, desc: pendingAfterSale ? '有待审核售后申请' : '暂无待审核售后' },
      { key: 'inventory', label: '库存风险', status: inventoryRisks.length ? 'warning' : 'ok', value: `${inventoryRisks.length} 项`, desc: inventoryRisks.length ? '存在低库存或缺 SKU 项' : '库存风险暂未触发' },
      { key: 'coupon', label: '优惠券投放', status: couponList.length ? 'ok' : 'warning', value: `${usedCouponCount}/${userCouponList.length}`, desc: '已使用 / 已领取' },
      { key: 'operation-log', label: '操作审计', status: operationLogs.length ? 'ok' : 'warning', value: `${operationLogs.length} 条`, desc: operationLogs.length ? '运营动作已有记录' : '完成运营操作后会自动记录' }
    ],
    recentLogs: operationLogs.slice(0, 5),
    collectionStatus: [
      { key: 'order', ok: true, count: orderList.length, msg: '' },
      { key: 'after_sale', ok: true, count: afterSaleList.length, msg: '' },
      { key: 'goods', ok: true, count: goodsList.length, msg: '' },
      { key: 'goods_sku', ok: true, count: skuList.length, msg: '' },
      { key: 'coupon', ok: true, count: couponList.length, msg: '' },
      { key: 'user_coupon', ok: true, count: userCouponList.length, msg: '' },
      { key: 'message', ok: true, count: messageList.length, msg: '' },
      { key: 'operation_log', ok: true, count: operationLogs.length, msg: '' }
    ]
  }
}

export const mockService = {
  async call(action, params = {}, cloudFunction = '') {
    seedStorage()
    if (cloudFunction === 'admin-center') {
      const adminHandlers = {
        async getDashboard() {
          const orderList = read(STORAGE_KEYS.orders, [])
          const afterSaleList = read(STORAGE_KEYS.afterSales, [])
          const goodsList = readGoods()
          const messageList = read(STORAGE_KEYS.messages, [])
          const couponList = read(STORAGE_KEYS.coupons, coupons)
          return ok({
            stats: {
              goods: goodsList.filter(item => item.status === 1).length,
              orders: orderList.length,
              users: 1,
              afterSaleTodo: afterSaleList.filter(item => [0, 1].includes(item.status)).length,
              couponAvailable: couponList.filter(item => item.status === 'available').length,
              messageTotal: messageList.length,
              unreadMessage: messageList.filter(item => !item.read && !item.is_read).length
            },
            orderStatus: {
              pendingPay: orderList.filter(item => item.status === ORDER_STATUS.pendingPay).length,
              pendingShip: orderList.filter(item => item.status === ORDER_STATUS.pendingShip).length,
              pendingReceive: orderList.filter(item => item.status === ORDER_STATUS.pendingReceive).length,
              pendingReview: orderList.filter(item => item.status === ORDER_STATUS.pendingReview).length,
              refunding: orderList.filter(item => item.status === ORDER_STATUS.refunding).length,
              completed: orderList.filter(item => item.status === ORDER_STATUS.completed).length
            },
            afterSaleStatus: {
              pending: afterSaleList.filter(item => item.status === 0).length,
              approved: afterSaleList.filter(item => item.status === 1).length,
              completed: afterSaleList.filter(item => item.status === 4).length
            }
          })
        },
        async getOpsReport() {
          return ok(buildMockOpsReport(params), '运营报表已生成')
        },
        async getGoodsList() {
          let list = readGoods()
          if (params.status !== undefined && params.status !== '' && params.status !== 'all') {
            list = list.filter(item => Number(item.status) === Number(params.status))
          }
          if (params.keyword) {
            const keyword = String(params.keyword).toLowerCase()
            list = list.filter(item => `${item.name}${item.subtitle}${item.brand}`.toLowerCase().includes(keyword))
          }
          return ok(paginate(attachSkuList(list), params.page, params.pageSize))
        },
        async createGoods() {
          const name = String(params.name || '').trim()
          if (!name) return fail('请填写商品名称')
          const now = Date.now()
          const item = {
            _id: `goods-${now}`,
            name,
            subtitle: params.subtitle || '',
            price: Number(params.price || 0),
            original_price: Number(params.original_price || 0),
            image: params.image || '/static/demo/goods-cup.png',
            images: params.images || [params.image || '/static/demo/goods-cup.png'],
            category_id: params.category_id || 'cat-life',
            sub_category_id: params.sub_category_id || '',
            brand: params.brand || 'XINCHAO',
            stock: Number(params.stock || 0),
            sales: Number(params.sales || 0),
            status: Number(params.status || 0),
            sort: Number(params.sort || 0),
            is_new: Boolean(params.is_new),
            is_hot: Boolean(params.is_hot),
            is_recommend: params.is_recommend ? 1 : 0,
            detail: params.detail || '',
            create_date: now,
            update_date: now
          }
          writeGoods([item, ...readGoods()])
          writeOperationLog('createGoods', 'goods', item._id, null, item, '创建商品')
          return ok({ goods_id: item._id, goods: item }, '商品已创建')
        },
        async updateGoods() {
          const goodsId = params.goods_id || params.goodsId || params._id
          if (!goodsId) return fail('缺少商品 ID')
          const current = readGoods().find(item => item._id === goodsId)
          if (!current) return fail('商品不存在', 404)
          const update = {
            ...current,
            ...params,
            _id: goodsId,
            price: Number(params.price ?? current.price),
            original_price: Number(params.original_price ?? current.original_price ?? 0),
            stock: Number(params.stock ?? current.stock ?? 0),
            sales: Number(params.sales ?? current.sales ?? 0),
            sort: Number(params.sort ?? current.sort ?? 0),
            status: Number(params.status ?? current.status ?? 0),
            is_recommend: params.is_recommend ? 1 : 0,
            update_date: Date.now()
          }
          writeGoods(readGoods().map(item => item._id === goodsId ? update : item))
          writeOperationLog('updateGoods', 'goods', goodsId, current, update, '编辑商品')
          return ok({ goods_id: goodsId, goods: update }, '商品已保存')
        },
        async deleteGoodsDraft() {
          const goodsId = params.goods_id || params.goodsId || params._id
          const current = readGoods().find(item => item._id === goodsId)
          if (!current) return fail('商品不存在', 404)
          if (Number(current.status) !== 0 || Number(current.sales || 0) > 0) return fail('只能删除未销售的下架草稿商品')
          writeGoods(readGoods().filter(item => item._id !== goodsId))
          writeSkus(readSkus().filter(item => item.goods_id !== goodsId))
          writeOperationLog('deleteGoodsDraft', 'goods', goodsId, current, null, '删除商品草稿')
          return ok({}, '商品草稿已删除')
        },
        async updateSkuList() {
          const goodsId = params.goods_id || params.goodsId
          const skuList = Array.isArray(params.sku_list || params.skuList) ? (params.sku_list || params.skuList) : []
          if (!goodsId) return fail('缺少商品 ID')
          const now = Date.now()
          const nextSkuList = skuList.map((item, index) => ({
            _id: item._id || `sku-${goodsId}-${now}-${index}`,
            goods_id: goodsId,
            spec_values: item.spec_values || item.specValues || '默认规格',
            price: Number(item.price || 0),
            stock: Number(item.stock || 0),
            image: item.image || '',
            status: Number(item.status ?? 1),
            sort: Number(item.sort || index),
            create_date: item.create_date || now,
            update_date: now
          }))
          const before = readSkus().filter(item => item.goods_id === goodsId)
          writeSkus([...readSkus().filter(item => item.goods_id !== goodsId), ...nextSkuList])
          const stock = nextSkuList.reduce((sum, item) => sum + Number(item.stock || 0), 0)
          writeGoods(readGoods().map(item => item._id === goodsId ? { ...item, stock, update_date: now } : item))
          writeOperationLog('updateSkuList', 'goods', goodsId, { sku_count: before.length }, { sku_count: nextSkuList.length, stock }, '编辑 SKU')
          return ok({ list: nextSkuList, total: nextSkuList.length }, 'SKU 已保存')
        },
        async updateGoodsStatus() {
          const goodsId = params.goods_id || params.goodsId
          const status = Number(params.status)
          if (!goodsId) return fail('缺少商品 ID')
          if (![0, 1].includes(status)) return fail('商品状态不正确')
          const current = readGoods().find(item => item._id === goodsId)
          const next = readGoods().map(item => item._id === goodsId ? { ...item, status, update_date: Date.now() } : item)
          writeGoods(next)
          writeOperationLog('updateGoodsStatus', 'goods', goodsId, current, { ...current, status }, status === 1 ? '商品上架' : '商品下架')
          return ok({}, status === 1 ? '商品已上架' : '商品已下架')
        },
        async updateGoodsStock() {
          const goodsId = params.goods_id || params.goodsId
          const stock = Number(params.stock)
          if (!goodsId) return fail('缺少商品 ID')
          if (!Number.isFinite(stock) || stock < 0) return fail('库存必须大于等于 0')
          const current = readGoods().find(item => item._id === goodsId)
          const next = readGoods().map(item => item._id === goodsId ? { ...item, stock, update_date: Date.now() } : item)
          writeGoods(next)
          writeOperationLog('updateGoodsStock', 'goods', goodsId, current, { ...current, stock }, '调整库存')
          return ok({}, '库存已更新')
        },
        async getCouponList() {
          let list = read(STORAGE_KEYS.coupons, coupons)
          if (params.status && params.status !== 'all') list = list.filter(item => item.status === params.status)
          return ok(paginate(list, params.page, params.pageSize))
        },
        async createCoupon() {
          const title = String(params.title || '').trim()
          if (!title) return fail('请填写优惠券名称')
          const item = {
            _id: `coupon-${Date.now()}`,
            title,
            amount: Number(params.amount || 0),
            threshold: Number(params.threshold || 0),
            status: params.status || 'available',
            expire: params.expire || '2026-12-31',
            total_quantity: Number(params.total_quantity || 0),
            per_user_limit: Number(params.per_user_limit || 1),
            received_count: 0,
            used_count: 0,
            sort: Number(params.sort || 0),
            create_date: Date.now(),
            update_date: Date.now()
          }
          write(STORAGE_KEYS.coupons, [item, ...read(STORAGE_KEYS.coupons, coupons)])
          writeOperationLog('createCoupon', 'coupon', item._id, null, item, '创建优惠券')
          return ok({ coupon_id: item._id, coupon: item }, '优惠券已创建')
        },
        async updateCoupon() {
          const couponId = params.coupon_id || params.couponId || params._id
          const current = read(STORAGE_KEYS.coupons, coupons).find(item => item._id === couponId)
          if (!current) return fail('优惠券不存在', 404)
          const nextItem = {
            ...current,
            ...params,
            _id: couponId,
            amount: Number(params.amount ?? current.amount),
            threshold: Number(params.threshold ?? current.threshold ?? 0),
            total_quantity: Number(params.total_quantity ?? current.total_quantity ?? 0),
            per_user_limit: Number(params.per_user_limit ?? current.per_user_limit ?? 1),
            sort: Number(params.sort ?? current.sort ?? 0),
            update_date: Date.now()
          }
          write(STORAGE_KEYS.coupons, read(STORAGE_KEYS.coupons, coupons).map(item => item._id === couponId ? nextItem : item))
          writeOperationLog('updateCoupon', 'coupon', couponId, current, nextItem, '编辑优惠券')
          return ok({ coupon_id: couponId, coupon: nextItem }, '优惠券已保存')
        },
        async getCouponStats() {
          const rows = readUserCoupons()
          return ok({
            available: rows.filter(item => item.status === 'available').length,
            used: rows.filter(item => item.status === 'used').length,
            expired: rows.filter(item => item.status === 'expired').length,
            total: rows.length
          })
        },
        async updateCouponStatus() {
          const couponId = params.coupon_id || params.couponId
          const status = params.status
          if (!couponId) return fail('缺少优惠券 ID')
          if (!['available', 'expired'].includes(status)) return fail('优惠券状态不正确')
          const current = read(STORAGE_KEYS.coupons, coupons).find(item => item._id === couponId)
          const next = read(STORAGE_KEYS.coupons, coupons).map(item => item._id === couponId ? { ...item, status, update_date: Date.now() } : item)
          write(STORAGE_KEYS.coupons, next)
          writeOperationLog('updateCouponStatus', 'coupon', couponId, current, { ...current, status }, status === 'available' ? '启用优惠券' : '停用优惠券')
          return ok({}, status === 'available' ? '优惠券已启用' : '优惠券已停用')
        },
        async getMessageList() {
          let list = read(STORAGE_KEYS.messages, []).filter(item => (item.status || 'published') === 'published')
          if (params.type && params.type !== 'all') list = list.filter(item => item.type === params.type)
          return ok(paginate(list, params.page, params.pageSize))
        },
        async publishMessage() {
          const title = String(params.title || '').trim()
          const content = String(params.content || '').trim()
          const type = params.type || 'system'
          const status = params.status || 'published'
          if (!title) return fail('请填写消息标题')
          if (!content) return fail('请填写消息内容')
          if (!['order', 'promo', 'system'].includes(type)) return fail('消息类型不正确')
          if (!['published', 'draft', 'archived'].includes(status)) return fail('消息状态不正确')
          const item = {
            _id: `msg-${Date.now()}`,
            user_id: params.user_id || params.userId || 'all',
            type,
            title: title.slice(0, 40),
            content: content.slice(0, 180),
            link: params.link || '',
            status,
            read: false,
            is_read: false,
            create_date: Date.now(),
            update_date: Date.now()
          }
          write(STORAGE_KEYS.messages, [item, ...read(STORAGE_KEYS.messages, [])])
          writeOperationLog('publishMessage', 'message', item._id, null, item, '发布消息')
          return ok({ message_id: item._id, message: item }, status === 'published' ? '消息已发布' : '消息已保存')
        },
        async updateMessage() {
          const messageId = params.message_id || params.messageId || params._id
          const current = read(STORAGE_KEYS.messages, []).find(item => item._id === messageId)
          if (!current) return fail('消息不存在', 404)
          if (params.type && !['order', 'promo', 'system'].includes(params.type)) return fail('消息类型不正确')
          if (params.status && !['published', 'draft', 'archived'].includes(params.status)) return fail('消息状态不正确')
          if (params.title !== undefined && !String(params.title || '').trim()) return fail('请填写消息标题')
          if (params.content !== undefined && !String(params.content || '').trim()) return fail('请填写消息内容')
          const nextItem = { ...current, ...params, _id: messageId, update_date: Date.now() }
          write(STORAGE_KEYS.messages, read(STORAGE_KEYS.messages, []).map(item => item._id === messageId ? nextItem : item))
          writeOperationLog('updateMessage', 'message', messageId, current, nextItem, '编辑消息')
          return ok({ message_id: messageId, message: nextItem }, '消息已保存')
        },
        async getMessageStats() {
          const rows = read(STORAGE_KEYS.messages, [])
          return ok({
            total: rows.length,
            unread: rows.filter(item => !item.is_read && !item.read).length,
            system: rows.filter(item => item.type === 'system').length,
            promo: rows.filter(item => item.type === 'promo').length,
            order: rows.filter(item => item.type === 'order').length
          })
        },
        async addOrderRemark() {
          const orderId = params.order_id || params.orderId
          const remark = String(params.remark || '').trim()
          const orderList = read(STORAGE_KEYS.orders, [])
          const current = orderList.find(item => item._id === orderId)
          if (!current) return fail('订单不存在', 404)
          const nextItem = { ...current, admin_remark: remark, update_date: Date.now() }
          write(STORAGE_KEYS.orders, orderList.map(item => item._id === orderId ? nextItem : item))
          writeOperationLog('addOrderRemark', 'order', orderId, current, nextItem, remark)
          return ok({ remark }, '备注已添加')
        },
        async updateShipment() {
          const orderId = params.order_id || params.orderId
          const orderList = read(STORAGE_KEYS.orders, [])
          const current = orderList.find(item => item._id === orderId)
          if (!current) return fail('订单不存在', 404)
          const nextItem = {
            ...current,
            status: ORDER_STATUS.pendingReceive,
            logistics_company: params.company || params.logistics_company || '薪超优选配送',
            tracking_no: params.tracking_no || params.trackingNo || `XCEXP${Date.now()}`,
            ship_time: Date.now(),
            update_date: Date.now()
          }
          write(STORAGE_KEYS.orders, orderList.map(item => item._id === orderId ? nextItem : item))
          writeOperationLog('updateShipment', 'order', orderId, current, nextItem, '编辑物流')
          return ok({}, '物流信息已保存')
        },
        async addAfterSaleRemark() {
          const afterSaleId = params.after_sale_id || params.afterSaleId
          const remark = String(params.remark || '').trim()
          const rows = read(STORAGE_KEYS.afterSales, [])
          const current = rows.find(item => item._id === afterSaleId)
          if (!current) return fail('售后记录不存在', 404)
          const nextItem = { ...current, admin_remark: remark, update_date: Date.now() }
          write(STORAGE_KEYS.afterSales, rows.map(item => item._id === afterSaleId ? nextItem : item))
          writeOperationLog('addAfterSaleRemark', 'after_sale', afterSaleId, current, nextItem, remark)
          return ok({ remark }, '备注已添加')
        },
        async getOperationLogs() {
          let list = readOperationLogs()
          if (params.target && params.target !== 'all') list = list.filter(item => item.target === params.target)
          return ok(paginate(list, params.page, params.pageSize))
        }
      }

      const adminHandler = adminHandlers[action]
      if (adminHandler) return adminHandler()
    }

    const handlers = {
      async loginBySms() {
        const user = resolveMockLoginUser(params)
        writeAuthSession('mock-token', user)
        return ok({ token: 'mock-token', tokenExpired: Date.now() + 7 * 24 * 60 * 60 * 1000, userInfo: user }, '登录成功')
      },
      async loginByPassword() {
        return handlers.loginBySms()
      },
      async loginByWeixin() {
        return handlers.loginBySms()
      },
      async register() {
        return handlers.loginBySms()
      },
      async sendSmsCode() {
        return ok({}, '验证码已发送')
      },
      async logout() {
        clearAuthSession()
        return ok()
      },
      async getUserInfo() {
        return ok({ userInfo: read(STORAGE_KEYS.userInfo, defaultUser) })
      },
      async updateUserInfo() {
        const user = { ...read(STORAGE_KEYS.userInfo, defaultUser), ...pickProfileUpdate(params) }
        write(STORAGE_KEYS.userInfo, user)
        return ok(user, '更新成功')
      },
      async changePassword() {
        return fail('体验账号密码固定用于验收，请注册普通账号测试修改密码', 403)
      },
      async setPassword() {
        const user = { ...read(STORAGE_KEYS.userInfo, defaultUser), hasPassword: true }
        write(STORAGE_KEYS.userInfo, user)
        return ok({ userInfo: user }, '密码已设置')
      },
      async bindMobile() {
        const mobile = String(params.mobile || '').trim()
        if (!mobile) return fail('请填写手机号')
        const user = { ...read(STORAGE_KEYS.userInfo, defaultUser), mobile }
        write(STORAGE_KEYS.userInfo, user)
        return ok({ userInfo: user }, '手机号已绑定')
      },
      async requestAccountCancel() {
        const user = {
          ...read(STORAGE_KEYS.userInfo, defaultUser),
          account_status: 'demo_cancel_requested',
          account_cancel_request: {
            requested: true,
            demo: true,
            reason: params.reason || '用户主动申请注销',
            apply_date: Date.now()
          }
        }
        write(STORAGE_KEYS.userInfo, user)
        return ok({ disabled: false, demo: true }, '体验账号已记录注销申请，不会停用演示管理员')
      },
      async getPrivacyStatus() {
        return ok({ privacyStatus: read(STORAGE_KEYS.privacyStatus, defaultPrivacyStatus()) })
      },
      async updatePrivacyStatus() {
        const next = {
          ...defaultPrivacyStatus(),
          personalizedRecommend: params.personalizedRecommend !== false,
          activityMessage: params.activityMessage !== false,
          diagnosticsLog: params.diagnosticsLog !== false,
          updated_date: Date.now()
        }
        write(STORAGE_KEYS.privacyStatus, next)
        return ok({ privacyStatus: next }, '隐私设置已保存')
      },
      async checkToken() {
        return readAuthToken()
          ? ok({ uid: defaultUser._id, tokenExpired: Date.now() + 7 * 24 * 60 * 60 * 1000, role: defaultUser.role, userInfo: defaultUser })
          : fail('请先登录', 401)
      },
      async getHealthCheck() {
        const orderList = read(STORAGE_KEYS.orders, [])
        const afterSaleList = read(STORAGE_KEYS.afterSales, [])
        const token = readAuthToken()
        return ok({
          checked_at: Date.now(),
          runtime: {
            cloudFunction: 'mock',
            provider: runtimeConfig.cloudSpace.provider,
            mode: runtimeConfig.runtimeEnv,
            version: runtimeConfig.version,
            diagnosticMode: 'light',
            authSecret: 'demo-secret'
          },
          source: 'mock',
          auth: token
            ? { ok: true, status: 'authenticated', uid: defaultUser._id, role: defaultUser.role, isAdmin: true, msg: '本地演示登录有效' }
            : { ok: false, status: 'guest', msg: '未登录' },
          demoAccount: {
            exists: true,
            uid: defaultUser._id,
            username: runtimeConfig.demoAccount.username,
            mobile: runtimeConfig.demoAccount.mobile,
            nickname: runtimeConfig.demoAccount.nickname,
            hasPassword: true,
            role: runtimeConfig.demoAccount.adminRoles,
            isAdmin: true
          },
          collections: {
            home_banner: { ok: true, count: banners.length },
            goods_category: { ok: true, count: categories.length + subCategories.length },
            goods: { ok: true, count: goods.length },
            goods_sku: { ok: true, count: readSkus().length },
            coupon: { ok: true, count: read(STORAGE_KEYS.coupons, coupons).length },
            user_coupon: { ok: true, count: readUserCoupons().length },
            message: { ok: true, count: read(STORAGE_KEYS.messages, []).length },
            goods_evaluate: { ok: true, count: read(STORAGE_KEYS.evaluations, []).length },
            user_address: { ok: true, count: read(STORAGE_KEYS.addresses, []).length },
            order: { ok: true, count: orderList.length },
            after_sale: { ok: true, count: afterSaleList.length },
            operation_log: { ok: true, count: readOperationLogs().length },
            'uni-id-users': { ok: true, count: 1 }
          },
          cloudFunctions: ['init-data', 'user-center', 'goods-center', 'cart-center', 'order-center', 'address-center', 'service-center', 'admin-center'].map(name => ({
            name,
            ok: false,
            status: '当前使用本地 mock，需上传云函数后真机验证'
          })),
          compliance: [
            { key: 'agreement', label: '用户协议', path: '/pages/legal/agreement', version: runtimeConfig.legal.agreementVersion, ok: true, status: '已配置' },
            { key: 'privacy', label: '隐私政策', path: '/pages/legal/privacy', version: runtimeConfig.legal.privacyVersion, ok: true, status: '已配置' },
            { key: 'account-security', label: '账号与安全', path: '/pages/account/security', version: runtimeConfig.version, ok: true, status: '已配置' },
            { key: 'privacy-settings', label: '隐私设置', path: '/pages/account/privacy', version: runtimeConfig.version, ok: true, status: '已配置' },
            { key: 'account-cancel', label: '账号注销', path: '/pages/account/cancel', version: runtimeConfig.version, ok: true, status: '已配置' }
          ],
          recentErrors: readApiErrorLogs(),
          releaseChecks: runtimeConfig.releaseChecks.map(label => ({ key: label, label, status: 'manual' }))
        }, '本地诊断完成')
      },
      async getDeepHealthCheck() {
        const result = await handlers.getHealthCheck()
        if (result?.data?.runtime) result.data.runtime.diagnosticMode = 'deep'
        if (result?.data) result.data.source = 'mock'
        return { ...result, msg: '本地深度诊断完成' }
      },
      async getHomeData() {
        return ok({
          banner_list: banners,
          category_list: categories,
          recommend_list: readGoods().filter(item => item.status === 1 && item.is_recommend)
        })
      },
      async getCategoryList() {
        return ok(categories.map(parent => ({
          ...parent,
          children: subCategories.filter(child => child.parent_id === parent._id)
        })))
      },
      async getGoodsList() {
        return ok(getGoodsList(params))
      },
      async getGoodsByCategory() {
        return ok(getGoodsList(params))
      },
      async searchGoods() {
        return ok(getGoodsList(params))
      },
      async getGoodsDetail() {
        const product = readGoods().find(item => item._id === params.goodsId || item._id === params.goods_id)
        if (!product) return fail('商品不存在', 404)
        return ok({
          ...product,
          sku_list: skus.filter(item => item.goods_id === product._id),
          evaluate_list: read(STORAGE_KEYS.evaluations, [])
            .filter(item => item.goods_id === product._id)
            .slice(0, 5)
        })
      },
      async getCartList() {
        // 与云端 cart-center 一致：回查商品和 SKU 标记失效项（已下架 / 售罄 / 已删除 / 规格失效）。
        const goodsRows = readGoods()
        const skuRows = readSkus()
        const data = read(STORAGE_KEYS.cart, []).map(item => {
          const product = goodsRows.find(row => row._id === item.goods_id)
          const sku = item.sku_id ? skuRows.find(row => row._id === item.sku_id) : null
          let disabled = false
          let invalid_reason = ''
          let currentStock = Number(product?.stock ?? item.stock ?? 0)
          if (!product) {
            disabled = true
            invalid_reason = '商品已删除'
          } else if (product.status !== 1) {
            disabled = true
            invalid_reason = '商品已下架'
          } else if (item.sku_id && !sku) {
            disabled = true
            invalid_reason = '规格已失效'
          } else if (sku && sku.goods_id !== item.goods_id) {
            disabled = true
            invalid_reason = '规格不匹配'
          } else if (sku && sku.status !== undefined && Number(sku.status) !== 1) {
            disabled = true
            invalid_reason = '规格已停用'
          } else {
            currentStock = Number(sku ? sku.stock : product.stock)
          }
          if (!disabled && currentStock <= 0) {
            disabled = true
            invalid_reason = sku ? '规格已售罄' : '已售罄'
          }
          return { ...item, stock: currentStock, disabled, invalid_reason }
        })
        return ok(data)
      },
      async addToCart() {
        const item = normalizeCartItem(params)
        if (item?.error) return fail(item.error)
        const cart = read(STORAGE_KEYS.cart, [])
        const exist = cart.find(row => row._id === item._id)
        if (exist) exist.quantity = Math.min(exist.quantity + item.quantity, exist.stock)
        else cart.unshift(item)
        write(STORAGE_KEYS.cart, cart)
        return ok(item, '已加入购物车')
      },
      async updateCartQuantity() {
        const current = read(STORAGE_KEYS.cart, []).find(item => item._id === params.cart_id)
        if (!current) return fail('购物车商品不存在', 404)
        const snapshot = normalizeCartItem({
          goods_id: current.goods_id,
          sku_id: current.sku_id,
          quantity: Number(params.quantity)
        })
        if (snapshot?.error) return fail(snapshot.error)
        const cart = read(STORAGE_KEYS.cart, []).map(item => item._id === params.cart_id
          ? { ...item, quantity: Number(params.quantity), stock: snapshot.stock, update_date: Date.now() }
          : item)
        write(STORAGE_KEYS.cart, cart)
        return ok(cart)
      },
      async removeFromCart() {
        const ids = params.cart_ids || [params.cart_id]
        const cart = read(STORAGE_KEYS.cart, []).filter(item => !ids.includes(item._id))
        write(STORAGE_KEYS.cart, cart)
        return ok(cart, '删除成功')
      },
      async clearCart() {
        write(STORAGE_KEYS.cart, [])
        return ok()
      },
      async getCartCount() {
        return ok({ count: read(STORAGE_KEYS.cart, []).reduce((sum, item) => sum + item.quantity, 0) })
      },
      async getAddressList() {
        return ok(read(STORAGE_KEYS.addresses, []))
      },
      async getDefault() {
        const list = read(STORAGE_KEYS.addresses, [])
        return ok(list.find(item => item.is_default) || list[0] || null)
      },
      async addAddress() {
        const list = read(STORAGE_KEYS.addresses, [])
        const item = { ...params, _id: `addr-${Date.now()}`, user_id: 'mock-user' }
        if (item.is_default || list.length === 0) list.forEach(row => { row.is_default = false })
        write(STORAGE_KEYS.addresses, [item, ...list])
        return ok(item, '保存成功')
      },
      async updateAddress() {
        const list = read(STORAGE_KEYS.addresses, [])
        const addressId = params.address_id || params._id
        const next = list.map(item => item._id === addressId ? { ...item, ...params } : (params.is_default ? { ...item, is_default: false } : item))
        write(STORAGE_KEYS.addresses, next)
        return ok(next.find(item => item._id === addressId), '保存成功')
      },
      async deleteAddress() {
        write(STORAGE_KEYS.addresses, read(STORAGE_KEYS.addresses, []).filter(item => item._id !== params.address_id))
        return ok()
      },
      async setDefault() {
        const next = read(STORAGE_KEYS.addresses, []).map(item => ({ ...item, is_default: item._id === params.address_id }))
        write(STORAGE_KEYS.addresses, next)
        return ok()
      },
      async getCouponList() {
        return ok(paginate(getCouponRows(params), params.page, params.pageSize))
      },
      async receiveCoupon() {
        const couponId = params.coupon_id || params.couponId
        if (!couponId) return fail('缺少优惠券 ID')
        const coupon = read(STORAGE_KEYS.coupons, coupons).find(item => item._id === couponId)
        if (!coupon) return fail('优惠券不存在', 404)
        if (coupon.status !== 'available' || isCouponExpired(coupon)) return fail('优惠券已失效')

        const exists = readUserCoupons().find(item => item.coupon_id === couponId)
        if (exists) return ok(mergeUserCoupon(coupon, exists), '已领取过该优惠券')

        const now = Date.now()
        const userCoupon = {
          _id: `uc-${couponId}-${now}`,
          user_id: defaultUser._id,
          coupon_id: couponId,
          status: 'available',
          receive_time: now,
          create_date: now,
          update_date: now
        }
        writeUserCoupons([userCoupon, ...readUserCoupons()])
        return ok(mergeUserCoupon(coupon, userCoupon), '领取成功')
      },
      async getCollectList() {
        const ids = read(STORAGE_KEYS.collects, [])
        return ok(readGoods().filter(item => ids.includes(item._id)))
      },
      async toggleCollect() {
        const ids = read(STORAGE_KEYS.collects, [])
        const goodsId = params.goods_id || params.goodsId
        const next = ids.includes(goodsId) ? ids.filter(id => id !== goodsId) : [goodsId, ...ids]
        write(STORAGE_KEYS.collects, next)
        return ok({ is_collect: next.includes(goodsId) }, next.includes(goodsId) ? '已收藏' : '已取消收藏')
      },
      async cancelCollect() {
        const goodsId = params.goods_id || params.goodsId
        write(STORAGE_KEYS.collects, read(STORAGE_KEYS.collects, []).filter(id => id !== goodsId))
        return ok()
      },
      async getMessageList() {
        let list = read(STORAGE_KEYS.messages, []).filter(item => (item.status || 'published') === 'published')
        if (params.type && params.type !== 'all') list = list.filter(item => item.type === params.type)
        return ok(paginate(list, params.page, params.pageSize))
      },
      async markAsRead() {
        const next = read(STORAGE_KEYS.messages, []).map(item => item._id === params.message_id ? { ...item, read: true, is_read: true } : item)
        write(STORAGE_KEYS.messages, next)
        return ok()
      },
      async createOrder() {
        const addresses = read(STORAGE_KEYS.addresses, [])
        const address = addresses.find(item => item._id === params.address_id) || addresses[0]
        if (!address) return fail('请选择收货地址')
        const coupon = params.coupon_id ? getCouponRows({ scope: 'mine', status: 'available' }).find(item => item._id === params.coupon_id) : null
        if (params.coupon_id && !coupon) return fail('优惠券不可用，请重新选择')
        const order = createDemoOrder(params.goods_list || [], address, coupon)
        order.remark = params.remark || ''
        write(STORAGE_KEYS.orders, [order, ...read(STORAGE_KEYS.orders, [])])
        if (coupon?.user_coupon_id) {
          writeUserCoupons(readUserCoupons().map(item => item._id === coupon.user_coupon_id
            ? { ...item, status: 'used', use_time: Date.now(), order_id: order._id, update_date: Date.now() }
            : item))
        }
        if (params.goods_list?.some(item => item.cart_id)) {
          const cartIds = params.goods_list.map(item => item.cart_id).filter(Boolean)
          write(STORAGE_KEYS.cart, read(STORAGE_KEYS.cart, []).filter(item => !cartIds.includes(item._id)))
        }
        return ok({ order_id: order._id, order_no: order.order_no, pay_amount: order.pay_amount })
      },
      async getOrderList() {
        let list = expireMockPendingOrders(read(STORAGE_KEYS.orders, []))
        if (params.status !== undefined && params.status !== '' && params.status !== 'all') {
          list = list.filter(item => item.status === Number(params.status))
        }
        return ok(paginate(list, params.page, params.pageSize))
      },
      async getOrderDetail() {
        const order = expireMockPendingOrders(read(STORAGE_KEYS.orders, [])).find(item => item._id === params.order_id || item._id === params.orderId)
        return order ? ok(order) : fail('订单不存在', 404)
      },
      async payOrder() {
        const orders = read(STORAGE_KEYS.orders, [])
        const id = params.order_id || params.orderId
        const next = orders.map(item => item._id === id ? { ...item, status: ORDER_STATUS.pendingShip, pay_method: params.pay_method || 'wechat', pay_time: Date.now() } : item)
        write(STORAGE_KEYS.orders, next)
        return ok(next.find(item => item._id === id), '支付成功')
      },
      async shipOrder() {
        const id = params.order_id || params.orderId
        const next = read(STORAGE_KEYS.orders, []).map(item => item._id === id ? {
          ...item,
          status: ORDER_STATUS.pendingReceive,
          logistics_company: '薪超优选配送',
          tracking_no: `XCEXP${Date.now()}`,
          ship_time: Date.now()
        } : item)
        write(STORAGE_KEYS.orders, next)
        return ok(next.find(item => item._id === id), '已模拟发货')
      },
      async cancelOrder() {
        const orders = read(STORAGE_KEYS.orders, [])
        const order = orders.find(item => item._id === params.order_id || item._id === params.orderId)
        if (order) restoreUserCoupon(order)
        const next = orders.map(item => item._id === params.order_id || item._id === params.orderId ? { ...item, status: ORDER_STATUS.canceled, cancel_time: Date.now(), cancel_reason: params.reason || '用户取消' } : item)
        write(STORAGE_KEYS.orders, next)
        return ok()
      },
      async confirmReceive() {
        const next = read(STORAGE_KEYS.orders, []).map(item => item._id === params.order_id ? { ...item, status: ORDER_STATUS.pendingReview, confirm_time: Date.now() } : item)
        write(STORAGE_KEYS.orders, next)
        return ok()
      },
      async deleteOrder() {
        write(STORAGE_KEYS.orders, read(STORAGE_KEYS.orders, []).filter(item => item._id !== params.order_id))
        return ok()
      },
      async addEvaluate() {
        const list = read(STORAGE_KEYS.evaluations, [])
        write(STORAGE_KEYS.evaluations, [{ ...params, _id: `eval-${Date.now()}`, create_date: Date.now() }, ...list])
        const next = read(STORAGE_KEYS.orders, []).map(item => item._id === params.order_id ? { ...item, status: ORDER_STATUS.completed, evaluate_time: Date.now() } : item)
        write(STORAGE_KEYS.orders, next)
        return ok({}, '评价已提交')
      },
      async applyAfterSale() {
        const list = read(STORAGE_KEYS.afterSales, [])
        const orderList = read(STORAGE_KEYS.orders, [])
        const sourceOrder = orderList.find(order => order._id === params.order_id)
        const item = {
          ...params,
          _id: `as-${Date.now()}`,
          aftersale_no: `AS${Date.now()}`,
          prev_order_status: sourceOrder ? Number(sourceOrder.status) : ORDER_STATUS.completed,
          status: 0,
          create_date: Date.now(),
          update_date: Date.now()
        }
        write(STORAGE_KEYS.afterSales, [item, ...list])
        const next = orderList.map(order => order._id === params.order_id ? { ...order, status: ORDER_STATUS.refunding, aftersale_time: Date.now() } : order)
        write(STORAGE_KEYS.orders, next)
        return ok(item, '售后申请已提交')
      },
      async getAfterSaleList() {
        return ok(paginate(read(STORAGE_KEYS.afterSales, []), params.page, params.pageSize))
      },
      async auditAfterSale() {
        const id = params.after_sale_id || params.afterSaleId
        const approved = params.result !== 'reject'
        const afterSales = read(STORAGE_KEYS.afterSales, [])
        const record = afterSales.find(item => item._id === id)
        if (!record) return fail('售后记录不存在', 404)
        if (record.status !== 0) return fail('只有待审核售后可以审核')

        const now = Date.now()
        write(STORAGE_KEYS.afterSales, afterSales.map(item => item._id === id ? {
          ...item,
          status: approved ? 1 : 2,
          audit_result: approved ? 'approved' : 'rejected',
          audit_remark: params.remark || (approved ? '演示审核通过' : '演示审核拒绝'),
          audit_time: now,
          update_date: now
        } : item))

        if (!approved) {
          const next = read(STORAGE_KEYS.orders, []).map(order => order._id === record.order_id ? { ...order, status: restoreMockOrderStatus(record.prev_order_status), aftersale_reject_time: now } : order)
          write(STORAGE_KEYS.orders, next)
        }

        return ok({}, approved ? '已同意售后申请' : '已拒绝售后申请')
      },
      async cancelAfterSale() {
        const id = params.after_sale_id || params.afterSaleId
        const afterSales = read(STORAGE_KEYS.afterSales, [])
        const record = afterSales.find(item => item._id === id)
        if (!record) return fail('售后记录不存在', 404)
        if (![0, 1].includes(record.status)) return fail('当前售后状态不能取消')

        const now = Date.now()
        write(STORAGE_KEYS.afterSales, afterSales.map(item => item._id === id ? {
          ...item,
          status: 5,
          cancel_reason: params.reason || '用户取消',
          cancel_time: now,
          update_date: now
        } : item))
        const next = read(STORAGE_KEYS.orders, []).map(order => order._id === record.order_id ? { ...order, status: restoreMockOrderStatus(record.prev_order_status), aftersale_cancel_time: now } : order)
        write(STORAGE_KEYS.orders, next)
        return ok({}, '售后申请已取消')
      },
      async completeAfterSale() {
        const id = params.after_sale_id || params.afterSaleId
        const afterSales = read(STORAGE_KEYS.afterSales, [])
        const record = afterSales.find(item => item._id === id)
        if (!record) return fail('售后记录不存在', 404)
        if (![1, 3].includes(record.status)) return fail('只有已同意或退货中的售后可以完成')

        const now = Date.now()
        write(STORAGE_KEYS.afterSales, afterSales.map(item => item._id === id ? {
          ...item,
          status: 4,
          refund_no: params.refund_no || `RF${now}`,
          complete_time: now,
          update_date: now
        } : item))
        const next = read(STORAGE_KEYS.orders, []).map(order => order._id === record.order_id ? { ...order, status: ORDER_STATUS.completed, refund_time: now } : order)
        write(STORAGE_KEYS.orders, next)
        return ok({}, '退款已完成')
      },
      async getLogistics() {
        return ok([
          { time: Date.now() - 7200000, text: '商家已通知快递揽收' },
          { time: Date.now() - 3600000, text: '包裹正在前往分拣中心' }
        ])
      }
    }
    const handler = handlers[action]
    if (!handler) return fail(`接口 ${action} 暂未实现`, 404)
    return handler()
  }
}
