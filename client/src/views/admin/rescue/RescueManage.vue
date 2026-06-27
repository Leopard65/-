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

    <div class="list-summary">
      <div class="list-summary__main">
        <span>当前结果</span>
        <strong>{{ total }}</strong>
        <span>条救助求助</span>
      </div>
      <div class="list-summary__meta">
        <span>状态：{{ activeStatusLabel }}</span>
        <span>紧急度：{{ activeUrgencyLabel }}</span>
        <span>高/紧急事项建议优先受理</span>
      </div>
    </div>

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

    <el-dialog
      v-model="detailVisible"
      title="求助详情"
      width="920px"
      top="5vh"
      class="admin-detail-dialog"
      destroy-on-close
    >
      <template v-if="currentItem">
        <div class="detail-hero">
          <div class="detail-hero__main">
            <span class="detail-eyebrow">救助求助 #{{ currentItem.id }}</span>
            <h3>{{ currentItem.location || '未知地点' }}</h3>
            <p>
              {{ currentItem.reporter_name || '匿名用户' }} 提交于
              {{ fmtDate(currentItem.created_at, 16) }}，优先核对紧急程度、现场照片与联系方式。
            </p>
          </div>
          <div class="detail-actions">
            <StatusTag kind="urgency" :value="currentItem.urgency" size="small" />
            <StatusTag kind="rescue" :value="currentItem.status" size="small" />
            <el-button
              v-if="currentItem.status === 'pending'"
              type="primary"
              size="small"
              @click="updateStatus(currentItem.id, 'processing')"
            >
              受理
            </el-button>
            <el-button
              v-if="currentItem.status === 'processing'"
              type="success"
              size="small"
              @click="updateStatus(currentItem.id, 'resolved')"
            >
              标记解决
            </el-button>
          </div>
        </div>

        <div class="detail-grid">
          <section class="detail-panel">
            <div class="detail-panel__head">
              <div>
                <span class="detail-panel__title">现场与联系人</span>
                <span class="detail-panel__subtitle">用于快速派单、电话确认和路线定位</span>
              </div>
            </div>
            <dl class="detail-kv-list">
              <div class="detail-kv">
                <dt>报告人</dt>
                <dd>{{ currentItem.reporter_name || '未填写' }}</dd>
              </div>
              <div class="detail-kv">
                <dt>联系电话</dt>
                <dd>{{ currentItem.phone || '未填写' }}</dd>
              </div>
              <div class="detail-kv">
                <dt>动物类型</dt>
                <dd>{{ currentItem.animal_type || '未填写' }}</dd>
              </div>
              <div class="detail-kv">
                <dt>当前状态</dt>
                <dd><StatusTag kind="rescue" :value="currentItem.status" size="small" /></dd>
              </div>
              <div class="detail-kv detail-kv--wide">
                <dt>详细地点</dt>
                <dd class="detail-prose">{{ currentItem.location || '未填写' }}</dd>
              </div>
              <div class="detail-kv detail-kv--wide">
                <dt>求助描述</dt>
                <dd class="detail-prose">{{ currentItem.description || '未填写' }}</dd>
              </div>
            </dl>
          </section>

          <section class="detail-panel">
            <div class="detail-panel__head">
              <div>
                <span class="detail-panel__title">现场照片</span>
                <span class="detail-panel__subtitle">点击图片可放大预览</span>
              </div>
            </div>
            <el-image
              v-if="currentItem.image_url"
              :src="currentItem.image_url"
              :preview-src-list="[currentItem.image_url]"
              fit="cover"
              class="rescue-photo"
              preview-teleported
            >
              <template #error><div class="img-err"><el-icon><Picture /></el-icon></div></template>
            </el-image>
            <div v-else class="rescue-photo rescue-photo--empty">
              <el-icon><Picture /></el-icon>
              <span>未上传现场照片</span>
            </div>
          </section>

          <section class="detail-panel span-2">
            <div class="detail-panel__head">
              <div>
                <span class="detail-panel__title">处理进度</span>
                <span class="detail-panel__subtitle">记录受理、备注和解决过程，便于后续追踪</span>
              </div>
            </div>
            <div class="rescue-progress-layout">
              <div class="rescue-timeline" v-loading="logsLoading">
                <el-timeline>
                  <el-timeline-item :timestamp="fmtDate(currentItem.created_at, 16)" type="info" placement="top">
                    <StatusTag kind="rescueAction" value="created" size="small" />
                    <span class="log-note">{{ currentItem.reporter_name || '用户' }} 提交了求助</span>
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
              </div>

              <div class="add-note">
                <span class="add-note__title">新增处理记录</span>
                <el-input v-model="noteText" type="textarea" :rows="5" placeholder="如：已联系志愿者前往现场，预计 30 分钟后反馈" />
                <el-button type="primary" :loading="savingNote" @click="addNote">
                  添加处理记录
                </el-button>
              </div>
            </div>
          </section>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
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
const logsLoading = ref(false)
const savingNote = ref(false)
const noteText = ref('')

const activeStatusLabel = computed(() => (
  filters.status ? dictLabel(RESCUE_STATUS, filters.status) : '全部状态'
))

const activeUrgencyLabel = computed(() => (
  filters.urgency ? dictLabel(URGENCY, filters.urgency) : '全部紧急度'
))

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
  if (currentItem.value?.id === id) {
    currentItem.value = { ...currentItem.value, status }
    loadLogs(id)
  }
  loadData()
}

function showDetail(row) {
  currentItem.value = row
  noteText.value = ''
  detailVisible.value = true
  loadLogs(row.id)
}

async function loadLogs(id) {
  logsLoading.value = true
  logs.value = []
  try {
    const res = await request.get(`/rescues/${id}/logs`)
    logs.value = res.data || []
  } catch {
    logs.value = []
  } finally {
    logsLoading.value = false
  }
}

async function addNote() {
  const note = noteText.value.trim()
  if (!note) return ElMessage.warning('请输入处理备注')
  savingNote.value = true
  try {
    await request.post(`/rescues/${currentItem.value.id}/logs`, { note })
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
.rescue-photo {
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: var(--radius-sm);
  display: block;
  overflow: hidden;
}
.rescue-photo--empty,
.img-err {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--bg-soft);
  color: var(--text-secondary);
  font-size: 13px;
}
.img-err {
  width: 100%;
  height: 100%;
  min-height: 220px;
}
.rescue-photo--empty .el-icon,
.img-err .el-icon {
  font-size: 30px;
}
.rescue-progress-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 18px;
  align-items: start;
}
.rescue-timeline {
  min-height: 180px;
}
.log-note {
  margin-left: 8px;
  color: var(--text-regular);
  font-size: 13px;
  line-height: 1.7;
}
.add-note {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding: 14px;
  border-radius: var(--radius-sm);
  background: var(--bg-soft);
}
.add-note__title {
  color: var(--text-main);
  font-weight: 700;
  font-size: 14px;
}
</style>
