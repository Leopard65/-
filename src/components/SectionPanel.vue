<template>
  <section class="panel">
    <div v-if="title || $slots.title || $slots.actions" class="panel__header">
      <div class="panel__title">
        <slot name="title">{{ title }}</slot>
      </div>
      <div v-if="$slots.actions" class="panel__actions">
        <slot name="actions" />
      </div>
    </div>
    <div :class="bodyClass">
      <slot />
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

/**
 * 区块面板：替代散落的 el-card + header span。
 * 统一标题字重、内边距、边框与阴影；padding=false 时贴边（用于表格类内容）。
 */
const props = defineProps({
  title: { type: String, default: '' },
  padding: { type: Boolean, default: true }
})

const bodyClass = computed(() => (props.padding ? 'panel__body' : ''))
</script>

<!-- 样式见 src/styles/global.css（.panel / __header / __title / __body） -->
