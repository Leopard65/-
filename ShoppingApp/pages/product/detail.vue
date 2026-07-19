<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { api } from '@/api/client'
import { ROUTES } from '@/constants/routes'
import { requireLogin } from '@/utils/navigation'
import { useUserStore } from '@/stores/user'
import { useCartStore } from '@/stores/cart'
import XPrice from '@/components/x-price/x-price.vue'
import XQuantity from '@/components/x-quantity/x-quantity.vue'

const userStore = useUserStore()
const cartStore = useCartStore()
const goodsId = ref('')
const goods = ref(null)
const skuList = ref([])
const selectedSkuId = ref('')
const quantity = ref(1)
const collected = ref(false)
const showSku = ref(false)

const selectedSku = computed(() => skuList.value.find(item => item._id === selectedSkuId.value) || skuList.value[0] || null)
const currentPrice = computed(() => selectedSku.value?.price ?? goods.value?.price ?? 0)
const currentStock = computed(() => Number(selectedSku.value?.stock ?? goods.value?.stock ?? 0))
const evaluations = computed(() => goods.value?.evaluate_list || [])
const salesText = computed(() => {
  const sales = Number(goods.value?.sales || 0)
  return sales > 0 ? `已售 ${sales}` : '新品上架'
})
const starText = (value) => '★'.repeat(Math.max(1, Math.min(5, Number(value) || 5)))
const normalizeList = (data) => Array.isArray(data) ? data : (data?.list || [])

const loadDetail = async () => {
  const res = await api.goods.getGoodsDetail({ goodsId: goodsId.value })
  if (res?.code === 0) {
    goods.value = res.data
    skuList.value = res.data.sku_list || []
    selectedSkuId.value = skuList.value[0]?._id || ''
    const collectRes = await api.service.getCollectList({}, { showError: false })
    collected.value = normalizeList(collectRes?.data).some(item => (item.goods_id || item._id) === goodsId.value)
  }
  await cartStore.getCartList()
}

const toggleCollect = async () => {
  if (!requireLogin(userStore, `${ROUTES.goodsDetail}?id=${goodsId.value}`)) return
  const res = await api.service.toggleCollect({ goods_id: goodsId.value })
  if (res?.code === 0) {
    collected.value = res.data.is_collect
    uni.showToast({ title: res.msg, icon: 'success' })
  }
}

const addCart = async () => {
  if (!requireLogin(userStore, `${ROUTES.goodsDetail}?id=${goodsId.value}`)) return
  if (currentStock.value <= 0) {
    uni.showToast({ title: '当前规格已售罄', icon: 'none' })
    return
  }
  await cartStore.addToCart({
    goods_id: goodsId.value,
    sku_id: selectedSku.value?._id,
    quantity: quantity.value
  })
  showSku.value = false
}

const buyNow = () => {
  if (!requireLogin(userStore, `${ROUTES.goodsDetail}?id=${goodsId.value}`)) return
  if (currentStock.value <= 0) {
    uni.showToast({ title: '当前规格已售罄', icon: 'none' })
    return
  }
  const item = {
    goods_id: goodsId.value,
    sku_id: selectedSku.value?._id,
    goods_name: goods.value.name,
    goods_image: selectedSku.value?.image || goods.value.image,
    price: currentPrice.value,
    quantity: quantity.value,
    sku_info: selectedSku.value?.spec_values || '默认规格'
  }
  uni.navigateTo({
    url: `${ROUTES.orderConfirm}?goodsData=${encodeURIComponent(JSON.stringify([item]))}`
  })
}

onLoad((options = {}) => {
  goodsId.value = options.id || ''
  loadDetail()
})
</script>

<template>
  <view class="page-shell detail" v-if="goods">
    <swiper class="gallery" circular indicator-dots indicator-color="rgba(255,255,255,.45)" indicator-active-color="#2f5d50">
      <swiper-item v-for="(img, index) in goods.images" :key="index">
        <image class="gallery__image" :src="img" mode="aspectFill"></image>
      </swiper-item>
    </swiper>

    <view class="summary">
      <view class="summary__price">
        <XPrice :value="currentPrice" size="large" />
        <XPrice v-if="goods.original_price" :value="goods.original_price" size="small" muted />
      </view>
      <text class="summary__name">{{ goods.name }}</text>
      <text class="summary__subtitle">{{ goods.subtitle }}</text>
      <text class="summary__sales">{{ salesText }}</text>
      <view class="tag-row">
        <text v-for="tag in goods.tags" :key="tag" class="tag">{{ tag }}</text>
      </view>
    </view>

    <view class="panel" @click="showSku = true">
      <view>
        <text class="panel__label">已选规格</text>
        <text class="panel__value">{{ selectedSku?.spec_values || '默认规格' }} · x{{ quantity }}</text>
      </view>
      <uni-icons type="right" size="16" color="#8a928d"></uni-icons>
    </view>

    <view class="panel">
      <view>
        <text class="panel__label">优惠</text>
        <text class="panel__value">新人礼券、满减券可在确认订单时使用</text>
      </view>
    </view>

    <view class="review-card">
      <view class="review-card__head">
        <text class="review-card__title">商品评价</text>
        <text class="review-card__count">{{ evaluations.length ? `${evaluations.length} 条评价` : '暂无评价' }}</text>
      </view>
      <view v-if="evaluations.length" class="review-list">
        <view v-for="(item, index) in evaluations.slice(0, 3)" :key="item._id || index" class="review-item">
          <view class="review-item__head">
            <text class="review-item__user">{{ item.user_name || '匿名用户' }}</text>
            <text class="review-item__stars">{{ starText(item.star || item.score) }}</text>
          </view>
          <text class="review-item__content">{{ item.content || '该用户没有填写评价内容' }}</text>
        </view>
      </view>
      <text v-else class="review-empty">还没有评价，先到先得。</text>
    </view>

    <view class="detail-card">
      <text class="detail-card__title">商品说明</text>
      <text class="detail-card__text">{{ goods.detail }}</text>
    </view>

    <view class="bottom-safe"></view>
    <view class="detail-bar safe-area-bottom">
      <view class="detail-bar__icon" @click="uni.switchTab({ url: ROUTES.home })">
        <uni-icons type="home" size="22" color="#59625d"></uni-icons>
        <text>首页</text>
      </view>
      <view class="detail-bar__icon" @click="uni.switchTab({ url: ROUTES.cart })">
        <uni-icons type="cart" size="22" color="#59625d"></uni-icons>
        <text>购物车</text>
      </view>
      <view class="detail-bar__icon" @click="toggleCollect">
        <uni-icons :type="collected ? 'heart-filled' : 'heart'" size="22" :color="collected ? '#b84a3c' : '#59625d'"></uni-icons>
        <text>{{ collected ? '已收藏' : '收藏' }}</text>
      </view>
      <view class="detail-bar__actions">
        <view class="detail-bar__btn ghost" @click="showSku = true">选规格</view>
        <view class="detail-bar__btn primary" @click="buyNow">立即购买</view>
      </view>
    </view>

    <view v-if="showSku" class="sku-mask" @click="showSku = false"></view>
    <view class="sku-panel" :class="{ show: showSku }">
      <view class="sku-panel__head">
        <image class="sku-panel__image" :src="selectedSku?.image || goods.image" mode="aspectFill"></image>
        <view class="sku-panel__info">
          <XPrice :value="currentPrice" size="large" />
          <text class="sku-panel__stock">库存 {{ currentStock }} 件</text>
        </view>
        <text class="sku-panel__close" @click="showSku = false">×</text>
      </view>
      <view class="sku-section">
        <text class="sku-section__title">规格</text>
        <view class="sku-options">
          <view
            v-for="item in skuList"
            :key="item._id"
            class="sku-option"
            :class="{ active: selectedSkuId === item._id }"
            @click="selectedSkuId = item._id"
          >
            {{ item.spec_values || '默认规格' }}
          </view>
        </view>
      </view>
      <view class="sku-section sku-section--row">
        <text class="sku-section__title">数量</text>
        <XQuantity v-model="quantity" :max="currentStock" />
      </view>
      <view class="sku-panel__actions safe-area-bottom">
        <view class="sku-panel__btn ghost" @click="addCart">加入购物车</view>
        <view class="sku-panel__btn primary" @click="buyNow">立即购买</view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.detail {
  padding-bottom: 140rpx;
}

.gallery {
  width: 100%;
  height: 720rpx;
  background: #eeebe3;
}

.gallery__image {
  width: 100%;
  height: 100%;
}

.summary,
.detail-card,
.panel {
  margin: 18rpx 24rpx 0;
  padding: 28rpx;
  background: #fff;
  border: 1rpx solid #e7e3dc;
  border-radius: 24rpx;
}

.summary__price {
  display: flex;
  align-items: baseline;
  gap: 16rpx;
}

.summary__name {
  display: block;
  margin-top: 18rpx;
  color: #1f2522;
  font-size: 38rpx;
  font-weight: 700;
  line-height: 1.35;
}

.summary__subtitle {
  display: block;
  margin-top: 10rpx;
  color: #59625d;
  font-size: 26rpx;
}

.summary__sales {
  display: block;
  margin-top: 12rpx;
  color: #8a928d;
  font-size: 23rpx;
}

.review-card {
  margin: 18rpx 24rpx 0;
  padding: 28rpx;
  background: #fff;
  border: 1rpx solid #e7e3dc;
  border-radius: 24rpx;
}

.review-card__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.review-card__title {
  color: #1f2522;
  font-size: 28rpx;
  font-weight: 700;
}

.review-card__count {
  color: #8a928d;
  font-size: 23rpx;
}

.review-list {
  margin-top: 16rpx;
}

.review-item {
  padding: 18rpx 0;
  border-bottom: 1rpx solid #f1eee7;
}

.review-item:last-child {
  border-bottom: none;
}

.review-item__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.review-item__user {
  color: #1f2522;
  font-size: 25rpx;
  font-weight: 600;
}

.review-item__stars {
  color: #e0a52b;
  font-size: 24rpx;
}

.review-item__content {
  display: block;
  margin-top: 10rpx;
  color: #59625d;
  font-size: 25rpx;
  line-height: 1.6;
}

.review-empty {
  display: block;
  margin-top: 16rpx;
  color: #8a928d;
  font-size: 24rpx;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 22rpx;
}

.tag {
  padding: 8rpx 16rpx;
  color: #2f5d50;
  background: #eef4f1;
  border-radius: 999rpx;
  font-size: 22rpx;
}

.panel {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel__label,
.detail-card__title,
.sku-section__title {
  display: block;
  color: #1f2522;
  font-size: 28rpx;
  font-weight: 700;
}

.panel__value,
.detail-card__text,
.sku-panel__stock {
  display: block;
  margin-top: 8rpx;
  color: #8a928d;
  font-size: 24rpx;
  line-height: 1.6;
}

.bottom-safe {
  height: 120rpx;
}

.detail-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 20rpx;
  background: rgba(255,255,255,.96);
  border-top: 1rpx solid #e7e3dc;
  z-index: 20;
}

.detail-bar__icon {
  width: 78rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #59625d;
  font-size: 20rpx;
}

.detail-bar__actions {
  flex: 1;
  display: flex;
  gap: 12rpx;
}

.detail-bar__btn,
.sku-panel__btn {
  flex: 1;
  height: 78rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  font-size: 27rpx;
  font-weight: 600;
}

.primary {
  background: #2f5d50;
  color: #fff;
}

.ghost {
  background: #fff;
  color: #2f5d50;
  border: 1rpx solid #d7d1c5;
}

.sku-mask {
  position: fixed;
  inset: 0;
  background: rgba(31,37,34,.38);
  z-index: 40;
}

.sku-panel {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  transform: translateY(100%);
  transition: transform .24s ease;
  background: #f7f5f0;
  border-radius: 32rpx 32rpx 0 0;
  z-index: 41;
}

.sku-panel.show {
  transform: translateY(0);
}

.sku-panel__head {
  position: relative;
  display: flex;
  gap: 22rpx;
  padding: 32rpx;
}

.sku-panel__image {
  width: 160rpx;
  height: 160rpx;
  border-radius: 20rpx;
}

.sku-panel__close {
  position: absolute;
  right: 34rpx;
  top: 26rpx;
  color: #8a928d;
  font-size: 44rpx;
}

.sku-section {
  margin: 0 24rpx 18rpx;
  padding: 24rpx;
  background: #fff;
  border: 1rpx solid #e7e3dc;
  border-radius: 20rpx;
}

.sku-section--row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sku-options {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
  margin-top: 18rpx;
}

.sku-option {
  padding: 14rpx 22rpx;
  color: #59625d;
  background: #f7f5f0;
  border: 1rpx solid #e7e3dc;
  border-radius: 999rpx;
  font-size: 24rpx;
}

.sku-option.active {
  color: #fff;
  background: #2f5d50;
  border-color: #2f5d50;
}

.sku-panel__actions {
  display: flex;
  gap: 18rpx;
  padding: 22rpx 24rpx;
  background: #fff;
}
</style>
