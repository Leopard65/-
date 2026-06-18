<template>
  <div class="animal-manage admin-view">
    <PageHeader title="动物管理" subtitle="录入、编辑与维护动物档案">
      <el-button :loading="exporting" @click="exportData">
        <el-icon style="margin-right: 4px"><Download /></el-icon> 导出
      </el-button>
      <el-button type="primary" @click="$router.push('/admin/animals/add')">
        <el-icon style="margin-right: 4px"><Plus /></el-icon> 录入动物
      </el-button>
    </PageHeader>

    <!-- 状态快捷筛选：点击按动物状态过滤，数量来自 /animals/stats -->
    <div class="status-filters">
      <button
        v-for="opt in statusOptions"
        :key="opt.value"
        type="button"
        class="status-pill"
        :class="{ active: filters.status === opt.value }"
        @click="selectStatus(opt.value)"
      >
        <span class="pill-label">{{ opt.label }}</span>
        <span class="pill-count">{{ opt.count }}</span>
      </button>
    </div>

    <!-- 筛选 -->
    <DataToolbar>
      <el-input v-model="filters.keyword" placeholder="名称关键词" clearable style="width: 200px" @keyup.enter="onSearch" @clear="onSearch">
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <template #actions>
        <el-button type="primary" @click="onSearch">查询</el-button>
        <el-button @click="resetFilters">重置</el-button>
      </template>
    </DataToolbar>

    <!-- 表格 -->
    <div class="table-card">
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column label="图片" width="76">
          <template #default="{ row }">
            <el-image
              v-if="row.image_url"
              :src="row.image_url"
              fit="cover"
              class="cell-thumb"
              :preview-src-list="[row.image_url]"
              preview-teleported
            >
              <template #error><div class="cell-thumb paw-mini">🐾</div></template>
            </el-image>
            <div v-else class="cell-thumb paw-mini">🐾</div>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="名称" width="120" show-overflow-tooltip />
        <el-table-column prop="category_name" label="类型" width="80" />
        <el-table-column prop="breed_name" label="品种" width="100" show-overflow-tooltip />
        <el-table-column label="性别" width="60">
          <template #default="{ row }">{{ genderText(row.gender) }}</template>
        </el-table-column>
        <el-table-column prop="age" label="年龄" width="90" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }"><StatusTag kind="animal" :value="row.status" size="small" /></template>
        </el-table-column>
        <el-table-column prop="created_at" label="录入时间" width="160">
          <template #default="{ row }">{{ fmtDate(row.created_at, 16) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="$router.push(`/admin/animals/edit/${row.id}`)">编辑</el-button>
            <el-popconfirm title="确认删除该动物档案？" width="220" @confirm="handleDelete(row.id)">
              <template #reference>
                <el-button text type="danger" size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="total, prev, pager, next" @current-change="loadData" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import DataToolbar from '@/components/admin/DataToolbar.vue'
import StatusTag from '@/components/StatusTag.vue'
import { ANIMAL_STATUS, genderText, fmtDate, dictLabel } from '@/utils/format'
import { fetchAllPages, exportCsv } from '@/utils/export'

const list = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = 15
const total = ref(0)
const filters = reactive({ keyword: '', status: '' })
const exporting = ref(false)
const stats = ref({ total: 0, rescued: 0, available: 0, adopted: 0, fostered: 0 })

// 状态快捷筛选项（含数量）：全部 + ANIMAL_STATUS 字典各项
const statusOptions = computed(() => [
  { value: '', label: '全部', count: stats.value.total || 0 },
  ...Object.entries(ANIMAL_STATUS).map(([k, v]) => ({ value: k, label: v.label, count: stats.value[k] || 0 })),
])

onMounted(() => {
  loadData()
  loadStats()
})

function selectStatus(val) {
  filters.status = val
  onSearch()
}

async function loadStats() {
  try {
    const res = await request.get('/animals/stats')
    if (res.data) stats.value = res.data
  } catch { /* 统计失败不阻塞列表 */ }
}

function onSearch() {
  page.value = 1
  loadData()
}

function resetFilters() {
  filters.keyword = ''
  filters.status = ''
  onSearch()
}

async function loadData() {
  loading.value = true
  try {
    const res = await request.get('/animals', { params: { ...filters, page: page.value, pageSize } })
    list.value = res.data?.list || []
    total.value = res.data?.total || 0
  } finally {
    loading.value = false
  }
}

async function handleDelete(id) {
  await request.delete(`/animals/${id}`)
  ElMessage.success('删除成功')
  loadData()
  loadStats()
}

async function exportData() {
  exporting.value = true
  try {
    const rows = await fetchAllPages('/animals', { ...filters })
    exportCsv(`动物列表_${fmtDate(new Date().toISOString())}.csv`, [
      { label: 'ID', value: (r) => r.id },
      { label: '名称', value: (r) => r.name },
      { label: '类型', value: (r) => r.category_name },
      { label: '品种', value: (r) => r.breed_name },
      { label: '性别', value: (r) => genderText(r.gender) },
      { label: '年龄', value: (r) => r.age },
      { label: '状态', value: (r) => dictLabel(ANIMAL_STATUS, r.status) },
      { label: '录入时间', value: (r) => fmtDate(r.created_at, 16) },
    ], rows)
    ElMessage.success(`已导出 ${rows.length} 条`)
  } finally {
    exporting.value = false
  }
}
</script>

<style scoped>
.status-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg-card);
  color: var(--text-regular);
  font-size: 14px;
  line-height: 1.4;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s, background 0.2s;
}
.status-pill:hover {
  border-color: var(--brand);
  color: var(--brand);
}
.status-pill.active {
  background: var(--brand);
  border-color: var(--brand);
  color: #fff;
}
.pill-count {
  min-width: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--bg-soft);
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 18px;
  text-align: center;
}
.status-pill.active .pill-count {
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
}
.cell-thumb {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  object-fit: cover;
  display: block;
}
.paw-mini {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-soft);
  font-size: 22px;
}
</style>
