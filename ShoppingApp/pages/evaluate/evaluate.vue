<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { api } from '@/api/client'
import { ROUTES } from '@/constants/routes'
import XEmpty from '@/components/x-empty/x-empty.vue'

const orderId = ref('')
const order = ref(null)
const score = ref(5)
const content = ref('')
const images = ref([])
const anonymous = ref(false)
const submitting = ref(false)
const uploading = ref(false)

const scoreText = computed(() => {
  const map = { 1: '很不满意', 2: '不太满意', 3: '还可以', 4: '满意', 5: '非常满意' }
  return map[score.value]
})

const goodsList = computed(() => order.value?.goods_list || [])

const loadOrder = async () => {
  if (!orderId.value) return
  const res = await api.order.getOrderDetail({ order_id: orderId.value }, { showError: false })
  if (res?.code === 0) order.value = res.data
}

onLoad((options = {}) => {
  orderId.value = options.orderId || options.id || ''
  loadOrder()
})

const chooseImage = () => {
  if (uploading.value) return
  uni.chooseMedia({
    count: 9 - images.value.length,
    mediaType: ['image'],
    sizeType: ['compressed'],
    sourceType: ['album'],
    success: async (res) => {
      uploading.value = true
      const next = []
      for (const file of res.tempFiles || []) {
        const filePath = file.tempFilePath
        const uploadRes = await api.upload.uploadImage({ filePath, scene: 'evaluate' }, { showError: true })
        if (uploadRes?.code === 0 && uploadRes.data?.url) next.push(uploadRes.data.url)
      }
      images.value = [...images.value, ...next].slice(0, 9)
      uploading.value = false
    }
  })
}

const removeImage = (index) => {
  images.value.splice(index, 1)
}

const submit = async () => {
  if (submitting.value) return
  if (uploading.value) {
    uni.showToast({ title: '图片正在上传，请稍候', icon: 'none' })
    return
  }
  if (!orderId.value) {
    uni.showToast({ title: '订单信息异常，请重新进入评价', icon: 'none' })
    return
  }
  if (!content.value.trim() && images.value.length === 0) {
    uni.showToast({ title: '请填写评价内容或上传图片', icon: 'none' })
    return
  }
  submitting.value = true
  const res = await api.service.addEvaluate({
    order_id: orderId.value,
    goods_list: goodsList.value,
    score: score.value,
    content: content.value,
    images: images.value,
    is_anonymous: anonymous.value
  })
  submitting.value = false
  if (res?.code === 0) {
    uni.showModal({
      title: '评价成功',
      content: '订单已完成，现在可以申请售后。',
      showCancel: false,
      confirmText: '查看订单',
      success: () => {
        uni.redirectTo({ url: `${ROUTES.orderDetail}?id=${orderId.value}` })
      }
    })
  }
}
</script>

<template>
  <view class="page">
    <view v-if="goodsList.length" class="goods-panel">
      <view v-for="item in goodsList" :key="`${item.goods_id}-${item.sku_id}`" class="goods-row">
        <image class="goods-row__image" :src="item.goods_image || item.image" mode="aspectFill"></image>
        <view class="goods-row__body">
          <text class="goods-row__name text-ellipsis-2">{{ item.goods_name || item.name }}</text>
          <text class="goods-row__sku">{{ item.sku_info || '默认规格' }}</text>
        </view>
      </view>
    </view>
    <XEmpty v-else image="/static/empty-order.png" title="未找到订单商品" desc="请从订单详情重新进入评价。" />

    <view class="form-panel">
      <view class="score-row">
        <text class="score-row__label">商品评分</text>
        <view class="stars">
          <text v-for="item in 5" :key="item" class="star" :class="{ 'star--active': item <= score }" @click="score = item">★</text>
        </view>
        <text class="score-row__text">{{ scoreText }}</text>
      </view>

      <view class="textarea-wrap">
        <textarea
          class="textarea"
          v-model="content"
          maxlength="500"
          placeholder="分享真实体验，例如质感、包装、尺码和使用感受。"
        ></textarea>
        <text class="textarea-count">{{ content.length }}/500</text>
      </view>

      <view class="image-grid">
        <view v-for="(img, index) in images" :key="img" class="image-item">
          <image class="image-item__preview" :src="img" mode="aspectFill"></image>
          <view class="image-item__remove" @click="removeImage(index)">×</view>
        </view>
        <view v-if="images.length < 9" class="image-add" @click="chooseImage">
          <text class="image-add__icon">＋</text>
          <text class="image-add__text">{{ uploading ? '上传中' : `${images.length}/9` }}</text>
        </view>
      </view>

      <view class="anonymous-row">
        <view>
          <text class="anonymous-row__title">匿名评价</text>
          <text class="anonymous-row__desc">提交后仅展示昵称脱敏信息</text>
        </view>
        <switch :checked="anonymous" color="#2f5d50" @change="anonymous = $event.detail.value" />
      </view>
    </view>

    <view class="bottom-bar safe-area-bottom">
      <button class="primary-btn" :loading="submitting" :disabled="submitting" @click="submit">
        {{ submitting ? '提交中' : '提交评价' }}
      </button>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 20rpx 24rpx 128rpx;
  background: #f7f5f0;
  box-sizing: border-box;
}

.goods-panel,
.form-panel {
  background: #fff;
  border: 1rpx solid #e7e3dc;
  border-radius: 22rpx;
}

.goods-panel {
  margin-bottom: 18rpx;
}

.goods-row {
  display: flex;
  padding: 22rpx;
  border-bottom: 1rpx solid #f1eee7;
}

.goods-row:last-child {
  border-bottom: none;
}

.goods-row__image {
  width: 126rpx;
  height: 126rpx;
  flex-shrink: 0;
  background: #eeebe3;
  border-radius: 16rpx;
}

.goods-row__body {
  flex: 1;
  min-width: 0;
  margin-left: 18rpx;
}

.goods-row__name {
  color: #1f2522;
  font-size: 28rpx;
  font-weight: 700;
  line-height: 1.45;
}

.goods-row__sku {
  display: block;
  margin-top: 10rpx;
  color: #8a928d;
  font-size: 23rpx;
}

.form-panel {
  padding: 24rpx;
}

.score-row {
  display: flex;
  align-items: center;
}

.score-row__label {
  color: #1f2522;
  font-size: 28rpx;
  font-weight: 800;
}

.stars {
  display: flex;
  margin-left: 22rpx;
  gap: 8rpx;
}

.star {
  color: #d8d2c7;
  font-size: 42rpx;
}

.star--active {
  color: #b58a45;
}

.score-row__text {
  margin-left: 18rpx;
  color: #b58a45;
  font-size: 24rpx;
  font-weight: 700;
}

.textarea-wrap {
  position: relative;
  margin-top: 28rpx;
}

.textarea {
  width: 100%;
  height: 240rpx;
  padding: 22rpx;
  color: #1f2522;
  background: #fbfaf7;
  border: 1rpx solid #e7e3dc;
  border-radius: 18rpx;
  box-sizing: border-box;
  font-size: 27rpx;
  line-height: 1.6;
}

.textarea-count {
  position: absolute;
  right: 22rpx;
  bottom: 18rpx;
  color: #8a928d;
  font-size: 22rpx;
}

.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 24rpx;
}

.image-item,
.image-add {
  position: relative;
  width: 150rpx;
  height: 150rpx;
  border-radius: 18rpx;
}

.image-item__preview {
  width: 100%;
  height: 100%;
  border-radius: 18rpx;
}

.image-item__remove {
  position: absolute;
  top: -10rpx;
  right: -10rpx;
  width: 36rpx;
  height: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: rgba(31, 37, 34, 0.72);
  border-radius: 50%;
  font-size: 26rpx;
}

.image-add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #8a928d;
  background: #fbfaf7;
  border: 1rpx dashed #c8c1b6;
}

.image-add__icon {
  font-size: 42rpx;
}

.image-add__text {
  margin-top: 6rpx;
  font-size: 22rpx;
}

.anonymous-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 28rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #f1eee7;
}

.anonymous-row__title {
  display: block;
  color: #1f2522;
  font-size: 28rpx;
  font-weight: 700;
}

.anonymous-row__desc {
  display: block;
  margin-top: 8rpx;
  color: #8a928d;
  font-size: 23rpx;
}

.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 18rpx 24rpx;
  background: rgba(255, 255, 255, 0.96);
  border-top: 1rpx solid #e7e3dc;
}

.primary-btn {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: #2f5d50;
  border-radius: 999rpx;
  font-size: 30rpx;
  font-weight: 700;
}
</style>
