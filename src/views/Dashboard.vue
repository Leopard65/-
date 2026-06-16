<template>
  <div>
    <!-- 页面标题 -->
    <PageHeader title="仪表盘" description="今日经营概览与待办事项">
      <template #actions>
        <span style="color:var(--text-secondary);font-size:13px">最后更新: {{ lastUpdated }}</span>
        <el-button :icon="Refresh" @click="handleRefresh" :loading="fetching">刷新</el-button>
      </template>
    </PageHeader>

    <!-- 核心 KPI -->
    <div class="metric-grid">
      <MetricCard label="今日销售额" :value="formatMoney(data.todaySales)" tone="primary">
        <template #icon><el-icon><Money /></el-icon></template>
      </MetricCard>
      <MetricCard label="今日订单" :value="formatNumber(data.todayOrders)" tone="success">
        <template #icon><el-icon><Tickets /></el-icon></template>
      </MetricCard>
      <MetricCard label="今日客单价" :value="formatMoney(avgOrderValue)" tone="warning">
        <template #icon><el-icon><Wallet /></el-icon></template>
      </MetricCard>
      <MetricCard label="会员总数" :value="formatNumber(data.memberCount)" tone="accent">
        <template #icon><el-icon><UserFilled /></el-icon></template>
      </MetricCard>
    </div>

    <!-- 趋势 + 今日目标完成率 -->
    <el-row :gutter="20" style="margin-bottom: 20px">
      <el-col :span="16">
        <SectionPanel title="近 7 天销售趋势">
          <div v-show="data.trend && data.trend.length" ref="trendChartRef" class="chart chart--lg"></div>
          <EmptyState v-if="!data.trend || !data.trend.length" description="暂无销售数据" />
        </SectionPanel>
      </el-col>
      <el-col :span="8">
        <SectionPanel title="今日目标完成率">
          <div ref="gaugeChartRef" class="chart chart--lg"></div>
          <div class="target-foot">
            目标 {{ formatMoney(data.salesTarget) }} · 已达 {{ formatMoney(data.todaySales) }}
          </div>
        </SectionPanel>
      </el-col>
    </el-row>

    <!-- 热销排行 + 占比 + 待办提醒 -->
    <el-row :gutter="20" style="margin-bottom: 20px">
      <el-col :span="8">
        <SectionPanel title="热销排行 TOP5">
          <div v-if="data.hotProducts?.length" class="hot-list">
            <div v-for="(item, i) in data.hotProducts" :key="i" class="hot-item">
              <span class="hot-rank" :class="'rank-' + (i+1)">{{ i + 1 }}</span>
              <span class="hot-name">{{ item.name }}</span>
              <span class="hot-num num">{{ item.total_sold }} 件</span>
            </div>
          </div>
          <EmptyState v-else description="暂无销售数据" />
        </SectionPanel>
      </el-col>
      <el-col :span="8">
        <SectionPanel title="热销销量占比">
          <div v-show="data.hotProducts?.length" ref="donutChartRef" class="chart chart--md"></div>
          <EmptyState v-if="!data.hotProducts?.length" description="暂无销售数据" />
        </SectionPanel>
      </el-col>
      <el-col :span="8">
        <SectionPanel title="待办提醒">
          <div v-if="todos.length" class="todo-list">
            <div v-for="t in todos" :key="t.key" class="todo-row" @click="goTo(t.path)">
              <span class="todo-icon" :style="{ color: `var(--color-${t.tone})`, background: `color-mix(in srgb, var(--color-${t.tone}) 12%, transparent)` }">
                <el-icon><component :is="t.icon" /></el-icon>
              </span>
              <span class="todo-label">{{ t.label }}</span>
              <span class="todo-count" :style="{ color: `var(--color-${t.tone})` }">{{ t.count }}</span>
              <el-icon class="todo-arrow"><ArrowRight /></el-icon>
            </div>
          </div>
          <EmptyState v-else description="暂无待办，一切正常" />
        </SectionPanel>
      </el-col>
    </el-row>

    <!-- 库存预警明细 -->
    <SectionPanel title="库存预警明细">
      <el-table :data="data.lowStock || []" style="width:100%" max-height="320" stripe>
        <el-table-column prop="name" label="商品" min-width="160" />
        <el-table-column prop="category_name" label="分类" width="120" />
        <el-table-column prop="stock" label="库存" width="100">
          <template #default="{ row }">
            <el-tag :type="row.stock === 0 ? 'danger' : 'warning'" size="small">{{ row.stock }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="min_stock" label="预警值" width="100" />
        <el-table-column label="缺口" width="100">
          <template #default="{ row }">
            <span class="amount amount--danger">{{ row.min_stock - row.stock }}</span>
          </template>
        </el-table-column>
      </el-table>
      <EmptyState v-if="!data.lowStock?.length" description="库存充足，暂无预警" />
    </SectionPanel>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Refresh, Money, Tickets, Wallet, UserFilled, RefreshLeft, Warning, CircleClose, ArrowRight, Calendar } from '@element-plus/icons-vue'
import * as echarts from 'echarts/core'
import { LineChart, PieChart, GaugeChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { dashboardApi } from '@/api'
import { formatMoney, formatNumber } from '@/utils/format'
import { CHART_PALETTE, GRID, TOOLTIP, SPLIT_LINE, AXIS_LINE } from '@/utils/chart'
import PageHeader from '@/components/PageHeader.vue'
import MetricCard from '@/components/MetricCard.vue'
import SectionPanel from '@/components/SectionPanel.vue'
import EmptyState from '@/components/EmptyState.vue'

echarts.use([LineChart, PieChart, GaugeChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const router = useRouter()
const data = ref({})
const fetching = ref(false)
const lastUpdated = ref('--:--:--')
const trendChartRef = ref(null)
const gaugeChartRef = ref(null)
const donutChartRef = ref(null)
let trendChart = null
let gaugeChart = null
let donutChart = null
let refreshInterval = null

const goTo = (path) => router.push(path)

// 今日客单价 = 今日销售额 / 今日订单数
const avgOrderValue = computed(() => {
  const s = data.value.todaySales || 0
  const o = data.value.todayOrders || 0
  return o > 0 ? (s / o).toFixed(2) : '0.00'
})

const targetPercent = computed(() => {
  const t = data.value.salesTarget || 0
  const s = data.value.todaySales || 0
  if (t <= 0) return 0
  return Math.min(100, Math.round((s / t) * 100))
})

// 待办提醒（全部来自仪表盘数据，无额外请求；空项不展示）
const todos = computed(() => {
  const low = data.value.lowStock || []
  const outOfStock = low.filter(s => s.stock === 0).length
  const expiryCount = (data.value.nearExpiry || 0) + (data.value.expiredBatches || 0)
  const items = [
    { key: 'returns', label: '待审核退货', count: data.value.pendingReturns || 0, tone: 'warning', icon: RefreshLeft, path: '/returns' },
    { key: 'expiry', label: '临期/过期预警', count: expiryCount, tone: 'warning', icon: Calendar, path: '/batches' },
    { key: 'low', label: '低库存预警', count: low.length, tone: 'danger', icon: Warning, path: '/inventory' },
    { key: 'out', label: '缺货商品', count: outOfStock, tone: 'danger', icon: CircleClose, path: '/inventory' }
  ]
  return items.filter(i => i.count > 0)
})

const renderTrendChart = () => {
  const trend = data.value.trend || []
  if (!trendChartRef.value || !trend.length) return
  if (!trendChart) trendChart = echarts.init(trendChartRef.value)
  trendChart.setOption({
    color: CHART_PALETTE,
    tooltip: { ...TOOLTIP, trigger: 'axis', valueFormatter: v => '¥' + Number(v).toFixed(2) },
    grid: GRID,
    xAxis: { type: 'category', boundaryGap: false, data: trend.map(d => d.date), axisLine: AXIS_LINE },
    yAxis: { type: 'value', splitLine: SPLIT_LINE },
    series: [{
      name: '销售额',
      type: 'line',
      smooth: true,
      data: trend.map(d => d.amount),
      areaStyle: { opacity: 0.16 },
      lineStyle: { width: 3 },
      showSymbol: false
    }]
  })
}

const renderGauge = () => {
  if (!gaugeChartRef.value) return
  if (!gaugeChart) gaugeChart = echarts.init(gaugeChartRef.value)
  const pct = targetPercent.value
  const color = pct >= 100 ? '#2faa6e' : pct >= 60 ? '#3b6fe0' : '#e6932e'
  gaugeChart.setOption({
    series: [{
      type: 'gauge',
      startAngle: 210,
      endAngle: -30,
      min: 0,
      max: 100,
      progress: { show: true, width: 14, itemStyle: { color } },
      axisLine: { lineStyle: { width: 14, color: [[1, '#eef0f3']] } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      pointer: { show: false },
      anchor: { show: false },
      detail: {
        valueAnimation: true,
        formatter: '{value}%',
        fontSize: 30,
        fontWeight: 'bolder',
        color: '#1f2329',
        offsetCenter: [0, 0]
      },
      data: [{ value: pct }]
    }]
  })
}

const renderDonut = () => {
  const hot = data.value.hotProducts || []
  if (!donutChartRef.value || !hot.length) return
  if (!donutChart) donutChart = echarts.init(donutChartRef.value)
  donutChart.setOption({
    color: CHART_PALETTE,
    tooltip: { ...TOOLTIP, trigger: 'item', formatter: '{b}: {c} 件 ({d}%)' },
    legend: { type: 'scroll', bottom: 0, textStyle: { color: '#4e5969' } },
    series: [{
      type: 'pie',
      radius: ['42%', '64%'],
      center: ['50%', '44%'],
      avoidLabelOverlap: true,
      label: { show: false },
      data: hot.map(p => ({ name: p.name, value: p.total_sold }))
    }]
  })
}

const renderCharts = () => { renderTrendChart(); renderGauge(); renderDonut() }

const onResize = () => { trendChart?.resize(); gaugeChart?.resize(); donutChart?.resize() }

const fetchDashboard = async () => {
  try {
    data.value = await dashboardApi.getDashboard()
    lastUpdated.value = new Date().toLocaleTimeString()
    nextTick(renderCharts)
  } catch (e) {
    console.error('获取仪表盘数据失败:', e)
  }
}

const handleRefresh = async () => {
  fetching.value = true
  try {
    await fetchDashboard()
  } finally {
    fetching.value = false
  }
}

onMounted(() => {
  fetchDashboard()
  window.addEventListener('resize', onResize)
  // 每5分钟自动刷新
  refreshInterval = setInterval(fetchDashboard, 5 * 60 * 1000)
})

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval)
  window.removeEventListener('resize', onResize)
  trendChart?.dispose(); gaugeChart?.dispose(); donutChart?.dispose()
  trendChart = gaugeChart = donutChart = null
})
</script>

<style scoped>
/* 图表容器高度稳定 */
.chart { width: 100%; }
.chart--lg { height: 300px; }
.chart--md { height: 280px; }
.target-foot { text-align: center; font-size: 13px; color: var(--text-secondary); margin-top: -8px; }

/* 热销排行 */
.hot-list { min-height: 280px; }
.hot-item { display: flex; align-items: center; padding: 11px 0; border-bottom: 1px solid var(--border-color-light); }
.hot-item:last-child { border-bottom: none; }
.hot-rank { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #fff; margin-right: 12px; background: var(--color-info); flex-shrink: 0; }
.hot-name { flex: 1; color: var(--text-regular); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hot-num { color: var(--color-primary); font-weight: 600; }
.rank-1 { background: var(--color-danger); }
.rank-2 { background: var(--color-warning); }
.rank-3 { background: var(--color-primary); }

/* 待办提醒 */
.todo-list { display: flex; flex-direction: column; gap: 10px; }
.todo-row { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1px solid var(--border-color-light); border-radius: var(--radius-md); cursor: pointer; transition: background 0.15s, border-color 0.15s; }
.todo-row:hover { background: var(--bg-muted); border-color: var(--border-color); }
.todo-icon { width: 34px; height: 34px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
.todo-label { flex: 1; color: var(--text-regular); }
.todo-count { font-size: 18px; font-weight: 700; font-variant-numeric: tabular-nums; }
.todo-arrow { color: var(--text-placeholder); }
</style>
