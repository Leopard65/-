<script setup>
import { AFTER_SALE_STATUS, AFTER_SALE_STATUS_META } from '@/constants/status'
import { formatMoney } from '@/utils/format'
import XEmpty from '@/components/x-empty/x-empty.vue'

defineProps({
  filters: { type: Array, default: () => [] },
  activeFilter: { type: [String, Number], default: 'all' },
  afterSales: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  actionBusyId: { type: String, default: '' }
})

const emit = defineEmits(['change-filter', 'audit', 'complete', 'remark'])

const getAfterSaleId = (item) => item?._id || item?.id || item?.after_sale_id || ''
const afterSaleStatusText = (status) => AFTER_SALE_STATUS_META[status] || '处理中'
const typeText = (type) => type === 'return' ? '退货退款' : '仅退款'
const canAudit = (item) => Number(item.status) === AFTER_SALE_STATUS.pending
const canComplete = (item) => [AFTER_SALE_STATUS.approved, AFTER_SALE_STATUS.returning].includes(Number(item.status))
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

    <view v-for="item in afterSales" :key="getAfterSaleId(item)" class="record-card">
      <view class="record-card__head">
        <text class="record-card__no">{{ item.aftersale_no || getAfterSaleId(item) }}</text>
        <text class="record-card__status">{{ afterSaleStatusText(item.status) }}</text>
      </view>
      <view v-for="goods in item.goods_list || []" :key="`${getAfterSaleId(item)}-${goods.goods_id}`" class="goods-line">
        <image class="goods-line__image" :src="goods.goods_image || goods.image" mode="aspectFill"></image>
        <view class="goods-line__body">
          <text class="goods-line__name text-ellipsis">{{ goods.goods_name || goods.name }}</text>
          <text class="goods-line__meta">{{ goods.sku_info || '默认规格' }}</text>
        </view>
      </view>
      <view class="record-card__foot">
        <view class="record-card__foot-text">
          <text>{{ typeText(item.type) }} · {{ item.reason || '未填写原因' }}</text>
          <text v-if="item.admin_remark || item.audit_remark" class="record-card__remark text-ellipsis">
            备注：{{ item.admin_remark || item.audit_remark }}
          </text>
        </view>
        <text class="record-card__amount">¥{{ formatMoney(item.refund_amount) }}</text>
      </view>
      <view class="record-card__actions">
        <button class="action-btn" :disabled="!!actionBusyId" @click="emit('remark', item)">备注</button>
        <button v-if="canAudit(item)" class="action-btn action-btn--primary" :loading="actionBusyId === getAfterSaleId(item)" :disabled="!!actionBusyId" @click="emit('audit', item, 'approve')">同意</button>
        <button v-if="canAudit(item)" class="action-btn" :disabled="!!actionBusyId" @click="emit('audit', item, 'reject')">拒绝</button>
        <button v-if="canComplete(item)" class="action-btn action-btn--primary" :loading="actionBusyId === getAfterSaleId(item)" :disabled="!!actionBusyId" @click="emit('complete', item)">完成退款</button>
      </view>
    </view>

    <XEmpty v-if="!loading && afterSales.length === 0" image="/static/empty-aftersale.png" title="暂无售后" desc="当前筛选条件下没有售后记录。" />
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
  flex-wrap: wrap;
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
