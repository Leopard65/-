<template>
  <el-tag :type="mapped.type" :size="size" :effect="effect">{{ mapped.text }}</el-tag>
</template>

<script setup>
import { computed } from 'vue'

/**
 * 状态/等级标签统一出口。
 * 集中维护「值 → 颜色 → 文案」映射，避免各页面各写一套 statusType/getLevelType。
 * preset 选择内置映射；也可通过 :map 传入自定义映射覆盖。
 */
const props = defineProps({
  value: { type: [String, Number], default: '' },
  preset: { type: String, default: '' }, // returnStatus / memberLevel / userStatus / role
  map: { type: Object, default: null },
  size: { type: String, default: 'default' },
  effect: { type: String, default: 'light' }
})

const presets = {
  returnStatus: {
    pending: { type: 'warning', text: '待审核' },
    completed: { type: 'success', text: '已完成' },
    rejected: { type: 'danger', text: '已拒绝' }
  },
  memberLevel: {
    normal: { type: 'info', text: '普通会员' },
    silver: { type: 'info', text: '银卡会员' },
    gold: { type: 'warning', text: '金卡会员' },
    diamond: { type: 'danger', text: '钻石会员' },
    普通会员: { type: 'info', text: '普通会员' },
    银卡会员: { type: 'info', text: '银卡会员' },
    金卡会员: { type: 'warning', text: '金卡会员' },
    钻石会员: { type: 'danger', text: '钻石会员' }
  },
  userStatus: {
    1: { type: 'success', text: '启用' },
    0: { type: 'info', text: '禁用' }
  },
  role: {
    admin: { type: 'primary', text: '管理员' },
    cashier: { type: 'info', text: '收银员' }
  }
}

const mapped = computed(() => {
  const table = props.map || presets[props.preset] || {}
  return table[props.value] || { type: 'info', text: String(props.value ?? '-') }
})
</script>
