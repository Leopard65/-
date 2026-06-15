<template>
  <div class="rescue-manage">
    <h2>救助管理</h2>

    <el-card class="filter-card">
      <el-form :inline="true">
        <el-form-item label="状态">
          <el-select v-model="filters.status" clearable placeholder="全部" @change="loadData">
            <el-option label="待处理" value="pending" />
            <el-option label="处理中" value="processing" />
            <el-option label="已解决" value="resolved" />
            <el-option label="已关闭" value="closed" />
          </el-select>
        </el-form-item>
        <el-form-item label="紧急程度">
          <el-select v-model="filters.urgency" clearable placeholder="全部" @change="loadData">
            <el-option label="低" value="low" />
            <el-option label="中" value="medium" />
            <el-option label="高" value="high" />
            <el-option label="紧急" value="critical" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card>
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="reporter_name" label="报告人" width="100" />
        <el-table-column prop="phone" label="电话" width="120" />
        <el-table-column prop="location" label="地点" show-overflow-tooltip />
        <el-table-column prop="animal_type" label="动物类型" width="90" />
        <el-table-column prop="urgency" label="紧急程度" width="90">
          <template #default="{ row }">
            <el-tag :type="urgencyType(row.urgency)" size="small">{{ urgencyText(row.urgency) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="提交时间" width="160">
          <template #default="{ row }">{{ row.created_at?.slice(0, 16) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'pending'" text type="primary" size="small" @click="updateStatus(row.id, 'processing')">受理</el-button>
            <el-button v-if="row.status === 'processing'" text type="success" size="small" @click="updateStatus(row.id, 'resolved')">解决</el-button>
            <el-button text size="small" @click="showDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="total, prev, pager, next" @current-change="loadData" />
      </div>
    </el-card>

    <el-dialog v-model="detailVisible" title="求助详情" width="600px">
      <el-descriptions :column="2" border v-if="currentItem">
        <el-descriptions-item label="报告人">{{ currentItem.reporter_name }}</el-descriptions-item>
        <el-descriptions-item label="电话">{{ currentItem.phone }}</el-descriptions-item>
        <el-descriptions-item label="地点" :span="2">{{ currentItem.location }}</el-descriptions-item>
        <el-descriptions-item label="动物类型">{{ currentItem.animal_type || '未填' }}</el-descriptions-item>
        <el-descriptions-item label="紧急程度">{{ urgencyText(currentItem.urgency) }}</el-descriptions-item>
        <el-descriptions-item label="描述" :span="2">{{ currentItem.description }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'

const list = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = 15
const total = ref(0)
const filters = reactive({ status: '', urgency: '' })
const detailVisible = ref(false)
const currentItem = ref(null)

onMounted(() => loadData())

async function loadData() {
  loading.value = true
  try {
    const res = await request.get('/rescues', { params: { ...filters, page: page.value, pageSize } })
    list.value = res.data?.list || []
    total.value = res.data?.total || 0
  } finally {
    loading.value = false
  }
}

async function updateStatus(id, status) {
  await request.put(`/rescues/${id}/status`, { status })
  ElMessage.success('状态更新成功')
  loadData()
}

function showDetail(row) {
  currentItem.value = row
  detailVisible.value = true
}

function urgencyText(u) {
  return { low: '低', medium: '中', high: '高', critical: '紧急' }[u] || u
}
function urgencyType(u) {
  return { low: 'info', medium: '', high: 'warning', critical: 'danger' }[u] || ''
}
function statusText(s) {
  return { pending: '待处理', processing: '处理中', resolved: '已解决', closed: '已关闭' }[s] || s
}
function statusType(s) {
  return { pending: 'warning', processing: '', resolved: 'success', closed: 'info' }[s] || ''
}
</script>

<style scoped>
.filter-card { margin-bottom: 16px; }
.pagination { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
