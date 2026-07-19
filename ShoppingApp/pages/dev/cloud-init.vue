<script setup>
import { computed, ref, shallowRef } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { api } from '@/api/client'
import { ROUTES } from '@/constants/routes'
import runtimeConfig from '@/config/runtime'

const loading = shallowRef(false)
const lastAction = shallowRef('')
const errorMessage = shallowRef('')
const result = ref(null)

const demoAccount = runtimeConfig.demoAccount

const collectionLabels = {
  home_banner: '首页 Banner',
  goods_category: '商品分类',
  goods: '商品',
  goods_sku: 'SKU',
  coupon: '优惠券',
  message: '消息',
  goods_evaluate: '评价',
  user_address: '默认地址'
}

const collectionRows = computed(() => {
  const collections = result.value?.data?.collections || {}
  return Object.keys(collectionLabels).map(key => ({
    key,
    label: collectionLabels[key],
    count: Number(collections[key] || 0)
  }))
})

const statusText = computed(() => {
  if (errorMessage.value) return errorMessage.value
  if (!result.value) return '尚未检查云端数据'
  return result.value.msg || '云端连接正常'
})

const hasSeeded = computed(() => collectionRows.value.some(item => item.count > 0))

const isBusyMessage = (message = '') => /资源.*繁忙|服务器繁忙|resource exhausted|busy|稍后重试/i.test(message)

async function runAction(action) {
  if (loading.value) return
  loading.value = true
  errorMessage.value = ''
  lastAction.value = action

  try {
    const actionMap = {
      status: api.dev.initStatus,
      seed: api.dev.seedDemo,
      resetDemo: api.dev.resetDemo
    }
    const res = await actionMap[action]({}, { showError: false, allowMock: false })
    result.value = res

    if (res?.code !== 0) {
      errorMessage.value = res?.msg || '云端操作失败，请确认服务空间已关联并上传云函数'
      if (isBusyMessage(errorMessage.value)) {
        errorMessage.value = '云数据库资源暂时繁忙，请等待 10 秒后点“检查状态”或重新初始化。'
      }
      uni.showToast({ title: errorMessage.value, icon: 'none' })
      return
    }

    uni.showToast({
      title: action === 'seed' ? '初始化完成' : action === 'resetDemo' ? '已重置演示数据' : '状态已更新',
      icon: 'success'
    })
  } catch (error) {
    errorMessage.value = error?.message || '云端连接失败，请稍后重试'
    if (isBusyMessage(errorMessage.value)) {
      errorMessage.value = '云数据库资源暂时繁忙，请等待 10 秒后重试。'
    }
    uni.showToast({ title: errorMessage.value, icon: 'none' })
  } finally {
    loading.value = false
  }
}

function confirmReset() {
  uni.showModal({
    title: '重置演示数据',
    content: '只会清理固定 demo ID 和体验账号相关演示数据，不会清理你的真实用户数据。',
    confirmText: '重置',
    confirmColor: '#b84a3c',
    success: (res) => {
      if (res.confirm) runAction('resetDemo')
    }
  })
}

function goDiagnostics() {
  uni.navigateTo({ url: ROUTES.diagnostics })
}

onLoad(() => {
  runAction('status')
})
</script>

<template>
  <view class="page">
    <view class="hero">
      <text class="hero__eyebrow">uniCloud Demo</text>
      <text class="hero__title">云端初始化</text>
      <text class="hero__desc">把新服务空间写入演示商品、优惠券、消息、默认地址，并创建真实 uni-id 体验账号。</text>
    </view>

    <view class="panel">
      <view class="panel__head">
        <text class="panel__title">体验账号</text>
        <text class="panel__tag">真实登录</text>
      </view>
      <view class="account-row">
        <text class="account-row__label">账号</text>
        <text class="account-row__value">{{ demoAccount.username }}</text>
      </view>
      <view class="account-row">
        <text class="account-row__label">密码</text>
        <text class="account-row__value">{{ demoAccount.password }}</text>
      </view>
      <view class="account-row">
        <text class="account-row__label">昵称</text>
        <text class="account-row__value">{{ demoAccount.nickname }}</text>
      </view>
    </view>

    <view class="panel">
      <view class="panel__head">
        <text class="panel__title">云端状态</text>
        <text class="panel__tag" :class="{ 'panel__tag--ok': hasSeeded }">{{ hasSeeded ? '已有数据' : '待初始化' }}</text>
      </view>
      <text class="status" :class="{ 'status--error': errorMessage }">{{ statusText }}</text>

      <view class="count-grid">
        <view v-for="item in collectionRows" :key="item.key" class="count-card">
          <text class="count-card__num">{{ item.count }}</text>
          <text class="count-card__label">{{ item.label }}</text>
        </view>
      </view>
    </view>

    <view class="actions">
      <button class="btn btn--primary" :disabled="loading" :loading="loading && lastAction === 'seed'" @click="runAction('seed')">
        初始化演示数据
      </button>
      <button class="btn" :disabled="loading" :loading="loading && lastAction === 'status'" @click="runAction('status')">
        检查状态
      </button>
      <button class="btn" @click="goDiagnostics">
        运行诊断
      </button>
      <button class="btn btn--danger" :disabled="loading" :loading="loading && lastAction === 'resetDemo'" @click="confirmReset">
        重置演示数据
      </button>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 28rpx 24rpx 56rpx;
  background: #f7f5f0;
  box-sizing: border-box;
}

.hero {
  padding: 34rpx 28rpx;
  color: #fff;
  background: #2f5d50;
  border-radius: 24rpx;
  box-shadow: 0 18rpx 40rpx rgba(47, 93, 80, 0.2);
}

.hero__eyebrow,
.hero__title,
.hero__desc {
  display: block;
}

.hero__eyebrow {
  color: rgba(255, 255, 255, 0.72);
  font-size: 22rpx;
  font-weight: 700;
  letter-spacing: 0;
}

.hero__title {
  margin-top: 12rpx;
  font-size: 42rpx;
  font-weight: 900;
}

.hero__desc {
  margin-top: 14rpx;
  color: rgba(255, 255, 255, 0.82);
  font-size: 25rpx;
  line-height: 1.6;
}

.panel {
  margin-top: 22rpx;
  padding: 24rpx;
  background: #fff;
  border: 1rpx solid #e7e3dc;
  border-radius: 22rpx;
}

.panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.panel__title {
  color: #1f2522;
  font-size: 31rpx;
  font-weight: 800;
}

.panel__tag {
  padding: 8rpx 14rpx;
  color: #8a928d;
  background: #f3f1ec;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 700;
}

.panel__tag--ok {
  color: #2f5d50;
  background: #eef3ef;
}

.account-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 62rpx;
  border-bottom: 1rpx solid #f1eee7;
}

.account-row:last-child {
  border-bottom: none;
}

.account-row__label {
  color: #8a928d;
  font-size: 24rpx;
}

.account-row__value {
  color: #1f2522;
  font-size: 27rpx;
  font-weight: 800;
}

.status {
  display: block;
  color: #59625d;
  font-size: 24rpx;
  line-height: 1.5;
}

.status--error {
  color: #b84a3c;
}

.count-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14rpx;
  margin-top: 20rpx;
}

.count-card {
  min-height: 112rpx;
  padding: 18rpx;
  background: #faf8f3;
  border: 1rpx solid #eee9df;
  border-radius: 18rpx;
  box-sizing: border-box;
}

.count-card__num,
.count-card__label {
  display: block;
}

.count-card__num {
  color: #2f5d50;
  font-size: 34rpx;
  font-weight: 900;
}

.count-card__label {
  margin-top: 8rpx;
  color: #8a928d;
  font-size: 22rpx;
}

.actions {
  display: grid;
  gap: 16rpx;
  margin-top: 24rpx;
}

.btn {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2f5d50;
  background: #fff;
  border: 1rpx solid #dbe5df;
  border-radius: 18rpx;
  font-size: 28rpx;
  font-weight: 800;
}

.btn--primary {
  color: #fff;
  background: #2f5d50;
  border-color: #2f5d50;
}

.btn--danger {
  color: #b84a3c;
  border-color: #eadbd6;
}

.btn[disabled] {
  color: #8a928d;
  background: #ece8df;
  border-color: #ece8df;
}
</style>
