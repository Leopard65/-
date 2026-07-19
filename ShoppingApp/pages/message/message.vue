<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { api } from '@/api/client'
import XEmpty from '@/components/x-empty/x-empty.vue'

const messages = ref([])
const loading = ref(false)
const refreshing = ref(false)

const normalizeList = (data) => Array.isArray(data) ? data : (data?.list || [])

const loadMessages = async () => {
  loading.value = true
  const res = await api.service.getMessageList({ page: 1, pageSize: 50 }, { showError: false })
  if (res?.code === 0) messages.value = normalizeList(res.data)
  loading.value = false
  refreshing.value = false
}

onShow(loadMessages)

const refresh = () => {
  refreshing.value = true
  loadMessages()
}

const typeMeta = (type) => {
  const map = {
    order: { label: '订单', tone: 'green' },
    promo: { label: '活动', tone: 'gold' },
    promotion: { label: '活动', tone: 'gold' },
    system: { label: '系统', tone: 'gray' }
  }
  return map[type] || { label: '消息', tone: 'gray' }
}

const relativeTime = (timestamp) => {
  if (!timestamp) return ''
  const diff = Date.now() - Number(timestamp)
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
  const date = new Date(timestamp)
  return `${date.getMonth() + 1}-${date.getDate()}`
}

const readFlag = (item) => item.is_read ?? item.read

const openMessage = async (item) => {
  if (!readFlag(item)) {
    await api.service.markAsRead({ message_id: item._id }, { showError: false })
    item.is_read = true
    item.read = true
  }
  if (item.link) uni.navigateTo({ url: item.link })
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
      <view v-for="item in messages" :key="item._id" class="message-card" @click="openMessage(item)">
        <view class="message-card__badge" :class="`message-card__badge--${typeMeta(item.type).tone}`">
          <text>{{ typeMeta(item.type).label }}</text>
        </view>
        <view class="message-card__body">
          <view class="message-card__head">
            <text class="message-card__title">{{ item.title }}</text>
            <text class="message-card__time">{{ relativeTime(item.create_date) }}</text>
          </view>
          <text class="message-card__content text-ellipsis-2">{{ item.content }}</text>
        </view>
        <view v-if="!readFlag(item)" class="message-card__dot"></view>
      </view>

      <XEmpty
        v-if="!loading && messages.length === 0"
        image="/static/empty-message.png"
        title="暂无消息"
        desc="订单提醒、活动通知和系统消息会出现在这里。"
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

.message-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  margin-bottom: 16rpx;
  padding: 24rpx;
  background: #fff;
  border: 1rpx solid #e7e3dc;
  border-radius: 22rpx;
}

.message-card__badge {
  width: 70rpx;
  height: 70rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 18rpx;
  font-size: 22rpx;
  font-weight: 800;
}

.message-card__badge--green {
  color: #2f5d50;
  background: #eef3ef;
}

.message-card__badge--gold {
  color: #9b6f29;
  background: #fbf4e8;
}

.message-card__badge--gray {
  color: #59625d;
  background: #f1eee7;
}

.message-card__body {
  flex: 1;
  min-width: 0;
  margin-left: 18rpx;
}

.message-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.message-card__title {
  color: #1f2522;
  font-size: 29rpx;
  font-weight: 800;
}

.message-card__time {
  flex-shrink: 0;
  color: #8a928d;
  font-size: 22rpx;
}

.message-card__content {
  display: block;
  margin-top: 10rpx;
  color: #59625d;
  font-size: 25rpx;
  line-height: 1.55;
}

.message-card__dot {
  position: absolute;
  top: 22rpx;
  right: 22rpx;
  width: 14rpx;
  height: 14rpx;
  background: #b84a3c;
  border-radius: 50%;
}
</style>
