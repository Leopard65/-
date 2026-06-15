<template>
  <div>
    <!-- 页面标题 -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <h2 style="margin:0">仪表盘</h2>
      <div style="display:flex;align-items:center;gap:15px">
        <span style="color:#999;font-size:14px">最后更新: {{ lastUpdated }}</span>
        <el-button :icon="Refresh" @click="handleRefresh" :loading="fetching">刷新</el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="20" style="margin-bottom: 20px">
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-icon" style="background:#409EFF">💰</div>
            <div>
              <div class="stat-label">今日销售额</div>
              <div class="stat-value">¥{{ data.todaySales?.toFixed(2) || '0.00' }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-icon" style="background:#67C23A">📦</div>
            <div>
              <div class="stat-label">今日订单</div>
              <div class="stat-value">{{ data.todayOrders || 0 }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-icon" style="background:#E6A23C">🏷️</div>
            <div>
              <div class="stat-label">商品总数</div>
              <div class="stat-value">{{ data.productCount || 0 }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-icon" style="background:#F56C6C">👥</div>
            <div>
              <div class="stat-label">会员总数</div>
              <div class="stat-value">{{ data.memberCount || 0 }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 待办 / 今日目标 -->
    <el-row :gutter="20" style="margin-bottom: 20px">
      <el-col :span="8">
        <el-card shadow="hover" class="todo-card" @click="goTo('/returns')">
          <div class="stat-card">
            <div class="stat-icon" style="background:#E6A23C">↩️</div>
            <div>
              <div class="stat-label">待审核退货</div>
              <div class="stat-value">{{ data.pendingReturns || 0 }} <small class="unit">单</small></div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover" class="todo-card" @click="goTo('/inventory')">
          <div class="stat-card">
            <div class="stat-icon" style="background:#F56C6C">⚠️</div>
            <div>
              <div class="stat-label">库存预警</div>
              <div class="stat-value">{{ data.lowStock?.length || 0 }} <small class="unit">种</small></div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <div class="stat-label" style="margin-bottom:10px">今日销售目标（近30天日均 ¥{{ data.salesTarget || 0 }}）</div>
          <el-progress :percentage="targetPercent" :color="targetColor" :stroke-width="16" />
          <div style="margin-top:8px;font-size:13px;color:#666">今日已达 ¥{{ data.todaySales?.toFixed(2) || '0.00' }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <!-- 库存预警 -->
      <el-col :span="12">
        <el-card>
          <template #header><span>⚠️ 库存预警</span></template>
          <el-table :data="data.lowStock || []" style="width:100%" max-height="300" stripe>
            <el-table-column prop="name" label="商品" />
            <el-table-column prop="category_name" label="分类" width="100" />
            <el-table-column prop="stock" label="库存" width="80">
              <template #default="{ row }">
                <el-tag :type="row.stock === 0 ? 'danger' : 'warning'" size="small">{{ row.stock }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="min_stock" label="预警值" width="80" />
          </el-table>
          <el-empty v-if="!data.lowStock?.length" description="暂无预警" />
        </el-card>
      </el-col>

      <!-- 热销排行 -->
      <el-col :span="12">
        <el-card>
          <template #header><span>🔥 热销排行 TOP5</span></template>
          <div v-if="data.hotProducts?.length">
            <div v-for="(item, i) in data.hotProducts" :key="i" class="hot-item">
              <span class="hot-rank" :class="'rank-' + (i+1)">{{ i + 1 }}</span>
              <span style="flex:1">{{ item.name }}</span>
              <span style="color:#409EFF; font-weight:bold">{{ item.total_sold }} 件</span>
            </div>
          </div>
          <el-empty v-else description="暂无销售数据" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Refresh } from '@element-plus/icons-vue'
import { dashboardApi } from '@/api'

const router = useRouter()
const data = ref({})
const fetching = ref(false)
const lastUpdated = ref('--:--:--')
let refreshInterval = null

const goTo = (path) => router.push(path)

const targetPercent = computed(() => {
  const t = data.value.salesTarget || 0
  const s = data.value.todaySales || 0
  if (t <= 0) return 0
  return Math.min(100, Math.round((s / t) * 100))
})

const targetColor = computed(() => {
  const p = targetPercent.value
  if (p >= 100) return '#67C23A'
  if (p >= 60) return '#409EFF'
  return '#E6A23C'
})

const fetchDashboard = async () => {
  try {
    data.value = await dashboardApi.getDashboard()
    lastUpdated.value = new Date().toLocaleTimeString()
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
  // 每5分钟自动刷新
  refreshInterval = setInterval(fetchDashboard, 5 * 60 * 1000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<style scoped>
.stat-card { display: flex; align-items: center; gap: 15px; }
.stat-icon { width: 50px; height: 50px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
.stat-label { color: #999; font-size: 14px; }
.stat-value { font-size: 24px; font-weight: bold; color: #333; margin-top: 4px; }
.stat-value .unit { font-size: 13px; color: #999; font-weight: normal; }
.todo-card { cursor: pointer; transition: transform 0.15s; }
.todo-card:hover { transform: translateY(-2px); }
.hot-item { display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
.hot-rank { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #fff; margin-right: 10px; background: #999; }
.rank-1 { background: #F56C6C; }
.rank-2 { background: #E6A23C; }
.rank-3 { background: #409EFF; }
</style>
