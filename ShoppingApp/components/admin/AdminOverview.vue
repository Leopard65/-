<script setup>
defineProps({
  statCards: { type: Array, default: () => [] },
  orderStatusRows: { type: Array, default: () => [] },
  afterSaleStatusRows: { type: Array, default: () => [] }
})
</script>

<template>
  <view class="admin-section">
    <view class="stat-grid">
      <view v-for="item in statCards" :key="item.label" class="stat-card">
        <text class="stat-card__value">{{ item.value }}</text>
        <text class="stat-card__label">{{ item.label }}</text>
        <text class="stat-card__hint">{{ item.hint }}</text>
      </view>
    </view>

    <view class="admin-panel">
      <text class="admin-panel__title">订单状态</text>
      <view v-for="item in orderStatusRows" :key="item.label" class="metric-row">
        <text>{{ item.label }}</text>
        <text>{{ item.value }}</text>
      </view>
    </view>

    <view class="admin-panel">
      <text class="admin-panel__title">售后状态</text>
      <view v-for="item in afterSaleStatusRows" :key="item.label" class="metric-row">
        <text>{{ item.label }}</text>
        <text>{{ item.value }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.admin-section {
  margin-top: 20rpx;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.stat-card,
.admin-panel {
  background: #fff;
  border: 1rpx solid #e7e3dc;
  border-radius: 22rpx;
}

.stat-card {
  padding: 24rpx;
}

.stat-card__value,
.stat-card__label,
.stat-card__hint,
.admin-panel__title {
  display: block;
}

.stat-card__value {
  color: #2f5d50;
  font-size: 42rpx;
  font-weight: 900;
}

.stat-card__label {
  margin-top: 8rpx;
  color: #1f2522;
  font-size: 27rpx;
  font-weight: 800;
}

.stat-card__hint {
  margin-top: 6rpx;
  color: #8a928d;
  font-size: 22rpx;
}

.admin-panel {
  margin-top: 18rpx;
  padding: 24rpx;
}

.admin-panel__title {
  margin-bottom: 14rpx;
  color: #1f2522;
  font-size: 30rpx;
  font-weight: 900;
}

.metric-row {
  min-height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #59625d;
  border-bottom: 1rpx solid #f1eee7;
  font-size: 26rpx;
}

.metric-row:last-child {
  border-bottom: none;
}
</style>
