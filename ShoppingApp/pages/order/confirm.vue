<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { api } from '@/api/client'
import { useCartStore } from '@/stores/cart'
import { ROUTES } from '@/constants/routes'
import { PAY_METHODS } from '@/constants/status'
import { formatMoney, parseJsonParam } from '@/utils/format'

const cartStore = useCartStore()
const goodsList = ref([])
const address = ref(null)
const coupons = ref([])
const selectedCouponId = ref('')
const remark = ref('')
const payMethod = ref('wechat')
const requestId = ref('')
const submitting = ref(false)

const payMethodLabel = computed(() => PAY_METHODS.find(item => item.value === payMethod.value)?.label || '在线支付')

const goodsAmount = computed(() => goodsList.value.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0))
const freight = computed(() => goodsAmount.value >= 99 ? 0 : 10)
const normalizeList = (data) => Array.isArray(data) ? data : (data?.list || [])
const couponThreshold = (item) => Number(item?.threshold ?? item?.min_amount ?? 0)
const couponTitle = (item) => item?.title || item?.name || '优惠券'
const availableCoupons = computed(() => coupons.value.filter(item => item.status === 'available' && goodsAmount.value >= couponThreshold(item)))
const selectedCoupon = computed(() => availableCoupons.value.find(item => item._id === selectedCouponId.value) || null)
const discount = computed(() => selectedCoupon.value?.amount || 0)
const payAmount = computed(() => Math.max(goodsAmount.value + freight.value - discount.value, 0))
const couponPickerText = computed(() => {
  if (selectedCoupon.value) return `${couponTitle(selectedCoupon.value)} -¥${formatMoney(discount.value)}`
  return coupons.value.length ? '当前金额未满足门槛' : '暂无可用'
})

const createRequestId = () => `req-${Date.now()}-${Math.random().toString(16).slice(2)}`

const loadData = async (options = {}) => {
  requestId.value = createRequestId()
  const pageGoods = parseJsonParam(options.goodsData, null)
  if (pageGoods) {
    goodsList.value = pageGoods
  } else {
    await cartStore.getCartList()
    goodsList.value = cartStore.checkedGoods.map(item => ({
      cart_id: item._id,
      goods_id: item.goods_id,
      sku_id: item.sku_id,
      goods_name: item.goods_name,
      goods_image: item.goods_image,
      price: item.price,
      quantity: item.quantity,
      sku_info: item.sku_info
    }))
  }
  const [addressRes, couponRes] = await Promise.all([
    api.address.getDefault({}, { showError: false }),
    api.service.getCouponList({ scope: 'mine', status: 'available', page: 1, pageSize: 50 }, { showError: false })
  ])
  address.value = addressRes?.data || null
  coupons.value = normalizeList(couponRes?.data).map(item => ({
    ...item,
    title: couponTitle(item),
    threshold: couponThreshold(item)
  }))
  selectedCouponId.value = availableCoupons.value[0]?._id || ''
}

const chooseAddress = () => {
  uni.navigateTo({
    url: `${ROUTES.addressList}?select=1`,
    events: {
      selectAddress: (data) => { address.value = data }
    }
  })
}

const submit = async () => {
  if (submitting.value) return
  if (!address.value) {
    uni.showToast({ title: '请选择收货地址', icon: 'none' })
    return
  }
  if (!goodsList.value.length) {
    uni.showToast({ title: '没有可提交的商品', icon: 'none' })
    return
  }
  submitting.value = true
  const res = await api.order.createOrder({
    request_id: requestId.value,
    address_id: address.value._id,
    goods_list: goodsList.value,
    coupon_id: selectedCoupon.value?._id,
    pay_method: payMethod.value,
    remark: remark.value
  })
  submitting.value = false
  if (res?.code === 0) {
    uni.redirectTo({
      url: `${ROUTES.orderPay}?orderId=${res.data.order_id}&amount=${res.data.pay_amount}&payMethod=${payMethod.value}`
    })
  }
}

onLoad(loadData)
</script>

<template>
  <view class="page-shell confirm-page">
    <view class="address-card card" @click="chooseAddress">
      <view v-if="address">
        <view class="address-card__top">
          <text class="address-card__name">{{ address.name }}</text>
          <text class="address-card__phone">{{ address.phone }}</text>
        </view>
        <text class="address-card__detail">{{ address.province }}{{ address.city }}{{ address.district }}{{ address.detail }}</text>
      </view>
      <text v-else class="address-card__empty">请选择收货地址</text>
      <uni-icons type="right" size="16" color="#8a928d"></uni-icons>
    </view>

    <view class="goods-card card">
      <view v-for="item in goodsList" :key="`${item.goods_id}-${item.sku_id}`" class="goods-line">
        <image class="goods-line__image" :src="item.goods_image" mode="aspectFill"></image>
        <view class="goods-line__info">
          <text class="goods-line__name text-ellipsis-2">{{ item.goods_name }}</text>
          <text class="goods-line__sku">{{ item.sku_info || '默认规格' }}</text>
          <view class="goods-line__bottom">
            <text>¥{{ formatMoney(item.price) }}</text>
            <text>x{{ item.quantity }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="form-card card">
      <view class="form-row">
        <text>优惠券</text>
        <picker :range="availableCoupons" range-key="title" @change="selectedCouponId = availableCoupons[$event.detail.value]?._id || ''">
          <text class="form-row__value">{{ couponPickerText }}</text>
        </picker>
      </view>
      <view class="form-row">
        <text>配送方式</text>
        <text class="form-row__value">普通配送</text>
      </view>
      <view class="form-row">
        <text>支付方式</text>
        <picker :range="PAY_METHODS" range-key="label" @change="payMethod = PAY_METHODS[$event.detail.value]?.value || 'wechat'">
          <text class="form-row__value">{{ payMethodLabel }} ›</text>
        </picker>
      </view>
      <view class="form-row">
        <text>订单备注</text>
        <input class="remark-input" v-model="remark" placeholder="选填" />
      </view>
    </view>

    <view class="amount-card card">
      <view class="amount-row"><text>商品金额</text><text>¥{{ formatMoney(goodsAmount) }}</text></view>
      <view class="amount-row"><text>运费</text><text>¥{{ formatMoney(freight) }}</text></view>
      <view class="amount-row"><text>优惠</text><text>-¥{{ formatMoney(discount) }}</text></view>
    </view>

    <view class="submit-bar safe-area-bottom">
      <view class="submit-bar__price">实付 ¥{{ formatMoney(payAmount) }}</view>
      <view class="submit-bar__btn" :class="{ disabled: submitting }" @click="submit">
        {{ submitting ? '提交中' : '提交订单' }}
      </view>
    </view>
  </view>
</template>

<style scoped>
.confirm-page {
  padding: 24rpx 24rpx 150rpx;
}

.address-card,
.form-row,
.amount-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.address-card {
  padding: 28rpx;
}

.address-card__top {
  display: flex;
  gap: 20rpx;
  color: #1f2522;
  font-size: 30rpx;
  font-weight: 700;
}

.address-card__detail,
.address-card__empty,
.form-row__value {
  display: block;
  margin-top: 10rpx;
  color: #8a928d;
  font-size: 24rpx;
  line-height: 1.5;
}

.goods-card,
.form-card,
.amount-card {
  margin-top: 18rpx;
  padding: 24rpx;
}

.goods-line {
  display: flex;
  padding: 14rpx 0;
}

.goods-line__image {
  width: 150rpx;
  height: 150rpx;
  border-radius: 18rpx;
}

.goods-line__info {
  flex: 1;
  margin-left: 18rpx;
}

.goods-line__name {
  color: #1f2522;
  font-size: 28rpx;
  font-weight: 700;
}

.goods-line__sku {
  display: block;
  margin-top: 8rpx;
  color: #8a928d;
  font-size: 23rpx;
}

.goods-line__bottom {
  display: flex;
  justify-content: space-between;
  margin-top: 18rpx;
  color: #59625d;
  font-size: 25rpx;
}

.form-row,
.amount-row {
  min-height: 78rpx;
  color: #1f2522;
  font-size: 27rpx;
}

.remark-input {
  flex: 1;
  margin-left: 24rpx;
  text-align: right;
  font-size: 26rpx;
}

.submit-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 22rpx;
  padding: 18rpx 24rpx;
  background: #fff;
  border-top: 1rpx solid #e7e3dc;
}

.submit-bar__price {
  flex: 1;
  color: #b84a3c;
  font-size: 34rpx;
  font-weight: 700;
}

.submit-bar__btn {
  width: 230rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: #2f5d50;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 700;
}

.submit-bar__btn.disabled {
  opacity: 0.72;
}
</style>
