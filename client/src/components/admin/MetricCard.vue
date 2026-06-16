<template>
  <div class="metric-card" :class="`tone-${tone}`">
    <div class="mc-icon">
      <slot name="icon">
        <el-icon><DataLine /></el-icon>
      </slot>
    </div>
    <div class="mc-body">
      <div class="mc-value">{{ value }}</div>
      <div class="mc-label">{{ label }}</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, default: '' },
  value: { type: [Number, String], default: 0 },
  // 色调：brand | success | warning | danger | info | violet
  tone: { type: String, default: 'brand' },
})
</script>

<style scoped>
.metric-card {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  background: var(--bg-card);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  padding: var(--space-5);
}
.mc-icon {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}
.mc-value {
  font-size: 26px;
  font-weight: 700;
  color: var(--text-main);
  line-height: 1.2;
}
.mc-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 2px;
}

/* 色调 */
.tone-brand .mc-icon { background: var(--brand-light); color: var(--brand); }
.tone-success .mc-icon { background: #e7f5ee; color: var(--success); }
.tone-warning .mc-icon { background: #fdf3e3; color: var(--warning); }
.tone-danger .mc-icon { background: #fceae9; color: var(--danger); }
.tone-info .mc-icon { background: #eef0f3; color: var(--info); }
.tone-violet .mc-icon { background: #f0ebfb; color: #8254d8; }

@media (max-width: 768px) {
  .metric-card { padding: var(--space-4); gap: var(--space-3); }
  .mc-icon { width: 44px; height: 44px; font-size: 20px; }
  .mc-value { font-size: 22px; }
}
</style>
