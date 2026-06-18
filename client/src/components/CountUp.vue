<template><span>{{ display }}</span></template>

<script setup>
/**
 * 数字滚动动画：value 变化时用 requestAnimationFrame 补间（easeOutCubic）。
 * 首页救助成果等统计数字进入时从 0 滚动到目标值。
 */
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 },
  duration: { type: Number, default: 1200 },
})

const display = ref(0)
let raf = null

function run(to) {
  cancelAnimationFrame(raf)
  const from = display.value
  const start = performance.now()
  const tick = (now) => {
    const p = Math.min(1, (now - start) / props.duration)
    const eased = 1 - Math.pow(1 - p, 3) // easeOutCubic
    display.value = Math.round(from + (to - from) * eased)
    if (p < 1) raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
}

watch(() => props.value, (v) => run(v))
onMounted(() => run(props.value))
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>
