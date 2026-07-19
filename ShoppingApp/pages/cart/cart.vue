<script setup>
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useCartStore } from '@/stores/cart'
import { useUserStore } from '@/stores/user'
import { ROUTES } from '@/constants/routes'
import { requireLogin } from '@/utils/navigation'
import { formatMoney } from '@/utils/format'
import XEmpty from '@/components/x-empty/x-empty.vue'
import XQuantity from '@/components/x-quantity/x-quantity.vue'

const cartStore = useCartStore()
const userStore = useUserStore()

const validList = computed(() => cartStore.validList)
const invalidList = computed(() => cartStore.invalidList)

const changeQuantity = (item, quantity) => {
  cartStore.updateQuantity(item._id, quantity)
}

const removeItem = (item) => {
  uni.showModal({
    title: '删除商品',
    content: `确定从购物车移除「${item.goods_name}」吗？`,
    success: (res) => {
      if (res.confirm) cartStore.removeGoods([item._id])
    }
  })
}

const clearInvalid = () => {
  uni.showModal({
    title: '清空失效商品',
    content: `确定移除 ${invalidList.value.length} 件失效商品吗？`,
    success: (res) => {
      if (res.confirm) cartStore.removeInvalid()
    }
  })
}

const checkout = () => {
  if (!requireLogin(userStore, ROUTES.cart)) return
  if (!cartStore.checkedGoods.length) {
    uni.showToast({ title: '请选择要结算的商品', icon: 'none' })
    return
  }
  uni.navigateTo({ url: ROUTES.orderConfirm })
}

onShow(() => {
  if (userStore.isLogin) cartStore.getCartList()
})
</script>

<template>
  <view class="page-shell cart-page">
    <template v-if="userStore.isLogin">
      <view v-if="cartStore.cartList.length" class="cart-list">
        <!-- 自营店头 + 有效商品 -->
        <view v-if="validList.length" class="cart-shop card">
          <view class="cart-shop__head">
            <view class="cart-shop__check" @click="cartStore.toggleAllCheck">
              <uni-icons :type="cartStore.isAllChecked ? 'checkbox-filled' : 'circle'" size="24" :color="cartStore.isAllChecked ? '#2f5d50' : '#8a928d'"></uni-icons>
            </view>
            <text class="cart-shop__icon">🏪</text>
            <text class="cart-shop__name">薪超优选 · 自营</text>
          </view>
          <view v-for="item in validList" :key="item._id" class="cart-item">
            <view class="cart-item__check" @click="cartStore.toggleCheck(item._id)">
              <uni-icons :type="item.checked ? 'checkbox-filled' : 'circle'" size="24" :color="item.checked ? '#2f5d50' : '#8a928d'"></uni-icons>
            </view>
            <image class="cart-item__image" :src="item.goods_image" mode="aspectFill"></image>
            <view class="cart-item__info">
              <text class="cart-item__name text-ellipsis-2">{{ item.goods_name }}</text>
              <text class="cart-item__sku text-ellipsis">{{ item.sku_info || '默认规格' }}</text>
              <view class="cart-item__bottom">
                <text class="cart-item__price">¥{{ formatMoney(item.price) }}</text>
                <XQuantity :model-value="item.quantity" :max="item.stock" @change="changeQuantity(item, $event)" />
              </view>
            </view>
            <view class="cart-item__remove" @click="removeItem(item)">×</view>
          </view>
        </view>

        <!-- 失效商品区 -->
        <view v-if="invalidList.length" class="cart-shop card cart-invalid">
          <view class="cart-invalid__head">
            <text class="cart-invalid__title">失效商品 {{ invalidList.length }} 件</text>
            <text class="cart-invalid__clear" @click="clearInvalid">清空失效</text>
          </view>
          <view v-for="item in invalidList" :key="item._id" class="cart-item cart-item--disabled">
            <view class="cart-item__badge">失效</view>
            <image class="cart-item__image" :src="item.goods_image" mode="aspectFill"></image>
            <view class="cart-item__info">
              <text class="cart-item__name text-ellipsis-2">{{ item.goods_name }}</text>
              <text class="cart-item__reason">{{ item.invalid_reason }}</text>
              <view class="cart-item__bottom">
                <text class="cart-item__price cart-item__price--muted">¥{{ formatMoney(item.price) }}</text>
              </view>
            </view>
            <view class="cart-item__remove" @click="removeItem(item)">×</view>
          </view>
        </view>
      </view>
      <XEmpty v-else image="/static/empty-cart.png" title="购物车是空的" desc="去挑几件真正喜欢的东西。" action-text="去首页看看" @action="uni.switchTab({ url: ROUTES.home })" />
      <view class="cart-bar safe-area-bottom" v-if="validList.length">
        <view class="cart-bar__select" @click="cartStore.toggleAllCheck">
          <uni-icons :type="cartStore.isAllChecked ? 'checkbox-filled' : 'circle'" size="24" :color="cartStore.isAllChecked ? '#2f5d50' : '#8a928d'"></uni-icons>
          <text>全选</text>
        </view>
        <view class="cart-bar__total">
          <text>合计</text>
          <text class="cart-bar__price">¥{{ formatMoney(cartStore.checkedTotal) }}</text>
        </view>
        <view class="cart-bar__btn" @click="checkout">结算 {{ cartStore.checkedCount }}</view>
      </view>
    </template>
    <XEmpty v-else image="/static/empty-cart.png" title="登录后查看购物车" desc="你的收藏和购物车会保存在账号里。" action-text="去登录" @action="uni.navigateTo({ url: ROUTES.login })" />
  </view>
</template>

<style scoped>
.cart-page {
  padding-bottom: 220rpx;
}

.cart-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  padding: 24rpx;
}

/* 店铺分组容器 */
.cart-shop {
  padding: 0;
  overflow: hidden;
}

.cart-shop__head {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 22rpx 22rpx 16rpx;
  border-bottom: 1rpx solid #f0ede6;
}

.cart-shop__check {
  display: flex;
  align-items: center;
}

.cart-shop__icon {
  font-size: 28rpx;
}

.cart-shop__name {
  color: #1f2522;
  font-size: 27rpx;
  font-weight: 700;
}

.cart-item {
  position: relative;
  display: flex;
  align-items: center;
  padding: 22rpx;
}

.cart-item + .cart-item {
  border-top: 1rpx solid #f3f1ea;
}

.cart-item__check {
  padding-right: 16rpx;
}

.cart-item__image {
  width: 168rpx;
  height: 168rpx;
  border-radius: 18rpx;
  background: #eeebe3;
}

.cart-item__info {
  flex: 1;
  min-width: 0;
  margin-left: 18rpx;
}

.cart-item__name {
  color: #1f2522;
  font-size: 28rpx;
  font-weight: 700;
  line-height: 1.35;
}

.cart-item__sku {
  display: block;
  margin-top: 8rpx;
  color: #8a928d;
  font-size: 23rpx;
}

.cart-item__bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 18rpx;
}

.cart-item__price {
  color: #b84a3c;
  font-size: 30rpx;
  font-weight: 700;
}

.cart-item__remove {
  position: absolute;
  right: 14rpx;
  top: 8rpx;
  color: #8a928d;
  font-size: 34rpx;
}

/* 失效商品区 */
.cart-invalid {
  background: #faf9f6;
}

.cart-invalid__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 22rpx 14rpx;
  border-bottom: 1rpx solid #f0ede6;
}

.cart-invalid__title {
  color: #59625d;
  font-size: 25rpx;
  font-weight: 700;
}

.cart-invalid__clear {
  color: #8a928d;
  font-size: 24rpx;
}

.cart-item--disabled {
  opacity: 0.6;
}

.cart-item--disabled .cart-item__image {
  filter: grayscale(1);
}

.cart-item__badge {
  width: 64rpx;
  height: 64rpx;
  margin-right: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: #b0b4ae;
  border-radius: 50%;
  font-size: 22rpx;
}

.cart-item__reason {
  display: block;
  margin-top: 8rpx;
  color: #b84a3c;
  font-size: 23rpx;
}

.cart-item__price--muted {
  color: #8a928d;
}

.cart-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 18rpx 24rpx;
  background: #fff;
  border-top: 1rpx solid #e7e3dc;
  z-index: 20;
}

.cart-bar__select {
  display: flex;
  align-items: center;
  gap: 8rpx;
  color: #59625d;
  font-size: 25rpx;
}

.cart-bar__total {
  flex: 1;
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 10rpx;
  color: #59625d;
  font-size: 24rpx;
}

.cart-bar__price {
  color: #b84a3c;
  font-size: 36rpx;
  font-weight: 700;
}

.cart-bar__btn {
  min-width: 180rpx;
  height: 78rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: #2f5d50;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 700;
}
</style>
