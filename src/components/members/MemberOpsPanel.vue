<script setup>
import { computed } from 'vue'
import { DataAnalysis } from '@element-plus/icons-vue'
import { formatMoney } from '@/utils/format'
import SectionPanel from '@/components/SectionPanel.vue'
import EmptyState from '@/components/EmptyState.vue'

const props = defineProps({
  rfm: { type: Object, default: () => ({}) },
  repurchase: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['openReports'])

const segments = computed(() => props.rfm.segments || [])
const churnMembers = computed(() =>
  (props.rfm.members || []).filter(member => member.segment === '流失预警').slice(0, 5)
)

const segmentClass = (segment) => ({
  核心客户: 'segment--core',
  流失预警: 'segment--risk',
  潜力客户: 'segment--potential',
  沉睡客户: 'segment--sleeping'
}[segment] || 'segment--sleeping')
</script>

<template>
  <SectionPanel title="会员运营洞察" class="member-ops-panel">
    <template #actions>
      <el-button type="primary" plain :icon="DataAnalysis" @click="emit('openReports')">查看会员分析</el-button>
    </template>

    <div v-loading="loading">
      <div class="ops-metrics">
        <div class="ops-metric">
          <span>购买会员</span>
          <strong>{{ repurchase.totalBuyers || 0 }}</strong>
        </div>
        <div class="ops-metric">
          <span>复购会员</span>
          <strong>{{ repurchase.repeatBuyers || 0 }}</strong>
        </div>
        <div class="ops-metric">
          <span>复购率</span>
          <strong>{{ repurchase.repurchaseRate || 0 }}%</strong>
        </div>
        <div class="ops-metric">
          <span>价值分界</span>
          <strong>{{ formatMoney(rfm.value_split || 0) }}</strong>
        </div>
      </div>

      <div v-if="segments.length" class="segment-grid">
        <div v-for="seg in segments" :key="seg.segment" class="segment-card" :class="segmentClass(seg.segment)">
          <span>{{ seg.segment }}</span>
          <strong>{{ seg.count }} 人</strong>
          <small>累计 {{ formatMoney(seg.total) }}</small>
        </div>
      </div>
      <EmptyState v-else description="暂无会员画像数据" />

      <div class="risk-members">
        <div class="risk-members__title">流失预警会员</div>
        <el-table :data="churnMembers" size="small" stripe max-height="220">
          <el-table-column prop="name" label="会员" min-width="100" />
          <el-table-column prop="phone" label="手机号" width="130" />
          <el-table-column label="最近消费" width="100" align="right">
            <template #default="{ row }">{{ row.last_days }} 天前</template>
          </el-table-column>
          <el-table-column label="累计消费" width="120" align="right">
            <template #default="{ row }"><span class="num amount">{{ formatMoney(row.total) }}</span></template>
          </el-table-column>
        </el-table>
        <EmptyState v-if="!churnMembers.length && segments.length" description="暂无流失预警会员" />
      </div>
    </div>
  </SectionPanel>
</template>

<style scoped>
.member-ops-panel {
  margin-bottom: var(--space-4);
}

.ops-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.ops-metric {
  padding: 10px 12px;
  border: 1px solid var(--border-color-light);
  border-radius: var(--radius-md);
  background: var(--bg-subtle);
}

.ops-metric span {
  display: block;
  color: var(--text-secondary);
  font-size: 12px;
}

.ops-metric strong {
  display: block;
  margin-top: 4px;
  color: var(--text-primary);
  font-family: var(--font-data);
  font-size: 20px;
}

.segment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.segment-card {
  --segment-color: var(--color-info);
  padding: 10px 12px;
  border: 1px solid var(--border-color-light);
  border-left: 3px solid var(--segment-color);
  border-radius: var(--radius-md);
  background: var(--bg-subtle);
}

.segment-card span,
.segment-card small {
  display: block;
  color: var(--text-secondary);
  font-size: 12px;
}

.segment-card strong {
  display: block;
  margin: 4px 0;
  color: var(--segment-color);
  font-size: 20px;
  font-family: var(--font-data);
}

.segment--core {
  --segment-color: var(--color-success);
}

.segment--risk {
  --segment-color: var(--color-danger);
}

.segment--potential {
  --segment-color: var(--color-warning);
}

.segment--sleeping {
  --segment-color: var(--color-info);
}

.risk-members__title {
  margin-bottom: var(--space-2);
  color: var(--text-primary);
  font-weight: 600;
}
</style>
