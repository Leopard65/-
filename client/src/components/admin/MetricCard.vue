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
      <div v-if="meta" class="mc-meta">{{ meta }}</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, default: '' },
  value: { type: [Number, String], default: 0 },
  // 色调：brand | success | warning | danger | info | violet
  tone: { type: String, default: 'brand' },
  meta: { type: String, default: '' },
})
</script>

<style scoped>
.metric-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-4);
  background: var(--bg-card);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-light);
  padding: var(--space-5);
  min-width: 0;
  overflow: hidden;
  transition:
    transform var(--dur-fast) var(--ease),
    box-shadow var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease);
}
.metric-card::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background: var(--brand);
  opacity: 0.9;
}
.metric-card:hover {
  transform: translateY(-2px);
  border-color: var(--el-color-primary-light-7);
  box-shadow: var(--shadow);
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
.mc-body {
  min-width: 0;
}
.mc-value {
  font-size: 26px;
  font-weight: 700;
  color: var(--text-main);
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}
.mc-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 2px;
}
.mc-meta {
  margin-top: 4px;
  color: var(--text-placeholder);
  font-size: 12px;
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 色调 */
.tone-brand .mc-icon { background: var(--brand-light); color: var(--brand); }
.tone-success .mc-icon { background: var(--tone-success-bg); color: var(--success); }
.tone-warning .mc-icon { background: var(--tone-warning-bg); color: var(--warning); }
.tone-danger .mc-icon { background: var(--tone-danger-bg); color: var(--danger); }
.tone-info .mc-icon { background: var(--tone-info-bg); color: var(--info); }
.tone-violet .mc-icon { background: var(--tone-violet-bg); color: var(--tone-violet); }
.tone-success::before { background: var(--success); }
.tone-warning::before { background: var(--warning); }
.tone-danger::before { background: var(--danger); }
.tone-info::before { background: var(--info); }
.tone-violet::before { background: var(--tone-violet); }

@media (max-width: 768px) {
  .metric-card { padding: var(--space-4); gap: var(--space-3); }
  .mc-icon { width: 44px; height: 44px; font-size: 20px; }
  .mc-value { font-size: 22px; }
}

@media (prefers-reduced-motion: reduce) {
  .metric-card {
    transition: none;
  }
  .metric-card:hover {
    transform: none;
  }
}
</style>
