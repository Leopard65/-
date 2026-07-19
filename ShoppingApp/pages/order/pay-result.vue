<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { ROUTES } from '@/constants/routes'

const orderId = ref('')

onLoad((options = {}) => {
  orderId.value = options.orderId || ''
})
</script>

<template>
  <view class="page-shell result-page">
    <view class="result-card card">
      <view class="result-card__icon">
        <uni-icons type="checkbox-filled" size="46" color="#ffffff"></uni-icons>
      </view>
      <text class="result-card__title">支付成功</text>
      <text class="result-card__desc">订单已进入待发货状态。真实支付接入后，这里会等待支付回调确认。</text>
      <view class="result-card__actions">
        <view class="btn-ghost" @click="uni.redirectTo({ url: `${ROUTES.orderDetail}?id=${orderId}` })">查看订单</view>
        <view class="btn-primary" @click="uni.switchTab({ url: ROUTES.home })">继续逛逛</view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.result-page {
  padding: 80rpx 24rpx;
}

.result-card {
  padding: 64rpx 36rpx;
  text-align: center;
}

.result-card__icon {
  width: 112rpx;
  height: 112rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 28rpx;
  background: #2f5d50;
  border-radius: 50%;
}

.result-card__title {
  display: block;
  color: #1f2522;
  font-size: 42rpx;
  font-weight: 800;
}

.result-card__desc {
  display: block;
  margin-top: 18rpx;
  color: #8a928d;
  font-size: 26rpx;
  line-height: 1.6;
}

.result-card__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18rpx;
  margin-top: 42rpx;
}
</style>
