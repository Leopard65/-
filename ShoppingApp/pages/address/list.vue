<script setup>
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { api } from '@/api/client'
import { ROUTES } from '@/constants/routes'
import XEmpty from '@/components/x-empty/x-empty.vue'

const addresses = ref([])
const selectable = ref(false)
const loading = ref(false)

const loadAddresses = async () => {
  loading.value = true
  const res = await api.address.getAddressList({}, { showError: false })
  if (res?.code === 0) addresses.value = res.data || []
  loading.value = false
}

onLoad((options = {}) => {
  selectable.value = options.select === '1'
})

onShow(loadAddresses)

const emitSelectedAddress = (item) => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const channel = currentPage?.getOpenerEventChannel?.()
  channel?.emit?.('selectAddress', item)
  uni.navigateBack()
}

const onAddressTap = (item) => {
  if (selectable.value) emitSelectedAddress(item)
}

const addAddress = () => {
  uni.navigateTo({ url: ROUTES.addressEdit })
}

const editAddress = (item) => {
  uni.navigateTo({ url: `${ROUTES.addressEdit}?id=${item._id}` })
}

const setDefault = async (item) => {
  const res = await api.address.setDefault({ address_id: item._id })
  if (res?.code === 0) loadAddresses()
}

const deleteAddress = async (item) => {
  const modal = await new Promise(resolve => {
    uni.showModal({
      title: '删除地址',
      content: '确认删除这条收货地址吗？',
      confirmText: '删除',
      success: resolve
    })
  })
  if (!modal.confirm) return
  const res = await api.address.deleteAddress({ address_id: item._id })
  if (res?.code === 0) {
    uni.showToast({ title: '已删除', icon: 'success' })
    loadAddresses()
  }
}
</script>

<template>
  <view class="page">
    <scroll-view class="list" scroll-y>
      <view v-for="item in addresses" :key="item._id" class="address-card" @click="onAddressTap(item)">
        <view class="address-card__main">
          <view class="address-card__top">
            <text class="address-card__name">{{ item.name }}</text>
            <text class="address-card__phone">{{ item.phone }}</text>
            <text v-if="item.is_default" class="address-card__tag">默认</text>
          </view>
          <text class="address-card__detail">
            {{ item.province }}{{ item.city }}{{ item.district }}{{ item.detail }}
          </text>
        </view>
        <view class="address-card__actions">
          <text v-if="!item.is_default" class="address-card__link" @click.stop="setDefault(item)">设为默认</text>
          <text class="address-card__link" @click.stop="editAddress(item)">编辑</text>
          <text class="address-card__link address-card__link--danger" @click.stop="deleteAddress(item)">删除</text>
        </view>
      </view>

      <XEmpty
        v-if="!loading && addresses.length === 0"
        image="/static/empty-address.png"
        title="还没有收货地址"
        desc="添加一个常用地址，下单时会更顺手。"
        action-text="新增地址"
        @action="addAddress"
      />
    </scroll-view>

    <view class="bottom-bar safe-area-bottom">
      <button class="primary-btn" @click="addAddress">新增收货地址</button>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding-bottom: 128rpx;
  background: #f7f5f0;
}

.list {
  height: calc(100vh - 128rpx);
  padding: 20rpx 24rpx;
  box-sizing: border-box;
}

.address-card {
  margin-bottom: 18rpx;
  padding: 24rpx;
  background: #fff;
  border: 1rpx solid #e7e3dc;
  border-radius: 22rpx;
}

.address-card__top {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.address-card__name {
  color: #1f2522;
  font-size: 31rpx;
  font-weight: 800;
}

.address-card__phone {
  color: #59625d;
  font-size: 26rpx;
}

.address-card__tag {
  padding: 4rpx 12rpx;
  color: #2f5d50;
  background: #eef3ef;
  border-radius: 999rpx;
  font-size: 20rpx;
  font-weight: 700;
}

.address-card__detail {
  display: block;
  margin-top: 14rpx;
  color: #59625d;
  font-size: 26rpx;
  line-height: 1.6;
}

.address-card__actions {
  display: flex;
  justify-content: flex-end;
  gap: 28rpx;
  margin-top: 20rpx;
  padding-top: 18rpx;
  border-top: 1rpx solid #f1eee7;
}

.address-card__link {
  color: #2f5d50;
  font-size: 24rpx;
  font-weight: 700;
}

.address-card__link--danger {
  color: #b84a3c;
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
