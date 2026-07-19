<script setup>
import { computed, ref } from 'vue'
import { formatMoney } from '@/utils/format'
import XEmpty from '@/components/x-empty/x-empty.vue'

const props = defineProps({
  filters: { type: Array, default: () => [] },
  activeFilter: { type: [String, Number], default: 'all' },
  coupons: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  actionBusyId: { type: String, default: '' }
})

const emit = defineEmits(['change-filter', 'save', 'status'])

const showForm = ref(false)
const draft = ref(createDraft())
const couponStatuses = ['available', 'expired']
const formTitle = computed(() => draft.value._id ? '编辑优惠券' : '新增优惠券')
const canSave = computed(() => Boolean(draft.value.title && Number(draft.value.amount) > 0 && !props.actionBusyId))
const statusIndex = computed(() => draft.value.status === 'available' ? 0 : 1)

function createDraft(item = null) {
  return {
    _id: item?._id || '',
    title: item?.title || '',
    amount: item?.amount ?? 0,
    threshold: item?.threshold ?? 0,
    status: item?.status || 'available',
    expire: item?.expire || '2026-12-31',
    total_quantity: item?.total_quantity ?? 0,
    per_user_limit: item?.per_user_limit ?? 1,
    sort: item?.sort ?? 0
  }
}

function openCreate() {
  draft.value = createDraft()
  showForm.value = true
}

function openEdit(item) {
  draft.value = createDraft(item)
  showForm.value = true
}

function submitDraft() {
  if (!canSave.value) return
  emit('save', { ...draft.value })
  showForm.value = false
}

const couponStatusText = (status) => status === 'available' ? '可用' : '停用'
function setStatus(index) {
  draft.value.status = couponStatuses[Number(index)] || 'available'
}
</script>

<template>
  <view class="admin-section">
    <view class="toolbar">
      <button class="toolbar-btn toolbar-btn--primary" @click="openCreate">新增优惠券</button>
    </view>

    <view v-if="showForm" class="edit-panel">
      <view class="edit-panel__head">
        <text class="edit-panel__title">{{ formTitle }}</text>
        <text class="edit-panel__close" @click="showForm = false">关闭</text>
      </view>
      <input v-model="draft.title" class="form-input" placeholder="优惠券名称" maxlength="40" />
      <view class="form-grid">
        <input v-model="draft.amount" class="form-input" type="digit" placeholder="优惠金额" />
        <input v-model="draft.threshold" class="form-input" type="digit" placeholder="使用门槛" />
      </view>
      <view class="form-grid">
        <input v-model="draft.total_quantity" class="form-input" type="number" placeholder="发放总量，0 不限" />
        <input v-model="draft.per_user_limit" class="form-input" type="number" placeholder="每人限领" />
      </view>
      <view class="form-grid">
        <input v-model="draft.expire" class="form-input" placeholder="到期日期 2026-12-31" />
        <input v-model="draft.sort" class="form-input" type="number" placeholder="排序" />
      </view>
      <picker :range="couponStatuses" :value="statusIndex" @change="setStatus($event.detail.value)">
        <view class="picker-field">{{ couponStatusText(draft.status) }}</view>
      </picker>
      <button class="save-btn" :disabled="!canSave" :loading="!!actionBusyId" @click="submitDraft">保存优惠券</button>
    </view>

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

    <view v-for="item in coupons" :key="item._id" class="record-card">
      <view class="record-card__head">
        <text class="coupon-title text-ellipsis">{{ item.title }}</text>
        <text class="record-card__status">{{ couponStatusText(item.status) }}</text>
      </view>
      <view class="coupon-body">
        <text class="coupon-amount">¥{{ formatMoney(item.amount) }}</text>
        <text class="coupon-meta">满 {{ item.threshold || 0 }} 可用 · 到期 {{ item.expire || '未设置' }}</text>
        <text class="coupon-meta">已领 {{ item.received_count || 0 }} / {{ item.total_quantity || '不限' }} · 已用 {{ item.used_count || 0 }} · 每人 {{ item.per_user_limit || 1 }} 张</text>
      </view>
      <view class="record-card__actions">
        <button class="action-btn" :disabled="!!actionBusyId" @click="openEdit(item)">编辑</button>
        <button class="action-btn action-btn--primary" :loading="actionBusyId === item._id" :disabled="!!actionBusyId" @click="emit('status', item)">
          {{ item.status === 'available' ? '停用' : '启用' }}
        </button>
      </view>
    </view>

    <XEmpty v-if="!loading && coupons.length === 0" image="/static/empty-coupon.png" title="暂无优惠券" desc="当前筛选条件下没有优惠券。" />
  </view>
</template>

<style scoped>
.admin-section {
  margin-top: 20rpx;
}

.toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 18rpx;
}

.toolbar-btn,
.save-btn,
.action-btn {
  margin: 0;
  border-radius: 999rpx;
}

.toolbar-btn {
  height: 72rpx;
  padding: 0 28rpx;
  color: #2f5d50;
  background: #fff;
  border: 1rpx solid #d9d4ca;
  font-size: 24rpx;
  line-height: 72rpx;
}

.toolbar-btn--primary,
.save-btn,
.action-btn--primary {
  color: #fff;
  background: #2f5d50;
  border-color: #2f5d50;
}

.edit-panel,
.record-card {
  margin-bottom: 18rpx;
  padding: 24rpx;
  background: #fff;
  border: 1rpx solid #e7e3dc;
  border-radius: 22rpx;
}

.edit-panel__head,
.form-grid,
.record-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14rpx;
}

.edit-panel__title {
  color: #1f2522;
  font-size: 30rpx;
  font-weight: 900;
}

.edit-panel__close {
  color: #2f5d50;
  font-size: 24rpx;
  font-weight: 800;
}

.form-input,
.picker-field {
  width: 100%;
  min-height: 72rpx;
  margin-top: 16rpx;
  padding: 0 22rpx;
  color: #1f2522;
  background: #fff;
  border: 1rpx solid #e7e3dc;
  border-radius: 16rpx;
  font-size: 25rpx;
}

.form-grid .form-input {
  flex: 1;
  min-width: 0;
}

.picker-field {
  display: flex;
  align-items: center;
}

.save-btn {
  height: 78rpx;
  margin-top: 20rpx;
  font-size: 28rpx;
  font-weight: 800;
  line-height: 78rpx;
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

.coupon-title,
.coupon-amount,
.coupon-meta {
  display: block;
}

.coupon-title {
  flex: 1;
  min-width: 0;
  color: #1f2522;
  font-size: 28rpx;
  font-weight: 900;
}

.record-card__status {
  color: #2f5d50;
  font-size: 25rpx;
  font-weight: 900;
}

.coupon-body {
  margin-top: 14rpx;
}

.coupon-amount {
  color: #b84a3c;
  font-size: 40rpx;
  font-weight: 900;
}

.coupon-meta {
  margin-top: 8rpx;
  color: #8a928d;
  font-size: 23rpx;
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
  padding: 0 24rpx;
  color: #2f5d50;
  background: #fff;
  border: 1rpx solid #d9d4ca;
  font-size: 24rpx;
  line-height: 62rpx;
}

.toolbar-btn::after,
.save-btn::after,
.action-btn::after {
  border: none;
}
</style>
