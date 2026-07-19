<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { api } from '@/api/client'
import { ROUTES } from '@/constants/routes'
import XGoodsCard from '@/components/x-goods-card/x-goods-card.vue'

const categories = ref([])
const currentIndex = ref(0)
const hotGoods = ref([])

const current = computed(() => categories.value[currentIndex.value] || null)

const loadData = async () => {
  const res = await api.goods.getCategoryList()
  if (res?.code === 0) {
    categories.value = res.data || []
    await loadHotGoods(current.value?._id)
  }
}

const loadHotGoods = async (categoryId) => {
  if (!categoryId) return
  const res = await api.goods.getGoodsByCategory({ categoryId, pageSize: 6, sort: 'sales' })
  if (res?.code === 0) hotGoods.value = res.data.list || []
}

const changeCategory = async (index) => {
  currentIndex.value = index
  await loadHotGoods(current.value?._id)
}

const goList = (item) => {
  uni.navigateTo({ url: `${ROUTES.goodsList}?categoryId=${item._id}&title=${encodeURIComponent(item.name)}` })
}

const goGoods = (item) => {
  const goodsId = item?._id || item?.id || item?.goods_id
  if (!goodsId) return
  uni.navigateTo({ url: `${ROUTES.goodsDetail}?id=${goodsId}` })
}

onLoad(loadData)
</script>

<template>
  <view class="page-shell category">
    <scroll-view class="category__rail" scroll-y>
      <view
        v-for="(item, index) in categories"
        :key="item._id"
        class="category__tab"
        :class="{ active: currentIndex === index }"
        @click="changeCategory(index)"
      >
        <text>{{ item.name }}</text>
      </view>
    </scroll-view>
    <scroll-view class="category__main" scroll-y>
      <view v-if="current" class="category__panel">
        <view class="category__intro card">
          <text class="category__name">{{ current.name }}</text>
          <text class="category__desc">按质感、功能和使用场景重新整理的精选分类。</text>
        </view>
        <view class="sub-grid">
          <view v-for="item in current.children" :key="item._id" class="sub-grid__item" @click="goList(item)">
            <image :src="item.icon" class="sub-grid__icon" mode="aspectFit"></image>
            <text>{{ item.name }}</text>
          </view>
        </view>
        <view class="section-title">热门推荐</view>
        <view class="hot-list">
          <XGoodsCard v-for="item in hotGoods" :key="item._id" :item="item" compact @select="goGoods" />
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped>
.category {
  height: 100vh;
  display: flex;
}

.category__rail {
  width: 190rpx;
  height: 100vh;
  background: #eeebe3;
}

.category__tab {
  min-height: 104rpx;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  color: #59625d;
  font-size: 26rpx;
  border-left: 6rpx solid transparent;
}

.category__tab.active {
  color: #1f2522;
  background: #f7f5f0;
  border-left-color: #2f5d50;
  font-weight: 700;
}

.category__main {
  flex: 1;
  height: 100vh;
}

.category__panel {
  padding: 24rpx 24rpx 180rpx;
}

.category__intro {
  padding: 28rpx;
}

.category__name {
  display: block;
  font-size: 38rpx;
  color: #1f2522;
  font-weight: 700;
}

.category__desc {
  display: block;
  margin-top: 10rpx;
  color: #8a928d;
  font-size: 24rpx;
  line-height: 1.5;
}

.sub-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18rpx;
  margin-top: 22rpx;
}

.sub-grid__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  padding: 18rpx 8rpx;
  background: #fff;
  border: 1rpx solid #e7e3dc;
  border-radius: 18rpx;
  color: #59625d;
  font-size: 23rpx;
}

.sub-grid__icon {
  width: 84rpx;
  height: 84rpx;
}

.section-title {
  margin: 34rpx 0 18rpx;
  color: #1f2522;
  font-size: 32rpx;
  font-weight: 700;
}

.hot-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}
</style>
