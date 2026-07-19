<script setup>
import { computed, onUnmounted, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { api } from '@/api/client'
import { PAY_METHODS, ORDER_STATUS } from '@/constants/status'
import { ROUTES } from '@/constants/routes'
import { formatMoney } from '@/utils/format'

const orderId = ref('')
const amount = ref(0)
const payMethod = ref('wechat')
const remainSeconds = ref(0)
const expired = ref(false)
const paying = ref(false)
let timer = null

const countdownText = computed(() => {
  const total = Math.max(0, remainSeconds.value)
  const minute = String(Math.floor(total / 60)).padStart(2, '0')
  const second = String(total % 60).padStart(2, '0')
  return `${minute}:${second}`
})

const stopTimer = () => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

const startCountdown = (deadline) => {
  stopTimer()
  const tick = () => {
    const left = Math.floor((deadline - Date.now()) / 1000)
    if (left <= 0) {
      remainSeconds.value = 0
      expired.value = true
      stopTimer()
      return
    }
    remainSeconds.value = left
  }
  tick()
  timer = setInterval(tick, 1000)
}

const loadOrder = async () => {
  if (!orderId.value) return
  const res = await api.order.getOrderDetail({ order_id: orderId.value }, { showError: false })
  if (res?.code === 0 && res.data) {
    const order = res.data
    if (Number(order.status) === ORDER_STATUS.canceled) {
      expired.value = true
      return
    }
    if (Number(order.status) !== ORDER_STATUS.pendingPay) {
      uni.redirectTo({ url: `${ROUTES.orderResult}?orderId=${orderId.value}&status=success` })
      return
    }
    if (order.pay_amount !== undefined) amount.value = Number(order.pay_amount)
    startCountdown(Number(order.pay_expire_time || 0) || (Date.now() + 30 * 60 * 1000))
  } else {
    startCountdown(Date.now() + 30 * 60 * 1000)
  }
}

const pay = async () => {
  if (paying.value) return
  if (expired.value) {
    uni.showToast({ title: '订单已超时，请返回重新下单', icon: 'none' })
    return
  }
  paying.value = true
  const res = await api.order.payOrder({ order_id: orderId.value, pay_method: payMethod.value })
  paying.value = false
  if (res?.code === 0) {
    stopTimer()
    uni.redirectTo({ url: `${ROUTES.orderResult}?orderId=${orderId.value}&status=success` })
    return
  }
  if (res?.msg && /超时/.test(res.msg)) expired.value = true
}

onLoad((options = {}) => {
  orderId.value = options.orderId || ''
  amount.value = Number(options.amount || 0)
  if (options.payMethod) payMethod.value = options.payMethod
  loadOrder()
})

onUnmounted(stopTimer)
</script>

<template>
  <view class="page-shell pay-page">
    <view class="pay-amount card">
      <text class="pay-amount__label">需支付</text>
      <text class="pay-amount__value">¥{{ formatMoney(amount) }}</text>
      <text v-if="expired" class="pay-amount__hint pay-amount__hint--warn">订单已超时取消，请返回重新下单</text>
      <text v-else class="pay-amount__hint">支付剩余 {{ countdownText }} · 演示模式点击即模拟成功</text>
    </view>
    <view class="method-card card">
      <view
        v-for="item in PAY_METHODS"
        :key="item.value"
        class="method"
        @click="payMethod = item.value"
      >
        <view>
          <text class="method__label">{{ item.label }}</text>
          <text class="method__hint">{{ item.hint }}</text>
        </view>
        <uni-icons :type="payMethod === item.value ? 'checkbox-filled' : 'circle'" size="24" :color="payMethod === item.value ? '#2f5d50' : '#8a928d'"></uni-icons>
      </view>
    </view>
    <view class="btn-primary pay-btn" :class="{ 'pay-btn--disabled': expired || paying }" @click="pay">
      {{ expired ? '订单已超时' : (paying ? '支付中' : '确认支付') }}
    </view>
  </view>
</template>

<style scoped>
.pay-page {
  padding: 32rpx 24rpx;
}

.pay-amount {
  padding: 46rpx 28rpx;
  text-align: center;
}

.pay-amount__label,
.pay-amount__hint,
.method__hint {
  display: block;
  color: #8a928d;
  font-size: 24rpx;
}

.pay-amount__hint--warn {
  color: #b84a3c;
  font-weight: 700;
}

.pay-btn--disabled {
  opacity: 0.6;
}

.pay-amount__value {
  display: block;
  margin: 18rpx 0;
  color: #b84a3c;
  font-size: 64rpx;
  font-weight: 800;
}

.method-card {
  margin-top: 24rpx;
  padding: 12rpx 24rpx;
}

.method {
  min-height: 112rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1rpx solid #e7e3dc;
}

.method:last-child {
  border-bottom: 0;
}

.method__label {
  display: block;
  color: #1f2522;
  font-size: 30rpx;
  font-weight: 700;
}

.method__hint {
  margin-top: 8rpx;
}

.pay-btn {
  margin-top: 42rpx;
}
</style>
