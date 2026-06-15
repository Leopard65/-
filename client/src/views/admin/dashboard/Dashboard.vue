<template>
  <div class="dashboard">
    <h2>数据看板</h2>

    <!-- 统计卡片 -->
    <div class="stat-cards">
      <el-card v-for="item in statCards" :key="item.label" class="stat-card" shadow="hover">
        <div class="stat-icon" :style="{ background: item.color }">{{ item.icon }}</div>
        <div class="stat-info">
          <div class="stat-num">{{ item.value }}</div>
          <div class="stat-label">{{ item.label }}</div>
        </div>
      </el-card>
    </div>

    <!-- 待办事项 -->
    <el-row :gutter="16" class="todo-row">
      <el-col :xs="24" :md="12">
        <el-card shadow="never">
          <template #header>
            <div class="card-head">
              <span>📋 待审核领养（{{ adoptionPending }}）</span>
              <el-button text type="primary" size="small" @click="$router.push('/admin/adoptions')">去处理</el-button>
            </div>
          </template>
          <el-table :data="pendingAdoptions" v-loading="loadingAdopt" size="small" :show-header="true">
            <el-table-column prop="animal_name" label="动物" width="110" show-overflow-tooltip />
            <el-table-column prop="applicant_name" label="申请人" width="100" show-overflow-tooltip />
            <el-table-column prop="phone" label="电话" />
            <el-table-column prop="created_at" label="申请时间" width="120">
              <template #default="{ row }">{{ row.created_at?.slice(5, 16) }}</template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!loadingAdopt && pendingAdoptions.length === 0" description="暂无待审核申请" :image-size="60" />
        </el-card>
      </el-col>

      <el-col :xs="24" :md="12">
        <el-card shadow="never">
          <template #header>
            <div class="card-head">
              <span>🆘 待处理救助（{{ rescueCount }}）</span>
              <el-button text type="primary" size="small" @click="$router.push('/admin/rescues')">去处理</el-button>
            </div>
          </template>
          <el-table :data="pendingRescues" v-loading="loadingRescue" size="small">
            <el-table-column prop="reporter_name" label="报告人" width="100" show-overflow-tooltip />
            <el-table-column prop="location" label="地点" show-overflow-tooltip />
            <el-table-column prop="urgency" label="紧急" width="80">
              <template #default="{ row }">
                <el-tag :type="urgencyType(row.urgency)" size="small">{{ urgencyText(row.urgency) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="created_at" label="时间" width="120">
              <template #default="{ row }">{{ row.created_at?.slice(5, 16) }}</template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!loadingRescue && pendingRescues.length === 0" description="暂无待处理求助" :image-size="60" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 快捷操作 -->
    <el-card class="quick-actions" shadow="never">
      <template #header>快捷操作</template>
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
import { ref, onMounted, computed } from 'vue'
import request from '@/utils/request'

const animalStats = ref({ total: 0, rescued: 0, available: 0, adopted: 0 })
const userCount = ref(0)
const adoptionPending = ref(0)
const rescueCount = ref(0)

const pendingAdoptions = ref([])
const pendingRescues = ref([])
const loadingAdopt = ref(false)
const loadingRescue = ref(false)

const statCards = computed(() => [
  { icon: '🐾', label: '动物总数', value: animalStats.value.total, color: '#409eff22' },
  { icon: '🏠', label: '可领养', value: animalStats.value.available, color: '#67c23a22' },
  { icon: '✅', label: '已领养', value: animalStats.value.adopted, color: '#e6a23c22' },
  { icon: '📋', label: '待审核领养', value: adoptionPending.value, color: '#909eff22' },
  { icon: '🆘', label: '待处理求助', value: rescueCount.value, color: '#f56c6c22' },
  { icon: '👥', label: '注册用户', value: userCount.value, color: '#9254de22' },
])

onMounted(() => {
  request.get('/animals/stats').then(res => { animalStats.value = res.data }).catch(() => {})
  request.get('/users', { params: { pageSize: 1 } }).then(res => { userCount.value = res.data?.total || 0 }).catch(() => {})

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
})

function urgencyText(u) {
  return { low: '低', medium: '中', high: '高', critical: '紧急' }[u] || u
}
function urgencyType(u) {
  return { low: 'info', medium: '', high: 'warning', critical: 'danger' }[u] || ''
}
</script>

<style scoped>
.dashboard h2 { margin-bottom: 20px; }
.stat-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}
.stat-card :deep(.el-card__body) { display: flex; align-items: center; gap: 16px; }
.stat-icon { width: 56px; height: 56px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 28px; flex-shrink: 0; }
.stat-num { font-size: 28px; font-weight: bold; color: #333; }
.stat-label { font-size: 13px; color: #999; }
.todo-row { margin-bottom: 20px; }
.todo-row .el-col { margin-bottom: 16px; }
.card-head { display: flex; justify-content: space-between; align-items: center; }
.quick-actions { margin-bottom: 20px; }
</style>
