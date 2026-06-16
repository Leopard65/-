<template>
  <div class="dashboard admin-view">
    <PageHeader title="数据看板" subtitle="救助与领养运营概览" />

    <!-- 统计卡片 -->
    <div class="stat-cards">
      <MetricCard
        v-for="item in statCards"
        :key="item.label"
        :label="item.label"
        :value="item.value"
        :tone="item.tone"
      >
        <template #icon><component :is="item.icon" /></template>
      </MetricCard>
    </div>

    <!-- 图表 -->
    <el-row :gutter="16" class="chart-row">
      <el-col :xs="24" :md="14">
        <el-card shadow="never" class="panel">
          <template #header><span class="panel-title">近 6 个月领养申请趋势</span></template>
          <div ref="trendRef" class="chart"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="10">
        <el-card shadow="never" class="panel">
          <template #header><span class="panel-title">动物状态分布</span></template>
          <div ref="pieRef" class="chart"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 救助紧急程度分布 -->
    <el-row :gutter="16" class="chart-row">
      <el-col :xs="24" :md="24">
        <el-card shadow="never" class="panel">
          <template #header><span class="panel-title">救助紧急程度分布</span></template>
          <div ref="urgencyRef" class="chart chart-sm"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 待办事项 -->
    <el-row :gutter="16" class="todo-row">
      <el-col :xs="24" :md="12">
        <el-card shadow="never" class="panel">
          <template #header>
            <div class="card-head">
              <span class="panel-title">待审核领养（{{ adoptionPending }}）</span>
              <el-button text type="primary" size="small" @click="$router.push('/admin/adoptions')">去处理</el-button>
            </div>
          </template>
          <el-table :data="pendingAdoptions" v-loading="loadingAdopt" size="small">
            <el-table-column prop="animal_name" label="动物" width="110" show-overflow-tooltip />
            <el-table-column prop="applicant_name" label="申请人" width="100" show-overflow-tooltip />
            <el-table-column prop="phone" label="电话" />
            <el-table-column prop="created_at" label="申请时间" width="120">
              <template #default="{ row }">{{ fmtDate(row.created_at, 'md') }}</template>
            </el-table-column>
          </el-table>
          <EmptyState v-if="!loadingAdopt && pendingAdoptions.length === 0" description="暂无待审核申请" :image-size="60" />
        </el-card>
      </el-col>

      <el-col :xs="24" :md="12">
        <el-card shadow="never" class="panel">
          <template #header>
            <div class="card-head">
              <span class="panel-title">待处理救助（{{ rescueCount }}）</span>
              <el-button text type="primary" size="small" @click="$router.push('/admin/rescues')">去处理</el-button>
            </div>
          </template>
          <el-table :data="pendingRescues" v-loading="loadingRescue" size="small">
            <el-table-column prop="reporter_name" label="报告人" width="100" show-overflow-tooltip />
            <el-table-column prop="location" label="地点" show-overflow-tooltip />
            <el-table-column prop="urgency" label="紧急" width="80">
              <template #default="{ row }"><StatusTag kind="urgency" :value="row.urgency" size="small" /></template>
            </el-table-column>
            <el-table-column prop="created_at" label="时间" width="120">
              <template #default="{ row }">{{ fmtDate(row.created_at, 'md') }}</template>
            </el-table-column>
          </el-table>
          <EmptyState v-if="!loadingRescue && pendingRescues.length === 0" description="暂无待处理求助" :image-size="60" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 回访提醒 -->
    <el-card class="panel reminder-card" shadow="never">
      <template #header>
        <div class="card-head">
          <span class="panel-title">领养回访提醒（{{ reminders.length }}）<span class="reminder-sub">已通过满 30 天且尚无回访记录</span></span>
          <el-button text type="primary" size="small" @click="$router.push('/admin/adoptions')">去回访</el-button>
        </div>
      </template>
      <el-table :data="reminders" v-loading="loadingReminder" size="small">
        <el-table-column prop="animal_name" label="动物" width="120" show-overflow-tooltip />
        <el-table-column prop="applicant_name" label="领养人" width="110" show-overflow-tooltip />
        <el-table-column prop="phone" label="电话" width="140" />
        <el-table-column label="通过时间" width="120">
          <template #default="{ row }">{{ fmtDate(row.reviewed_at) }}</template>
        </el-table-column>
        <el-table-column label="距今">
          <template #default="{ row }"><el-tag type="warning" size="small" round>{{ row.days_since }} 天</el-tag></template>
        </el-table-column>
      </el-table>
      <EmptyState v-if="!loadingReminder && reminders.length === 0" description="暂无需回访的领养" :image-size="60" />
    </el-card>

    <!-- 近期计划回访 -->
    <el-card class="panel reminder-card" shadow="never">
      <template #header>
        <div class="card-head">
          <span class="panel-title">近期计划回访（{{ upcoming.length }}）<span class="reminder-sub">未来 30 天内已排期的回访</span></span>
          <el-button text type="primary" size="small" @click="$router.push('/admin/adoptions')">去查看</el-button>
        </div>
      </template>
      <el-table :data="upcoming" v-loading="loadingUpcoming" size="small">
        <el-table-column prop="animal_name" label="动物" width="120" show-overflow-tooltip />
        <el-table-column prop="applicant_name" label="领养人" width="110" show-overflow-tooltip />
        <el-table-column prop="phone" label="电话" width="140" />
        <el-table-column label="计划回访日" width="120">
          <template #default="{ row }">{{ fmtDate(row.next_visit_date) }}</template>
        </el-table-column>
        <el-table-column label="距今">
          <template #default="{ row }">
            <el-tag :type="row.days_until <= 3 ? 'danger' : 'success'" size="small" round>
              {{ row.days_until === 0 ? '今天' : row.days_until + ' 天后' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
      <EmptyState v-if="!loadingUpcoming && upcoming.length === 0" description="近期没有已排期的回访" :image-size="60" />
    </el-card>

    <!-- 快捷操作 -->
    <el-card class="panel quick-actions" shadow="never">
      <template #header><span class="panel-title">快捷操作</span></template>
      <el-space wrap>
        <el-button type="primary" @click="$router.push('/admin/animals/add')">录入动物</el-button>
        <el-button @click="$router.push('/admin/adoptions')">审核领养</el-button>
        <el-button @click="$router.push('/admin/rescues')">处理求助</el-button>
        <el-button @click="$router.push('/admin/announcements')">发布公告</el-button>
      </el-space>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { TooltipComponent, GridComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import request from '@/utils/request'

echarts.use([BarChart, LineChart, PieChart, TooltipComponent, GridComponent, LegendComponent, CanvasRenderer])
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import EmptyState from '@/components/EmptyState.vue'
import MetricCard from '@/components/admin/MetricCard.vue'
import { fmtDate } from '@/utils/format'

const animalStats = ref({ total: 0, rescued: 0, available: 0, adopted: 0 })
const userCount = ref(0)
const adoptionPending = ref(0)
const rescueCount = ref(0)

const pendingAdoptions = ref([])
const pendingRescues = ref([])
const loadingAdopt = ref(false)
const loadingRescue = ref(false)
const reminders = ref([])
const loadingReminder = ref(false)
const upcoming = ref([])
const loadingUpcoming = ref(false)

// ECharts
const trendRef = ref()
const pieRef = ref()
const urgencyRef = ref()
let trendChart = null
let pieChart = null
let urgencyChart = null

function renderPie(stats) {
  if (!pieRef.value) return
  pieChart = echarts.init(pieRef.value)
  pieChart.setOption({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['42%', '70%'],
      data: [
        { value: stats.available || 0, name: '可领养' },
        { value: stats.adopted || 0, name: '已领养' },
        { value: stats.rescued || 0, name: '已救助' },
        { value: stats.fostered || 0, name: '寄养中' },
      ],
      label: { formatter: '{b}: {c}' },
    }],
    color: ['#2f9e87', '#e6a23c', '#5b8def', '#b6aea3'],
  })
}

function renderTrend(series) {
  if (!trendRef.value) return
  trendChart = echarts.init(trendRef.value)
  trendChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 16, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: series.map(s => s.month), boundaryGap: false },
    yAxis: { type: 'value', minInterval: 1 },
    series: [{
      type: 'line', smooth: true,
      areaStyle: { color: 'rgba(47,158,135,0.14)' },
      lineStyle: { width: 3, color: '#2f9e87' },
      data: series.map(s => s.count), itemStyle: { color: '#2f9e87' },
    }],
  })
}

function renderUrgency(map) {
  if (!urgencyRef.value) return
  urgencyChart = echarts.init(urgencyRef.value)
  const cats = ['低', '中', '高', '紧急']
  const keys = ['low', 'medium', 'high', 'critical']
  const colors = ['#909399', '#5b8def', '#e6a23c', '#e15b56']
  urgencyChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 48, right: 30, top: 16, bottom: 24 },
    xAxis: { type: 'value', minInterval: 1 },
    yAxis: { type: 'category', data: cats },
    series: [{
      type: 'bar',
      barWidth: '52%',
      data: keys.map((k, i) => ({ value: map[k] || 0, itemStyle: { color: colors[i], borderRadius: [0, 6, 6, 0] } })),
      label: { show: true, position: 'right' },
    }],
  })
}

function resizeCharts() {
  trendChart?.resize()
  pieChart?.resize()
  urgencyChart?.resize()
}

const statCards = computed(() => [
  { icon: 'Files', label: '动物总数', value: animalStats.value.total, tone: 'brand' },
  { icon: 'House', label: '可领养', value: animalStats.value.available, tone: 'success' },
  { icon: 'CircleCheck', label: '已领养', value: animalStats.value.adopted, tone: 'warning' },
  { icon: 'Document', label: '待审核领养', value: adoptionPending.value, tone: 'violet' },
  { icon: 'FirstAidKit', label: '待处理求助', value: rescueCount.value, tone: 'danger' },
  { icon: 'User', label: '注册用户', value: userCount.value, tone: 'info' },
])

onMounted(() => {
  request.get('/animals/stats')
    .then(res => { animalStats.value = res.data; nextTick(() => renderPie(res.data)) })
    .catch(() => {})
  request.get('/users', { params: { pageSize: 1 } }).then(res => { userCount.value = res.data?.total || 0 }).catch(() => {})

  request.get('/adoptions/stats/trend')
    .then(res => { nextTick(() => renderTrend(res.data || [])) })
    .catch(() => {})

  request.get('/rescues/stats/urgency')
    .then(res => { nextTick(() => renderUrgency(res.data || {})) })
    .catch(() => {})

  loadingAdopt.value = true
  request.get('/adoptions', { params: { status: 'pending', page: 1, pageSize: 5 } })
    .then(res => { pendingAdoptions.value = res.data?.list || []; adoptionPending.value = res.data?.total || 0 })
    .catch(() => {})
    .finally(() => { loadingAdopt.value = false })

  loadingRescue.value = true
  request.get('/rescues', { params: { status: 'pending', page: 1, pageSize: 5 } })
    .then(res => { pendingRescues.value = res.data?.list || []; rescueCount.value = res.data?.total || 0 })
    .catch(() => {})
    .finally(() => { loadingRescue.value = false })

  loadingReminder.value = true
  request.get('/adoptions/followup-reminders')
    .then(res => { reminders.value = res.data || [] })
    .catch(() => {})
    .finally(() => { loadingReminder.value = false })

  loadingUpcoming.value = true
  request.get('/adoptions/followups/upcoming')
    .then(res => { upcoming.value = res.data || [] })
    .catch(() => {})
    .finally(() => { loadingUpcoming.value = false })

  window.addEventListener('resize', resizeCharts)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts)
  trendChart?.dispose()
  pieChart?.dispose()
  urgencyChart?.dispose()
})
</script>

<style scoped>
.stat-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}
.panel {
  border: none;
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
}
.panel-title {
  font-weight: 700;
  color: var(--text-main);
}
.todo-row, .chart-row { margin-bottom: 4px; }
.chart-row .el-col, .todo-row .el-col { margin-bottom: 16px; }
.chart { height: 300px; }
.chart-sm { height: 260px; }
.card-head { display: flex; justify-content: space-between; align-items: center; }
.reminder-card { margin-bottom: 16px; }
.reminder-sub { color: var(--text-placeholder); font-size: 12px; font-weight: normal; margin-left: 8px; }
.quick-actions { margin-bottom: 8px; }
@media (max-width: 768px) {
  .reminder-sub { display: none; }
}
</style>
