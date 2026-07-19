<script setup>
import { computed } from 'vue'
import { ROUTES } from '@/constants/routes'
import runtimeConfig from '@/config/runtime'

const featureRows = computed(() => [
  { label: '应用版本', value: runtimeConfig.version },
  { label: '运行环境', value: runtimeConfig.runtimeEnv },
  { label: '支付状态', value: runtimeConfig.features.mockPayment ? '模拟支付' : '真实支付' },
  { label: '物流状态', value: runtimeConfig.features.mockLogistics ? '模拟物流' : '真实物流' },
  { label: '推送状态', value: runtimeConfig.features.mockPush ? '模拟推送' : '真实推送' },
  { label: '协议版本', value: runtimeConfig.legal.agreementVersion },
  { label: '隐私版本', value: runtimeConfig.legal.privacyVersion }
])

function go(url) {
  uni.navigateTo({ url })
}
</script>

<template>
  <view class="page">
    <view class="brand">
      <image class="brand__logo" src="/static/logo.png" mode="aspectFit"></image>
      <text class="brand__name">薪超购物</text>
      <text class="brand__desc">精品生活方式购物 App</text>
    </view>

    <view class="panel">
      <view v-for="item in featureRows" :key="item.label" class="info-row">
        <text>{{ item.label }}</text>
        <text>{{ item.value }}</text>
      </view>
    </view>

    <view class="panel">
      <view class="link-row" @click="go(ROUTES.agreement)">
        <text>用户协议</text>
        <text>›</text>
      </view>
      <view class="link-row" @click="go(ROUTES.privacy)">
        <text>隐私政策</text>
        <text>›</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 42rpx 24rpx 72rpx;
  background: #f7f5f0;
  box-sizing: border-box;
}

.brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 36rpx 24rpx;
}

.brand__logo {
  width: 132rpx;
  height: 132rpx;
}

.brand__name {
  margin-top: 20rpx;
  color: #1f2522;
  font-size: 42rpx;
  font-weight: 900;
}

.brand__desc {
  margin-top: 10rpx;
  color: #59625d;
  font-size: 25rpx;
}

.panel {
  margin-top: 22rpx;
  padding: 0 24rpx;
  background: #fff;
  border: 1rpx solid #e7e3dc;
  border-radius: 22rpx;
}

.info-row,
.link-row {
  min-height: 92rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #59625d;
  border-bottom: 1rpx solid #f1eee7;
  font-size: 26rpx;
}

.info-row:last-child,
.link-row:last-child {
  border-bottom: none;
}

.info-row text:last-child,
.link-row text:last-child {
  color: #1f2522;
  font-weight: 800;
}
</style>
