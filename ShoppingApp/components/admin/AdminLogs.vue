<script setup>
import { formatDateTime } from '@/utils/format'
import XEmpty from '@/components/x-empty/x-empty.vue'

defineProps({
  targets: { type: Array, default: () => [] },
  activeTarget: { type: [String, Number], default: 'all' },
  logs: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['change-target'])

const actionText = (action = '') => {
  const map = {
    createGoods: '创建商品',
    updateGoods: '编辑商品',
    deleteGoodsDraft: '删除草稿',
    updateSkuList: '编辑 SKU',
    updateGoodsStatus: '调整商品状态',
    updateGoodsStock: '调整库存',
    createCoupon: '创建优惠券',
    updateCoupon: '编辑优惠券',
    updateCouponStatus: '调整优惠券状态',
    publishMessage: '发布消息',
    updateMessage: '编辑消息',
    shipOrder: '订单发货',
    updateShipment: '编辑物流',
    addOrderRemark: '订单备注',
    auditAfterSale: '审核售后',
    completeAfterSale: '完成退款',
    addAfterSaleRemark: '售后备注',
    seedDemoData: '初始化数据'
  }
  return map[action] || action || '操作'
}

const resultText = (after = {}) => {
  const parts = []
  if (after.status !== undefined) parts.push(`状态 ${after.status}`)
  if (after.stock !== undefined) parts.push(`库存 ${after.stock}`)
  if (after.price !== undefined) parts.push(`价格 ${after.price}`)
  return parts.join(' / ')
}
</script>

<template>
  <view class="admin-section">
    <scroll-view class="filters" scroll-x>
      <view class="filters__inner">
        <view
          v-for="item in targets"
          :key="item.value"
          class="filter-chip"
          :class="{ 'filter-chip--active': activeTarget === item.value }"
          @click="emit('change-target', item.value)"
        >
          {{ item.label }}
        </view>
      </view>
    </scroll-view>

    <view v-for="item in logs" :key="item._id" class="log-card">
      <view class="log-card__head">
        <text class="log-card__title">{{ actionText(item.action) }}</text>
        <text class="log-card__target">{{ item.target || 'system' }}</text>
      </view>
      <text class="log-card__meta">{{ item.operator_name || '运营人员' }} · {{ formatDateTime(item.create_date) }}</text>
      <text v-if="item.remark" class="log-card__remark text-ellipsis-2">{{ item.remark }}</text>
      <view class="log-card__summary">
        <text>对象：{{ item.target_id || '-' }}</text>
        <text v-if="item.after && resultText(item.after)">结果：{{ resultText(item.after) }}</text>
      </view>
    </view>

    <XEmpty v-if="!loading && logs.length === 0" image="/static/empty-message.png" title="暂无操作日志" desc="完成一次运营操作后，这里会记录动作摘要。" />
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

.log-card {
  margin-bottom: 18rpx;
  padding: 24rpx;
  background: #fff;
  border: 1rpx solid #e7e3dc;
  border-radius: 22rpx;
}

.log-card__head,
.log-card__summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
}

.log-card__title,
.log-card__meta,
.log-card__remark {
  display: block;
}

.log-card__title {
  flex: 1;
  min-width: 0;
  color: #1f2522;
  font-size: 28rpx;
  font-weight: 900;
}

.log-card__target {
  padding: 8rpx 16rpx;
  color: #2f5d50;
  background: #eef5f1;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 700;
}

.log-card__meta,
.log-card__remark,
.log-card__summary {
  margin-top: 12rpx;
  color: #8a928d;
  font-size: 23rpx;
  line-height: 1.5;
}

.log-card__summary {
  padding-top: 14rpx;
  border-top: 1rpx solid #f1eee7;
}
</style>
