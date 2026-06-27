<template>
  <div class="page-header">
    <div class="ph-main">
      <h2 class="ph-title">{{ title }}</h2>
      <p v-if="subtitle" class="ph-subtitle">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.default" class="ph-actions">
      <slot />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
})
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
  min-width: 0;
}
.ph-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-main);
}
.ph-subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: var(--text-secondary);
}
.ph-actions {
  display: flex;
  gap: var(--space-2);
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }
  .ph-title {
    font-size: 19px;
  }
  .ph-actions {
    justify-content: flex-start;
  }
}
</style>
