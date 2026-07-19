<script setup>
import { computed } from 'vue'
import XPrice from '@/components/x-price/x-price.vue'
import { ORDER_STATUS, ORDER_STATUS_META } from '@/constants/status'
import { formatDateTime } from '@/utils/format'

const props = defineProps({
  order: { type: Object, required: true }
})

const emit = defineEmits(['select', 'action', 'cancel'])

const meta = computed(() => ORDER_STATUS_META[props.order.status] || { label: '未知状态', action: '查看' })
const canCancel = computed(() => props.order.status === ORDER_STATUS.pendingPay)
</script>

<template>
  <view class="order-card" @click="$emit('select', order)">
    <view class="order-card__head">
      <text class="order-card__no">{{ order.order_no }}</text>
      <text class="order-card__status">{{ meta.label }}</text>
    </view>
    <view class="order-card__goods" v-for="item in order.goods_list" :key="`${order._id}-${item.goods_id}-${item.sku_id}`">
      <image class="order-card__image" :src="item.goods_image || item.image" mode="aspectFill"></image>
      <view class="order-card__info">
        <text class="order-card__name text-ellipsis">{{ item.goods_name || item.name }}</text>
        <text class="order-card__sku text-ellipsis">{{ item.sku_info || '默认规格' }}</text>
        <text class="order-card__qty">x{{ item.quantity }}</text>
      </view>
    </view>
    <view class="order-card__foot">
      <text class="order-card__date">{{ formatDateTime(order.create_date) }}</text>
      <view class="order-card__amount">
        <text>实付</text>
        <XPrice :value="order.pay_amount" size="small" />
      </view>
    </view>
    <view class="order-card__actions">
      <view v-if="canCancel" class="order-card__button order-card__button--ghost" @click.stop="$emit('cancel', order)">
        <text>取消订单</text>
      </view>
      <view class="order-card__button order-card__button--primary" @click.stop="$emit('action', order)">
        <text>{{ meta.action }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.order-card {
  position: relative;
  padding: 24rpx;
  background: #fff;
  border: 1rpx solid #e7e3dc;
  border-radius: 20rpx;
  box-shadow: 0 8rpx 26rpx rgba(31, 37, 34, 0.06);
}

.order-card__head,
.order-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.order-card__no {
  color: #59625d;
  font-size: 24rpx;
}

.order-card__status {
  color: #2f5d50;
  font-size: 26rpx;
  font-weight: 600;
}

.order-card__goods {
  display: flex;
  margin-top: 20rpx;
}

.order-card__image {
  width: 128rpx;
  height: 128rpx;
  border-radius: 14rpx;
  background: #eeebe3;
}

.order-card__info {
  flex: 1;
  margin-left: 18rpx;
}

.order-card__name {
  display: block;
  color: #1f2522;
  font-size: 28rpx;
  font-weight: 600;
}

.order-card__sku,
.order-card__qty,
.order-card__date {
  display: block;
  margin-top: 8rpx;
  color: #8a928d;
  font-size: 22rpx;
}

.order-card__amount {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
  color: #59625d;
  font-size: 24rpx;
}

.order-card__actions {
  margin-top: 20rpx;
  margin-left: auto;
  display: flex;
  justify-content: flex-end;
  gap: 14rpx;
}

.order-card__button {
  min-width: 168rpx;
  padding: 0 24rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  font-size: 26rpx;
}

.order-card__button--primary {
  color: #fff;
  background: #2f5d50;
}

.order-card__button--ghost {
  color: #2f5d50;
  background: #fff;
  border: 1rpx solid #d9d4ca;
}
</style>
