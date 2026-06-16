<template>
  <div class="rescue-manage admin-view">
    <PageHeader title="救助管理" subtitle="跟进群众提交的流浪动物救助求助">
      <el-button :loading="exporting" @click="exportData">
        <el-icon style="margin-right: 4px"><Download /></el-icon> 导出
      </el-button>
    </PageHeader>

    <DataToolbar>
      <el-select v-model="filters.status" clearable placeholder="全部状态" style="width: 150px" @change="onSearch">
        <el-option v-for="(v, k) in RESCUE_STATUS" :key="k" :label="v.label" :value="k" />
      </el-select>
      <el-select v-model="filters.urgency" clearable placeholder="全部紧急度" style="width: 150px" @change="onSearch">
        <el-option v-for="(v, k) in URGENCY" :key="k" :label="v.label" :value="k" />
      </el-select>
      <template #actions>
        <el-button type="primary" @click="onSearch">查询</el-button>
        <el-button @click="resetFilters">重置</el-button>
      </template>
    </DataToolbar>

    <div class="table-card">
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="reporter_name" label="报告人" width="100" show-overflow-tooltip />
        <el-table-column prop="phone" label="电话" width="120" />
        <el-table-column prop="location" label="地点" show-overflow-tooltip />
        <el-table-column prop="animal_type" label="动物类型" width="90" />
        <el-table-column label="紧急程度" width="90">
          <template #default="{ row }"><StatusTag kind="urgency" :value="row.urgency" size="small" /></template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }"><StatusTag kind="rescue" :value="row.status" size="small" /></template>
        </el-table-column>
        <el-table-column prop="created_at" label="提交时间" width="160">
          <template #default="{ row }">{{ fmtDate(row.created_at, 16) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'pending'" text type="primary" size="small" @click="updateStatus(row.id, 'processing')">受理</el-button>
            <el-button v-if="row.status === 'processing'" text type="success" size="small" @click="updateStatus(row.id, 'resolved')">标记解决</el-button>
            <el-button text type="primary" size="small" @click="showDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="total, prev, pager, next" @current-change="loadData" />
      </div>
    </div>

    <el-dialog v-model="detailVisible" title="求助详情" width="600px">
      <el-descriptions :column="2" border v-if="currentItem">
        <el-descriptions-item label="报告人">{{ currentItem.reporter_name }}</el-descriptions-item>
        <el-descriptions-item label="电话">{{ currentItem.phone }}</el-descriptions-item>
        <el-descriptions-item label="地点" :span="2">{{ currentItem.location }}</el-descriptions-item>
        <el-descriptions-item label="动物类型">{{ currentItem.animal_type || '未填' }}</el-descriptions-item>
        <el-descriptions-item label="紧急程度">
          <StatusTag kind="urgency" :value="currentItem.urgency" size="small" />
        </el-descriptions-item>
        <el-descriptions-item label="描述" :span="2">{{ currentItem.description }}</el-descriptions-item>
        <el-descriptions-item v-if="currentItem.image_url" label="现场照片" :span="2">
          <el-image
            :src="currentItem.image_url"
            :preview-src-list="[currentItem.image_url]"
            fit="cover"
            class="rescue-photo"
            preview-teleported
          >
            <template #error><div class="img-err">🐾</div></template>
          </el-image>
        </el-descriptions-item>
      </el-descriptions>

      <div v-if="currentItem" class="rescue-progress">
        <div class="progress-title">处理进度</div>
        <el-timeline>
          <el-timeline-item :timestamp="fmtDate(currentItem.created_at, 16)" type="info" placement="top">
            <StatusTag kind="rescueAction" value="created" size="small" />
            <span class="log-note">{{ currentItem.reporter_name }} 提交了求助</span>
          </el-timeline-item>
          <el-timeline-item
            v-for="log in logs"
            :key="log.id"
            :timestamp="fmtDate(log.created_at, 16) + (log.operator_name ? ' · ' + log.operator_name : '')"
            :type="logType(log.action)"
            placement="top"
          >
            <StatusTag kind="rescueAction" :value="log.action" size="small" />
            <span v-if="log.note" class="log-note">{{ log.note }}</span>
          </el-timeline-item>
        </el-timeline>

        <div class="add-note">
          <el-input v-model="noteText" type="textarea" :rows="2" placeholder="添加处理备注（如：已联系志愿者前往现场）" />
          <el-button type="primary" size="small" style="margin-top: 8px" :loading="savingNote" @click="addNote">
            添加处理记录
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import DataToolbar from '@/components/admin/DataToolbar.vue'
import StatusTag from '@/components/StatusTag.vue'
import { RESCUE_STATUS, URGENCY, RESCUE_ACTION, fmtDate, dictLabel } from '@/utils/format'
import { fetchAllPages, exportCsv } from '@/utils/export'

const list = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = 15
const total = ref(0)
const filters = reactive({ status: '', urgency: '' })
const exporting = ref(false)
const detailVisible = ref(false)
const currentItem = ref(null)
const logs = ref([])
const savingNote = ref(false)
const noteText = ref('')

onMounted(() => loadData())

function onSearch() {
  page.value = 1
  loadData()
}
function resetFilters() {
  filters.status = ''
  filters.urgency = ''
  onSearch()
}

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
  noteText.value = ''
  detailVisible.value = true
  loadLogs(row.id)
}

async function loadLogs(id) {
  logs.value = []
  try {
    const res = await request.get(`/rescues/${id}/logs`)
    logs.value = res.data || []
  } catch { logs.value = [] }
}

async function addNote() {
  if (!noteText.value) return ElMessage.warning('请输入处理备注')
  savingNote.value = true
  try {
    await request.post(`/rescues/${currentItem.value.id}/logs`, { note: noteText.value })
    ElMessage.success('处理记录已添加')
    noteText.value = ''
    loadLogs(currentItem.value.id)
  } finally {
    savingNote.value = false
  }
}

function logType(action) {
  return RESCUE_ACTION[action]?.type || 'primary'
}

async function exportData() {
  exporting.value = true
  try {
    const rows = await fetchAllPages('/rescues', { ...filters })
    exportCsv(`救助求助_${fmtDate(new Date().toISOString())}.csv`, [
      { label: 'ID', value: (r) => r.id },
      { label: '报告人', value: (r) => r.reporter_name },
      { label: '电话', value: (r) => r.phone },
      { label: '地点', value: (r) => r.location },
      { label: '动物类型', value: (r) => r.animal_type },
      { label: '紧急程度', value: (r) => dictLabel(URGENCY, r.urgency) },
      { label: '状态', value: (r) => dictLabel(RESCUE_STATUS, r.status) },
      { label: '提交时间', value: (r) => fmtDate(r.created_at, 16) },
    ], rows)
    ElMessage.success(`已导出 ${rows.length} 条`)
  } finally {
    exporting.value = false
  }
}
</script>

<style scoped>
.rescue-progress {
  margin-top: 18px;
}
.progress-title {
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 12px;
}
.log-note {
  margin-left: 8px;
  color: var(--text-regular);
  font-size: 13px;
}
.add-note {
  margin-top: 8px;
}
.rescue-photo {
  width: 140px;
  height: 100px;
  border-radius: 6px;
}
.img-err {
  width: 140px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-soft);
  border-radius: 6px;
  font-size: 28px;
}
</style>
