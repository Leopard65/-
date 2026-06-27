<template>
  <div class="user-manage admin-view">
    <PageHeader title="用户管理" subtitle="管理注册用户与账号状态">
      <el-button :loading="exporting" @click="exportData">
        <el-icon style="margin-right: 4px"><Download /></el-icon> 导出
      </el-button>
    </PageHeader>

    <DataToolbar>
      <el-input v-model="filters.keyword" placeholder="用户名 / 昵称 / 手机" clearable style="width: 220px" @keyup.enter="onSearch" @clear="onSearch">
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-select v-model="filters.status" clearable placeholder="全部状态" style="width: 140px" @change="onSearch">
        <el-option label="正常" :value="1" />
        <el-option label="禁用" :value="0" />
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
        <span>个账号</span>
      </div>
      <div class="list-summary__meta">
        <span>状态：{{ activeStatusLabel }}</span>
        <span v-if="filters.keyword">关键词：{{ filters.keyword }}</span>
        <span>管理员账号不会在此处禁用</span>
      </div>
    </div>

    <div class="table-card">
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="username" label="用户名" width="120" show-overflow-tooltip />
        <el-table-column prop="nickname" label="昵称" width="120" show-overflow-tooltip />
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="email" label="邮箱" show-overflow-tooltip />
        <el-table-column label="角色" width="80">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'danger' : 'info'" size="small" round>
              {{ row.role === 'admin' ? '管理员' : '用户' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small" round>
              {{ row.status === 1 ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="注册时间" width="160">
          <template #default="{ row }">{{ fmtDate(row.created_at, 16) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-popconfirm
              v-if="row.role !== 'admin'"
              :title="row.status === 1 ? '确认禁用该用户？' : '确认启用该用户？'"
              width="200"
              @confirm="toggleStatus(row)"
            >
              <template #reference>
                <el-button text :type="row.status === 1 ? 'danger' : 'success'" size="small">
                  {{ row.status === 1 ? '禁用' : '启用' }}
                </el-button>
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
import { fmtDate } from '@/utils/format'
import { fetchAllPages, exportCsv } from '@/utils/export'

const list = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = 15
const total = ref(0)
const filters = reactive({ keyword: '', status: '' })
const exporting = ref(false)

const activeStatusLabel = computed(() => {
  if (filters.status === 1) return '正常'
  if (filters.status === 0) return '禁用'
  return '全部状态'
})

onMounted(() => loadData())

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
    const res = await request.get('/users', { params: { ...filters, page: page.value, pageSize } })
    list.value = res.data?.list || []
    total.value = res.data?.total || 0
  } finally {
    loading.value = false
  }
}

async function toggleStatus(row) {
  const newStatus = row.status === 1 ? 0 : 1
  await request.put(`/users/${row.id}/status`, { status: newStatus })
  ElMessage.success(newStatus === 1 ? '已启用' : '已禁用')
  loadData()
}

async function exportData() {
  exporting.value = true
  try {
    const rows = await fetchAllPages('/users', { ...filters })
    exportCsv(`用户列表_${fmtDate(new Date().toISOString())}.csv`, [
      { label: 'ID', value: (r) => r.id },
      { label: '用户名', value: (r) => r.username },
      { label: '昵称', value: (r) => r.nickname },
      { label: '手机号', value: (r) => r.phone },
      { label: '邮箱', value: (r) => r.email },
      { label: '角色', value: (r) => (r.role === 'admin' ? '管理员' : '用户') },
      { label: '状态', value: (r) => (r.status === 1 ? '正常' : '禁用') },
      { label: '注册时间', value: (r) => fmtDate(r.created_at, 16) },
    ], rows)
    ElMessage.success(`已导出 ${rows.length} 条`)
  } finally {
    exporting.value = false
  }
}
</script>
