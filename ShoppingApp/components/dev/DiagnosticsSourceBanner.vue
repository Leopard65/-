<script setup>
import { computed } from 'vue'

const props = defineProps({
  meta: { type: Object, default: () => ({}) },
  mode: { type: String, default: 'light' },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['refresh', 'deep-check'])

const sourceType = computed(() => props.meta?.source || 'unknown')

const sourceInfo = computed(() => {
  const map = {
    cloud: {
      label: '云端诊断',
      tone: 'ok',
      desc: props.meta?.retried ? '云端重试后成功返回，数据来自真实 uniCloud。' : '数据来自真实 uniCloud。'
    },
    'cloud-partial': {
      label: '云端部分诊断',
      tone: 'warn',
      desc: '云函数已响应，但部分数据库检查未完成。'
    },
    'mock-fallback': {
      label: '本地兜底诊断',
      tone: 'warn',
      desc: '云端暂不可用，本页正在展示本地演示数据。'
    },
    mock: {
      label: '本地演示诊断',
      tone: 'muted',
      desc: '当前主动使用本地演示数据。'
    },
    'cloud-error': {
      label: '云端诊断失败',
      tone: 'error',
      desc: '未获取到云端或本地兜底结果。'
    }
  }
  return map[sourceType.value] || {
    label: '等待诊断',
    tone: 'muted',
    desc: '点击刷新后查看运行状态。'
  }
})

const modeText = computed(() => props.mode === 'deep' ? '深度检查' : '轻量检查')
const cloudErrorText = computed(() => props.meta?.cloudError?.message || '')
</script>

<template>
  <view class="source" :class="`source--${sourceInfo.tone}`">
    <view class="source__main">
      <view class="source__head">
        <text class="source__label">{{ sourceInfo.label }}</text>
        <text class="source__mode">{{ modeText }}</text>
      </view>
      <text class="source__desc">{{ sourceInfo.desc }}</text>
      <text v-if="cloudErrorText" class="source__error">{{ cloudErrorText }}</text>
    </view>
    <view class="source__actions">
      <button class="source__btn" :loading="loading" @click="emit('refresh')">刷新</button>
      <button class="source__btn source__btn--primary" :loading="loading" @click="emit('deep-check')">深度</button>
    </view>
  </view>
</template>

<style scoped>
.source {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  margin-top: 22rpx;
  padding: 22rpx;
  background: #fff;
  border: 1rpx solid #e7e3dc;
  border-radius: 20rpx;
}

.source--ok {
  border-color: #c9ded3;
  background: #f1f7f3;
}

.source--warn {
  border-color: #eadfbd;
  background: #fffaf0;
}

.source--error {
  border-color: #eadbd6;
  background: #fff7f5;
}

.source__main {
  min-width: 0;
  flex: 1;
}

.source__head {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.source__label,
.source__mode,
.source__desc,
.source__error {
  display: block;
}

.source__label {
  color: #1f2522;
  font-size: 28rpx;
  font-weight: 900;
}

.source__mode {
  padding: 5rpx 10rpx;
  color: #2f5d50;
  background: rgba(47, 93, 80, 0.1);
  border-radius: 999rpx;
  font-size: 20rpx;
  font-weight: 800;
}

.source__desc {
  margin-top: 8rpx;
  color: #59625d;
  font-size: 23rpx;
  line-height: 1.45;
}

.source__error {
  margin-top: 8rpx;
  color: #b84a3c;
  font-size: 22rpx;
  line-height: 1.45;
}

.source__actions {
  width: 174rpx;
  flex-shrink: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10rpx;
}

.source__btn {
  height: 58rpx;
  margin: 0;
  padding: 0;
  color: #2f5d50;
  background: #fff;
  border: 1rpx solid #dbe5df;
  border-radius: 14rpx;
  font-size: 22rpx;
  line-height: 58rpx;
}

.source__btn--primary {
  color: #fff;
  background: #2f5d50;
  border-color: #2f5d50;
}

.source__btn::after {
  border: none;
}
</style>
