<script setup>
import { computed, reactive, shallowRef } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { ROUTES } from '@/constants/routes'
import { useUserStore } from '@/stores/user'
import runtimeConfig from '@/config/runtime'

const userStore = useUserStore()
const loading = shallowRef(false)
const saving = shallowRef(false)
const errorMessage = shallowRef('')
const form = reactive({
  personalizedRecommend: true,
  activityMessage: true,
  diagnosticsLog: true
})

const rows = computed(() => [
  {
    key: 'personalizedRecommend',
    title: '个性化推荐',
    desc: '根据浏览、收藏和购买记录优化商品排序',
    checked: form.personalizedRecommend
  },
  {
    key: 'activityMessage',
    title: '活动与订单消息',
    desc: '接收优惠券、订单和售后相关提醒',
    checked: form.activityMessage
  },
  {
    key: 'diagnosticsLog',
    title: '本机诊断日志',
    desc: '保留最近接口失败摘要，用于运行诊断定位问题',
    checked: form.diagnosticsLog
  }
])

const statusText = computed(() => {
  if (errorMessage.value) return errorMessage.value
  if (loading.value) return '正在读取隐私状态'
  return `协议版本 ${runtimeConfig.legal.privacyVersion}`
})

function applyStatus(data = {}) {
  form.personalizedRecommend = data.personalizedRecommend !== false
  form.activityMessage = data.activityMessage !== false
  form.diagnosticsLog = data.diagnosticsLog !== false
}

function onSwitch(key, event) {
  form[key] = Boolean(event.detail.value)
}

async function loadStatus() {
  if (!userStore.requireLogin(ROUTES.privacySettings)) return
  loading.value = true
  errorMessage.value = ''
  const res = await userStore.getPrivacyStatus()
  if (res?.code === 0) {
    applyStatus(res.data?.privacyStatus || res.privacyStatus)
  } else {
    errorMessage.value = res?.msg || '隐私状态读取失败'
  }
  loading.value = false
}

async function saveStatus() {
  if (!userStore.requireLogin(ROUTES.privacySettings)) return
  saving.value = true
  const res = await userStore.updatePrivacyStatus({
    personalizedRecommend: form.personalizedRecommend,
    activityMessage: form.activityMessage,
    diagnosticsLog: form.diagnosticsLog
  })
  saving.value = false

  if (res?.code === 0) {
    uni.showToast({ title: '已保存', icon: 'success' })
    return
  }
  uni.showToast({ title: res?.msg || '保存失败', icon: 'none' })
}

onLoad(loadStatus)
</script>

<template>
  <view class="page">
    <view class="hero">
      <text class="hero__title">隐私设置</text>
      <text class="hero__desc">{{ statusText }}</text>
    </view>

    <view class="panel">
      <view v-for="item in rows" :key="item.key" class="setting-row">
        <view class="setting-row__body">
          <text class="setting-row__title">{{ item.title }}</text>
          <text class="setting-row__desc">{{ item.desc }}</text>
        </view>
        <switch color="#2f5d50" :checked="item.checked" @change="onSwitch(item.key, $event)" />
      </view>
    </view>

    <view class="panel note">
      <text class="note__title">数据保护</text>
      <text class="note__body">当前版本不接入真实支付、真实物流和真实推送。诊断日志只保留接口名称、错误分类和提示摘要，不记录 token。</text>
    </view>

    <button class="primary-btn" :loading="saving" :disabled="loading || saving" @click="saveStatus">保存设置</button>
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
.hero__desc,
.setting-row__title,
.setting-row__desc,
.note__title,
.note__body {
  display: block;
}

.hero__title {
  font-size: 42rpx;
  font-weight: 900;
}

.hero__desc {
  margin-top: 12rpx;
  color: rgba(255, 255, 255, 0.8);
  font-size: 24rpx;
}

.panel {
  margin-top: 22rpx;
  padding: 0 24rpx;
  background: #fff;
  border: 1rpx solid #e7e3dc;
  border-radius: 22rpx;
}

.setting-row {
  min-height: 126rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 22rpx;
  border-bottom: 1rpx solid #f1eee7;
}

.setting-row:last-child {
  border-bottom: none;
}

.setting-row__body {
  flex: 1;
  min-width: 0;
}

.setting-row__title {
  color: #1f2522;
  font-size: 28rpx;
  font-weight: 900;
}

.setting-row__desc {
  margin-top: 8rpx;
  color: #8a928d;
  font-size: 23rpx;
  line-height: 1.45;
}

.note {
  padding: 24rpx;
}

.note__title {
  color: #1f2522;
  font-size: 29rpx;
  font-weight: 900;
}

.note__body {
  margin-top: 12rpx;
  color: #59625d;
  font-size: 25rpx;
  line-height: 1.65;
}

.primary-btn {
  height: 82rpx;
  margin: 26rpx 0 0;
  color: #fff;
  background: #2f5d50;
  border-radius: 16rpx;
  font-size: 28rpx;
  font-weight: 800;
  line-height: 82rpx;
}

.primary-btn[disabled] {
  background: #9eb7ae;
}

.primary-btn::after {
  border: none;
}
</style>
