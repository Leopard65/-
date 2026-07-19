import { computed, ref, shallowRef } from 'vue'
import { api } from '@/api/client'
import { ROUTES } from '@/constants/routes'
import { AFTER_SALE_STATUS, AFTER_SALE_STATUS_META, ORDER_STATUS, ORDER_STATUS_META } from '@/constants/status'
import { useUserStore } from '@/stores/user'

export const ADMIN_TABS = [
  { label: '概览', value: 'overview' },
  { label: '报表', value: 'reports' },
  { label: '订单', value: 'orders' },
  { label: '售后', value: 'afterSales' },
  { label: '商品', value: 'goods' },
  { label: '优惠券', value: 'coupons' },
  { label: '消息', value: 'messages' },
  { label: '日志', value: 'logs' }
]

export const ORDER_FILTERS = [
  { label: '全部', value: 'all' },
  { label: '待发货', value: ORDER_STATUS.pendingShip },
  { label: '待收货', value: ORDER_STATUS.pendingReceive },
  { label: '待评价', value: ORDER_STATUS.pendingReview },
  { label: '售后中', value: ORDER_STATUS.refunding },
  { label: '已完成', value: ORDER_STATUS.completed }
]

export const AFTER_SALE_FILTERS = [
  { label: '全部', value: 'all' },
  { label: '待审核', value: AFTER_SALE_STATUS.pending },
  { label: '已同意', value: AFTER_SALE_STATUS.approved },
  { label: '已完成', value: AFTER_SALE_STATUS.completed }
]

export const GOODS_FILTERS = [
  { label: '全部', value: 'all' },
  { label: '上架', value: 1 },
  { label: '下架', value: 0 }
]

export const COUPON_FILTERS = [
  { label: '全部', value: 'all' },
  { label: '可用', value: 'available' },
  { label: '停用', value: 'expired' }
]

export const MESSAGE_TYPES = [
  { label: '系统', value: 'system' },
  { label: '活动', value: 'promo' },
  { label: '订单', value: 'order' }
]

export const LOG_TARGETS = [
  { label: '全部', value: 'all' },
  { label: '商品', value: 'goods' },
  { label: '优惠券', value: 'coupon' },
  { label: '消息', value: 'message' },
  { label: '订单', value: 'order' },
  { label: '售后', value: 'after_sale' },
  { label: '系统', value: 'system' }
]

const normalizeList = (data) => Array.isArray(data) ? data : (data?.list || [])
const getOrderId = (item) => item?._id || item?.id || item?.order_id || ''
const getAfterSaleId = (item) => item?._id || item?.id || item?.after_sale_id || ''

const createDefaultOpsReport = () => ({
  checked_at: 0,
  windowDays: 7,
  summary: {},
  orderTrend: [],
  topGoods: [],
  inventoryRisks: [],
  couponStats: {},
  serviceRisks: [],
  releaseReadiness: [],
  recentLogs: [],
  collectionStatus: []
})

const showConfirm = (options = {}) => new Promise(resolve => {
  uni.showModal({
    confirmColor: '#2f5d50',
    ...options,
    success: (res) => resolve(res)
  })
})

const promptText = async ({ title, placeholderText = '', confirmText = '保存' }) => {
  const res = await showConfirm({
    title,
    editable: true,
    placeholderText,
    confirmText,
    cancelText: '取消'
  })
  if (!res.confirm) return null
  return String(res.content || '').trim()
}

export function useAdminOps() {
  const userStore = useUserStore()
  const activeTab = shallowRef('overview')
  const loading = shallowRef(false)
  const permissionError = shallowRef('')
  const permissionCode = shallowRef(0)
  const actionBusyId = shallowRef('')
  const hasLoaded = shallowRef(false)

  const orderFilter = shallowRef('all')
  const afterSaleFilter = shallowRef('all')
  const goodsFilter = shallowRef('all')
  const couponFilter = shallowRef('all')
  const messageFilter = shallowRef('all')
  const logTarget = shallowRef('all')
  const goodsKeyword = shallowRef('')

  const dashboard = ref({
    stats: {},
    orderStatus: {},
    afterSaleStatus: {}
  })
  const opsReport = ref(createDefaultOpsReport())
  const orders = ref([])
  const afterSales = ref([])
  const goodsRows = ref([])
  const couponRows = ref([])
  const messageRows = ref([])
  const operationLogs = ref([])

  const statCards = computed(() => [
    { label: '在售商品', value: dashboard.value.stats?.goods || 0, hint: '当前可售' },
    { label: '订单总数', value: dashboard.value.stats?.orders || 0, hint: '云端订单' },
    { label: '售后待办', value: dashboard.value.stats?.afterSaleTodo || 0, hint: '待审核/待退款' },
    { label: '可用券', value: dashboard.value.stats?.couponAvailable || 0, hint: '权益投放' },
    { label: '消息数', value: dashboard.value.stats?.messageTotal || 0, hint: '通知记录' },
    { label: '用户数', value: dashboard.value.stats?.users || 0, hint: '演示环境' }
  ])

  const orderStatusRows = computed(() => [
    { label: '待付款', value: dashboard.value.orderStatus?.pendingPay || 0 },
    { label: '待发货', value: dashboard.value.orderStatus?.pendingShip || 0 },
    { label: '待收货', value: dashboard.value.orderStatus?.pendingReceive || 0 },
    { label: '待评价', value: dashboard.value.orderStatus?.pendingReview || 0 },
    { label: '售后中', value: dashboard.value.orderStatus?.refunding || 0 },
    { label: '已完成', value: dashboard.value.orderStatus?.completed || 0 }
  ])

  const afterSaleStatusRows = computed(() => [
    { label: '待审核', value: dashboard.value.afterSaleStatus?.pending || 0 },
    { label: '已同意', value: dashboard.value.afterSaleStatus?.approved || 0 },
    { label: '已完成', value: dashboard.value.afterSaleStatus?.completed || 0 }
  ])

  const permissionTitle = computed(() => permissionCode.value === 401 ? '请先登录' : '暂无运营权限')
  const permissionActionText = computed(() => permissionCode.value === 401 ? '去登录' : '重新加载')

  async function loadDashboard() {
    const res = await api.admin.getDashboard({}, { showError: false, handleAuthError: false })
    if (res?.code === 0) {
      dashboard.value = res.data || { stats: {}, orderStatus: {}, afterSaleStatus: {} }
      permissionError.value = ''
      permissionCode.value = 0
      return
    }
    permissionError.value = res?.msg || '暂无运营权限'
    permissionCode.value = Number(res?.code || 0)
  }

  async function loadOrders() {
    if (permissionError.value) return
    const res = await api.admin.getOrderList({ status: orderFilter.value, page: 1, pageSize: 50 }, { showError: false })
    if (res?.code === 0) orders.value = normalizeList(res.data)
  }

  async function loadOpsReport() {
    if (permissionError.value) return
    const res = await api.admin.getOpsReport({ days: 7 }, { showError: false })
    if (res?.code === 0) opsReport.value = res.data || createDefaultOpsReport()
  }

  async function loadAfterSales() {
    if (permissionError.value) return
    const res = await api.admin.getAfterSaleList({ status: afterSaleFilter.value, page: 1, pageSize: 50 }, { showError: false })
    if (res?.code === 0) afterSales.value = normalizeList(res.data)
  }

  async function loadGoods() {
    if (permissionError.value) return
    const res = await api.admin.getGoodsList({
      status: goodsFilter.value,
      keyword: goodsKeyword.value,
      page: 1,
      pageSize: 50
    }, { showError: false })
    if (res?.code === 0) goodsRows.value = normalizeList(res.data)
  }

  async function loadCoupons() {
    if (permissionError.value) return
    const res = await api.admin.getCouponList({ status: couponFilter.value, page: 1, pageSize: 50 }, { showError: false })
    if (res?.code === 0) couponRows.value = normalizeList(res.data)
  }

  async function loadMessages() {
    if (permissionError.value) return
    const res = await api.admin.getMessageList({ type: messageFilter.value, page: 1, pageSize: 50 }, { showError: false })
    if (res?.code === 0) messageRows.value = normalizeList(res.data)
  }

  async function loadOperationLogs() {
    if (permissionError.value) return
    const res = await api.admin.getOperationLogs({ target: logTarget.value, page: 1, pageSize: 60 }, { showError: false })
    if (res?.code === 0) operationLogs.value = normalizeList(res.data)
  }

  async function loadAll() {
    loading.value = true
    await loadDashboard()
    if (!permissionError.value) {
      await Promise.all([
        loadOpsReport(),
        loadOrders(),
        loadAfterSales(),
        loadGoods(),
        loadCoupons(),
        loadMessages(),
        loadOperationLogs()
      ])
    }
    loading.value = false
  }

  function switchTab(value) {
    activeTab.value = value
  }

  function handlePermissionAction() {
    if (permissionCode.value === 401) {
      userStore.requireLogin(ROUTES.adminOps)
      return
    }
    loadAll()
  }

  async function runAction(id, runner, options = {}) {
    if (!id || actionBusyId.value) return null
    actionBusyId.value = id
    try {
      const res = await runner()
      if (res?.code === 0) {
        uni.showToast({ title: res.msg || options.successText || '处理成功', icon: 'success' })
        if (options.reload === 'current') await reloadCurrent()
        else await loadAll()
        return res
      }
      uni.showToast({ title: res?.msg || '处理失败', icon: 'none' })
      return res
    } catch (error) {
      uni.showToast({ title: error?.message || '处理失败，请稍后重试', icon: 'none' })
      return { code: 500, msg: error?.message || '处理失败' }
    } finally {
      actionBusyId.value = ''
    }
  }

  async function reloadCurrent() {
    await loadDashboard()
    const loaders = {
      overview: async () => {},
      reports: loadOpsReport,
      orders: loadOrders,
      afterSales: loadAfterSales,
      goods: loadGoods,
      coupons: loadCoupons,
      messages: loadMessages,
      logs: loadOperationLogs
    }
    await (loaders[activeTab.value] || loadAll)()
  }

  async function changeOrderFilter(value) {
    orderFilter.value = value
    await loadOrders()
  }

  async function changeAfterSaleFilter(value) {
    afterSaleFilter.value = value
    await loadAfterSales()
  }

  async function changeGoodsFilter(value) {
    goodsFilter.value = value
    await loadGoods()
  }

  async function changeCouponFilter(value) {
    couponFilter.value = value
    await loadCoupons()
  }

  async function changeMessageFilter(value) {
    messageFilter.value = value
    await loadMessages()
  }

  async function changeLogTarget(value) {
    logTarget.value = value
    await loadOperationLogs()
  }

  function orderStatusText(status) {
    return ORDER_STATUS_META[status]?.label || '未知状态'
  }

  function afterSaleStatusText(status) {
    return AFTER_SALE_STATUS_META[status] || '处理中'
  }

  function typeText(type) {
    return type === 'return' ? '退货退款' : '仅退款'
  }

  function goodsStatusText(status) {
    return Number(status) === 1 ? '上架' : '下架'
  }

  function couponStatusText(status) {
    return status === 'available' ? '可用' : '停用'
  }

  function messageTypeText(type) {
    return MESSAGE_TYPES.find(item => item.value === type)?.label || '系统'
  }

  function previewMessage(item) {
    uni.showModal({
      title: item.title,
      content: item.content,
      showCancel: false,
      confirmText: '知道了'
    })
  }

  async function shipOrder(item) {
    const orderId = getOrderId(item)
    const res = await showConfirm({
      title: '确认发货',
      content: '将订单状态改为待收货，并生成模拟物流单号。',
      confirmText: '发货'
    })
    if (res.confirm) return runAction(orderId, () => api.admin.shipOrder({ order_id: orderId }))
    return null
  }

  async function updateShipment(item) {
    const orderId = getOrderId(item)
    const trackingNo = await promptText({
      title: '编辑物流单号',
      placeholderText: item.tracking_no || `XCEXP${Date.now()}`
    })
    if (trackingNo === null) return null
    return runAction(`ship-${orderId}`, () => api.admin.updateShipment({
      order_id: orderId,
      company: item.logistics_company || '薪超优选配送',
      tracking_no: trackingNo || item.tracking_no
    }))
  }

  async function addOrderRemark(item) {
    const orderId = getOrderId(item)
    const remark = await promptText({
      title: '添加订单备注',
      placeholderText: item.admin_remark || '例如：客户要求尽快发出'
    })
    if (!remark) return null
    return runAction(`remark-${orderId}`, () => api.admin.addOrderRemark({ order_id: orderId, remark }))
  }

  async function auditAfterSale(item, result) {
    const afterSaleId = getAfterSaleId(item)
    const title = result === 'reject' ? '拒绝售后' : '同意售后'
    const remark = await promptText({
      title,
      placeholderText: result === 'reject' ? '填写拒绝原因' : '填写审核备注'
    })
    if (remark === null) return null
    return runAction(afterSaleId, () => api.admin.auditAfterSale({
      after_sale_id: afterSaleId,
      result,
      remark: remark || undefined
    }))
  }

  async function completeAfterSale(item) {
    const afterSaleId = getAfterSaleId(item)
    const res = await showConfirm({
      title: '完成退款',
      content: '将售后单改为已完成，并把订单恢复为已完成。',
      confirmText: '完成'
    })
    if (res.confirm) return runAction(afterSaleId, () => api.admin.completeAfterSale({ after_sale_id: afterSaleId }))
    return null
  }

  async function addAfterSaleRemark(item) {
    const afterSaleId = getAfterSaleId(item)
    const remark = await promptText({
      title: '添加售后备注',
      placeholderText: item.admin_remark || '例如：已电话沟通处理方案'
    })
    if (!remark) return null
    return runAction(`as-remark-${afterSaleId}`, () => api.admin.addAfterSaleRemark({ after_sale_id: afterSaleId, remark }))
  }

  async function toggleGoodsStatus(item) {
    const goodsId = item._id
    const nextStatus = Number(item.status) === 1 ? 0 : 1
    const res = await showConfirm({
      title: nextStatus === 1 ? '上架商品' : '下架商品',
      content: nextStatus === 1 ? '上架后买家端可看到该商品。' : '下架后买家端列表不再展示该商品。',
      confirmText: nextStatus === 1 ? '上架' : '下架'
    })
    if (res.confirm) return runAction(goodsId, () => api.admin.updateGoodsStatus({ goods_id: goodsId, status: nextStatus }))
    return null
  }

  async function editGoodsStock(item) {
    const value = await promptText({
      title: '调整库存',
      placeholderText: String(item.stock || 0)
    })
    if (value === null) return null
    const stock = Number(value)
    if (!Number.isFinite(stock) || stock < 0) {
      uni.showToast({ title: '请输入正确库存', icon: 'none' })
      return null
    }
    return runAction(`stock-${item._id}`, () => api.admin.updateGoodsStock({ goods_id: item._id, stock }))
  }

  async function saveGoods(draft) {
    const isEdit = Boolean(draft._id)
    const payload = {
      ...draft,
      goods_id: draft._id,
      price: Number(draft.price || 0),
      original_price: Number(draft.original_price || 0),
      stock: Number(draft.stock || 0),
      sort: Number(draft.sort || 0),
      sales: Number(draft.sales || 0),
      status: Number(draft.status || 0),
      is_new: Boolean(draft.is_new),
      is_hot: Boolean(draft.is_hot),
      is_recommend: draft.is_recommend ? 1 : 0
    }
    const res = await runAction(
      isEdit ? `goods-save-${draft._id}` : 'goods-create',
      () => isEdit ? api.admin.updateGoods(payload) : api.admin.createGoods(payload),
      { reload: 'current', successText: '商品已保存' }
    )
    const goodsId = res?.data?.goods_id || draft._id
    if (res?.code === 0 && goodsId && Array.isArray(draft.sku_list)) {
      await runAction(`sku-save-${goodsId}`, () => api.admin.updateSkuList({
        goods_id: goodsId,
        sku_list: draft.sku_list
      }), { reload: 'current', successText: 'SKU 已保存' })
    }
    return res
  }

  async function deleteGoodsDraft(item) {
    const res = await showConfirm({
      title: '删除草稿商品',
      content: '只能删除未销售的下架草稿商品，删除后不可恢复。',
      confirmText: '删除'
    })
    if (res.confirm) return runAction(`delete-${item._id}`, () => api.admin.deleteGoodsDraft({ goods_id: item._id }))
    return null
  }

  async function saveCoupon(draft) {
    const isEdit = Boolean(draft._id)
    const payload = {
      ...draft,
      coupon_id: draft._id,
      amount: Number(draft.amount || 0),
      threshold: Number(draft.threshold || 0),
      total_quantity: Number(draft.total_quantity || 0),
      per_user_limit: Number(draft.per_user_limit || 1),
      sort: Number(draft.sort || 0)
    }
    return runAction(
      isEdit ? `coupon-save-${draft._id}` : 'coupon-create',
      () => isEdit ? api.admin.updateCoupon(payload) : api.admin.createCoupon(payload),
      { reload: 'current', successText: '优惠券已保存' }
    )
  }

  async function toggleCouponStatus(item) {
    const nextStatus = item.status === 'available' ? 'expired' : 'available'
    const res = await showConfirm({
      title: nextStatus === 'available' ? '启用优惠券' : '停用优惠券',
      content: nextStatus === 'available' ? '启用后买家端可领取或使用。' : '停用后买家端会归入不可用状态。',
      confirmText: nextStatus === 'available' ? '启用' : '停用'
    })
    if (res.confirm) return runAction(item._id, () => api.admin.updateCouponStatus({ coupon_id: item._id, status: nextStatus }))
    return null
  }

  async function saveMessage(draft) {
    const isEdit = Boolean(draft._id)
    const payload = {
      ...draft,
      message_id: draft._id,
      user_id: draft.user_id || 'all',
      status: draft.status || 'published'
    }
    return runAction(
      isEdit ? `message-save-${draft._id}` : 'publish-message',
      () => isEdit ? api.admin.updateMessage(payload) : api.admin.publishMessage(payload),
      { reload: 'current', successText: isEdit ? '消息已保存' : '消息已发布' }
    )
  }

  return {
    tabs: ADMIN_TABS,
    orderFilters: ORDER_FILTERS,
    afterSaleFilters: AFTER_SALE_FILTERS,
    goodsFilters: GOODS_FILTERS,
    couponFilters: COUPON_FILTERS,
    messageTypes: MESSAGE_TYPES,
    logTargets: LOG_TARGETS,
    activeTab,
    loading,
    permissionError,
    permissionCode,
    permissionTitle,
    permissionActionText,
    actionBusyId,
    hasLoaded,
    orderFilter,
    afterSaleFilter,
    goodsFilter,
    couponFilter,
    messageFilter,
    logTarget,
    goodsKeyword,
    dashboard,
    opsReport,
    orders,
    afterSales,
    goodsRows,
    couponRows,
    messageRows,
    operationLogs,
    statCards,
    orderStatusRows,
    afterSaleStatusRows,
    getOrderId,
    getAfterSaleId,
    orderStatusText,
    afterSaleStatusText,
    typeText,
    goodsStatusText,
    couponStatusText,
    messageTypeText,
    loadAll,
    reloadCurrent,
    loadOpsReport,
    loadGoods,
    switchTab,
    handlePermissionAction,
    changeOrderFilter,
    changeAfterSaleFilter,
    changeGoodsFilter,
    changeCouponFilter,
    changeMessageFilter,
    changeLogTarget,
    previewMessage,
    shipOrder,
    updateShipment,
    addOrderRemark,
    auditAfterSale,
    completeAfterSale,
    addAfterSaleRemark,
    toggleGoodsStatus,
    editGoodsStock,
    saveGoods,
    deleteGoodsDraft,
    saveCoupon,
    toggleCouponStatus,
    saveMessage
  }
}
