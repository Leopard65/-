<template>
  <div class="data-toolbar">
    <div class="dt-filters">
      <slot />
    </div>
    <div v-if="$slots.actions" class="dt-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup>
// 后台筛选栏容器：默认插槽放筛选项，actions 插槽放查询/重置按钮
</script>

<style scoped>
.data-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-4);
  flex-wrap: wrap;
  background: var(--bg-card);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  padding: var(--space-4) var(--space-5);
}
.dt-filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
}
.dt-actions {
  display: flex;
  gap: var(--space-2);
  flex-shrink: 0;
}
/* 让内部表单项不带默认的底部外边距，垂直居中对齐 */
.dt-filters :deep(.el-form-item) {
  margin-bottom: 0;
}
@media (max-width: 768px) {
  .data-toolbar {
    padding: var(--space-3);
  }
  .dt-filters {
    width: 100%;
  }
}
</style>
