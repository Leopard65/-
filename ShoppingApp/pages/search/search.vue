<script setup>
import { computed, ref } from 'vue'
import { ROUTES } from '@/constants/routes'

const keyword = ref('')
const history = ref(uni.getStorageSync('xc_search_history') || ['保温杯', '短袖', '耳机'])
const hotWords = ['生活方式', '家居', '轻数码', '浴巾', '新人礼券']

const suggestions = computed(() => {
  if (!keyword.value) return hotWords
  return hotWords.filter(item => item.includes(keyword.value)).concat(keyword.value)
})

const submit = (word = keyword.value) => {
  const value = String(word || '').trim()
  if (!value) return
  history.value = [value, ...history.value.filter(item => item !== value)].slice(0, 8)
  uni.setStorageSync('xc_search_history', history.value)
  uni.navigateTo({ url: `${ROUTES.goodsList}?keyword=${encodeURIComponent(value)}&title=${encodeURIComponent(value)}` })
}

const clearHistory = () => {
  history.value = []
  uni.removeStorageSync('xc_search_history')
}
</script>

<template>
  <view class="page-shell search-page">
    <view class="search-box">
      <uni-icons type="search" size="18" color="#8a928d"></uni-icons>
      <input class="search-box__input" v-model="keyword" confirm-type="search" placeholder="搜索商品、品牌或风格" @confirm="submit()" />
      <text class="search-box__go" @click="submit()">搜索</text>
    </view>
    <view class="block">
      <view class="block__head">
        <text>搜索建议</text>
      </view>
      <view class="chips">
        <text v-for="item in suggestions" :key="item" class="chip" @click="submit(item)">{{ item }}</text>
      </view>
    </view>
    <view class="block">
      <view class="block__head">
        <text>最近搜索</text>
        <text class="block__clear" @click="clearHistory">清空</text>
      </view>
      <view class="chips" v-if="history.length">
        <text v-for="item in history" :key="item" class="chip chip--light" @click="submit(item)">{{ item }}</text>
      </view>
      <text v-else class="empty-line">还没有搜索记录</text>
    </view>
  </view>
</template>

<style scoped>
.search-page {
  padding: 24rpx;
}

.search-box {
  height: 84rpx;
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 0 22rpx;
  background: #fff;
  border: 1rpx solid #e7e3dc;
  border-radius: 999rpx;
}

.search-box__input {
  flex: 1;
  font-size: 28rpx;
}

.search-box__go {
  color: #2f5d50;
  font-size: 26rpx;
  font-weight: 600;
}

.block {
  margin-top: 36rpx;
}

.block__head {
  display: flex;
  justify-content: space-between;
  color: #1f2522;
  font-size: 30rpx;
  font-weight: 700;
}

.block__clear {
  color: #8a928d;
  font-size: 24rpx;
  font-weight: 400;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 20rpx;
}

.chip {
  padding: 16rpx 26rpx;
  color: #fff;
  background: #2f5d50;
  border-radius: 999rpx;
  font-size: 25rpx;
}

.chip--light {
  color: #59625d;
  background: #fff;
  border: 1rpx solid #e7e3dc;
}

.empty-line {
  display: block;
  margin-top: 20rpx;
  color: #8a928d;
  font-size: 24rpx;
}
</style>
