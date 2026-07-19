<script setup>
defineProps({
  image: { type: String, default: '/static/empty-goods.png' },
  title: { type: String, default: '这里还没有内容' },
  desc: { type: String, default: '换个条件试试，或稍后再来。' },
  actionText: { type: String, default: '' }
})

defineEmits(['action'])
</script>

<template>
  <view class="x-empty">
    <image class="x-empty__image" :src="image" mode="aspectFit"></image>
    <text class="x-empty__title">{{ title }}</text>
    <text class="x-empty__desc">{{ desc }}</text>
    <view v-if="actionText" class="x-empty__action" @click="$emit('action')">
      <text>{{ actionText }}</text>
    </view>
  </view>
</template>

<style scoped>
.x-empty {
  min-height: 520rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64rpx 48rpx;
}

.x-empty__image {
  width: 240rpx;
  height: 240rpx;
  margin-bottom: 24rpx;
}

.x-empty__title {
  font-size: 30rpx;
  color: #1f2522;
  font-weight: 600;
}

.x-empty__desc {
  margin-top: 10rpx;
  color: #8a928d;
  font-size: 24rpx;
  text-align: center;
  line-height: 1.6;
}

.x-empty__action {
  margin-top: 28rpx;
  padding: 18rpx 38rpx;
  color: #fff;
  background: #2f5d50;
  border-radius: 999rpx;
  font-size: 26rpx;
}
</style>
