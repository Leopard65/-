<script setup>
import { ref, shallowRef, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { TooltipComponent, GridComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import request from '@/utils/request'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import EmptyState from '@/components/EmptyState.vue'
import MetricCard from '@/components/admin/MetricCard.vue'
import { fmtDate } from '@/utils/format'

echarts.use([BarChart, LineChart, PieChart, TooltipComponent, GridComponent, LegendComponent, CanvasRenderer])

const animalStats = ref({ total: 0, rescued: 0, available: 0, adopted: 0, fostered: 0 })
const userCount = shallowRef(0)
const adoptionPending = shallowRef(0)
const rescueCount = shallowRef(0)
const refreshing = shallowRef(false)
const lastUpdated = shallowRef('')

const pendingAdoptions = ref([])
const pendingRescues = ref([])
const loadingAdopt = shallowRef(false)
const loadingRescue = shallowRef(false)
const reminders = ref([])
const loadingReminder = shallowRef(false)
const upcoming = ref([])
const loadingUpcoming = shallowRef(false)

const trendRef = shallowRef(null)
const pieRef = shallowRef(null)
const urgencyRef = shallowRef(null)
let trendChart = null
let pieChart = null
let urgencyChart = null

const todayLabel = computed(() => (
  new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date())
))

const totalBacklog = computed(() => (
  adoptionPending.value + rescueCount.value + reminders.value.length
))

const taskCards = computed(() => [
  {
    key: 'adoption',
    icon: 'Document',
    label: '领养待审核',
    value: adoptionPending.value,
    desc: '核验申请材料与联系方式',
    path: '/admin/adoptions',
    tone: 'violet',
    tagType: adoptionPending.value ? 'warning' : 'success',
    badge: adoptionPending.value ? '待处理' : '正常',
  },
  {
    key: 'rescue',
    icon: 'FirstAidKit',
    label: '救助待处理',
    value: rescueCount.value,
    desc: '关注紧急地点与上报人',
    path: '/admin/rescues',
    tone: 'danger',
    tagType: rescueCount.value ? 'danger' : 'success',
    badge: rescueCount.value ? '优先' : '正常',
  },
  {
    key: 'followup',
    icon: 'Bell',
    label: '需回访',
    value: reminders.value.length,
    desc: '满 30 天未回访的领养',
    path: '/admin/adoptions',
    tone: 'warning',
    tagType: reminders.value.length ? 'warning' : 'success',
    badge: reminders.value.length ? '待安排' : '正常',
  },
  {
    key: 'upcoming',
    icon: 'Calendar',
    label: '近期排期',
    value: upcoming.value.length,
    desc: '未来 30 天内回访安排',
    path: '/admin/adoptions',
    tone: 'success',
    tagType: upcoming.value.length ? 'success' : 'info',
    badge: upcoming.value.length ? '已排期' : '暂无',
  },
])

const primaryTask = computed(() => (
  taskCards.value.find(item => Number(item.value) > 0) || taskCards.value[0]
))

const statCards = computed(() => [
  { icon: 'Files', label: '动物总数', value: animalStats.value.total, tone: 'brand', meta: '全部在册档案' },
  { icon: 'House', label: '可领养', value: animalStats.value.available, tone: 'success', meta: '可进入领养流程' },
  { icon: 'CircleCheck', label: '已领养', value: animalStats.value.adopted, tone: 'warning', meta: '已完成或通过' },
  { icon: 'Document', label: '待审核领养', value: adoptionPending.value, tone: 'violet', meta: '需要管理员处理' },
  { icon: 'FirstAidKit', label: '待处理求助', value: rescueCount.value, tone: 'danger', meta: '待联系与跟进' },
  { icon: 'User', label: '注册用户', value: userCount.value, tone: 'info', meta: '平台用户规模' },
])

const quickActions = [
  { icon: 'Plus', label: '录入动物', desc: '新增救助档案', path: '/admin/animals/add' },
  { icon: 'DocumentChecked', label: '审核领养', desc: '处理申请状态', path: '/admin/adoptions' },
  { icon: 'FirstAidKit', label: '处理求助', desc: '更新救助进展', path: '/admin/rescues' },
  { icon: 'ChatLineRound', label: '发布公告', desc: '维护前台内容', path: '/admin/announcements' },
]

function renderPie(stats) {
  if (!pieRef.value) return
  if (!pieChart) pieChart = echarts.init(pieRef.value)
  pieChart.setOption({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, itemGap: 14 },
    series: [{
      type: 'pie',
      radius: ['44%', '70%'],
      center: ['50%', '44%'],
      data: [
        { value: stats.available || 0, name: '可领养' },
        { value: stats.adopted || 0, name: '已领养' },
        { value: stats.rescued || 0, name: '已救助' },
        { value: stats.fostered || 0, name: '寄养中' },
      ],
      label: { formatter: '{b}: {c}' },
    }],
    color: ['#2f9e87', '#e6a23c', '#5b8def', '#b6aea3'],
  }, true)
}

function renderTrend(series) {
  if (!trendRef.value) return
  if (!trendChart) trendChart = echarts.init(trendRef.value)
  trendChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 42, right: 18, top: 26, bottom: 34 },
    xAxis: {
      type: 'category',
      data: series.map(s => s.month),
      boundaryGap: false,
      axisTick: { show: false },
    },
    yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: '#ece7df' } } },
    series: [{
      type: 'line',
      smooth: true,
      symbolSize: 7,
      areaStyle: { color: 'rgba(47,158,135,0.14)' },
      lineStyle: { width: 3, color: '#2f9e87' },
      data: series.map(s => s.count),
      itemStyle: { color: '#2f9e87' },
    }],
  }, true)
}

function renderUrgency(map) {
  if (!urgencyRef.value) return
  if (!urgencyChart) urgencyChart = echarts.init(urgencyRef.value)
  const cats = ['低', '中', '高', '紧急']
  const keys = ['low', 'medium', 'high', 'critical']
  const colors = ['#909399', '#5b8def', '#e6a23c', '#e15b56']
  urgencyChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 46, right: 34, top: 18, bottom: 26 },
    xAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: '#ece7df' } } },
    yAxis: { type: 'category', data: cats, axisTick: { show: false } },
    series: [{
      type: 'bar',
      barWidth: '50%',
      data: keys.map((k, i) => ({
        value: map[k] || 0,
        itemStyle: { color: colors[i], borderRadius: [0, 6, 6, 0] },
      })),
      label: { show: true, position: 'right' },
    }],
  }, true)
}

function resizeCharts() {
  trendChart?.resize()
  pieChart?.resize()
  urgencyChart?.resize()
}

async function loadAnimalStats() {
  const res = await request.get('/animals/stats')
  animalStats.value = { ...animalStats.value, ...(res.data || {}) }
  await nextTick()
  renderPie(animalStats.value)
}

async function loadUserCount() {
  const res = await request.get('/users', { params: { pageSize: 1 } })
  userCount.value = res.data?.total || 0
}

async function loadTrend() {
  const res = await request.get('/adoptions/stats/trend')
  await nextTick()
  renderTrend(res.data || [])
}

async function loadUrgency() {
  const res = await request.get('/rescues/stats/urgency')
  await nextTick()
  renderUrgency(res.data || {})
}

async function loadPendingAdoptions() {
  loadingAdopt.value = true
  try {
    const res = await request.get('/adoptions', { params: { status: 'pending', page: 1, pageSize: 5 } })
    pendingAdoptions.value = res.data?.list || []
    adoptionPending.value = res.data?.total || 0
  } finally {
    loadingAdopt.value = false
  }
}

async function loadPendingRescues() {
  loadingRescue.value = true
  try {
    const res = await request.get('/rescues', { params: { status: 'pending', page: 1, pageSize: 5 } })
    pendingRescues.value = res.data?.list || []
    rescueCount.value = res.data?.total || 0
  } finally {
    loadingRescue.value = false
  }
}

async function loadReminders() {
  loadingReminder.value = true
  try {
    const res = await request.get('/adoptions/followup-reminders')
    reminders.value = res.data || []
  } finally {
    loadingReminder.value = false
  }
}

async function loadUpcoming() {
  loadingUpcoming.value = true
  try {
    const res = await request.get('/adoptions/followups/upcoming')
    upcoming.value = res.data || []
  } finally {
    loadingUpcoming.value = false
  }
}

async function loadDashboard() {
  refreshing.value = true
  try {
    await Promise.allSettled([
      loadAnimalStats(),
      loadUserCount(),
      loadTrend(),
      loadUrgency(),
      loadPendingAdoptions(),
      loadPendingRescues(),
      loadReminders(),
      loadUpcoming(),
    ])
    lastUpdated.value = new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date())
    await nextTick()
    resizeCharts()
  } finally {
    refreshing.value = false
  }
}

onMounted(() => {
  loadDashboard()
  window.addEventListener('resize', resizeCharts)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts)
  trendChart?.dispose()
  pieChart?.dispose()
  urgencyChart?.dispose()
})
</script>

<template>
  <div class="dashboard admin-view">
    <PageHeader title="数据看板" subtitle="救助、领养、回访与内容运营概览">
      <el-button :loading="refreshing" @click="loadDashboard">
        <el-icon class="button-icon"><Refresh /></el-icon>
        刷新数据
      </el-button>
    </PageHeader>

    <section class="ops-hero" aria-label="后台运营处理台">
      <div class="ops-main">
        <div class="ops-kicker">今日处理台 · {{ todayLabel }}</div>
        <h3 class="ops-title">优先处理 {{ totalBacklog }} 项关键事项</h3>
        <p class="ops-copy">
          将领养审核、救助上报和回访提醒集中到一个视图，先处理有时效压力的事项，再进入档案维护和内容发布。
        </p>
        <div class="ops-actions">
          <el-button type="primary" @click="$router.push(primaryTask.path)">
            处理{{ primaryTask.label }}
          </el-button>
          <el-button @click="$router.push('/admin/animals')">查看动物档案</el-button>
        </div>
        <div class="ops-meta">
          <span>最近刷新：{{ lastUpdated || '正在获取' }}</span>
          <span>可领养档案：{{ animalStats.available || 0 }}</span>
        </div>
      </div>

      <div class="ops-priority" aria-label="待办优先级">
        <button
          v-for="task in taskCards"
          :key="task.key"
          type="button"
          class="priority-card"
          :class="`tone-${task.tone}`"
          @click="$router.push(task.path)"
        >
          <span class="priority-icon">
            <el-icon><component :is="task.icon" /></el-icon>
          </span>
          <span class="priority-body">
            <span class="priority-label">{{ task.label }}</span>
            <span class="priority-desc">{{ task.desc }}</span>
          </span>
          <strong class="priority-value">{{ task.value }}</strong>
          <el-tag :type="task.tagType" size="small" round>{{ task.badge }}</el-tag>
        </button>
      </div>

      <figure class="ops-visual">
        <img src="/admin/rescue-admin-hero.jpg" alt="等待领养的动物照片" loading="eager">
        <div class="ops-visual__shade"></div>
      </figure>
    </section>

    <div class="stat-cards">
      <MetricCard
        v-for="item in statCards"
        :key="item.label"
        :label="item.label"
        :value="item.value"
        :tone="item.tone"
        :meta="item.meta"
      >
        <template #icon><component :is="item.icon" /></template>
      </MetricCard>
    </div>

    <section class="chart-grid dashboard-section" aria-label="运营图表">
      <el-card shadow="never" class="panel chart-panel chart-panel--wide">
        <template #header>
          <div class="panel-head">
            <span class="panel-title">近 6 个月领养申请趋势</span>
            <span class="panel-caption">观察申请峰值与审核压力</span>
          </div>
        </template>
        <div ref="trendRef" class="chart" role="img" aria-label="近 6 个月领养申请趋势图"></div>
      </el-card>

      <el-card shadow="never" class="panel chart-panel">
        <template #header>
          <div class="panel-head">
            <span class="panel-title">动物状态分布</span>
            <span class="panel-caption">档案状态占比</span>
          </div>
        </template>
        <div ref="pieRef" class="chart" role="img" aria-label="动物状态分布图"></div>
      </el-card>
    </section>

    <section class="chart-grid chart-grid--single dashboard-section" aria-label="救助紧急程度">
      <el-card shadow="never" class="panel chart-panel">
        <template #header>
          <div class="panel-head">
            <span class="panel-title">救助紧急程度分布</span>
            <span class="panel-caption">帮助判断处理优先级</span>
          </div>
        </template>
        <div ref="urgencyRef" class="chart chart-sm" role="img" aria-label="救助紧急程度分布图"></div>
      </el-card>
    </section>

    <section class="todo-grid dashboard-section" aria-label="待处理事项">
      <el-card shadow="never" class="panel table-panel">
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

      <el-card shadow="never" class="panel table-panel">
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
    </section>

    <section class="reminder-grid dashboard-section" aria-label="回访提醒">
      <el-card class="panel table-panel" shadow="never">
        <template #header>
          <div class="card-head">
            <span class="panel-title">
              领养回访提醒（{{ reminders.length }}）
              <span class="reminder-sub">满 30 天且尚无回访记录</span>
            </span>
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

      <el-card class="panel table-panel" shadow="never">
        <template #header>
          <div class="card-head">
            <span class="panel-title">
              近期计划回访（{{ upcoming.length }}）
              <span class="reminder-sub">未来 30 天内已排期</span>
            </span>
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
    </section>

    <section class="quick-actions panel dashboard-section" aria-label="快捷操作">
      <div class="quick-head">
        <span class="panel-title">快捷操作</span>
        <span class="panel-caption">常用后台入口</span>
      </div>
      <div class="quick-action-grid">
        <button
          v-for="action in quickActions"
          :key="action.path"
          type="button"
          class="quick-action"
          @click="$router.push(action.path)"
        >
          <span class="quick-action__icon">
            <el-icon><component :is="action.icon" /></el-icon>
          </span>
          <span class="quick-action__body">
            <span class="quick-action__label">{{ action.label }}</span>
            <span class="quick-action__desc">{{ action.desc }}</span>
          </span>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.button-icon {
  margin-right: 4px;
}

.ops-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(310px, 420px);
  grid-template-areas:
    "main visual"
    "priority visual";
  gap: 18px;
  margin-bottom: 20px;
  padding: 22px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  background:
    linear-gradient(135deg, rgba(47, 158, 135, 0.14), transparent 44%),
    linear-gradient(110deg, var(--bg-card), var(--brand-lighter));
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.ops-main {
  grid-area: main;
  position: relative;
  z-index: 1;
  min-width: 0;
}

.ops-kicker {
  color: var(--brand-hover);
  font-size: 13px;
  font-weight: 700;
}

.ops-title {
  margin-top: 8px;
  font-size: clamp(24px, 3vw, 34px);
  line-height: 1.22;
  letter-spacing: 0;
}

.ops-copy {
  max-width: 680px;
  margin-top: 10px;
  color: var(--text-regular);
  font-size: 14px;
}

.ops-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.ops-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-top: 14px;
  color: var(--text-secondary);
  font-size: 12px;
}

.ops-priority {
  grid-area: priority;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  position: relative;
  z-index: 1;
}

.priority-card {
  min-height: 92px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  background: var(--admin-priority-bg, rgba(255, 255, 255, 0.76));
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  grid-template-areas:
    "icon body value"
    "icon body tag";
  gap: 6px 10px;
  align-items: center;
  padding: 12px;
  text-align: left;
  color: var(--text-main);
  cursor: pointer;
  transition:
    transform var(--dur-fast) var(--ease),
    box-shadow var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease);
}

.priority-card:hover,
.priority-card:focus-visible {
  transform: translateY(-2px);
  border-color: var(--el-color-primary-light-7);
  box-shadow: var(--shadow-sm);
  outline: none;
}

.priority-icon {
  grid-area: icon;
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--brand-light);
  color: var(--brand);
  font-size: 20px;
}

.priority-body {
  grid-area: body;
  min-width: 0;
}

.priority-label {
  display: block;
  font-weight: 700;
  color: var(--text-main);
}

.priority-desc {
  display: block;
  margin-top: 2px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.4;
}

.priority-value {
  grid-area: value;
  justify-self: end;
  color: var(--text-main);
  font-size: 24px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.priority-card .el-tag {
  grid-area: tag;
  justify-self: end;
}

.priority-card.tone-danger .priority-icon { background: var(--tone-danger-bg); color: var(--danger); }
.priority-card.tone-warning .priority-icon { background: var(--tone-warning-bg); color: var(--warning); }
.priority-card.tone-success .priority-icon { background: var(--tone-success-bg); color: var(--success); }
.priority-card.tone-violet .priority-icon { background: var(--tone-violet-bg); color: var(--tone-violet); }

.ops-visual {
  grid-area: visual;
  position: relative;
  min-height: 300px;
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow);
  background: var(--bg-soft);
}

.ops-visual img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  object-position: center 42%;
}

.ops-visual__shade {
  position: absolute;
  inset: auto 0 0;
  height: 42%;
  background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.24));
  pointer-events: none;
}

.stat-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 16px;
  margin-bottom: 18px;
}

.dashboard-section {
  margin-bottom: 16px;
}

.panel {
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  background: var(--bg-card);
}

.panel :deep(.el-card__header) {
  padding: 15px 18px;
  border-bottom-color: var(--border-light);
}

.panel :deep(.el-card__body) {
  padding: 16px 18px 18px;
}

.panel-head,
.card-head,
.quick-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.panel-title {
  font-weight: 700;
  color: var(--text-main);
}

.panel-caption {
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 400;
}

.chart-grid,
.todo-grid,
.reminder-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.95fr);
  gap: 16px;
}

.chart-grid--single {
  grid-template-columns: 1fr;
}

.chart {
  height: 300px;
}

.chart-sm {
  height: 250px;
}

.table-panel {
  min-width: 0;
  overflow: hidden;
}

.reminder-sub {
  color: var(--text-placeholder);
  font-size: 12px;
  font-weight: normal;
  margin-left: 8px;
}

.quick-actions {
  padding: 16px 18px 18px;
}

.quick-action-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.quick-action {
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  background: var(--bg-card);
  padding: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  color: var(--text-main);
  cursor: pointer;
  transition:
    background var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease),
    transform var(--dur-fast) var(--ease);
}

.quick-action:hover,
.quick-action:focus-visible {
  background: var(--brand-lighter);
  border-color: var(--el-color-primary-light-7);
  transform: translateY(-2px);
  outline: none;
}

.quick-action__icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  color: var(--brand);
  background: var(--brand-light);
  font-size: 18px;
}

.quick-action__body {
  min-width: 0;
}

.quick-action__label {
  display: block;
  font-weight: 700;
}

.quick-action__desc {
  display: block;
  margin-top: 2px;
  color: var(--text-secondary);
  font-size: 12px;
}

@media (max-width: 1180px) {
  .ops-hero {
    grid-template-columns: 1fr;
    grid-template-areas:
      "main"
      "priority"
      "visual";
  }

  .ops-visual {
    min-height: 220px;
  }

  .chart-grid,
  .todo-grid,
  .reminder-grid {
    grid-template-columns: 1fr;
  }

  .quick-action-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .ops-hero {
    padding: 16px;
    gap: 14px;
    border-radius: var(--radius);
  }

  .ops-title {
    font-size: 23px;
  }

  .ops-priority,
  .stat-cards,
  .quick-action-grid {
    grid-template-columns: 1fr;
  }

  .ops-visual {
    min-height: 170px;
  }

  .panel :deep(.el-card__header),
  .panel :deep(.el-card__body),
  .quick-actions {
    padding: 14px;
  }

  .panel-head,
  .card-head,
  .quick-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .reminder-sub,
  .panel-caption {
    display: none;
  }

  .chart {
    height: 260px;
  }

  .chart-sm {
    height: 220px;
  }
}

@media (max-width: 420px) {
  .priority-card {
    grid-template-columns: 38px minmax(0, 1fr);
    grid-template-areas:
      "icon body"
      "value tag";
  }

  .priority-value {
    justify-self: start;
    padding-left: 4px;
  }

  .priority-card .el-tag {
    justify-self: end;
  }
}

@media (prefers-reduced-motion: reduce) {
  .priority-card,
  .quick-action {
    transition: none;
  }

  .priority-card:hover,
  .priority-card:focus-visible,
  .quick-action:hover,
  .quick-action:focus-visible {
    transform: none;
  }
}
</style>
