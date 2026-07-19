<script setup>
import { computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { ROUTES } from '@/constants/routes'
import { STORAGE_KEYS } from '@/constants/status'
import runtimeConfig from '@/config/runtime'

const userStore = useUserStore()

const accountText = computed(() => {
  if (!userStore.isLogin) return '未登录'
  return `${userStore.nickname} · ${userStore.phone || '已登录'}`
})

const rows = computed(() => [
  { label: '账号状态', value: accountText.value, action: userStore.isLogin ? '' : '登录', route: userStore.isLogin ? '' : ROUTES.login },
  { label: '账号与安全', value: userStore.isLogin ? '已登录' : '需登录', route: ROUTES.accountSecurity },
  { label: '隐私设置', value: runtimeConfig.legal.privacyVersion, route: ROUTES.privacySettings },
  { label: '账号注销', value: '', route: ROUTES.accountCancel },
  { label: '关于薪超', value: runtimeConfig.version, route: ROUTES.about },
  { label: '用户协议', value: '', route: ROUTES.agreement },
  { label: '隐私政策', value: '', route: ROUTES.privacy },
  { label: '运行诊断', value: '', route: ROUTES.diagnostics }
])

const cacheKeys = [
  STORAGE_KEYS.cart,
  STORAGE_KEYS.orders,
  STORAGE_KEYS.addresses,
  STORAGE_KEYS.collects,
  STORAGE_KEYS.messages,
  STORAGE_KEYS.coupons,
  STORAGE_KEYS.userCoupons,
  STORAGE_KEYS.afterSales,
  STORAGE_KEYS.evaluations,
  STORAGE_KEYS.privacyStatus,
  STORAGE_KEYS.apiErrors,
  'xc_search_history'
]

function goRow(item) {
  if (!item.route) return
  uni.navigateTo({ url: item.route })
}

function clearDemoCache() {
  uni.showModal({
    title: '清理本地缓存',
    content: '将清理本机 mock 演示数据和搜索历史，不会删除云端订单。',
    confirmText: '清理',
    confirmColor: '#b84a3c',
    success: (res) => {
      if (!res.confirm) return
      cacheKeys.forEach(key => uni.removeStorageSync(key))
      uni.showToast({ title: '已清理', icon: 'success' })
    }
  })
}

async function logout() {
  if (!userStore.isLogin) {
    uni.navigateTo({ url: ROUTES.login })
    return
  }
  const res = await new Promise(resolve => {
    uni.showModal({
      title: '退出登录',
      content: '退出后本机将不再保留当前账号状态。',
      confirmText: '退出',
      success: resolve
    })
  })
  if (!res.confirm) return
  await userStore.logout()
  uni.showToast({ title: '已退出登录', icon: 'success' })
}
</script>

<template>
  <view class="page">
    <view class="hero">
      <text class="hero__title">设置</text>
      <text class="hero__desc">账号、协议与发布前检查</text>
    </view>

    <view class="panel">
      <view v-for="item in rows" :key="item.label" class="row" @click="goRow(item)">
        <text class="row__label">{{ item.label }}</text>
        <view class="row__right">
          <text v-if="item.value" class="row__value">{{ item.value }}</text>
          <text v-if="item.action" class="row__action">{{ item.action }}</text>
          <text v-if="item.route" class="row__arrow">›</text>
        </view>
      </view>
    </view>

    <view class="panel">
      <view class="row" @click="clearDemoCache">
        <text class="row__label">清理本地演示缓存</text>
        <text class="row__arrow">›</text>
      </view>
    </view>

    <button class="logout-btn" @click="logout">{{ userStore.isLogin ? '退出登录' : '去登录' }}</button>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 28rpx 24rpx 72rpx;
  background: #f7f5f0;
  box-sizing: border-box;
}

.hero {
  padding: 32rpx 28rpx;
  color: #fff;
  background: #2f5d50;
  border-radius: 24rpx;
  box-shadow: 0 18rpx 40rpx rgba(47, 93, 80, 0.2);
}

.hero__title,
.hero__desc {
  display: block;
}

.hero__title {
  font-size: 42rpx;
  font-weight: 900;
}

.hero__desc {
  margin-top: 12rpx;
  color: rgba(255, 255, 255, 0.78);
  font-size: 24rpx;
}

.panel {
  margin-top: 22rpx;
  padding: 0 24rpx;
  background: #fff;
  border: 1rpx solid #e7e3dc;
  border-radius: 22rpx;
}

.row {
  min-height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  border-bottom: 1rpx solid #f1eee7;
}

.row:last-child {
  border-bottom: none;
}

.row__label {
  color: #1f2522;
  font-size: 28rpx;
  font-weight: 700;
}

.row__right {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 10rpx;
}

.row__value {
  max-width: 420rpx;
  color: #8a928d;
  font-size: 24rpx;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row__action {
  color: #2f5d50;
  font-size: 24rpx;
  font-weight: 800;
}

.row__arrow {
  color: #b8b1a6;
  font-size: 42rpx;
}

.logout-btn {
  height: 88rpx;
  margin-top: 24rpx;
  color: #b84a3c;
  background: #fff;
  border: 1rpx solid #eadbd6;
  border-radius: 22rpx;
  font-size: 28rpx;
  font-weight: 800;
  line-height: 88rpx;
}

.logout-btn::after {
  border: none;
}
</style>
