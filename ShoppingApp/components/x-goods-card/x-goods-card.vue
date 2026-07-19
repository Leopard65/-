<script setup>
import XPrice from '@/components/x-price/x-price.vue'
import { formatSales } from '@/utils/format'

defineProps({
  item: { type: Object, required: true },
  compact: { type: Boolean, default: false }
})

defineEmits(['select'])
</script>

<template>
  <view class="goods-card" :class="{ 'goods-card--compact': compact }" @click="$emit('select', item)">
    <image class="goods-card__image" :src="item.image" mode="aspectFill" lazy-load></image>
    <view class="goods-card__body">
      <text class="goods-card__name text-ellipsis-2">{{ item.name }}</text>
      <text class="goods-card__subtitle text-ellipsis" v-if="item.subtitle">{{ item.subtitle }}</text>
      <view class="goods-card__meta">
        <XPrice :value="item.price" />
        <text class="goods-card__sales">已售{{ formatSales(item.sales) }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.goods-card {
  overflow: hidden;
  background: #fff;
  border: 1rpx solid #e7e3dc;
  border-radius: 20rpx;
  box-shadow: 0 8rpx 26rpx rgba(31, 37, 34, 0.06);
}

.goods-card__image {
  width: 100%;
  height: 260rpx;
  background: #eeebe3;
}

.goods-card__body {
  padding: 16rpx;
}

.goods-card__name {
  min-height: 64rpx;
  color: #1f2522;
  font-size: 28rpx;
  line-height: 1.35;
  font-weight: 600;
}

.goods-card__subtitle {
  display: block;
  margin-top: 6rpx;
  color: #8a928d;
  font-size: 22rpx;
}

.goods-card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14rpx;
}

.goods-card__sales {
  color: #8a928d;
  font-size: 22rpx;
}

.goods-card--compact {
  display: flex;
}

.goods-card--compact .goods-card__image {
  width: 180rpx;
  height: 180rpx;
  flex-shrink: 0;
}

.goods-card--compact .goods-card__body {
  flex: 1;
}
</style>
