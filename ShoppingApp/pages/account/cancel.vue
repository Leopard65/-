<script setup>
import { computed, shallowRef } from 'vue'
import { ROUTES } from '@/constants/routes'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const reason = shallowRef('')
const confirmed = shallowRef(false)
const submitting = shallowRef(false)

const canSubmit = computed(() => userStore.isLogin && confirmed.value && !submitting.value)

function toggleConfirm() {
  confirmed.value = !confirmed.value
}

function goLogin() {
  uni.navigateTo({ url: `${ROUTES.login}?redirect=${encodeURIComponent(ROUTES.accountCancel)}` })
}

async function submitCancel() {
  if (!userStore.requireLogin(ROUTES.accountCancel)) return
  if (!confirmed.value) {
    uni.showToast({ title: '请先确认注销说明', icon: 'none' })
    return
  }

  const modal = await new Promise(resolve => {
    uni.showModal({
      title: '提交注销申请',
      content: '提交后普通账号将停止登录，订单和售后记录会作为凭证保留。',
      confirmText: '提交',
      confirmColor: '#b84a3c',
      success: resolve
    })
  })
  if (!modal.confirm) return

  submitting.value = true
  const res = await userStore.requestAccountCancel({
    reason: reason.value || '用户主动申请注销'
  })
  submitting.value = false

  if (res?.code !== 0) {
    uni.showToast({ title: res?.msg || '提交失败', icon: 'none' })
    return
  }

  uni.showModal({
    title: '申请已提交',
    content: res.msg || '注销申请已提交。',
    showCancel: false,
    success: () => {
      if (res.data?.disabled) {
        userStore.logoutAndClear()
        uni.redirectTo({ url: ROUTES.login })
        return
      }
      uni.navigateBack()
    }
  })
}
</script>

<template>
  <view class="page">
    <view class="hero">
      <text class="hero__title">账号注销</text>
      <text class="hero__desc">提交后保留订单、售后和合规凭证，不做物理删除</text>
    </view>

    <view v-if="!userStore.isLogin" class="panel empty">
      <text class="empty__title">需要先登录</text>
      <text class="empty__desc">登录后才能提交账号注销申请。</text>
      <button class="primary-btn" @click="goLogin">去登录</button>
    </view>

    <view v-else class="panel">
      <text class="panel__title">注销影响</text>
      <view class="impact-row">
        <text class="impact-row__dot"></text>
        <text class="impact-row__text">普通账号提交后会停止登录，体验账号只记录申请。</text>
      </view>
      <view class="impact-row">
        <text class="impact-row__dot"></text>
        <text class="impact-row__text">订单、售后、评价等交易凭证不会物理删除。</text>
      </view>
      <view class="impact-row">
        <text class="impact-row__dot"></text>
        <text class="impact-row__text">正式上线后可接入人工审核、导出和冷静期。</text>
      </view>
    </view>

    <view v-if="userStore.isLogin" class="panel form-panel">
      <text class="panel__title">申请原因</text>
      <textarea v-model="reason" class="textarea" maxlength="120" placeholder="可选，最多 120 字" />
      <view class="confirm-line" @click="toggleConfirm">
        <text class="checkbox" :class="{ 'checkbox--checked': confirmed }">{{ confirmed ? '✓' : '' }}</text>
        <text class="confirm-line__text">我已了解注销后普通账号将停止登录，交易凭证仍会保留。</text>
      </view>
      <button class="danger-btn" :disabled="!canSubmit" :loading="submitting" @click="submitCancel">提交注销申请</button>
    </view>
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
.panel__title,
.empty__title,
.empty__desc {
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
  line-height: 1.55;
}

.panel {
  margin-top: 22rpx;
  padding: 24rpx;
  background: #fff;
  border: 1rpx solid #e7e3dc;
  border-radius: 22rpx;
}

.panel__title {
  color: #1f2522;
  font-size: 30rpx;
  font-weight: 900;
}

.impact-row {
  display: flex;
  gap: 14rpx;
  margin-top: 18rpx;
}

.impact-row__dot {
  width: 12rpx;
  height: 12rpx;
  flex-shrink: 0;
  margin-top: 13rpx;
  background: #2f5d50;
  border-radius: 50%;
}

.impact-row__text {
  flex: 1;
  color: #59625d;
  font-size: 25rpx;
  line-height: 1.55;
}

.empty__title {
  color: #1f2522;
  font-size: 30rpx;
  font-weight: 900;
}

.empty__desc {
  margin-top: 12rpx;
  color: #59625d;
  font-size: 25rpx;
  line-height: 1.55;
}

.textarea {
  width: 100%;
  min-height: 180rpx;
  margin-top: 18rpx;
  padding: 18rpx 20rpx;
  color: #1f2522;
  background: #faf8f3;
  border: 1rpx solid #eee9df;
  border-radius: 16rpx;
  box-sizing: border-box;
  font-size: 26rpx;
  line-height: 1.5;
}

.confirm-line {
  display: flex;
  align-items: flex-start;
  gap: 14rpx;
  margin-top: 22rpx;
}

.checkbox {
  width: 34rpx;
  height: 34rpx;
  flex-shrink: 0;
  color: #fff;
  background: #f3f1ec;
  border: 1rpx solid #d8d2c7;
  border-radius: 8rpx;
  font-size: 24rpx;
  font-weight: 900;
  line-height: 34rpx;
  text-align: center;
}

.checkbox--checked {
  background: #2f5d50;
  border-color: #2f5d50;
}

.confirm-line__text {
  flex: 1;
  color: #59625d;
  font-size: 24rpx;
  line-height: 1.5;
}

.primary-btn,
.danger-btn {
  height: 82rpx;
  margin: 24rpx 0 0;
  color: #fff;
  background: #2f5d50;
  border-radius: 16rpx;
  font-size: 28rpx;
  font-weight: 800;
  line-height: 82rpx;
}

.danger-btn {
  background: #b84a3c;
}

.danger-btn[disabled] {
  background: #d6aaa2;
}

.primary-btn::after,
.danger-btn::after {
  border: none;
}
</style>
