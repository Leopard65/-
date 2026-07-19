<script setup>
import { ORDER_STATUS, ORDER_STATUS_META } from '@/constants/status'
import { formatDateTime, formatMoney } from '@/utils/format'
import XEmpty from '@/components/x-empty/x-empty.vue'

defineProps({
  filters: { type: Array, default: () => [] },
  activeFilter: { type: [String, Number], default: 'all' },
  orders: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  actionBusyId: { type: String, default: '' }
})

const emit = defineEmits(['change-filter', 'ship', 'shipment', 'remark'])

const getOrderId = (item) => item?._id || item?.id || item?.order_id || ''
const orderStatusText = (status) => ORDER_STATUS_META[status]?.label || '未知状态'
const canShip = (item) => Number(item.status) === ORDER_STATUS.pendingShip
const canEditShipment = (item) => [ORDER_STATUS.pendingShip, ORDER_STATUS.pendingReceive].includes(Number(item.status))
</script>

<template>
  <view class="admin-section">
    <scroll-view class="filters" scroll-x>
      <view class="filters__inner">
        <view
          v-for="item in filters"
          :key="item.value"
          class="filter-chip"
          :class="{ 'filter-chip--active': activeFilter === item.value }"
          @click="emit('change-filter', item.value)"
        >
          {{ item.label }}
        </view>
      </view>
    </scroll-view>

    <view v-for="item in orders" :key="getOrderId(item)" class="record-card">
      <view class="record-card__head">
        <text class="record-card__no">{{ item.order_no }}</text>
        <text class="record-card__status">{{ orderStatusText(item.status) }}</text>
      </view>
      <view v-for="goods in item.goods_list || []" :key="`${getOrderId(item)}-${goods.goods_id}-${goods.sku_id}`" class="goods-line">
        <image class="goods-line__image" :src="goods.goods_image || goods.image" mode="aspectFill"></image>
        <view class="goods-line__body">
          <text class="goods-line__name text-ellipsis">{{ goods.goods_name || goods.name }}</text>
          <text class="goods-line__meta">{{ goods.sku_info || '默认规格' }} · x{{ goods.quantity }}</text>
        </view>
      </view>
      <view class="record-card__foot">
        <view class="record-card__foot-text">
          <text>{{ formatDateTime(item.create_date) }}</text>
          <text v-if="item.admin_remark" class="record-card__remark text-ellipsis">备注：{{ item.admin_remark }}</text>
        </view>
        <text class="record-card__amount">¥{{ formatMoney(item.pay_amount) }}</text>
      </view>
      <view class="record-card__actions">
        <button class="action-btn" :disabled="!!actionBusyId" @click="emit('remark', item)">备注</button>
        <button v-if="canEditShipment(item)" class="action-btn" :disabled="!!actionBusyId" @click="emit('shipment', item)">物流</button>
        <button
          v-if="canShip(item)"
          class="action-btn action-btn--primary"
          :loading="actionBusyId === getOrderId(item)"
          :disabled="!!actionBusyId"
          @click="emit('ship', item)"
        >
          发货
        </button>
      </view>
    </view>

    <XEmpty v-if="!loading && orders.length === 0" image="/static/empty-order.png" title="暂无订单" desc="当前筛选条件下没有订单。" />
  </view>
</template>

<style scoped>
.admin-section {
  margin-top: 20rpx;
}

.filters {
  white-space: nowrap;
  margin-bottom: 18rpx;
}

.filters__inner {
  display: flex;
  gap: 14rpx;
}

.filter-chip {
  padding: 14rpx 24rpx;
  color: #59625d;
  background: #fff;
  border: 1rpx solid #e7e3dc;
  border-radius: 999rpx;
  font-size: 24rpx;
}

.filter-chip--active {
  color: #fff;
  background: #2f5d50;
  border-color: #2f5d50;
}

.record-card {
  margin-bottom: 18rpx;
  padding: 24rpx;
  background: #fff;
  border: 1rpx solid #e7e3dc;
  border-radius: 22rpx;
}

.record-card__head,
.record-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
}

.record-card__no {
  flex: 1;
  min-width: 0;
  color: #8a928d;
  font-size: 23rpx;
}

.record-card__status {
  flex-shrink: 0;
  color: #2f5d50;
  font-size: 25rpx;
  font-weight: 900;
}

.goods-line {
  display: flex;
  margin-top: 18rpx;
}

.goods-line__image {
  width: 108rpx;
  height: 108rpx;
  flex-shrink: 0;
  background: #eeebe3;
  border-radius: 14rpx;
}

.goods-line__body {
  flex: 1;
  min-width: 0;
  margin-left: 16rpx;
}

.goods-line__name,
.goods-line__meta,
.record-card__remark {
  display: block;
}

.goods-line__name {
  color: #1f2522;
  font-size: 27rpx;
  font-weight: 800;
}

.goods-line__meta,
.record-card__remark {
  margin-top: 8rpx;
  color: #8a928d;
  font-size: 22rpx;
}

.record-card__foot {
  margin-top: 18rpx;
  padding-top: 16rpx;
  color: #8a928d;
  border-top: 1rpx solid #f1eee7;
  font-size: 23rpx;
}

.record-card__foot-text {
  flex: 1;
  min-width: 0;
}

.record-card__amount {
  flex-shrink: 0;
  color: #b84a3c;
  font-size: 30rpx;
  font-weight: 900;
}

.record-card__actions {
  display: flex;
  justify-content: flex-end;
  gap: 14rpx;
  margin-top: 18rpx;
}

.action-btn {
  min-width: 128rpx;
  height: 62rpx;
  margin: 0;
  padding: 0 24rpx;
  color: #2f5d50;
  background: #fff;
  border: 1rpx solid #d9d4ca;
  border-radius: 999rpx;
  font-size: 24rpx;
  line-height: 62rpx;
}

.action-btn--primary {
  color: #fff;
  background: #2f5d50;
  border-color: #2f5d50;
}

.action-btn::after {
  border: none;
}
</style>
