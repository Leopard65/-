<script setup>
import { computed } from 'vue'
import { formatMoney } from '@/utils/format'

const props = defineProps({
  value: { type: [Number, String], default: 0 },
  muted: { type: Boolean, default: false },
  size: { type: String, default: 'normal' }
})

const priceText = computed(() => formatMoney(props.value))
</script>

<template>
  <text class="x-price" :class="[`x-price--${size}`, { 'x-price--muted': muted }]">
    ¥{{ priceText }}
  </text>
</template>

<style scoped>
.x-price {
  color: #b84a3c;
  font-weight: 700;
  letter-spacing: 0;
}

.x-price--small {
  font-size: 24rpx;
}

.x-price--normal {
  font-size: 32rpx;
}

.x-price--large {
  font-size: 48rpx;
}

.x-price--muted {
  color: #8a928d;
  text-decoration: line-through;
  font-weight: 400;
}
</style>
