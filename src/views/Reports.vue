<template>
  <div>
    <PageHeader title="报表统计" description="销售、库存、利润与会员多维分析" />
    <el-tabs v-model="activeTab" @tab-change="handleTabChange" class="report-tabs">
      <!-- 销售报表 -->
      <el-tab-pane label="销售报表" name="sales">
        <div class="metric-grid">
          <MetricCard label="净销售额" :value="formatMoney(salesSummary.netAmount)" tone="primary">
            <template #icon><el-icon><TrendCharts /></el-icon></template>
          </MetricCard>
          <MetricCard label="总订单数" :value="formatNumber(salesSummary.totalOrders)" tone="success">
            <template #icon><el-icon><Tickets /></el-icon></template>
          </MetricCard>
          <MetricCard label="日均销售额" :value="formatMoney(salesSummary.avgDailyAmount)" tone="warning">
            <template #icon><el-icon><Calendar /></el-icon></template>
          </MetricCard>
          <MetricCard label="退款合计" :value="formatMoney(salesSummary.totalRefund)" tone="danger">
            <template #icon><el-icon><RefreshLeft /></el-icon></template>
          </MetricCard>
        </div>

        <SectionPanel title="销售趋势">
          <template #actions>
            <el-date-picker v-model="salesDateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" @change="loadSalesData" />
          </template>
          <div v-show="salesData.length" ref="salesChartRef" class="chart"></div>
          <EmptyState v-if="!salesData.length" description="所选区间暂无销售数据" />
        </SectionPanel>

        <el-row :gutter="20" style="margin-top:20px">
          <el-col :span="8">
            <SectionPanel title="商品销售排行 TOP10">
              <el-table :data="productRank" stripe size="small" max-height="320">
                <el-table-column type="index" label="#" width="46" />
                <el-table-column prop="name" label="商品" min-width="100" show-overflow-tooltip />
                <el-table-column prop="total_amount" label="金额" width="100" align="right">
                  <template #default="{ row }"><span class="num amount">{{ formatMoney(row.total_amount) }}</span></template>
                </el-table-column>
              </el-table>
              <EmptyState v-if="!productRank.length" description="暂无数据" />
            </SectionPanel>
          </el-col>
          <el-col :span="8">
            <SectionPanel title="分类销售占比">
              <div v-show="categorySales.length" ref="categoryChartRef" class="chart"></div>
              <EmptyState v-if="!categorySales.length" description="暂无数据" />
            </SectionPanel>
          </el-col>
          <el-col :span="8">
            <SectionPanel title="支付方式占比">
              <div v-show="paymentStats.length" ref="paymentChartRef" class="chart"></div>
              <EmptyState v-if="!paymentStats.length" description="暂无数据" />
            </SectionPanel>
          </el-col>
        </el-row>
      </el-tab-pane>

      <!-- 库存报表 -->
      <el-tab-pane label="库存报表" name="inventory">
        <el-row :gutter="20">
          <el-col :span="12">
            <SectionPanel title="库存预警商品">
              <el-table :data="inventoryWarning" stripe size="small" max-height="400">
                <el-table-column prop="name" label="商品" min-width="120" />
                <el-table-column prop="category_name" label="分类" width="100" />
                <el-table-column prop="stock" label="库存" width="80" align="center">
                  <template #default="{ row }">
                    <el-tag type="danger" size="small">{{ row.stock }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="min_stock" label="预警值" width="80" align="right" />
              </el-table>
              <EmptyState v-if="!inventoryWarning.length" description="库存充足，暂无预警" />
            </SectionPanel>
          </el-col>
          <el-col :span="12">
            <SectionPanel title="库存价值统计">
              <el-table :data="inventoryValue" stripe size="small" max-height="400">
                <el-table-column prop="category_name" label="分类" min-width="100" />
                <el-table-column prop="product_count" label="商品数" width="76" align="right" />
                <el-table-column prop="total_stock" label="总库存" width="76" align="right" />
                <el-table-column prop="cost_value" label="成本价值" width="110" align="right">
                  <template #default="{ row }"><span class="num">{{ formatMoney(row.cost_value) }}</span></template>
                </el-table-column>
                <el-table-column prop="retail_value" label="零售价值" width="110" align="right">
                  <template #default="{ row }"><span class="num amount">{{ formatMoney(row.retail_value) }}</span></template>
                </el-table-column>
              </el-table>
              <EmptyState v-if="!inventoryValue.length" description="暂无数据" />
            </SectionPanel>
          </el-col>
        </el-row>
      </el-tab-pane>

      <!-- 利润分析 -->
      <el-tab-pane label="利润分析" name="profit">
        <SectionPanel title="毛利润趋势">
          <template #actions>
            <el-date-picker v-model="profitDateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" @change="loadProfitData" />
          </template>
          <div v-show="profitData.length" ref="profitChartRef" class="chart"></div>
          <EmptyState v-if="!profitData.length" description="所选区间暂无利润数据" />
        </SectionPanel>

        <SectionPanel title="月度利润汇总" style="margin-top:20px">
          <el-table :data="monthlyProfit" stripe>
            <el-table-column prop="month" label="月份" width="120" />
            <el-table-column prop="revenue" label="收入" min-width="120" align="right">
              <template #default="{ row }"><span class="num">{{ formatMoney(row.revenue) }}</span></template>
            </el-table-column>
            <el-table-column prop="cost" label="成本" min-width="120" align="right">
              <template #default="{ row }"><span class="num">{{ formatMoney(row.cost) }}</span></template>
            </el-table-column>
            <el-table-column prop="gross_profit" label="毛利润" min-width="120" align="right">
              <template #default="{ row }">
                <span class="num" :class="row.gross_profit >= 0 ? 'amount--success' : 'amount--danger'">{{ formatMoney(row.gross_profit) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="profit_rate" label="毛利率" width="100" align="right">
              <template #default="{ row }">{{ row.profit_rate }}%</template>
            </el-table-column>
          </el-table>
          <EmptyState v-if="!monthlyProfit.length" description="暂无数据" />
        </SectionPanel>
      </el-tab-pane>

      <!-- 会员分析 -->
      <el-tab-pane label="会员分析" name="members">
        <el-row :gutter="20">
          <el-col :span="14">
            <SectionPanel title="会员消费排行 TOP10">
              <el-table :data="memberRanking" stripe size="small" max-height="360">
                <el-table-column type="index" label="排名" width="60" />
                <el-table-column prop="name" label="会员" min-width="100" />
                <el-table-column prop="level" label="等级" width="110">
                  <template #default="{ row }"><StatusTag preset="memberLevel" :value="row.level" size="small" /></template>
                </el-table-column>
                <el-table-column prop="order_count" label="订单数" width="80" align="right" />
                <el-table-column prop="total_spent" label="累计消费" width="120" align="right">
                  <template #default="{ row }"><span class="num amount">{{ formatMoney(row.total_spent) }}</span></template>
                </el-table-column>
                <el-table-column prop="points" label="积分" width="90" align="right" />
              </el-table>
              <EmptyState v-if="!memberRanking.length" description="暂无会员数据" />
            </SectionPanel>
          </el-col>
          <el-col :span="10">
            <SectionPanel title="会员等级分布">
              <div v-show="levelDist.length" ref="levelChartRef" class="chart chart--tall"></div>
              <EmptyState v-if="!levelDist.length" description="暂无数据" />
            </SectionPanel>
          </el-col>
        </el-row>

        <SectionPanel title="复购分析" style="margin-top:20px">
          <el-row :gutter="20">
            <el-col :span="8">
              <el-descriptions :column="1" border>
                <el-descriptions-item label="购买会员数">{{ repurchase.totalBuyers || 0 }}</el-descriptions-item>
                <el-descriptions-item label="复购会员数">{{ repurchase.repeatBuyers || 0 }}</el-descriptions-item>
                <el-descriptions-item label="复购率">
                  <span style="font-weight:bold;color:var(--color-primary)">{{ repurchase.repurchaseRate || 0 }}%</span>
                </el-descriptions-item>
              </el-descriptions>
            </el-col>
            <el-col :span="16">
              <el-table :data="repurchase.top || []" stripe size="small" max-height="240">
                <el-table-column type="index" label="排名" width="60" />
                <el-table-column prop="name" label="会员" min-width="100" />
                <el-table-column prop="order_count" label="订单数" width="100" align="right" />
                <el-table-column prop="total" label="累计消费" width="120" align="right">
                  <template #default="{ row }"><span class="num amount">{{ formatMoney(row.total) }}</span></template>
                </el-table-column>
              </el-table>
              <EmptyState v-if="!repurchase.top?.length" description="暂无复购会员" />
            </el-col>
          </el-row>
        </SectionPanel>

        <SectionPanel title="RFM 客户分层" style="margin-top:20px">
          <template #actions>
            <span style="font-size:12px;color:var(--text-secondary)">价值分界(中位数) {{ formatMoney(rfm.value_split) }} · 活跃门槛 {{ rfm.active_days || 14 }} 天</span>
          </template>
          <el-row :gutter="16" style="margin-bottom:16px">
            <el-col :span="6" v-for="seg in rfm.segments || []" :key="seg.segment">
              <div class="rfm-tile" :style="{ borderTopColor: segColor(seg.segment) }">
                <div class="rfm-seg">{{ seg.segment }}</div>
                <div class="rfm-count num">{{ seg.count }} <small>人</small></div>
                <div class="rfm-total">消费 {{ formatMoney(seg.total) }}</div>
              </div>
            </el-col>
          </el-row>
          <el-table :data="rfm.members || []" stripe size="small" max-height="320">
            <el-table-column type="index" label="#" width="50" />
            <el-table-column prop="name" label="会员" min-width="100" />
            <el-table-column label="分层" width="110">
              <template #default="{ row }">
                <el-tag :type="segType(row.segment)" effect="light">{{ row.segment }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="最近消费(R)" width="120" align="right">
              <template #default="{ row }">{{ row.last_days }} 天前</template>
            </el-table-column>
            <el-table-column prop="orders" label="订单数(F)" width="100" align="right" />
            <el-table-column prop="total" label="累计消费(M)" width="130" align="right">
              <template #default="{ row }"><span class="num amount">{{ formatMoney(row.total) }}</span></template>
            </el-table-column>
          </el-table>
          <EmptyState v-if="!rfm.members?.length" description="暂无会员消费数据" />
        </SectionPanel>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
// echarts 按需引入（仅打包用到的图表/组件，显著减小体积）
import * as echarts from 'echarts/core'
import { LineChart, BarChart, PieChart } from 'echarts/charts'
import { TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { TrendCharts, Tickets, Calendar, RefreshLeft } from '@element-plus/icons-vue'
import { reportsApi } from '@/api'
import { formatMoney, formatNumber } from '@/utils/format'
import { CHART_PALETTE, GRID, TOOLTIP, SPLIT_LINE, AXIS_LINE } from '@/utils/chart'
import PageHeader from '@/components/PageHeader.vue'
import SectionPanel from '@/components/SectionPanel.vue'
import MetricCard from '@/components/MetricCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import StatusTag from '@/components/StatusTag.vue'

echarts.use([LineChart, BarChart, PieChart, TooltipComponent, LegendComponent, GridComponent, CanvasRenderer])

const activeTab = ref('sales')
const salesDateRange = ref(null)
const profitDateRange = ref(null)

// 销售数据
const salesData = ref([])
const productRank = ref([])
const categorySales = ref([])
const paymentStats = ref([])
const salesSummary = ref({})

// 库存数据
const inventoryWarning = ref([])
const inventoryValue = ref([])

// 利润数据
const profitData = ref([])
const monthlyProfit = ref([])

// 会员分析数据
const memberRanking = ref([])
const levelDist = ref([])
const repurchase = ref({})
const rfm = ref({})

const segType = (seg) => ({ 核心客户: 'success', 潜力客户: 'warning', 流失预警: 'danger', 沉睡客户: 'info' }[seg] || 'info')
const segColor = (seg) => ({ 核心客户: '#2faa6e', 潜力客户: '#e6932e', 流失预警: '#e0564f', 沉睡客户: '#86909c' }[seg] || '#86909c')
const payText = (p) => ({ cash: '现金', wechat: '微信', alipay: '支付宝' }[p] || p || '其他')

// 图表引用
const salesChartRef = ref(null)
const categoryChartRef = ref(null)
const paymentChartRef = ref(null)
const profitChartRef = ref(null)
const levelChartRef = ref(null)

let salesChart = null
let categoryChart = null
let paymentChart = null
let profitChart = null
let levelChart = null

// 加载销售数据
const loadSalesData = async () => {
  try {
    const params = {}
    if (salesDateRange.value) {
      params.start_date = salesDateRange.value[0]
      params.end_date = salesDateRange.value[1]
    }

    const [daily, products, categories, payments] = await Promise.all([
      reportsApi.getDailySales(params),
      reportsApi.getProductSalesRank({ ...params, limit: 10 }),
      reportsApi.getCategorySales(params),
      reportsApi.getPaymentStats(params)
    ])

    salesData.value = daily
    productRank.value = products
    categorySales.value = categories
    paymentStats.value = payments

    // 计算汇总（含退款与净销售额）
    const grossAmount = daily.reduce((s, d) => s + (d.total_amount || 0), 0)
    const totalRefund = daily.reduce((s, d) => s + (d.refund_amount || 0), 0)
    salesSummary.value = {
      totalAmount: grossAmount,
      totalRefund,
      netAmount: grossAmount - totalRefund,
      totalOrders: daily.reduce((s, d) => s + (d.order_count || 0), 0),
      avgDailyAmount: daily.length > 0 ? grossAmount / daily.length : 0
    }

    nextTick(() => {
      renderSalesChart()
      renderCategoryChart()
      renderPaymentChart()
    })
  } catch (e) {
    console.error('加载销售数据失败:', e)
  }
}

// 加载库存数据
const loadInventoryData = async () => {
  try {
    const [warning, value] = await Promise.all([
      reportsApi.getInventoryWarning(),
      reportsApi.getInventoryValue()
    ])
    inventoryWarning.value = warning
    inventoryValue.value = value
  } catch (e) {
    console.error('加载库存数据失败:', e)
  }
}

// 加载利润数据
const loadProfitData = async () => {
  try {
    const params = {}
    if (profitDateRange.value) {
      params.start_date = profitDateRange.value[0]
      params.end_date = profitDateRange.value[1]
    }

    const [gross, monthly] = await Promise.all([
      reportsApi.getGrossProfit(params),
      reportsApi.getMonthlyProfit()
    ])

    profitData.value = gross
    monthlyProfit.value = monthly

    nextTick(() => renderProfitChart())
  } catch (e) {
    console.error('加载利润数据失败:', e)
  }
}

// 渲染销售图表
const renderSalesChart = () => {
  if (!salesChartRef.value) return
  if (!salesChart) salesChart = echarts.init(salesChartRef.value)

  salesChart.setOption({
    color: CHART_PALETTE,
    tooltip: { ...TOOLTIP, trigger: 'axis' },
    legend: { data: ['销售额', '净销售额', '订单数'], top: 0 },
    grid: GRID,
    xAxis: { type: 'category', data: salesData.value.map(d => d.date), axisLine: AXIS_LINE },
    yAxis: { type: 'value', splitLine: SPLIT_LINE },
    series: [
      { name: '销售额', type: 'line', smooth: true, showSymbol: false, data: salesData.value.map(d => d.total_amount), areaStyle: { opacity: 0.16 }, lineStyle: { width: 3 } },
      { name: '净销售额', type: 'line', smooth: true, showSymbol: false, data: salesData.value.map(d => d.net_amount) },
      { name: '订单数', type: 'bar', barWidth: '40%', data: salesData.value.map(d => d.order_count) }
    ]
  })
}

// 渲染分类占比环图
const renderCategoryChart = () => {
  if (!categoryChartRef.value) return
  if (!categoryChart) categoryChart = echarts.init(categoryChartRef.value)

  categoryChart.setOption({
    color: CHART_PALETTE,
    tooltip: { ...TOOLTIP, trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { type: 'scroll', bottom: 0, textStyle: { color: '#4e5969' } },
    series: [{
      type: 'pie',
      radius: ['40%', '64%'],
      center: ['50%', '44%'],
      avoidLabelOverlap: true,
      label: { show: false },
      data: categorySales.value.map(c => ({ name: c.category_name, value: c.total_amount }))
    }]
  })
}

// 渲染支付方式占比环图
const renderPaymentChart = () => {
  if (!paymentChartRef.value) return
  if (!paymentChart) paymentChart = echarts.init(paymentChartRef.value)

  paymentChart.setOption({
    color: CHART_PALETTE,
    tooltip: { ...TOOLTIP, trigger: 'item', formatter: '{b}: {c} 元 ({d}%)' },
    legend: { bottom: 0, textStyle: { color: '#4e5969' } },
    series: [{
      type: 'pie',
      radius: ['40%', '64%'],
      center: ['50%', '44%'],
      data: paymentStats.value.map(p => ({ name: payText(p.payment), value: p.total_amount }))
    }]
  })
}

// 渲染利润图表
const renderProfitChart = () => {
  if (!profitChartRef.value) return
  if (!profitChart) profitChart = echarts.init(profitChartRef.value)

  profitChart.setOption({
    color: CHART_PALETTE,
    tooltip: { ...TOOLTIP, trigger: 'axis' },
    legend: { data: ['收入', '成本', '毛利润'], top: 0 },
    grid: GRID,
    xAxis: { type: 'category', data: profitData.value.map(d => d.date), axisLine: AXIS_LINE },
    yAxis: { type: 'value', splitLine: SPLIT_LINE },
    series: [
      { name: '收入', type: 'line', smooth: true, showSymbol: false, data: profitData.value.map(d => d.revenue) },
      { name: '成本', type: 'line', smooth: true, showSymbol: false, data: profitData.value.map(d => d.cost) },
      { name: '毛利润', type: 'line', smooth: true, showSymbol: false, data: profitData.value.map(d => d.gross_profit) }
    ]
  })
}

// 加载会员分析数据
const loadMemberData = async () => {
  try {
    const [ranking, levels, repurch, rfmRes] = await Promise.all([
      reportsApi.getMemberRanking({ limit: 10 }),
      reportsApi.getMemberLevelDist(),
      reportsApi.getMemberRepurchase(),
      reportsApi.getMemberRfm()
    ])
    memberRanking.value = ranking
    levelDist.value = levels
    repurchase.value = repurch
    rfm.value = rfmRes
    nextTick(() => renderLevelChart())
  } catch (e) {
    console.error('加载会员分析失败:', e)
  }
}

// 渲染会员等级分布饼图
const renderLevelChart = () => {
  if (!levelChartRef.value) return
  if (!levelChart) levelChart = echarts.init(levelChartRef.value)

  levelChart.setOption({
    color: CHART_PALETTE,
    tooltip: { ...TOOLTIP, trigger: 'item', formatter: '{b}: {c} 人 ({d}%)' },
    legend: { bottom: 0, textStyle: { color: '#4e5969' } },
    series: [{
      type: 'pie',
      radius: ['40%', '65%'],
      center: ['50%', '44%'],
      data: levelDist.value.map(l => ({ name: l.level, value: l.count }))
    }]
  })
}

const handleTabChange = (tab) => {
  if (tab === 'sales') loadSalesData()
  else if (tab === 'inventory') loadInventoryData()
  else if (tab === 'profit') loadProfitData()
  else if (tab === 'members') loadMemberData()
}

const onResize = () => { salesChart?.resize(); categoryChart?.resize(); paymentChart?.resize(); profitChart?.resize(); levelChart?.resize() }

onMounted(() => {
  loadSalesData()
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  salesChart?.dispose(); categoryChart?.dispose(); paymentChart?.dispose(); profitChart?.dispose(); levelChart?.dispose()
  salesChart = categoryChart = paymentChart = profitChart = levelChart = null
})
</script>

<style scoped>
.report-tabs :deep(.el-tabs__item) { font-size: 15px; }
/* 图表容器统一高度，避免抖动 */
.chart { width: 100%; height: 320px; }
.chart--tall { height: 360px; }

.rfm-tile {
  border: 1px solid var(--border-color-light);
  border-top: 3px solid var(--color-info);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  background: var(--bg-muted);
}
.rfm-seg { font-size: 14px; color: var(--text-regular); }
.rfm-count { font-size: 24px; font-weight: bold; color: var(--text-primary); margin: 4px 0; }
.rfm-count small { font-size: 13px; font-weight: normal; color: var(--text-secondary); }
.rfm-total { font-size: 12px; color: var(--text-secondary); }
</style>
