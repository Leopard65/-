<script setup>
import { computed, onUnmounted, shallowRef } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { api } from '@/api/client'
import { useUserStore } from '@/stores/user'
import { ROUTES } from '@/constants/routes'
import { isValidPhone } from '@/utils/util'
import runtimeConfig from '@/config/runtime'

const userStore = useUserStore()

const loginType = shallowRef('password')
const phone = shallowRef(runtimeConfig.demoAccount.mobile)
const smsCode = shallowRef('888888')
const password = shallowRef(runtimeConfig.demoAccount.password)
const showPassword = shallowRef(false)
const agreed = shallowRef(true)
const countdown = shallowRef(0)
const redirect = shallowRef(ROUTES.home)
let timer = null
const tabRoutes = [ROUTES.home, ROUTES.category, ROUTES.cart, ROUTES.my]

const loginTitle = computed(() => loginType.value === 'sms' ? '验证码登录' : '密码登录')
const smsButtonText = computed(() => countdown.value > 0 ? `${countdown.value}s` : '获取验证码')

onLoad((options = {}) => {
  redirect.value = options.redirect ? decodeURIComponent(options.redirect) : ROUTES.home
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const toast = (title) => uni.showToast({ title, icon: 'none' })

const validateBase = () => {
  if (!agreed.value) {
    toast('请先同意用户协议与隐私政策')
    return false
  }
  if (!isValidPhone(phone.value)) {
    toast('请输入正确的手机号')
    return false
  }
  return true
}

const sendSmsCode = async () => {
  if (countdown.value > 0 || !validateBase()) return
  const res = await api.user.sendSmsCode({ mobile: phone.value, type: 'login' })
  if (res?.code !== 0) return

  uni.showToast({ title: '验证码已发送', icon: 'success' })
  countdown.value = 60
  timer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) clearInterval(timer)
  }, 1000)
}

const finishLogin = () => {
  uni.showToast({ title: '登录成功', icon: 'success' })
  setTimeout(() => {
    if (redirect.value && redirect.value !== ROUTES.home) {
      if (tabRoutes.includes(redirect.value)) {
        uni.switchTab({ url: redirect.value })
        return
      }
      uni.redirectTo({ url: redirect.value })
      return
    }
    uni.switchTab({ url: ROUTES.home })
  }, 500)
}

// 首次验证码登录(尚未设置密码)引导设置登录密码,可跳过
const promptSetPassword = () => new Promise((resolve) => {
  uni.showModal({
    title: '设置登录密码',
    editable: true,
    placeholderText: '设置后可用密码登录,至少 6 位(可跳过)',
    confirmText: '保存',
    cancelText: '跳过',
    success: async (res) => {
      const value = String(res.content || '').trim()
      if (res.confirm && value.length >= 6) {
        const saveRes = await api.user.setPassword({ password: value })
        if (saveRes?.code === 0) {
          await userStore.getUserInfo()
          uni.showToast({ title: '密码已设置', icon: 'success' })
        }
      } else if (res.confirm) {
        uni.showToast({ title: '密码至少 6 位,已跳过', icon: 'none' })
      }
      resolve()
    },
    fail: () => resolve()
  })
})

// 微信登录后若未绑定手机号,引导绑定,可稍后
const promptBindMobile = () => new Promise((resolve) => {
  uni.showModal({
    title: '绑定手机号',
    editable: true,
    placeholderText: '请输入要绑定的手机号',
    confirmText: '绑定',
    cancelText: '稍后',
    success: async (res) => {
      const value = String(res.content || '').trim()
      if (res.confirm && isValidPhone(value)) {
        const bindRes = await api.user.bindMobile({ mobile: value })
        if (bindRes?.code === 0) {
          await userStore.getUserInfo()
          uni.showToast({ title: '手机号已绑定', icon: 'success' })
        }
      } else if (res.confirm) {
        uni.showToast({ title: '手机号格式不正确,已跳过', icon: 'none' })
      }
      resolve()
    },
    fail: () => resolve()
  })
})

const onLogin = async () => {
  if (!validateBase()) return

  const res = loginType.value === 'sms'
    ? await userStore.loginBySms({ mobile: phone.value, code: smsCode.value })
    : await userStore.loginByPassword({ username: phone.value, password: password.value })

  if (res?.code === 0) {
    if (loginType.value === 'sms' && userStore.userInfo?.hasPassword === false) {
      await promptSetPassword()
    }
    finishLogin()
  }
}

const onWeixinLogin = async () => {
  if (!validateBase()) return
  const res = await api.user.loginByWeixin({}, { preferMock: true })
  if (res?.code === 0) {
    userStore.setLoginInfo(res.token || res.data?.token || 'mock-token', res.userInfo || res.data?.userInfo)
    if (!userStore.userInfo?.mobile) await promptBindMobile()
    finishLogin()
  }
}

const goRegister = () => {
  uni.navigateTo({ url: ROUTES.register })
}

const goAgreement = () => {
  uni.navigateTo({ url: ROUTES.agreement })
}

const goPrivacy = () => {
  uni.navigateTo({ url: ROUTES.privacy })
}
</script>

<template>
  <view class="page">
    <view class="hero">
      <image class="hero__logo" src="/static/logo.png" mode="aspectFit"></image>
      <text class="hero__eyebrow">薪超购物</text>
      <text class="hero__title">把日常买得更有质感</text>
      <text class="hero__desc">登录后可同步购物车、订单、优惠券与售后进度。</text>
    </view>

    <view class="panel">
      <view class="tabs">
        <view class="tab" :class="{ 'tab--active': loginType === 'sms' }" @click="loginType = 'sms'">
          <text>验证码</text>
        </view>
        <view class="tab" :class="{ 'tab--active': loginType === 'password' }" @click="loginType = 'password'">
          <text>密码</text>
        </view>
      </view>

      <text class="panel__title">{{ loginTitle }}</text>

      <view class="field">
        <text class="field__prefix">+86</text>
        <input class="field__input" type="number" maxlength="11" v-model="phone" placeholder="请输入手机号" />
      </view>

      <view v-if="loginType === 'sms'" class="field">
        <input class="field__input" type="number" maxlength="6" v-model="smsCode" placeholder="请输入验证码" />
        <view class="field__action" :class="{ 'field__action--disabled': countdown > 0 }" @click="sendSmsCode">
          <text>{{ smsButtonText }}</text>
        </view>
      </view>

      <view v-else class="field">
        <input class="field__input" :password="!showPassword" v-model="password" placeholder="请输入密码" />
        <view class="field__action" @click="showPassword = !showPassword">
          <text>{{ showPassword ? '隐藏' : '显示' }}</text>
        </view>
      </view>

      <view class="agreement" @click="agreed = !agreed">
        <view class="check" :class="{ 'check--active': agreed }">
          <text v-if="agreed">✓</text>
        </view>
        <text class="agreement__text">已阅读并同意</text>
        <text class="agreement__link" @click.stop="goAgreement">《用户协议》</text>
        <text class="agreement__text">和</text>
        <text class="agreement__link" @click.stop="goPrivacy">《隐私政策》</text>
      </view>

      <button class="primary-btn" @click="onLogin">登录</button>
      <button class="ghost-btn" @click="onWeixinLogin">微信一键登录</button>
      <view class="register-link" @click="goRegister">
        <text>还没有账号？立即注册</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 72rpx 32rpx 48rpx;
  background: #f7f5f0;
  box-sizing: border-box;
}

.hero {
  padding: 24rpx 8rpx 44rpx;
}

.hero__logo {
  width: 112rpx;
  height: 112rpx;
}

.hero__eyebrow {
  display: block;
  margin-top: 22rpx;
  color: #2f5d50;
  font-size: 24rpx;
  font-weight: 700;
}

.hero__title {
  display: block;
  margin-top: 12rpx;
  color: #1f2522;
  font-size: 48rpx;
  font-weight: 800;
  line-height: 1.2;
}

.hero__desc {
  display: block;
  margin-top: 18rpx;
  color: #59625d;
  font-size: 26rpx;
  line-height: 1.7;
}

.panel {
  padding: 28rpx;
  background: #fff;
  border: 1rpx solid #e7e3dc;
  border-radius: 24rpx;
  box-shadow: 0 18rpx 42rpx rgba(31, 37, 34, 0.08);
}

.tabs {
  display: flex;
  padding: 6rpx;
  background: #f1eee7;
  border-radius: 999rpx;
}

.tab {
  flex: 1;
  height: 68rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #59625d;
  font-size: 26rpx;
  border-radius: 999rpx;
}

.tab--active {
  color: #fff;
  background: #2f5d50;
  font-weight: 700;
}

.panel__title {
  display: block;
  margin: 30rpx 0 12rpx;
  color: #1f2522;
  font-size: 34rpx;
  font-weight: 700;
}

.field {
  height: 96rpx;
  display: flex;
  align-items: center;
  margin-top: 18rpx;
  padding: 0 22rpx;
  background: #fbfaf7;
  border: 1rpx solid #e7e3dc;
  border-radius: 18rpx;
}

.field__prefix {
  margin-right: 18rpx;
  padding-right: 18rpx;
  color: #1f2522;
  font-size: 28rpx;
  border-right: 1rpx solid #e7e3dc;
}

.field__input {
  flex: 1;
  height: 100%;
  color: #1f2522;
  font-size: 28rpx;
}

.field__action {
  color: #2f5d50;
  font-size: 24rpx;
  font-weight: 700;
}

.field__action--disabled {
  color: #8a928d;
}

.agreement {
  display: flex;
  align-items: center;
  margin-top: 26rpx;
}

.check {
  width: 30rpx;
  height: 30rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12rpx;
  color: #fff;
  font-size: 22rpx;
  border: 2rpx solid #c8c1b6;
  border-radius: 50%;
}

.check--active {
  background: #2f5d50;
  border-color: #2f5d50;
}

.agreement__text {
  color: #8a928d;
  font-size: 23rpx;
}

.agreement__link {
  color: #2f5d50;
  font-size: 23rpx;
  font-weight: 700;
}

.primary-btn,
.ghost-btn {
  height: 92rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 28rpx;
  border-radius: 999rpx;
  font-size: 30rpx;
}

.primary-btn {
  color: #fff;
  background: #2f5d50;
}

.ghost-btn {
  color: #2f5d50;
  background: #eef3ef;
}

.register-link {
  padding-top: 28rpx;
  text-align: center;
  color: #b58a45;
  font-size: 26rpx;
}
</style>
