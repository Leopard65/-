<script setup>
import { computed, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { api } from '@/api/client'
import { isValidPhone } from '@/utils/util'

const addressId = ref('')
const regionIndex = ref([0, 0, 0])
const form = reactive({
  name: '',
  phone: '',
  province: '',
  city: '',
  district: '',
  detail: '',
  is_default: false
})

const regionOptions = [
  ['广东省', '浙江省', '江苏省', '上海市', '北京市'],
  ['深圳市', '杭州市', '南京市', '上海市', '北京市'],
  ['南山区', '西湖区', '玄武区', '徐汇区', '朝阳区']
]

const regionText = computed(() => {
  if (!form.province) return '请选择省市区'
  return `${form.province} ${form.city} ${form.district}`
})

const loadAddress = async () => {
  if (!addressId.value) return
  const res = await api.address.getAddressList({}, { showError: false })
  const item = res?.data?.find(row => row._id === addressId.value)
  if (!item) return
  Object.assign(form, {
    name: item.name || '',
    phone: item.phone || '',
    province: item.province || '',
    city: item.city || '',
    district: item.district || '',
    detail: item.detail || '',
    is_default: Boolean(item.is_default)
  })
}

onLoad((options = {}) => {
  addressId.value = options.id || ''
  loadAddress()
})

const onRegionChange = (event) => {
  regionIndex.value = event.detail.value
  form.province = regionOptions[0][regionIndex.value[0]]
  form.city = regionOptions[1][regionIndex.value[1]]
  form.district = regionOptions[2][regionIndex.value[2]]
}

const validate = () => {
  if (!form.name.trim()) return '请输入收货人'
  if (!isValidPhone(form.phone)) return '请输入正确的手机号'
  if (!form.province) return '请选择省市区'
  if (!form.detail.trim()) return '请输入详细地址'
  return ''
}

const saveAddress = async () => {
  const error = validate()
  if (error) {
    uni.showToast({ title: error, icon: 'none' })
    return
  }

  const payload = { ...form }
  const res = addressId.value
    ? await api.address.updateAddress({ ...payload, address_id: addressId.value })
    : await api.address.addAddress(payload)

  if (res?.code === 0) {
    uni.showToast({ title: '地址已保存', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 500)
  }
}
</script>

<template>
  <view class="page">
    <view class="form-card">
      <view class="field">
        <text class="field__label">收货人</text>
        <input class="field__input" v-model="form.name" placeholder="请输入姓名" />
      </view>
      <view class="field">
        <text class="field__label">手机号</text>
        <input class="field__input" type="number" maxlength="11" v-model="form.phone" placeholder="请输入手机号" />
      </view>
      <picker mode="multiSelector" :range="regionOptions" :value="regionIndex" @change="onRegionChange">
        <view class="field">
          <text class="field__label">省市区</text>
          <text class="field__value" :class="{ 'field__value--placeholder': !form.province }">{{ regionText }}</text>
          <text class="field__arrow">›</text>
        </view>
      </picker>
      <view class="field field--textarea">
        <text class="field__label">详细地址</text>
        <textarea class="field__textarea" v-model="form.detail" maxlength="80" placeholder="街道、门牌号等"></textarea>
      </view>
    </view>

    <view class="option-card">
      <view>
        <text class="option-card__title">设为默认地址</text>
        <text class="option-card__desc">下单时优先使用这个地址</text>
      </view>
      <switch :checked="form.is_default" color="#2f5d50" @change="form.is_default = $event.detail.value" />
    </view>

    <view class="bottom-bar safe-area-bottom">
      <button class="primary-btn" @click="saveAddress">保存地址</button>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 22rpx 24rpx 128rpx;
  background: #f7f5f0;
  box-sizing: border-box;
}

.form-card,
.option-card {
  background: #fff;
  border: 1rpx solid #e7e3dc;
  border-radius: 22rpx;
}

.field {
  min-height: 104rpx;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  border-bottom: 1rpx solid #f1eee7;
}

.field:last-child {
  border-bottom: none;
}

.field--textarea {
  align-items: flex-start;
  padding-top: 28rpx;
  padding-bottom: 24rpx;
}

.field__label {
  width: 150rpx;
  color: #1f2522;
  font-size: 27rpx;
  font-weight: 700;
}

.field__input {
  flex: 1;
  height: 100%;
  color: #1f2522;
  font-size: 27rpx;
}

.field__value {
  flex: 1;
  color: #1f2522;
  font-size: 27rpx;
}

.field__value--placeholder {
  color: #b8b1a6;
}

.field__arrow {
  color: #b8b1a6;
  font-size: 38rpx;
}

.field__textarea {
  flex: 1;
  height: 140rpx;
  color: #1f2522;
  font-size: 27rpx;
}

.option-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 20rpx;
  padding: 24rpx;
}

.option-card__title {
  display: block;
  color: #1f2522;
  font-size: 28rpx;
  font-weight: 700;
}

.option-card__desc {
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
