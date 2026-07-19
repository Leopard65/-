<script setup>
import { computed, ref } from 'vue'
import { formatDateTime } from '@/utils/format'
import XEmpty from '@/components/x-empty/x-empty.vue'

const props = defineProps({
  messageTypes: { type: Array, default: () => [] },
  activeFilter: { type: [String, Number], default: 'all' },
  messages: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  actionBusyId: { type: String, default: '' }
})

const emit = defineEmits(['change-filter', 'save', 'preview'])

const showForm = ref(false)
const draft = ref(createDraft())
const messageStatuses = ['published', 'draft', 'archived']
const formTitle = computed(() => draft.value._id ? '编辑消息' : '发布消息')
const canSave = computed(() => Boolean(draft.value.title && draft.value.content && !props.actionBusyId))

function createDraft(item = null) {
  return {
    _id: item?._id || '',
    type: item?.type || 'system',
    title: item?.title || '',
    content: item?.content || '',
    user_id: item?.user_id || 'all',
    link: item?.link || '',
    status: item?.status || 'published'
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

const messageTypeText = (type) => props.messageTypes.find(item => item.value === type)?.label || '系统'
const statusText = (status) => status === 'draft' ? '草稿' : (status === 'archived' ? '归档' : '已发布')
const statusIndex = computed(() => Math.max(messageStatuses.indexOf(draft.value.status), 0))

function setStatus(index) {
  draft.value.status = messageStatuses[Number(index)] || 'published'
}
</script>

<template>
  <view class="admin-section">
    <view class="toolbar">
      <button class="toolbar-btn toolbar-btn--primary" @click="openCreate">发布消息</button>
    </view>

    <view v-if="showForm" class="edit-panel">
      <view class="edit-panel__head">
        <text class="edit-panel__title">{{ formTitle }}</text>
        <text class="edit-panel__close" @click="showForm = false">关闭</text>
      </view>
      <view class="message-types">
        <view
          v-for="item in messageTypes"
          :key="item.value"
          class="filter-chip"
          :class="{ 'filter-chip--active': draft.type === item.value }"
          @click="draft.type = item.value"
        >
          {{ item.label }}
        </view>
      </view>
      <input v-model="draft.title" class="form-input" placeholder="消息标题" maxlength="40" />
      <textarea v-model="draft.content" class="form-textarea" placeholder="消息内容" maxlength="180" />
      <view class="form-grid">
        <input v-model="draft.user_id" class="form-input" placeholder="接收用户 ID，all 为全体" />
        <picker :range="messageStatuses" :value="statusIndex" @change="setStatus($event.detail.value)">
          <view class="picker-field">{{ statusText(draft.status) }}</view>
        </picker>
      </view>
      <input v-model="draft.link" class="form-input" placeholder="跳转链接，可选" maxlength="120" />
      <button class="save-btn" :disabled="!canSave" :loading="!!actionBusyId" @click="submitDraft">{{ draft._id ? '保存消息' : '发布消息' }}</button>
    </view>

    <scroll-view class="filters" scroll-x>
      <view class="filters__inner">
        <view class="filter-chip" :class="{ 'filter-chip--active': activeFilter === 'all' }" @click="emit('change-filter', 'all')">全部</view>
        <view
          v-for="item in messageTypes"
          :key="item.value"
          class="filter-chip"
          :class="{ 'filter-chip--active': activeFilter === item.value }"
          @click="emit('change-filter', item.value)"
        >
          {{ item.label }}
        </view>
      </view>
    </scroll-view>

    <view v-for="item in messages" :key="item._id" class="record-card" @click="emit('preview', item)">
      <view class="record-card__head">
        <text class="message-title text-ellipsis">{{ item.title }}</text>
        <text class="record-card__status">{{ messageTypeText(item.type) }}</text>
      </view>
      <text class="message-content text-ellipsis-2">{{ item.content }}</text>
      <view class="record-card__foot">
        <text>{{ item.user_id === 'all' ? '全体用户' : item.user_id }}</text>
        <text>{{ statusText(item.status) }} · {{ formatDateTime(item.create_date) }}</text>
      </view>
      <view class="record-card__actions">
        <button class="action-btn" :disabled="!!actionBusyId" @click.stop="openEdit(item)">编辑</button>
      </view>
    </view>

    <XEmpty v-if="!loading && messages.length === 0" image="/static/empty-message.png" title="暂无消息" desc="当前筛选条件下没有消息。" />
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
.save-btn {
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
.record-card__head,
.record-card__foot,
.message-types,
.filters__inner {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.edit-panel__head,
.record-card__head,
.record-card__foot {
  justify-content: space-between;
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
.form-textarea,
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

.form-grid .form-input,
.form-grid .picker-field {
  flex: 1;
  min-width: 0;
}

.picker-field {
  display: flex;
  align-items: center;
}

.form-textarea {
  height: 148rpx;
  padding-top: 18rpx;
  line-height: 1.5;
}

.message-types {
  margin-top: 18rpx;
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

.message-title,
.message-content {
  display: block;
}

.message-title {
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

.message-content {
  margin-top: 12rpx;
  color: #59625d;
  font-size: 25rpx;
  line-height: 1.5;
}

.record-card__foot {
  margin-top: 14rpx;
  color: #8a928d;
  font-size: 22rpx;
}

.record-card__actions {
  display: flex;
  justify-content: flex-end;
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
