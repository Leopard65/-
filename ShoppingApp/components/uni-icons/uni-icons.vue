<script setup>
import { computed } from 'vue'

const props = defineProps({
  type: {
    type: String,
    default: 'circle'
  },
  size: {
    type: [String, Number],
    default: 24
  },
  color: {
    type: String,
    default: '#333'
  }
})

const iconMap = {
  search: '⌕',
  bell: '⊚',
  right: '›',
  top: '⌃',
  bottom: '⌄',
  gear: '⚙',
  closeempty: '×',
  clear: '×',
  trash: '⌫',
  compose: '✎',
  wallet: '▣',
  gift: '◇',
  car: '▰',
  chat: '☰',
  undo: '↶',
  heart: '♡',
  'heart-filled': '♥',
  home: '⌂',
  cart: '▤',
  location: '⌖',
  camera: '▢',
  checkmarkempty: '✓',
  circle: '○',
  'checkbox-filled': '✓',
  eye: '◉',
  'eye-slash': '◎'
}

const label = computed(() => iconMap[props.type] || '•')
const iconStyle = computed(() => ({
  color: props.color,
  fontSize: `${Number(props.size) || 24}px`,
  width: `${Number(props.size) || 24}px`,
  height: `${Number(props.size) || 24}px`,
  lineHeight: `${Number(props.size) || 24}px`
}))
</script>

<template>
  <text class="uni-icons-fallback" :style="iconStyle">{{ label }}</text>
</template>

<style scoped>
.uni-icons-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: Arial, sans-serif;
  text-align: center;
}
</style>
