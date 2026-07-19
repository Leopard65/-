<script setup>
import { ref } from 'vue'
import { onLoad, onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import { api } from '@/api/client'
import { ROUTES } from '@/constants/routes'
import XGoodsCard from '@/components/x-goods-card/x-goods-card.vue'
import XEmpty from '@/components/x-empty/x-empty.vue'

const title = ref('全部商品')
const query = ref({
  categoryId: '',
  keyword: '',
  brand: '',
  minPrice: '',
  maxPrice: '',
  sort: 'default',
  page: 1,
  pageSize: 10
})
const goodsList = ref([])
const hasMore = ref(true)
const loading = ref(false)

const showFilter = ref(false)
const brandOptions = ref([])
const draftBrand = ref('')
const draftMin = ref('')
const draftMax = ref('')

const sortTabs = [
  { value: 'default', label: '综合' },
  { value: 'sales', label: '销量' },
  { value: 'new', label: '新品' },
  { value: 'price_asc', label: '价格↑' },
  { value: 'price_desc', label: '价格↓' }
]

const hasFilter = () => Boolean(query.value.brand || query.value.minPrice !== '' || query.value.maxPrice !== '')

const loadGoods = async (reset = false) => {
  if (loading.value) return
  loading.value = true
  if (reset) {
    query.value.page = 1
    hasMore.value = true
  }
  const res = await api.goods.getGoodsList(query.value)
  if (res?.code === 0) {
    const list = res.data.list || []
    goodsList.value = reset ? list : [...goodsList.value, ...list]
    hasMore.value = Boolean(res.data.hasMore)
    // 首次（无品牌筛选）加载时采集品牌选项，避免筛选后选项被缩减
    if (reset && !query.value.brand) {
      brandOptions.value = [...new Set(goodsList.value.map(item => item.brand).filter(Boolean))]
    }
  }
  loading.value = false
}

const changeSort = (sort) => {
  query.value.sort = sort
  loadGoods(true)
}

const toggleFilter = () => {
  draftBrand.value = query.value.brand
  draftMin.value = query.value.minPrice
  draftMax.value = query.value.maxPrice
  showFilter.value = !showFilter.value
}

const pickBrand = (brand) => {
  draftBrand.value = draftBrand.value === brand ? '' : brand
}

const applyFilter = () => {
  query.value.brand = draftBrand.value
  query.value.minPrice = draftMin.value === '' ? '' : Number(draftMin.value)
  query.value.maxPrice = draftMax.value === '' ? '' : Number(draftMax.value)
  showFilter.value = false
  loadGoods(true)
}

const resetFilter = () => {
  draftBrand.value = ''
  draftMin.value = ''
  draftMax.value = ''
  query.value.brand = ''
  query.value.minPrice = ''
  query.value.maxPrice = ''
  showFilter.value = false
  loadGoods(true)
}

const goGoods = (item) => {
  const goodsId = item?._id || item?.id || item?.goods_id
  if (!goodsId) return
  uni.navigateTo({ url: `${ROUTES.goodsDetail}?id=${goodsId}` })
}

onLoad((options = {}) => {
  query.value.categoryId = options.categoryId || ''
  query.value.keyword = options.keyword ? decodeURIComponent(options.keyword) : ''
  title.value = options.title ? decodeURIComponent(options.title) : (query.value.keyword || '全部商品')
  loadGoods(true)
})

onPullDownRefresh(async () => {
  await loadGoods(true)
  uni.stopPullDownRefresh()
})

onReachBottom(() => {
  if (!hasMore.value) return
  query.value.page += 1
  loadGoods()
})
</script>

<template>
  <view class="page-shell list-page">
    <view class="list-head">
      <text class="list-head__title">{{ title }}</text>
      <text class="list-head__count">{{ goodsList.length }} 件精选</text>
    </view>
    <scroll-view class="sort-bar" scroll-x>
      <view class="sort-bar__inner">
        <view
          v-for="item in sortTabs"
          :key="item.value"
          class="sort-bar__item"
          :class="{ active: query.sort === item.value }"
          @click="changeSort(item.value)"
        >
          {{ item.label }}
        </view>
      </view>
    </scroll-view>
    <view class="filter-row">
      <view class="filter-trigger" :class="{ active: hasFilter() }" @click="toggleFilter">
        <text>筛选</text>
        <text class="filter-trigger__arrow">{{ showFilter ? '⌃' : '⌄' }}</text>
      </view>
    </view>
    <view v-if="showFilter" class="filter-panel card">
      <text class="filter-panel__label">价格区间</text>
      <view class="filter-price">
        <input class="filter-price__input" type="number" v-model="draftMin" placeholder="最低价" />
        <text class="filter-price__sep">—</text>
        <input class="filter-price__input" type="number" v-model="draftMax" placeholder="最高价" />
      </view>
      <template v-if="brandOptions.length">
        <text class="filter-panel__label">品牌</text>
        <view class="filter-brands">
          <text
            v-for="b in brandOptions"
            :key="b"
            class="filter-brand"
            :class="{ active: draftBrand === b }"
            @click="pickBrand(b)"
          >{{ b }}</text>
        </view>
      </template>
      <view class="filter-actions">
        <text class="filter-btn filter-btn--ghost" @click="resetFilter">重置</text>
        <text class="filter-btn filter-btn--primary" @click="applyFilter">确定</text>
      </view>
    </view>
    <view v-if="goodsList.length" class="goods-grid">
      <XGoodsCard v-for="item in goodsList" :key="item._id" :item="item" @select="goGoods" />
    </view>
    <XEmpty v-else title="暂时没有找到商品" desc="换个关键词或分类再试试。" />
    <view class="load-more" v-if="goodsList.length">
      <text>{{ hasMore ? (loading ? '加载中...' : '继续上拉查看更多') : '已经到底了' }}</text>
    </view>
  </view>
</template>

<style scoped>
.list-page {
  padding-bottom: 32rpx;
}

.list-head {
  padding: 32rpx 24rpx 12rpx;
}

.list-head__title {
  display: block;
  color: #1f2522;
  font-size: 42rpx;
  font-weight: 700;
}

.list-head__count {
  display: block;
  margin-top: 8rpx;
  color: #8a928d;
  font-size: 24rpx;
}

.sort-bar {
  white-space: nowrap;
  padding: 12rpx 0 20rpx;
}

.sort-bar__inner {
  display: flex;
  gap: 14rpx;
  padding: 0 24rpx;
}

.sort-bar__item {
  padding: 14rpx 26rpx;
  color: #59625d;
  background: #fff;
  border: 1rpx solid #e7e3dc;
  border-radius: 999rpx;
  font-size: 24rpx;
}

.sort-bar__item.active {
  color: #fff;
  background: #2f5d50;
  border-color: #2f5d50;
}

.filter-row {
  display: flex;
  justify-content: flex-end;
  padding: 0 24rpx 12rpx;
}

.filter-trigger {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 26rpx;
  color: #59625d;
  background: #fff;
  border: 1rpx solid #e7e3dc;
  border-radius: 999rpx;
  font-size: 24rpx;
}

.filter-trigger.active {
  color: #2f5d50;
  border-color: #2f5d50;
  font-weight: 600;
}

.filter-trigger__arrow {
  font-size: 22rpx;
}

.filter-panel {
  margin: 0 24rpx 18rpx;
  padding: 24rpx;
}

.filter-panel__label {
  display: block;
  color: #1f2522;
  font-size: 26rpx;
  font-weight: 700;
}

.filter-price {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin: 16rpx 0 24rpx;
}

.filter-price__input {
  flex: 1;
  height: 72rpx;
  padding: 0 22rpx;
  background: #f6f4ef;
  border-radius: 14rpx;
  font-size: 26rpx;
}

.filter-price__sep {
  color: #8a928d;
}

.filter-brands {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin: 16rpx 0 24rpx;
}

.filter-brand {
  padding: 12rpx 26rpx;
  color: #59625d;
  background: #f6f4ef;
  border-radius: 999rpx;
  font-size: 24rpx;
}

.filter-brand.active {
  color: #fff;
  background: #2f5d50;
}

.filter-actions {
  display: flex;
  gap: 18rpx;
}

.filter-btn {
  flex: 1;
  height: 76rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  font-size: 27rpx;
  font-weight: 600;
}

.filter-btn--ghost {
  color: #59625d;
  background: #f1efe9;
}

.filter-btn--primary {
  color: #fff;
  background: #2f5d50;
}

.goods-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18rpx;
  padding: 0 24rpx;
}

.load-more {
  padding: 28rpx;
  text-align: center;
  color: #8a928d;
  font-size: 24rpx;
}
</style>
