<template>
  <div>
    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <!-- 销售报表 -->
      <el-tab-pane label="销售报表" name="sales">
        <el-card>
          <template #header>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span>销售趋势</span>
              <el-date-picker v-model="salesDateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" @change="loadSalesData" />
            </div>
          </template>

          <el-row :gutter="20">
            <el-col :span="16">
              <div ref="salesChartRef" style="height:300px"></div>
            </el-col>
            <el-col :span="8">
              <el-descriptions title="汇总数据" :column="1" border>
                <el-descriptions-item label="总销售额">¥{{ salesSummary.totalAmount?.toFixed(2) || '0.00' }}</el-descriptions-item>
                <el-descriptions-item label="退款合计">
                  <span style="color:#F56C6C">-¥{{ salesSummary.totalRefund?.toFixed(2) || '0.00' }}</span>
                </el-descriptions-item>
                <el-descriptions-item label="净销售额">
                  <span style="font-weight:bold;color:#67C23A">¥{{ salesSummary.netAmount?.toFixed(2) || '0.00' }}</span>
                </el-descriptions-item>
                <el-descriptions-item label="总订单数">{{ salesSummary.totalOrders || 0 }}</el-descriptions-item>
                <el-descriptions-item label="日均销售额">¥{{ salesSummary.avgDailyAmount?.toFixed(2) || '0.00' }}</el-descriptions-item>
              </el-descriptions>
            </el-col>
          </el-row>
        </el-card>

        <el-row :gutter="20" style="margin-top:20px">
          <el-col :span="12">
            <el-card>
              <template #header><span>商品销售排行 TOP10</span></template>
              <el-table :data="productRank" stripe size="small" max-height="300">
                <el-table-column type="index" label="排名" width="60" />
                <el-table-column prop="name" label="商品" />
                <el-table-column prop="total_quantity" label="销量" width="80" />
                <el-table-column prop="total_amount" label="金额" width="100">
                  <template #default="{ row }">¥{{ row.total_amount?.toFixed(2) }}</template>
                </el-table-column>
              </el-table>
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card>
              <template #header><span>分类销售统计</span></template>
              <div ref="categoryChartRef" style="height:300px"></div>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>

      <!-- 库存报表 -->
      <el-tab-pane label="库存报表" name="inventory">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-card>
              <template #header><span>库存预警商品</span></template>
              <el-table :data="inventoryWarning" stripe size="small" max-height="400">
                <el-table-column prop="name" label="商品" />
                <el-table-column prop="category_name" label="分类" width="100" />
                <el-table-column prop="stock" label="库存" width="80">
                  <template #default="{ row }">
                    <el-tag type="danger">{{ row.stock }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="min_stock" label="预警值" width="80" />
              </el-table>
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card>
              <template #header><span>库存价值统计</span></template>
              <el-table :data="inventoryValue" stripe size="small">
                <el-table-column prop="category_name" label="分类" />
                <el-table-column prop="product_count" label="商品数" width="80" />
                <el-table-column prop="total_stock" label="总库存" width="80" />
                <el-table-column prop="cost_value" label="成本价值" width="120">
                  <template #default="{ row }">¥{{ row.cost_value?.toFixed(2) }}</template>
                </el-table-column>
                <el-table-column prop="retail_value" label="零售价值" width="120">
                  <template #default="{ row }">¥{{ row.retail_value?.toFixed(2) }}</template>
                </el-table-column>
              </el-table>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>

      <!-- 利润分析 -->
      <el-tab-pane label="利润分析" name="profit">
        <el-card>
          <template #header>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span>毛利润趋势</span>
              <el-date-picker v-model="profitDateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" @change="loadProfitData" />
            </div>
          </template>
          <div ref="profitChartRef" style="height:300px"></div>
        </el-card>

        <el-card style="margin-top:20px">
          <template #header><span>月度利润汇总</span></template>
          <el-table :data="monthlyProfit" stripe>
            <el-table-column prop="month" label="月份" width="120" />
            <el-table-column prop="revenue" label="收入" width="120">
              <template #default="{ row }">¥{{ row.revenue?.toFixed(2) }}</template>
            </el-table-column>
            <el-table-column prop="cost" label="成本" width="120">
              <template #default="{ row }">¥{{ row.cost?.toFixed(2) }}</template>
            </el-table-column>
            <el-table-column prop="gross_profit" label="毛利润" width="120">
              <template #default="{ row }">
                <span :style="{ color: row.gross_profit >= 0 ? '#67C23A' : '#F56C6C' }">¥{{ row.gross_profit?.toFixed(2) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="profit_rate" label="毛利率" width="100">
              <template #default="{ row }">{{ row.profit_rate }}%</template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { reportsApi } from '@/api'

const activeTab = ref('sales')
const salesDateRange = ref(null)
const profitDateRange = ref(null)

// 销售数据
const salesData = ref([])
const productRank = ref([])
const categorySales = ref([])
const salesSummary = ref({})

// 库存数据
const inventoryWarning = ref([])
const inventoryValue = ref([])

// 利润数据
const profitData = ref([])
const monthlyProfit = ref([])

// 图表引用
const salesChartRef = ref(null)
const categoryChartRef = ref(null)
const profitChartRef = ref(null)

let salesChart = null
let categoryChart = null
let profitChart = null

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
    tooltip: { trigger: 'axis' },
    legend: { data: ['销售额', '净销售额', '订单数'] },
    xAxis: { type: 'category', data: salesData.value.map(d => d.date) },
    yAxis: { type: 'value' },
    series: [
      {
        name: '销售额',
        type: 'line',
        smooth: true,
        data: salesData.value.map(d => d.total_amount),
        areaStyle: { opacity: 0.3 },
        itemStyle: { color: '#409EFF' }
      },
      {
        name: '净销售额',
        type: 'line',
        smooth: true,
        data: salesData.value.map(d => d.net_amount),
        itemStyle: { color: '#E6A23C' }
      },
      {
        name: '订单数',
        type: 'bar',
        data: salesData.value.map(d => d.order_count),
        itemStyle: { color: '#67C23A' },
        yAxisIndex: 0
      }
    ]
  })
}

// 渲染分类图表
const renderCategoryChart = () => {
  if (!categoryChartRef.value) return
  if (!categoryChart) categoryChart = echarts.init(categoryChartRef.value)

  categoryChart.setOption({
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie',
      radius: '60%',
      data: categorySales.value.map(c => ({
        name: c.category_name,
        value: c.total_amount
      })),
      emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
    }]
  })
}

// 渲染利润图表
const renderProfitChart = () => {
  if (!profitChartRef.value) return
  if (!profitChart) profitChart = echarts.init(profitChartRef.value)

  profitChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['收入', '成本', '毛利润'] },
    xAxis: { type: 'category', data: profitData.value.map(d => d.date) },
    yAxis: { type: 'value' },
    series: [
      { name: '收入', type: 'line', data: profitData.value.map(d => d.revenue), itemStyle: { color: '#409EFF' } },
      { name: '成本', type: 'line', data: profitData.value.map(d => d.cost), itemStyle: { color: '#E6A23C' } },
      { name: '毛利润', type: 'line', data: profitData.value.map(d => d.gross_profit), itemStyle: { color: '#67C23A' } }
    ]
  })
}

const handleTabChange = (tab) => {
  if (tab === 'sales') loadSalesData()
  else if (tab === 'inventory') loadInventoryData()
  else if (tab === 'profit') loadProfitData()
}

onMounted(() => {
  loadSalesData()
})
</script>
