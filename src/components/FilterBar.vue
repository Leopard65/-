<template>
  <div class="toolbar">
    <slot />
    <div v-if="$slots.actions" class="toolbar__spacer"></div>
    <slot name="actions" />
  </div>
</template>

<script setup>
/**
 * 筛选 / 工具栏：左侧放筛选控件（默认插槽），右侧放主操作（actions 插槽）。
 * 仅承担布局与间距统一，不耦合业务，供手写表格页复用。
 */
</script>

<!-- 样式见 src/styles/global.css（.toolbar / __spacer） -->
