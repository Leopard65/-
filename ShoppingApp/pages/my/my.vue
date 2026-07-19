<script setup>
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import { ORDER_STATUS } from '@/constants/status'
import { ROUTES } from '@/constants/routes'

const userStore = useUserStore()

const orderItems = [
  { label: '待付款', icon: '¥', status: ORDER_STATUS.pendingPay },
  { label: '待发货', icon: '包', status: ORDER_STATUS.pendingShip },
  { label: '待收货', icon: '车', status: ORDER_STATUS.pendingReceive },
  { label: '待评价', icon: '评', status: ORDER_STATUS.pendingReview },
  { label: '售后', icon: '退', route: ROUTES.afterSaleList }
]

const serviceItems = [
  { label: '优惠券', desc: '可用权益与门槛', icon: '券', route: ROUTES.coupon },
  { label: '我的收藏', desc: '喜欢的商品', icon: '藏', route: ROUTES.collect },
  { label: '收货地址', desc: '管理配送信息', icon: '址', route: ROUTES.addressList },
  { label: '消息中心', desc: '订单与活动提醒', icon: '信', route: ROUTES.message },
  { label: '设置', desc: '账号、安全与隐私', icon: '设', route: ROUTES.settings, public: true },
  { label: '运行诊断', desc: '检查云端、账号与发布项', icon: '诊', route: ROUTES.diagnostics, public: true },
  { label: '运营中心', desc: '商品、订单、售后与投放维护', icon: '营', route: ROUTES.adminOps },
  { label: '云端初始化', desc: '写入演示数据与体验账号', icon: '云', route: ROUTES.cloudInit, public: true }
]

const displayName = computed(() => userStore.isLogin ? userStore.nickname : '点击登录')
const displayDesc = computed(() => userStore.isLogin ? `${userStore.phone || '薪超会员'} · 精品生活方式账户` : '登录后同步订单、优惠券与收藏')

onShow(() => {
  if (userStore.isLogin) userStore.getUserInfo()
})

const requireLogin = (target) => userStore.requireLogin(target)

const onUserTap = () => {
  if (!userStore.isLogin) requireLogin(ROUTES.my)
}

const goOrderList = (status = 'all') => {
  const url = `${ROUTES.orderList}?status=${status}`
  if (requireLogin(url)) uni.navigateTo({ url })
}

const goService = (route) => {
  if (requireLogin(route)) uni.navigateTo({ url: route })
}

const goServiceItem = (item) => {
  if (item.public) {
    uni.navigateTo({ url: item.route })
    return
  }
  goService(item.route)
}

const logout = async () => {
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
    <view class="profile" @click="onUserTap">
      <view class="profile__texture"></view>
      <image class="profile__avatar" :src="userStore.avatar" mode="aspectFill"></image>
      <view class="profile__info">
        <text class="profile__name">{{ displayName }}</text>
        <text class="profile__desc">{{ displayDesc }}</text>
      </view>
      <text class="profile__arrow">›</text>
    </view>

    <view class="panel">
      <view class="panel__head" @click="goOrderList('all')">
        <text class="panel__title">我的订单</text>
        <text class="panel__more">查看全部 ›</text>
      </view>
      <view class="order-grid">
        <view v-for="item in orderItems" :key="item.label" class="order-item" @click="item.route ? goService(item.route) : goOrderList(item.status)">
          <view class="order-item__icon">
            <text>{{ item.icon }}</text>
          </view>
          <text class="order-item__label">{{ item.label }}</text>
        </view>
      </view>
    </view>

    <view class="panel">
      <text class="panel__title panel__title--block">我的服务</text>
      <view class="service-list">
        <view v-for="item in serviceItems" :key="item.route" class="service-item" @click="goServiceItem(item)">
          <view class="service-item__icon">
            <text>{{ item.icon }}</text>
          </view>
          <view class="service-item__body">
            <text class="service-item__label">{{ item.label }}</text>
            <text class="service-item__desc">{{ item.desc }}</text>
          </view>
          <text class="service-item__arrow">›</text>
        </view>
      </view>
    </view>

    <view v-if="userStore.isLogin" class="logout" @click="logout">
      <text>退出登录</text>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 28rpx 24rpx 220rpx;
  background: #f7f5f0;
  box-sizing: border-box;
}

.profile {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  min-height: 210rpx;
  padding: 34rpx 28rpx;
  color: #fff;
  background: #2f5d50;
  border-radius: 24rpx;
  box-shadow: 0 18rpx 40rpx rgba(47, 93, 80, 0.22);
}

.profile__texture {
  position: absolute;
  right: -80rpx;
  top: -120rpx;
  width: 280rpx;
  height: 280rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.22);
  border-radius: 50%;
}

.profile__avatar {
  position: relative;
  width: 116rpx;
  height: 116rpx;
  flex-shrink: 0;
  border: 4rpx solid rgba(255, 255, 255, 0.45);
  border-radius: 50%;
}

.profile__info {
  position: relative;
  flex: 1;
  margin-left: 24rpx;
}

.profile__name {
  display: block;
  font-size: 38rpx;
  font-weight: 800;
}

.profile__desc {
  display: block;
  margin-top: 12rpx;
  color: rgba(255, 255, 255, 0.78);
  font-size: 24rpx;
  line-height: 1.5;
}

.profile__arrow {
  position: relative;
  font-size: 46rpx;
  color: rgba(255, 255, 255, 0.72);
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
}

.panel__title {
  color: #1f2522;
  font-size: 31rpx;
  font-weight: 800;
}

.panel__title--block {
  display: block;
  margin-bottom: 8rpx;
}

.panel__more {
  color: #8a928d;
  font-size: 24rpx;
}

.order-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12rpx;
  margin-top: 26rpx;
}

.order-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.order-item__icon {
  width: 70rpx;
  height: 70rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2f5d50;
  background: #eef3ef;
  border-radius: 50%;
  font-size: 26rpx;
  font-weight: 800;
}

.order-item__label {
  margin-top: 12rpx;
  color: #59625d;
  font-size: 23rpx;
}

.service-list {
  margin-top: 10rpx;
}

.service-item {
  min-height: 102rpx;
  display: flex;
  align-items: center;
  border-bottom: 1rpx solid #f1eee7;
}

.service-item:last-child {
  border-bottom: none;
}

.service-item__icon {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #b58a45;
  background: #fbf4e8;
  border-radius: 16rpx;
  font-size: 24rpx;
  font-weight: 800;
}

.service-item__body {
  flex: 1;
  margin-left: 18rpx;
}

.service-item__label {
  display: block;
  color: #1f2522;
  font-size: 28rpx;
  font-weight: 700;
}

.service-item__desc {
  display: block;
  margin-top: 6rpx;
  color: #8a928d;
  font-size: 22rpx;
}

.service-item__arrow {
  color: #b8b1a6;
  font-size: 40rpx;
}

.logout {
  height: 86rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 22rpx;
  color: #b84a3c;
  background: #fff;
  border: 1rpx solid #eadbd6;
  border-radius: 22rpx;
  font-size: 28rpx;
  font-weight: 700;
}
</style>
