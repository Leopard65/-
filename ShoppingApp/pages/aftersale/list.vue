<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { api } from '@/api/client'
import { AFTER_SALE_STATUS, AFTER_SALE_STATUS_META } from '@/constants/status'
import { formatDateTime, formatMoney } from '@/utils/format'
import XEmpty from '@/components/x-empty/x-empty.vue'

const records = ref([])
const loading = ref(false)
const refreshing = ref(false)
const actionBusyId = ref('')

const normalizeList = (data) => Array.isArray(data) ? data : (data?.list || [])

const loadRecords = async () => {
  loading.value = true
  const res = await api.service.getAfterSaleList({ page: 1, pageSize: 50 }, { showError: false })
  if (res?.code === 0) records.value = normalizeList(res.data)
  loading.value = false
  refreshing.value = false
}

onShow(loadRecords)

const refresh = () => {
  refreshing.value = true
  loadRecords()
}

const statusText = (status) => AFTER_SALE_STATUS_META[status] || '处理中'
const typeText = (type) => type === 'return' ? '退货退款' : '仅退款'
const getRecordId = (item) => item?._id || item?.id || item?.after_sale_id || ''

const getRecordActions = (item) => {
  if ([AFTER_SALE_STATUS.pending, AFTER_SALE_STATUS.approved].includes(item.status)) {
    return [{ text: '取消申请', type: 'cancel' }]
  }
  return []
}

const buildRecordContent = (item) => {
  const lines = [
    item.description || item.reason || '售后申请已提交，请等待商家处理。'
  ]
  if (item.audit_remark) lines.push(`审核备注：${item.audit_remark}`)
  if (item.refund_no) lines.push(`退款单号：${item.refund_no}`)
  return lines.join('\n')
}

const previewRecord = (item) => {
  uni.showModal({
    title: statusText(item.status),
    content: buildRecordContent(item),
    showCancel: false,
    confirmText: '知道了'
  })
}

const handleRecordAction = async (item, action) => {
  const afterSaleId = getRecordId(item)
  if (!afterSaleId || actionBusyId.value) return
  if (action.type !== 'cancel') return

  uni.showModal({
    title: '取消售后',
    content: '确认取消这条售后申请？',
    success: async (modalRes) => {
      if (!modalRes.confirm) return
      actionBusyId.value = afterSaleId
      const res = await api.service.cancelAfterSale({ after_sale_id: afterSaleId })
      actionBusyId.value = ''
      if (res?.code === 0) {
        uni.showToast({ title: res.msg || '已取消', icon: 'success' })
        loadRecords()
      }
    }
  })
}
</script>

<template>
  <view class="page">
    <scroll-view
      class="list"
      scroll-y
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="refresh"
    >
      <view v-for="item in records" :key="getRecordId(item)" class="after-card" @click="previewRecord(item)">
        <view class="after-card__head">
          <text class="after-card__no">{{ item.aftersale_no || item._id }}</text>
          <text class="after-card__status">{{ statusText(item.status) }}</text>
        </view>

        <view v-for="goods in item.goods_list || []" :key="`${item._id}-${goods.goods_id}`" class="goods-row">
          <image class="goods-row__image" :src="goods.goods_image || goods.image" mode="aspectFill"></image>
          <view class="goods-row__body">
            <text class="goods-row__name text-ellipsis-2">{{ goods.goods_name || goods.name }}</text>
            <text class="goods-row__sku">{{ goods.sku_info || '默认规格' }}</text>
          </view>
        </view>

        <view class="after-card__footer">
          <view>
            <text class="after-card__type">{{ typeText(item.type) }} · {{ item.reason }}</text>
            <text class="after-card__time">{{ formatDateTime(item.create_date) }}</text>
          </view>
          <text class="after-card__amount">¥{{ formatMoney(item.refund_amount) }}</text>
        </view>

        <view v-if="getRecordActions(item).length" class="after-card__actions">
          <button
            v-for="action in getRecordActions(item)"
            :key="action.type"
            class="after-card__button"
            :loading="actionBusyId === getRecordId(item)"
            :disabled="Boolean(actionBusyId)"
            @click.stop="handleRecordAction(item, action)"
          >
            {{ action.text }}
          </button>
        </view>
      </view>

      <XEmpty
        v-if="!loading && records.length === 0"
        image="/static/empty-aftersale.png"
        title="暂无售后记录"
        desc="已提交的退款、退货申请会展示在这里。"
      />
    </scroll-view>
  </view>
</template>

<style scoped>
.page {
  height: 100vh;
  background: #f7f5f0;
}

.list {
  height: 100%;
  padding: 20rpx 24rpx;
  box-sizing: border-box;
}

.after-card {
  margin-bottom: 18rpx;
  padding: 24rpx;
  background: #fff;
  border: 1rpx solid #e7e3dc;
  border-radius: 22rpx;
}

.after-card__head,
.after-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.after-card__no {
  color: #8a928d;
  font-size: 23rpx;
}

.after-card__status {
  color: #2f5d50;
  font-size: 26rpx;
  font-weight: 800;
}

.goods-row {
  display: flex;
  margin-top: 20rpx;
}

.goods-row__image {
  width: 126rpx;
  height: 126rpx;
  flex-shrink: 0;
  background: #eeebe3;
  border-radius: 16rpx;
}

.goods-row__body {
  flex: 1;
  min-width: 0;
  margin-left: 18rpx;
}

.goods-row__name {
  color: #1f2522;
  font-size: 27rpx;
  font-weight: 700;
  line-height: 1.45;
}

.goods-row__sku {
  display: block;
  margin-top: 8rpx;
  color: #8a928d;
  font-size: 22rpx;
}

.after-card__footer {
  margin-top: 20rpx;
  padding-top: 18rpx;
  border-top: 1rpx solid #f1eee7;
}

.after-card__type,
.after-card__time {
  display: block;
}

.after-card__type {
  color: #59625d;
  font-size: 24rpx;
}

.after-card__time {
  margin-top: 6rpx;
  color: #8a928d;
  font-size: 22rpx;
}

.after-card__amount {
  color: #b84a3c;
  font-size: 32rpx;
  font-weight: 900;
}

.after-card__actions {
  display: flex;
  justify-content: flex-end;
  gap: 14rpx;
  margin-top: 18rpx;
}

.after-card__button {
  width: auto;
  min-width: 142rpx;
  height: 58rpx;
  margin: 0;
  padding: 0 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #59625d;
  background: #fbfaf7;
  border: 1rpx solid #d8d2c7;
  border-radius: 999rpx;
  font-size: 24rpx;
  line-height: 58rpx;
}

.after-card__button::after {
  border: none;
}

.after-card__button--primary {
  color: #fff;
  background: #2f5d50;
  border-color: #2f5d50;
}
</style>
