<script setup>
const props = defineProps({
  modelValue: { type: Number, default: 1 },
  min: { type: Number, default: 1 },
  max: { type: Number, default: 999 }
})

const emit = defineEmits(['update:modelValue', 'change'])

const update = (value) => {
  const next = Math.max(props.min, Math.min(props.max, Number(value) || props.min))
  emit('update:modelValue', next)
  emit('change', next)
}
</script>

<template>
  <view class="x-quantity">
    <view class="x-quantity__btn" @click="update(modelValue - 1)">-</view>
    <input class="x-quantity__input" type="number" :value="modelValue" @blur="update($event.detail.value)" />
    <view class="x-quantity__btn" @click="update(modelValue + 1)">+</view>
  </view>
</template>

<style scoped>
.x-quantity {
  display: flex;
  align-items: center;
  border: 1rpx solid #e7e3dc;
  border-radius: 999rpx;
  background: #fff;
}

.x-quantity__btn {
  width: 64rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2f5d50;
  font-size: 30rpx;
}

.x-quantity__input {
  width: 70rpx;
  height: 56rpx;
  text-align: center;
  color: #1f2522;
  font-size: 26rpx;
}
</style>
