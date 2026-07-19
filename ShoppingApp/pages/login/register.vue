<script setup>
import { shallowRef } from 'vue'
import { useUserStore } from '@/stores/user'
import { ROUTES } from '@/constants/routes'
import { isValidPhone } from '@/utils/util'

const userStore = useUserStore()

const phone = shallowRef('')
const password = shallowRef('')
const confirmPassword = shallowRef('')
const showPassword = shallowRef(false)
const showConfirmPassword = shallowRef(false)
const agreed = shallowRef(false)

const toast = (title) => uni.showToast({ title, icon: 'none' })

const validate = () => {
  if (!agreed.value) return '请先同意用户协议与隐私政策'
  if (!isValidPhone(phone.value)) return '请输入正确的手机号'
  if (password.value.length < 6) return '密码至少 6 位'
  if (password.value !== confirmPassword.value) return '两次输入的密码不一致'
  return ''
}

const register = async () => {
  const error = validate()
  if (error) {
    toast(error)
    return
  }

  const res = await userStore.register({
    username: phone.value,
    mobile: phone.value,
    password: password.value
  })

  if (res?.code === 0) {
    uni.showToast({ title: '注册成功', icon: 'success' })
    setTimeout(() => uni.switchTab({ url: ROUTES.home }), 500)
  }
}

const goLogin = () => {
  uni.navigateBack()
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
      <text class="hero__eyebrow">创建账号</text>
      <text class="hero__title">加入薪超购物</text>
      <text class="hero__desc">一个账号管理购物车、订单、收藏和优惠权益。</text>
    </view>

    <view class="panel">
      <view class="field">
        <text class="field__prefix">+86</text>
        <input class="field__input" type="number" maxlength="11" v-model="phone" placeholder="请输入手机号" />
      </view>

      <view class="field">
        <input class="field__input" :password="!showPassword" v-model="password" placeholder="请输入密码" />
        <view class="field__action" @click="showPassword = !showPassword">
          <text>{{ showPassword ? '隐藏' : '显示' }}</text>
        </view>
      </view>

      <view class="field">
        <input class="field__input" :password="!showConfirmPassword" v-model="confirmPassword" placeholder="请再次输入密码" />
        <view class="field__action" @click="showConfirmPassword = !showConfirmPassword">
          <text>{{ showConfirmPassword ? '隐藏' : '显示' }}</text>
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

      <button class="primary-btn" @click="register">注册并登录</button>
      <view class="login-link" @click="goLogin">
        <text>已有账号，去登录</text>
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

.hero__eyebrow {
  display: block;
  color: #2f5d50;
  font-size: 24rpx;
  font-weight: 800;
}

.hero__title {
  display: block;
  margin-top: 12rpx;
  color: #1f2522;
  font-size: 50rpx;
  font-weight: 900;
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

.field {
  height: 96rpx;
  display: flex;
  align-items: center;
  margin-bottom: 18rpx;
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
  font-weight: 800;
}

.agreement {
  display: flex;
  align-items: center;
  margin-top: 8rpx;
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

.primary-btn {
  height: 92rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 28rpx;
  color: #fff;
  background: #2f5d50;
  border-radius: 999rpx;
  font-size: 30rpx;
  font-weight: 800;
}

.login-link {
  padding-top: 28rpx;
  text-align: center;
  color: #b58a45;
  font-size: 26rpx;
}
</style>
