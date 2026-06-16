<template>
  <div class="empty-state">
    <el-empty :description="description" :image-size="imageSize">
      <slot />
    </el-empty>
  </div>
</template>

<script setup>
defineProps({
  description: { type: String, default: '暂无数据' },
  imageSize: { type: Number, default: 90 },
})
</script>

<style scoped>
.empty-state {
  padding: var(--space-6) 0;
}
.empty-state :deep(.el-empty__description) {
  color: var(--text-secondary);
}
</style>
