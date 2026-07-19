<script setup>
import { ref } from 'vue'
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app'
import { api } from '@/api/client'
import { ROUTES } from '@/constants/routes'
import XGoodsCard from '@/components/x-goods-card/x-goods-card.vue'

const banners = ref([])
const categories = ref([])
const recommends = ref([])

const loadHome = async () => {
  const res = await api.goods.getHomeData({}, { showError: false })
  if (res && res.code === 0) {
    banners.value = res.data.banner_list || []
    categories.value = res.data.category_list || []
    recommends.value = res.data.recommend_list || []
  }
}

const goGoods = (item) => {
  const goodsId = item?._id || item?.id || item?.goods_id
  if (!goodsId) return
  uni.navigateTo({ url: `${ROUTES.goodsDetail}?id=${goodsId}` })
}

const goCategory = (item) => {
  uni.navigateTo({ url: `${ROUTES.goodsList}?categoryId=${item._id}&title=${encodeURIComponent(item.name)}` })
}

onLoad(loadHome)
onPullDownRefresh(async () => {
  await loadHome()
  uni.stopPullDownRefresh()
})
</script>

<template>
  <view class="page-shell home">
    <view class="hero">
      <view class="hero__top">
        <view>
          <text class="hero__eyebrow">Xinchao Atelier</text>
          <text class="hero__title">把日常用品，挑得更讲究。</text>
        </view>
        <view class="hero__bell" @click="uni.navigateTo({ url: ROUTES.message })">
          <uni-icons type="bell" size="22" color="#1f2522"></uni-icons>
        </view>
      </view>
      <view class="hero__search" @click="uni.navigateTo({ url: ROUTES.search })">
        <uni-icons type="search" size="18" color="#8a928d"></uni-icons>
        <text>搜索商品、品牌或风格</text>
      </view>
    </view>

    <swiper class="banner" circular autoplay indicator-dots indicator-color="rgba(255,255,255,.45)" indicator-active-color="#2f5d50">
      <swiper-item v-for="item in banners" :key="item._id">
        <image class="banner__image" :src="item.image" mode="aspectFill"></image>
        <view class="banner__copy">
          <text class="banner__title">{{ item.title }}</text>
          <text class="banner__subtitle">{{ item.subtitle }}</text>
        </view>
      </swiper-item>
    </swiper>

    <view class="category-strip">
      <view class="category-strip__item" v-for="item in categories" :key="item._id" @click="goCategory(item)">
        <image class="category-strip__icon" :src="item.icon" mode="aspectFit"></image>
        <text>{{ item.name }}</text>
      </view>
    </view>

    <view class="section-head">
      <view>
        <text class="section-head__title">本周精选</text>
        <text class="section-head__desc">少一点噪音，多一点品质感</text>
      </view>
      <text class="section-head__link" @click="uni.navigateTo({ url: ROUTES.goodsList })">查看全部</text>
    </view>

    <view class="goods-grid">
      <XGoodsCard v-for="item in recommends" :key="item._id" :item="item" @select="goGoods" />
    </view>
  </view>
</template>

<style scoped>
.home {
  padding-bottom: 220rpx;
}

.hero {
  padding: 48rpx 28rpx 24rpx;
  background: linear-gradient(180deg, #eeebe3 0%, #f7f5f0 100%);
}

.hero__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.hero__eyebrow {
  display: block;
  color: #b58a45;
  font-size: 22rpx;
  letter-spacing: 0;
  text-transform: uppercase;
}

.hero__title {
  display: block;
  width: 520rpx;
  margin-top: 12rpx;
  color: #1f2522;
  font-size: 48rpx;
  line-height: 1.14;
  font-weight: 700;
}

.hero__bell {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,.72);
  border: 1rpx solid #e7e3dc;
  border-radius: 50%;
}

.hero__search {
  height: 80rpx;
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-top: 36rpx;
  padding: 0 26rpx;
  background: #fff;
  border: 1rpx solid #e7e3dc;
  border-radius: 999rpx;
  color: #8a928d;
  font-size: 26rpx;
}

.banner {
  height: 330rpx;
  margin: 8rpx 24rpx 0;
  border-radius: 28rpx;
  overflow: hidden;
  box-shadow: 0 12rpx 40rpx rgba(31,37,34,.08);
}

.banner__image {
  width: 100%;
  height: 100%;
}

.banner__copy {
  position: absolute;
  left: 32rpx;
  bottom: 36rpx;
  right: 32rpx;
}

.banner__title,
.banner__subtitle {
  display: block;
  color: #fff;
  text-shadow: 0 2rpx 10rpx rgba(0,0,0,.22);
}

.banner__title {
  font-size: 38rpx;
  font-weight: 700;
}

.banner__subtitle {
  margin-top: 8rpx;
  font-size: 24rpx;
}

.category-strip {
  display: flex;
  gap: 16rpx;
  padding: 28rpx 24rpx 12rpx;
  overflow-x: auto;
}

.category-strip__item {
  width: 132rpx;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  color: #59625d;
  font-size: 24rpx;
}

.category-strip__icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 24rpx;
  background: #fff;
  border: 1rpx solid #e7e3dc;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 28rpx 24rpx 18rpx;
}

.section-head__title {
  display: block;
  color: #1f2522;
  font-size: 36rpx;
  font-weight: 700;
}

.section-head__desc {
  display: block;
  margin-top: 6rpx;
  color: #8a928d;
  font-size: 24rpx;
}

.section-head__link {
  color: #2f5d50;
  font-size: 24rpx;
}

.goods-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18rpx;
  padding: 0 24rpx;
}
</style>
