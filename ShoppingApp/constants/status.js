export const STORAGE_KEYS = {
  token: 'xc_token',
  userInfo: 'xc_user_info',
  cart: 'xc_cart',
  orders: 'xc_orders',
  addresses: 'xc_addresses',
  collects: 'xc_collects',
  messages: 'xc_messages',
  coupons: 'xc_coupons',
  userCoupons: 'xc_user_coupons',
  afterSales: 'xc_after_sales',
  evaluations: 'xc_evaluations',
  goods: 'xc_goods',
  goodsSkus: 'xc_goods_skus',
  operationLogs: 'xc_operation_logs',
  privacyStatus: 'xc_privacy_status',
  apiErrors: 'xc_api_errors'
}

export const ORDER_STATUS = {
  pendingPay: 0,
  pendingShip: 1,
  pendingReceive: 2,
  pendingReview: 3,
  completed: 4,
  refunding: 5,
  canceled: 6
}

export const ORDER_STATUS_META = {
  [ORDER_STATUS.pendingPay]: { label: '待付款', tone: 'warning', action: '去支付' },
  [ORDER_STATUS.pendingShip]: { label: '待发货', tone: 'info', action: '申请退款' },
  [ORDER_STATUS.pendingReceive]: { label: '待收货', tone: 'info', action: '确认收货' },
  [ORDER_STATUS.pendingReview]: { label: '待评价', tone: 'success', action: '评价' },
  [ORDER_STATUS.completed]: { label: '已完成', tone: 'neutral', action: '申请售后' },
  [ORDER_STATUS.refunding]: { label: '售后中', tone: 'warning', action: '查看售后' },
  [ORDER_STATUS.canceled]: { label: '已取消', tone: 'muted', action: '删除' }
}

export const AFTER_SALE_STATUS = {
  pending: 0,
  approved: 1,
  rejected: 2,
  returning: 3,
  completed: 4,
  canceled: 5
}

export const AFTER_SALE_STATUS_META = {
  [AFTER_SALE_STATUS.pending]: '待审核',
  [AFTER_SALE_STATUS.approved]: '已同意',
  [AFTER_SALE_STATUS.rejected]: '已拒绝',
  [AFTER_SALE_STATUS.returning]: '退货中',
  [AFTER_SALE_STATUS.completed]: '已完成',
  [AFTER_SALE_STATUS.canceled]: '已取消'
}

export const PAY_METHODS = [
  { value: 'wechat', label: '微信支付', hint: '模拟唤起微信支付' },
  { value: 'alipay', label: '支付宝', hint: '模拟唤起支付宝支付' },
  { value: 'cod', label: '货到付款', hint: '演示模式可选' }
]

export const RESPONSE_CODE = {
  ok: 0,
  unauthorized: 401,
  notFound: 404,
  businessError: 422,
  serverError: 500
}
