<script setup>
import { computed, reactive, shallowRef } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { ROUTES } from '@/constants/routes'
import { useUserStore } from '@/stores/user'
import runtimeConfig from '@/config/runtime'

const userStore = useUserStore()
const saving = shallowRef(false)
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const accountRows = computed(() => [
  { label: '账号状态', value: userStore.isLogin ? '已登录' : '未登录' },
  { label: '当前账号', value: userStore.phone || runtimeConfig.demoAccount.mobile },
  { label: '账号角色', value: userStore.roles.length ? userStore.roles.join('、') : '普通会员' },
  { label: '最近校验', value: userStore.authCheckedAt ? '已刷新' : '待刷新' }
])

const canSubmit = computed(() =>
  Boolean(passwordForm.oldPassword && passwordForm.newPassword && passwordForm.confirmPassword && !saving.value)
)

function go(url) {
  if (userStore.requireLogin(url)) uni.navigateTo({ url })
}

function goLogin() {
  uni.navigateTo({ url: `${ROUTES.login}?redirect=${encodeURIComponent(ROUTES.accountSecurity)}` })
}

async function submitPassword() {
  if (!userStore.requireLogin(ROUTES.accountSecurity)) return
  if (!canSubmit.value) return
  if (passwordForm.newPassword.length < 6) {
    uni.showToast({ title: '新密码至少 6 位', icon: 'none' })
    return
  }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    uni.showToast({ title: '两次新密码不一致', icon: 'none' })
    return
  }

  saving.value = true
  const res = await userStore.changePassword({
    oldPassword: passwordForm.oldPassword,
    newPassword: passwordForm.newPassword
  })
  saving.value = false

  if (res?.code === 0) {
    passwordForm.oldPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
    uni.showToast({ title: '密码已更新', icon: 'success' })
    return
  }

  uni.showToast({ title: res?.msg || '密码修改失败', icon: 'none' })
}

async function logout() {
  if (!userStore.isLogin) {
    goLogin()
    return
  }
  const modal = await new Promise(resolve => {
    uni.showModal({
      title: '退出登录',
      content: '退出后本机将不再保留当前账号状态。',
      confirmText: '退出',
      success: resolve
    })
  })
  if (!modal.confirm) return
  await userStore.logout()
  uni.showToast({ title: '已退出登录', icon: 'success' })
}

onShow(() => {
  if (userStore.isLogin) userStore.refreshAuthStatus()
})
</script>

<template>
  <view class="page">
    <view class="hero">
      <text class="hero__title">账号与安全</text>
      <text class="hero__desc">管理登录状态、密码和账号风险操作</text>
    </view>

    <view class="panel">
      <view v-for="item in accountRows" :key="item.label" class="row">
        <text class="row__label">{{ item.label }}</text>
        <text class="row__value">{{ item.value }}</text>
      </view>
    </view>

    <view v-if="userStore.isLogin" class="panel">
      <text class="panel__title">修改密码</text>
      <input v-model="passwordForm.oldPassword" class="input" password placeholder="原密码" />
      <input v-model="passwordForm.newPassword" class="input" password placeholder="新密码，至少 6 位" />
      <input v-model="passwordForm.confirmPassword" class="input" password placeholder="再次输入新密码" />
      <button class="primary-btn" :disabled="!canSubmit" :loading="saving" @click="submitPassword">保存新密码</button>
      <text class="hint">体验账号密码固定用于验收，普通注册账号可测试真实修改。</text>
    </view>

    <view v-else class="panel empty">
      <text class="empty__title">需要先登录</text>
      <text class="empty__desc">登录后可以查看账号权限、管理隐私设置和提交注销申请。</text>
      <button class="primary-btn" @click="goLogin">去登录</button>
    </view>

    <view class="panel">
      <view class="link-row" @click="go(ROUTES.privacySettings)">
        <view>
          <text class="link-row__title">隐私设置</text>
          <text class="link-row__desc">管理推荐、消息和诊断日志偏好</text>
        </view>
        <text class="link-row__arrow">›</text>
      </view>
      <view class="link-row" @click="go(ROUTES.accountCancel)">
        <view>
          <text class="link-row__title">账号注销</text>
          <text class="link-row__desc">提交软注销申请，保留订单售后凭证</text>
        </view>
        <text class="link-row__arrow">›</text>
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
.hero__desc,
.panel__title,
.hint,
.empty__title,
.empty__desc,
.link-row__title,
.link-row__desc {
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

.panel__title {
  padding-top: 24rpx;
  color: #1f2522;
  font-size: 30rpx;
  font-weight: 900;
}

.row,
.link-row {
  min-height: 94rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  border-bottom: 1rpx solid #f1eee7;
}

.row:last-child,
.link-row:last-child {
  border-bottom: none;
}

.row__label {
  color: #59625d;
  font-size: 26rpx;
}

.row__value {
  max-width: 430rpx;
  color: #1f2522;
  font-size: 26rpx;
  font-weight: 800;
  text-align: right;
}

.input {
  height: 88rpx;
  margin-top: 18rpx;
  padding: 0 20rpx;
  color: #1f2522;
  background: #faf8f3;
  border: 1rpx solid #eee9df;
  border-radius: 16rpx;
  box-sizing: border-box;
  font-size: 27rpx;
}

.primary-btn,
.logout-btn {
  height: 82rpx;
  margin: 24rpx 0 0;
  color: #fff;
  background: #2f5d50;
  border-radius: 16rpx;
  font-size: 28rpx;
  font-weight: 800;
  line-height: 82rpx;
}

.primary-btn[disabled] {
  color: #fff;
  background: #9eb7ae;
}

.primary-btn::after,
.logout-btn::after {
  border: none;
}

.hint {
  padding: 18rpx 0 24rpx;
  color: #8a928d;
  font-size: 23rpx;
  line-height: 1.55;
}

.empty {
  padding: 26rpx 24rpx;
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

.link-row {
  padding: 18rpx 0;
}

.link-row__title {
  color: #1f2522;
  font-size: 28rpx;
  font-weight: 800;
}

.link-row__desc {
  margin-top: 8rpx;
  color: #8a928d;
  font-size: 23rpx;
}

.link-row__arrow {
  color: #b8b1a6;
  font-size: 42rpx;
}

.logout-btn {
  color: #b84a3c;
  background: #fff;
  border: 1rpx solid #eadbd6;
}
</style>
