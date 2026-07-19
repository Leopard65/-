<script setup>
import { computed, ref, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { api } from '@/api/client'
import XPrice from '@/components/x-price/x-price.vue'
import { formatMoney } from '@/utils/format'

const orderId = ref('')
const order = ref(null)
const selectedGoods = ref([])
const afterType = ref('refund')
const reason = ref('')
const refundAmount = ref('')
const description = ref('')
const images = ref([])
const uploading = ref(false)
const submitting = ref(false)

const reasons = ['不想要了', '拍错或重复下单', '商品质量问题', '商品与描述不符', '收到商品破损', '其他原因']
const typeOptions = [
  { value: 'refund', title: '仅退款', desc: '未收到货或协商后无需退回商品' },
  { value: 'return', title: '退货退款', desc: '已收到货，需要寄回商品' }
]

const goodsList = computed(() => order.value?.goods_list || [])
const maxRefundAmount = computed(() => goodsList.value.reduce((sum, item) => {
  if (!selectedGoods.value.includes(item.goods_id)) return sum
  return sum + Number(item.price || 0) * Number(item.quantity || 1)
}, 0))

watch(maxRefundAmount, (value) => {
  refundAmount.value = formatMoney(value)
})

const loadOrder = async () => {
  if (!orderId.value) return
  const res = await api.order.getOrderDetail({ order_id: orderId.value }, { showError: false })
  if (res?.code !== 0) return
  order.value = res.data
  selectedGoods.value = goodsList.value.map(item => item.goods_id)
  refundAmount.value = formatMoney(maxRefundAmount.value)
}

onLoad((options = {}) => {
  orderId.value = options.orderId || options.id || ''
  loadOrder()
})

const toggleGoods = (item) => {
  const id = item.goods_id
  selectedGoods.value = selectedGoods.value.includes(id)
    ? selectedGoods.value.filter(row => row !== id)
    : [...selectedGoods.value, id]
}

const chooseImage = () => {
  if (uploading.value) return
  uni.chooseMedia({
    count: 5 - images.value.length,
    mediaType: ['image'],
    sizeType: ['compressed'],
    sourceType: ['album'],
    success: async (res) => {
      uploading.value = true
      const next = []
      for (const file of res.tempFiles || []) {
        const filePath = file.tempFilePath
        const uploadRes = await api.upload.uploadImage({ filePath, scene: 'aftersale' }, { showError: true })
        if (uploadRes?.code === 0 && uploadRes.data?.url) next.push(uploadRes.data.url)
      }
      images.value = [...images.value, ...next].slice(0, 5)
      uploading.value = false
    }
  })
}

const removeImage = (index) => {
  images.value.splice(index, 1)
}

const validate = () => {
  if (!selectedGoods.value.length) return '请选择售后商品'
  if (!reason.value) return '请选择售后原因'
  if (!refundAmount.value || Number(refundAmount.value) <= 0) return '请输入退款金额'
  if (Number(refundAmount.value) > maxRefundAmount.value) return '退款金额不能超过可退金额'
  return ''
}

const submit = async () => {
  if (submitting.value) return
  if (uploading.value) {
    uni.showToast({ title: '图片正在上传，请稍候', icon: 'none' })
    return
  }
  const error = validate()
  if (error) {
    uni.showToast({ title: error, icon: 'none' })
    return
  }

  const selectedSnapshot = goodsList.value.filter(item => selectedGoods.value.includes(item.goods_id))
  submitting.value = true
  const res = await api.service.applyAfterSale({
    order_id: orderId.value,
    goods_ids: selectedGoods.value,
    goods_list: selectedSnapshot,
    type: afterType.value,
    reason: reason.value,
    refund_amount: Number(refundAmount.value),
    description: description.value,
    images: images.value
  })
  submitting.value = false

  if (res?.code === 0) {
    uni.showToast({ title: '售后申请已提交', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 500)
  }
}
</script>

<template>
  <view class="page">
    <view class="panel">
      <text class="panel__title">选择商品</text>
      <view v-for="item in goodsList" :key="`${item.goods_id}-${item.sku_id}`" class="goods-row" @click="toggleGoods(item)">
        <view class="check" :class="{ 'check--active': selectedGoods.includes(item.goods_id) }">
          <text v-if="selectedGoods.includes(item.goods_id)">✓</text>
        </view>
        <image class="goods-row__image" :src="item.goods_image || item.image" mode="aspectFill"></image>
        <view class="goods-row__body">
          <text class="goods-row__name text-ellipsis-2">{{ item.goods_name || item.name }}</text>
          <text class="goods-row__sku">{{ item.sku_info || '默认规格' }}</text>
          <view class="goods-row__price">
            <XPrice :value="item.price" size="small" />
            <text class="goods-row__qty">x{{ item.quantity }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="panel">
      <text class="panel__title">售后类型</text>
      <view class="type-grid">
        <view v-for="item in typeOptions" :key="item.value" class="type-card" :class="{ 'type-card--active': afterType === item.value }" @click="afterType = item.value">
          <text class="type-card__title">{{ item.title }}</text>
          <text class="type-card__desc">{{ item.desc }}</text>
        </view>
      </view>
    </view>

    <view class="panel">
      <text class="panel__title">售后原因</text>
      <view class="reason-list">
        <view v-for="item in reasons" :key="item" class="reason-item" :class="{ 'reason-item--active': reason === item }" @click="reason = item">
          <text>{{ item }}</text>
          <text v-if="reason === item">✓</text>
        </view>
      </view>
    </view>

    <view class="panel">
      <text class="panel__title">退款金额</text>
      <view class="amount-field">
        <text class="amount-field__symbol">¥</text>
        <input class="amount-field__input" type="digit" v-model="refundAmount" placeholder="请输入金额" />
      </view>
      <text class="amount-tip">最多可退 ¥{{ formatMoney(maxRefundAmount) }}</text>
    </view>

    <view class="panel">
      <text class="panel__title">补充说明</text>
      <textarea class="desc" v-model="description" maxlength="200" placeholder="说明问题细节，便于商家快速处理。"></textarea>
      <view class="image-grid">
        <view v-for="(img, index) in images" :key="img" class="image-item">
          <image class="image-item__preview" :src="img" mode="aspectFill"></image>
          <view class="image-item__remove" @click="removeImage(index)">×</view>
        </view>
        <view v-if="images.length < 5" class="image-add" @click="chooseImage">
          <text class="image-add__icon">＋</text>
          <text class="image-add__text">{{ uploading ? '上传中' : `${images.length}/5` }}</text>
        </view>
      </view>
    </view>

    <view class="bottom-bar safe-area-bottom">
      <button class="primary-btn" :loading="submitting" :disabled="submitting" @click="submit">
        {{ submitting ? '提交中' : '提交申请' }}
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

.panel {
  margin-bottom: 18rpx;
  padding: 24rpx;
  background: #fff;
  border: 1rpx solid #e7e3dc;
  border-radius: 22rpx;
}

.panel__title {
  display: block;
  margin-bottom: 20rpx;
  color: #1f2522;
  font-size: 30rpx;
  font-weight: 800;
}

.goods-row {
  display: flex;
  align-items: center;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #f1eee7;
}

.goods-row:last-child {
  border-bottom: none;
}

.check {
  width: 34rpx;
  height: 34rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 16rpx;
  color: #fff;
  border: 2rpx solid #c8c1b6;
  border-radius: 50%;
  font-size: 22rpx;
}

.check--active {
  background: #2f5d50;
  border-color: #2f5d50;
}

.goods-row__image {
  width: 132rpx;
  height: 132rpx;
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
  font-size: 27rpx;
  font-weight: 700;
  line-height: 1.45;
}

.goods-row__sku {
  display: block;
  margin-top: 8rpx;
  color: #8a928d;
  font-size: 22rpx;
}

.goods-row__price {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10rpx;
}

.goods-row__qty {
  color: #8a928d;
  font-size: 22rpx;
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.type-card {
  padding: 22rpx;
  background: #fbfaf7;
  border: 1rpx solid #e7e3dc;
  border-radius: 18rpx;
}

.type-card--active {
  background: #eef3ef;
  border-color: #2f5d50;
}

.type-card__title {
  display: block;
  color: #1f2522;
  font-size: 28rpx;
  font-weight: 800;
}

.type-card__desc {
  display: block;
  margin-top: 10rpx;
  color: #8a928d;
  font-size: 22rpx;
  line-height: 1.45;
}

.reason-item {
  min-height: 78rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #59625d;
  border-bottom: 1rpx solid #f1eee7;
  font-size: 27rpx;
}

.reason-item:last-child {
  border-bottom: none;
}

.reason-item--active {
  color: #2f5d50;
  font-weight: 800;
}

.amount-field {
  height: 96rpx;
  display: flex;
  align-items: center;
  padding: 0 22rpx;
  background: #fbfaf7;
  border: 1rpx solid #e7e3dc;
  border-radius: 18rpx;
}

.amount-field__symbol {
  margin-right: 12rpx;
  color: #1f2522;
  font-size: 36rpx;
  font-weight: 800;
}

.amount-field__input {
  flex: 1;
  color: #1f2522;
  font-size: 36rpx;
  font-weight: 800;
}

.amount-tip {
  display: block;
  margin-top: 12rpx;
  color: #8a928d;
  font-size: 23rpx;
}

.desc {
  width: 100%;
  height: 180rpx;
  padding: 20rpx;
  color: #1f2522;
  background: #fbfaf7;
  border: 1rpx solid #e7e3dc;
  border-radius: 18rpx;
  box-sizing: border-box;
  font-size: 27rpx;
}

.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 18rpx;
}

.image-item,
.image-add {
  position: relative;
  width: 148rpx;
  height: 148rpx;
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
