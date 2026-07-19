<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { api } from '@/api/client'
import { ORDER_STATUS, ORDER_STATUS_META } from '@/constants/status'
import { ROUTES } from '@/constants/routes'
import { formatDateTime, formatMoney } from '@/utils/format'
import XEmpty from '@/components/x-empty/x-empty.vue'

const orderId = ref('')
const order = ref(null)
const logistics = ref([])
const loading = ref(false)
const loadError = ref('')

const meta = computed(() => order.value ? ORDER_STATUS_META[order.value.status] : null)
const currentOrderId = computed(() => order.value?._id || order.value?.id || order.value?.order_id || orderId.value)
const canCancel = computed(() => order.value?.status === ORDER_STATUS.pendingPay)

const loadDetail = async (id) => {
  const currentId = id || orderId.value
  if (!currentId) {
    order.value = null
    logistics.value = []
    loadError.value = '缺少订单 ID'
    return
  }
  loading.value = true
  loadError.value = ''
  const res = await api.order.getOrderDetail({ order_id: currentId }, { showError: false })
  if (res?.code === 0) {
    order.value = res.data
    const logRes = await api.order.getLogistics({ order_id: currentId }, { showError: false })
    logistics.value = logRes?.data || []
  } else {
    order.value = null
    logistics.value = []
    loadError.value = res?.msg || '订单不存在'
  }
  loading.value = false
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

const cancelOrder = async () => {
  const id = currentOrderId.value
  if (!id) return
  const confirmed = await confirmAction({
    title: '取消订单',
    content: '取消后会释放库存，并恢复本单使用的优惠券。确认取消吗？',
    confirmText: '取消订单',
    confirmColor: '#b4473c'
  })
  if (!confirmed) return
  const res = await api.order.cancelOrder({ order_id: id, reason: '用户取消' })
  if (res?.code === 0) {
    uni.showToast({ title: '订单已取消', icon: 'success' })
    loadDetail(id)
  }
}

const deleteOrder = async () => {
  const id = currentOrderId.value
  if (!id) return
  const confirmed = await confirmAction({
    title: '删除订单',
    content: '删除后列表中不再展示该订单，确认删除吗？',
    confirmText: '删除',
    confirmColor: '#b4473c'
  })
  if (!confirmed) return
  const res = await api.order.deleteOrder({ order_id: id })
  if (res?.code === 0) {
    uni.showToast({ title: '已删除', icon: 'success' })
    setTimeout(() => {
      uni.redirectTo({ url: ROUTES.orderList })
    }, 500)
  }
}

const primaryAction = async () => {
  if (!order.value) return
  const currentId = currentOrderId.value
  if (order.value.status === ORDER_STATUS.pendingPay) {
    uni.navigateTo({ url: `${ROUTES.orderPay}?orderId=${currentId}&amount=${order.value.pay_amount}` })
    return
  }
  if (order.value.status === ORDER_STATUS.pendingShip) {
    uni.navigateTo({ url: `${ROUTES.afterSaleApply}?orderId=${currentId}` })
    return
  }
  if (order.value.status === ORDER_STATUS.pendingReceive) {
    const res = await api.order.confirmReceive({ order_id: currentId })
    if (res?.code === 0) uni.showToast({ title: '已确认收货', icon: 'success' })
    loadDetail(currentId)
    return
  }
  if (order.value.status === ORDER_STATUS.pendingReview) {
    uni.navigateTo({ url: `${ROUTES.evaluate}?orderId=${currentId}` })
    return
  }
  if (order.value.status === ORDER_STATUS.completed) {
    uni.navigateTo({ url: `${ROUTES.afterSaleApply}?orderId=${currentId}` })
    return
  }
  if (order.value.status === ORDER_STATUS.refunding) {
    uni.navigateTo({ url: ROUTES.afterSaleList })
    return
  }
  if (order.value.status === ORDER_STATUS.canceled) {
    deleteOrder()
  }
}

onLoad((options = {}) => {
  orderId.value = options.id || options.orderId || ''
  loadDetail(orderId.value)
})

onShow(() => {
  if (orderId.value) loadDetail(orderId.value)
})
</script>

<template>
  <view class="page-shell detail-page" v-if="order">
    <view class="status-card card">
      <text class="status-card__label">{{ meta?.label || '订单状态' }}</text>
      <text class="status-card__hint">订单号 {{ order.order_no }}</text>
    </view>
    <view class="card block">
      <text class="block__title">收货地址</text>
      <text class="block__text">{{ order.address.name }} {{ order.address.phone }}</text>
      <text class="block__text">{{ order.address.province }}{{ order.address.city }}{{ order.address.district }}{{ order.address.detail }}</text>
    </view>
    <view class="card block">
      <text class="block__title">商品清单</text>
      <view class="goods-line" v-for="item in order.goods_list" :key="`${item.goods_id}-${item.sku_id}`">
        <image class="goods-line__image" :src="item.goods_image || item.image" mode="aspectFill"></image>
        <view class="goods-line__info">
          <text class="goods-line__name">{{ item.goods_name || item.name }}</text>
          <text class="goods-line__sku">{{ item.sku_info || '默认规格' }}</text>
          <text class="goods-line__price">¥{{ formatMoney(item.price) }} x{{ item.quantity }}</text>
        </view>
      </view>
    </view>
    <view class="card block">
      <text class="block__title">金额明细</text>
      <view class="amount-row"><text>商品金额</text><text>¥{{ formatMoney(order.total_amount) }}</text></view>
      <view class="amount-row"><text>运费</text><text>¥{{ formatMoney(order.freight) }}</text></view>
      <view class="amount-row"><text>优惠</text><text>-¥{{ formatMoney(order.discount_amount) }}</text></view>
      <view class="amount-row strong"><text>实付</text><text>¥{{ formatMoney(order.pay_amount) }}</text></view>
    </view>
    <view class="card block">
      <text class="block__title">物流跟踪</text>
      <view v-for="item in logistics" :key="item.time" class="log-line">
        <text>{{ formatDateTime(item.time) }}</text>
        <text>{{ item.text }}</text>
      </view>
    </view>
    <view class="detail-actions safe-area-bottom" v-if="meta?.action">
      <view v-if="canCancel" class="detail-actions__secondary" @click="cancelOrder">取消订单</view>
      <view class="detail-actions__primary" @click="primaryAction">{{ meta.action }}</view>
    </view>
  </view>
  <view v-else class="page-shell detail-page detail-page--empty">
    <XEmpty
      image="/static/empty-order.png"
      :title="loading ? '正在加载订单' : '订单不存在'"
      :desc="loading ? '请稍候' : (loadError || '请返回订单列表刷新后重试。')"
      action-text="返回订单列表"
      @action="uni.redirectTo({ url: ROUTES.orderList })"
    />
  </view>
</template>

<style scoped>
.detail-page {
  padding: 24rpx 24rpx 140rpx;
}

.detail-page--empty {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.status-card,
.block {
  padding: 28rpx;
  margin-bottom: 18rpx;
}

.status-card__label {
  display: block;
  color: #2f5d50;
  font-size: 42rpx;
  font-weight: 800;
}

.status-card__hint,
.block__text,
.log-line {
  display: block;
  margin-top: 10rpx;
  color: #8a928d;
  font-size: 24rpx;
  line-height: 1.6;
}

.block__title {
  display: block;
  margin-bottom: 18rpx;
  color: #1f2522;
  font-size: 30rpx;
  font-weight: 700;
}

.goods-line {
  display: flex;
  padding: 12rpx 0;
}

.goods-line__image {
  width: 130rpx;
  height: 130rpx;
  border-radius: 16rpx;
}

.goods-line__info {
  flex: 1;
  margin-left: 18rpx;
}

.goods-line__name {
  display: block;
  color: #1f2522;
  font-size: 27rpx;
  font-weight: 700;
}

.goods-line__sku,
.goods-line__price {
  display: block;
  margin-top: 8rpx;
  color: #8a928d;
  font-size: 23rpx;
}

.amount-row {
  display: flex;
  justify-content: space-between;
  padding: 10rpx 0;
  color: #59625d;
  font-size: 26rpx;
}

.amount-row.strong {
  color: #1f2522;
  font-weight: 800;
}

.log-line {
  display: flex;
  flex-direction: column;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #e7e3dc;
}

.detail-actions {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: 24rpx;
  display: flex;
  gap: 18rpx;
}

.detail-actions__primary,
.detail-actions__secondary {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  font-size: 30rpx;
  font-weight: 700;
}

.detail-actions__primary {
  flex: 1;
  color: #fff;
  background: #2f5d50;
}

.detail-actions__secondary {
  width: 220rpx;
  color: #2f5d50;
  background: #fff;
  border: 1rpx solid #d9d4ca;
}
</style>
