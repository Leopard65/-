<script setup>
import { ref } from 'vue'
import { onLoad, onPullDownRefresh, onReachBottom, onShow } from '@dcloudio/uni-app'
import { api } from '@/api/client'
import { ORDER_STATUS } from '@/constants/status'
import { ROUTES } from '@/constants/routes'
import XEmpty from '@/components/x-empty/x-empty.vue'
import XOrderCard from '@/components/x-order-card/x-order-card.vue'

const tabs = [
  { label: '全部', value: 'all' },
  { label: '待付款', value: ORDER_STATUS.pendingPay },
  { label: '待发货', value: ORDER_STATUS.pendingShip },
  { label: '待收货', value: ORDER_STATUS.pendingReceive },
  { label: '待评价', value: ORDER_STATUS.pendingReview },
  { label: '退款/售后', value: 'aftersale' }
]
const current = ref('all')
const orders = ref([])
const page = ref(1)
const pageSize = 10
const hasMore = ref(true)
const loading = ref(false)

const loadOrders = async (reset = true) => {
  if (loading.value) return
  loading.value = true
  if (reset) {
    page.value = 1
    hasMore.value = true
  }
  const res = await api.order.getOrderList({ status: current.value, page: page.value, pageSize })
  if (res?.code === 0) {
    const list = res.data.list || []
    orders.value = reset ? list : [...orders.value, ...list]
    hasMore.value = Boolean(res.data.hasMore)
  }
  loading.value = false
}

const changeTab = (value) => {
  if (value === 'aftersale') {
    uni.navigateTo({ url: ROUTES.afterSaleList })
    return
  }
  current.value = value
  loadOrders(true)
}

const getOrderId = (order) => order?._id || order?.id || order?.order_id || ''

const goDetail = (order) => {
  const orderId = getOrderId(order)
  if (!orderId) {
    uni.showToast({ title: '订单信息异常，请下拉刷新后重试', icon: 'none' })
    return
  }
  uni.navigateTo({ url: `${ROUTES.orderDetail}?id=${orderId}` })
}

const confirmAction = (options = {}) => new Promise((resolve) => {
  uni.showModal({
    title: options.title || '提示',
    content: options.content || '',
    confirmText: options.confirmText || '确认',
    confirmColor: options.confirmColor || '#2f5d50',
    success: (res) => resolve(Boolean(res.confirm)),
    fail: () => resolve(false)
  })
})

const cancelOrder = async (order) => {
  const orderId = getOrderId(order)
  if (!orderId) {
    uni.showToast({ title: '订单信息异常，请下拉刷新后重试', icon: 'none' })
    return
  }
  const confirmed = await confirmAction({
    title: '取消订单',
    content: '取消后会释放库存，并恢复本单使用的优惠券。确认取消吗？',
    confirmText: '取消订单',
    confirmColor: '#b4473c'
  })
  if (!confirmed) return
  const res = await api.order.cancelOrder({ order_id: orderId, reason: '用户取消' })
  if (res?.code === 0) {
    uni.showToast({ title: '订单已取消', icon: 'success' })
    loadOrders()
  }
}

const deleteOrder = async (order) => {
  const orderId = getOrderId(order)
  if (!orderId) {
    uni.showToast({ title: '订单信息异常，请下拉刷新后重试', icon: 'none' })
    return
  }
  const confirmed = await confirmAction({
    title: '删除订单',
    content: '删除后列表中不再展示该订单，确认删除吗？',
    confirmText: '删除',
    confirmColor: '#b4473c'
  })
  if (!confirmed) return
  const res = await api.order.deleteOrder({ order_id: orderId })
  if (res?.code === 0) {
    uni.showToast({ title: '已删除', icon: 'success' })
    loadOrders()
  }
}

const action = async (order) => {
  const orderId = getOrderId(order)
  if (!orderId) {
    uni.showToast({ title: '订单信息异常，请下拉刷新后重试', icon: 'none' })
    return
  }
  if (order.status === ORDER_STATUS.pendingPay) {
    uni.navigateTo({ url: `${ROUTES.orderPay}?orderId=${orderId}&amount=${order.pay_amount}` })
    return
  }
  if (order.status === ORDER_STATUS.pendingShip) {
    uni.navigateTo({ url: `${ROUTES.afterSaleApply}?orderId=${orderId}` })
    return
  }
  if (order.status === ORDER_STATUS.pendingReceive) {
    const res = await api.order.confirmReceive({ order_id: orderId })
    if (res?.code === 0) uni.showToast({ title: '已确认收货', icon: 'success' })
    loadOrders()
    return
  }
  if (order.status === ORDER_STATUS.pendingReview) {
    uni.navigateTo({ url: `${ROUTES.evaluate}?orderId=${orderId}` })
    return
  }
  if (order.status === ORDER_STATUS.canceled) {
    deleteOrder(order)
    return
  }
  goDetail(order)
}

onLoad((options = {}) => {
  if (options.status !== undefined && options.status !== '') {
    current.value = options.status === 'all' ? 'all' : Number(options.status)
  }
  loadOrders()
})
onShow(loadOrders)
onPullDownRefresh(async () => {
  await loadOrders(true)
  uni.stopPullDownRefresh()
})
onReachBottom(() => {
  if (!hasMore.value || loading.value) return
  page.value += 1
  loadOrders(false)
})
</script>

<template>
  <view class="page-shell order-list-page">
    <scroll-view class="tabs" scroll-x>
      <view class="tabs__inner">
        <view v-for="item in tabs" :key="item.value" class="tabs__item" :class="{ active: current === item.value }" @click="changeTab(item.value)">
          {{ item.label }}
        </view>
      </view>
    </scroll-view>
    <view v-if="orders.length" class="order-list">
      <XOrderCard v-for="order in orders" :key="getOrderId(order)" :order="order" @select="goDetail" @action="action" @cancel="cancelOrder" />
      <view class="load-more">
        <text>{{ hasMore ? (loading ? '加载中...' : '上拉查看更多') : '没有更多了' }}</text>
      </view>
    </view>
    <XEmpty v-else image="/static/empty-order.png" title="暂无订单" desc="下单后的商品会出现在这里。" action-text="去首页看看" @action="uni.switchTab({ url: ROUTES.home })" />
  </view>
</template>

<style scoped>
.tabs {
  white-space: nowrap;
  padding: 20rpx 0;
}

.tabs__inner {
  display: flex;
  gap: 14rpx;
  padding: 0 24rpx;
}

.tabs__item {
  padding: 14rpx 26rpx;
  color: #59625d;
  background: #fff;
  border: 1rpx solid #e7e3dc;
  border-radius: 999rpx;
  font-size: 24rpx;
}

.tabs__item.active {
  color: #fff;
  background: #2f5d50;
  border-color: #2f5d50;
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  padding: 0 24rpx 32rpx;
}

.load-more {
  padding: 8rpx 0 12rpx;
  text-align: center;
  color: #8a928d;
  font-size: 23rpx;
}
</style>
