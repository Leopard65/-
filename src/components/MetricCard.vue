<template>
  <div class="metric" :class="{ 'metric--clickable': clickable }">
    <div class="metric__icon" :style="iconStyle">
      <slot name="icon" />
    </div>
    <div class="metric__body">
      <div class="metric__label">{{ label }}</div>
      <div class="metric__value">
        {{ value }}<span v-if="unit" class="metric__unit">{{ unit }}</span>
      </div>
      <div v-if="trend" class="metric__trend" :class="`is-${trendDir}`">
        <el-icon v-if="trendDir === 'up'"><CaretTop /></el-icon>
        <el-icon v-else-if="trendDir === 'down'"><CaretBottom /></el-icon>
        <span>{{ trend }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { CaretTop, CaretBottom } from '@element-plus/icons-vue'

const props = defineProps({
  label: { type: String, default: '' },
  value: { type: [String, Number], default: '' },
  unit: { type: String, default: '' },
  // 语义色调：primary / success / warning / danger / accent / info
  tone: { type: String, default: 'primary' },
  trend: { type: String, default: '' },           // 如 "+12.5%"
  trendDir: { type: String, default: 'flat' },      // up / down / flat
  clickable: { type: Boolean, default: false }
})

const iconStyle = computed(() => ({
  color: `var(--color-${props.tone})`,
  background: `color-mix(in srgb, var(--color-${props.tone}) 12%, transparent)`
}))
</script>

<style scoped>
.metric {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-5);
  background:
    linear-gradient(180deg, #fff, var(--bg-muted));
  border: 1px solid var(--border-color-light);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  transition: box-shadow 0.15s, transform 0.15s;
  position: relative;
  overflow: hidden;
}
.metric::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background: var(--color-accent);
}
.metric--clickable { cursor: pointer; }
.metric--clickable:hover { box-shadow: var(--shadow-hover); transform: translateY(-2px); }

.metric__icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 20%, transparent);
}
.metric__body { min-width: 0; }
.metric__label { font-size: var(--font-aux); color: var(--text-secondary); font-weight: 600; }
.metric__value {
  font-size: var(--font-metric);
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
  font-variant-numeric: tabular-nums;
}
.metric__unit { font-size: var(--font-aux); font-weight: 400; color: var(--text-secondary); margin-left: 4px; }
.metric__trend { display: flex; align-items: center; gap: 2px; font-size: 12px; margin-top: 2px; }
.metric__trend.is-up { color: var(--color-success); }
.metric__trend.is-down { color: var(--color-danger); }
.metric__trend.is-flat { color: var(--text-secondary); }
</style>
