<script setup>
import { computed, ref, shallowRef, watch } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { api } from '@/api/client'
import { ROUTES } from '@/constants/routes'
import { useUserStore } from '@/stores/user'
import XEmpty from '@/components/x-empty/x-empty.vue'
import { formatDateTime } from '@/utils/format'

const tabs = [
  { label: '可领取', value: 'market' },
  { label: '可使用', value: 'available' },
  { label: '已使用', value: 'used' },
  { label: '已失效', value: 'expired' }
]

const userStore = useUserStore()
const current = shallowRef('available')
const coupons = ref([])
const loading = shallowRef(false)
const actionBusyId = shallowRef('')

const emptyDesc = computed(() => current.value === 'market'
  ? '暂无可领取优惠，稍后再来看看。'
  : '可用优惠会在领取后出现在这里。')

const normalizeList = (data) => Array.isArray(data) ? data : (data?.list || [])

const loadCoupons = async () => {
  if (!userStore.requireLogin(ROUTES.coupon)) return
  loading.value = true
  const params = current.value === 'market'
    ? { scope: 'market', status: 'available', page: 1, pageSize: 50 }
    : { scope: 'mine', status: current.value, page: 1, pageSize: 50 }
  const res = await api.service.getCouponList(params, { loading: false, showError: false })
  if (res?.code === 0) coupons.value = normalizeList(res.data)
  loading.value = false
}

watch(current, loadCoupons)
onLoad(loadCoupons)
onShow(loadCoupons)

const thresholdText = (item) => {
  const value = item.threshold ?? item.min_amount ?? 0
  return value > 0 ? `满 ${value} 元可用` : '无门槛'
}

const dateText = (item) => {
  if (item.expire) return `有效期至 ${item.expire}`
  if (item.end_time) return `有效期至 ${formatDateTime(item.end_time).slice(0, 10)}`
  return '长期有效'
}

const useCoupon = () => {
  uni.switchTab({ url: ROUTES.home })
}

const actionText = (item) => {
  if (current.value === 'market') return item.received ? '已领取' : '领取'
  if (current.value === 'available') return '去使用'
  return current.value === 'used' ? '已使用' : '已失效'
}

const isActionDisabled = (item) => {
  if (actionBusyId.value) return true
  if (current.value === 'market') return item.received || !item.can_receive
  return current.value !== 'available'
}

const receiveCoupon = async (item) => {
  if (!item?._id || isActionDisabled(item)) return
  actionBusyId.value = item._id
  const res = await api.service.receiveCoupon({ coupon_id: item._id }, { loading: false })
  actionBusyId.value = ''
  if (res?.code === 0) {
    uni.showToast({ title: res.msg || '领取成功', icon: 'success' })
    await loadCoupons()
    return
  }
  uni.showToast({ title: res?.msg || '领取失败', icon: 'none' })
}

const handleCouponAction = (item) => {
  if (current.value === 'market') {
    receiveCoupon(item)
    return
  }
  if (current.value === 'available') useCoupon()
}
</script>

<template>
  <view class="page">
    <view class="tabs">
      <view v-for="tab in tabs" :key="tab.value" class="tab" :class="{ 'tab--active': current === tab.value }" @click="current = tab.value">
        <text>{{ tab.label }}</text>
      </view>
    </view>

    <scroll-view class="list" scroll-y>
      <view v-for="item in coupons" :key="`${current}-${item._id}`" class="coupon-card" :class="{ 'coupon-card--muted': current === 'used' || current === 'expired' }">
        <view class="coupon-card__amount">
          <text class="coupon-card__symbol">¥</text>
          <text class="coupon-card__number">{{ item.amount }}</text>
        </view>
        <view class="coupon-card__body">
          <text class="coupon-card__title">{{ item.title || item.name }}</text>
          <text class="coupon-card__condition">{{ thresholdText(item) }}</text>
          <text class="coupon-card__date">{{ dateText(item) }}</text>
        </view>
        <view
          class="coupon-card__action"
          :class="{ 'coupon-card__action--disabled': isActionDisabled(item) }"
          @click="handleCouponAction(item)"
        >
          <text>{{ actionText(item) }}</text>
        </view>
      </view>

      <XEmpty
        v-if="!loading && coupons.length === 0"
        image="/static/empty-coupon.png"
        title="暂无优惠券"
        :desc="emptyDesc"
        :action-text="current === 'market' ? '' : '去领券'"
        @action="current = 'market'"
      />
    </scroll-view>
  </view>
</template>

<style scoped>
.page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f7f5f0;
}

.tabs {
  display: flex;
  gap: 12rpx;
  padding: 18rpx 24rpx;
  background: #f7f5f0;
}

.tab {
  flex: 1;
  height: 66rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #59625d;
  background: #fff;
  border: 1rpx solid #e7e3dc;
  border-radius: 999rpx;
  font-size: 26rpx;
}

.tab--active {
  color: #fff;
  background: #2f5d50;
  border-color: #2f5d50;
  font-weight: 700;
}

.list {
  flex: 1;
  padding: 8rpx 24rpx 32rpx;
  box-sizing: border-box;
}

.coupon-card {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  min-height: 178rpx;
  margin-bottom: 18rpx;
  background: #fff;
  border: 1rpx solid #e7e3dc;
  border-radius: 22rpx;
}

.coupon-card::before,
.coupon-card::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 28rpx;
  height: 28rpx;
  background: #f7f5f0;
  border-radius: 50%;
}

.coupon-card::before {
  left: 198rpx;
  transform: translate(-50%, -50%);
}

.coupon-card::after {
  right: 158rpx;
  transform: translate(50%, -50%);
}

.coupon-card--muted {
  opacity: 0.56;
}

.coupon-card__amount {
  width: 198rpx;
  display: flex;
  align-items: baseline;
  justify-content: center;
  color: #b58a45;
}

.coupon-card__symbol {
  font-size: 28rpx;
  font-weight: 700;
}

.coupon-card__number {
  font-size: 66rpx;
  font-weight: 900;
}

.coupon-card__body {
  flex: 1;
  min-width: 0;
  padding: 24rpx 12rpx;
  border-left: 1rpx dashed #e7e3dc;
}

.coupon-card__title {
  display: block;
  color: #1f2522;
  font-size: 30rpx;
  font-weight: 800;
}

.coupon-card__condition,
.coupon-card__date {
  display: block;
  margin-top: 8rpx;
  color: #8a928d;
  font-size: 22rpx;
}

.coupon-card__action {
  position: relative;
  z-index: 1;
  width: 128rpx;
  height: 58rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  color: #fff;
  background: #2f5d50;
  border-radius: 999rpx;
  font-size: 23rpx;
  font-weight: 700;
}

.coupon-card__action--disabled {
  color: #8a928d;
  background: #f1eee7;
}
</style>
