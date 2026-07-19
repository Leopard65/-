<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { api } from '@/api/client'
import { ROUTES } from '@/constants/routes'
import XEmpty from '@/components/x-empty/x-empty.vue'
import XGoodsCard from '@/components/x-goods-card/x-goods-card.vue'

const goodsList = ref([])
const loading = ref(false)
const refreshing = ref(false)

const normalizeList = (data) => Array.isArray(data) ? data : (data?.list || [])

const loadCollects = async () => {
  loading.value = true
  const res = await api.service.getCollectList({ page: 1, pageSize: 50 }, { showError: false })
  if (res?.code === 0) goodsList.value = normalizeList(res.data)
  loading.value = false
  refreshing.value = false
}

onShow(loadCollects)

const refresh = () => {
  refreshing.value = true
  loadCollects()
}

const goDetail = (item) => {
  const goodsId = item?.goods_id || item?._id || item?.id
  if (!goodsId) return
  uni.navigateTo({ url: `${ROUTES.goodsDetail}?id=${goodsId}` })
}

const cancelCollect = async (item) => {
  const goodsId = item.goods_id || item._id
  const res = await api.service.cancelCollect({ goods_id: goodsId })
  if (res?.code === 0) {
    goodsList.value = goodsList.value.filter(row => (row.goods_id || row._id) !== goodsId)
    uni.showToast({ title: '已取消收藏', icon: 'success' })
  }
}

const goShopping = () => {
  uni.switchTab({ url: ROUTES.home })
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
      <view v-for="item in goodsList" :key="item.goods_id || item._id" class="collect-row">
        <XGoodsCard :item="item" compact @select="goDetail" />
        <view class="collect-row__footer">
          <text class="collect-row__hint">已收藏，可在商品详情重新加入购物车</text>
          <text class="collect-row__action" @click="cancelCollect(item)">取消收藏</text>
        </view>
      </view>

      <XEmpty
        v-if="!loading && goodsList.length === 0"
        image="/static/empty-collect.png"
        title="还没有收藏"
        desc="遇到喜欢的商品，点亮收藏后会出现在这里。"
        action-text="去逛逛"
        @action="goShopping"
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

.collect-row {
  overflow: hidden;
  margin-bottom: 18rpx;
  background: #fff;
  border: 1rpx solid #e7e3dc;
  border-radius: 22rpx;
}

.collect-row :deep(.goods-card) {
  border: none;
  border-radius: 0;
  box-shadow: none;
}

.collect-row__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18rpx 20rpx;
  border-top: 1rpx solid #f1eee7;
}

.collect-row__hint {
  color: #8a928d;
  font-size: 22rpx;
}

.collect-row__action {
  flex-shrink: 0;
  margin-left: 18rpx;
  color: #b84a3c;
  font-size: 24rpx;
  font-weight: 700;
}
</style>
