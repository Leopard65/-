<template>
  <div class="announcement-manage admin-view">
    <PageHeader title="公告管理" subtitle="发布与维护站内公告">
      <el-button type="primary" @click="openDialog()">
        <el-icon style="margin-right: 4px"><Plus /></el-icon> 发布公告
      </el-button>
    </PageHeader>

    <DataToolbar>
      <el-input v-model="filters.keyword" placeholder="公告标题关键词" clearable style="width: 220px" @keyup.enter="onSearch" @clear="onSearch">
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-select v-model="filters.status" clearable placeholder="全部状态" style="width: 140px" @change="onSearch">
        <el-option v-for="(v, k) in PUBLISH_STATUS" :key="k" :label="v.label" :value="k" />
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
        <span>条公告</span>
      </div>
      <div class="list-summary__meta">
        <span>状态：{{ activePublishStatusLabel }}</span>
        <span v-if="filters.keyword">关键词：{{ filters.keyword }}</span>
        <span>置顶公告会优先展示</span>
      </div>
    </div>

    <div class="table-card">
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="title" label="标题" show-overflow-tooltip />
        <el-table-column label="置顶" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.is_top" type="danger" size="small" round>置顶</el-tag>
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }"><StatusTag kind="publish" :value="row.status" size="small" /></template>
        </el-table-column>
        <el-table-column prop="created_at" label="发布时间" width="160">
          <template #default="{ row }">{{ fmtDate(row.created_at, 16) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="openDialog(row)">编辑</el-button>
            <el-popconfirm title="确认删除该公告？" width="200" @confirm="handleDelete(row.id)">
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

    <!-- 弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑公告' : '发布公告'"
      width="720px"
      class="admin-edit-dialog"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <div class="dialog-intro">{{ announcementDialogIntro }}</div>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="78px">
        <div class="dialog-grid">
          <el-form-item label="标题" prop="title" class="span-2">
            <el-input v-model="form.title" maxlength="60" show-word-limit placeholder="请输入公告标题" />
          </el-form-item>
          <el-form-item label="置顶">
            <el-switch v-model="form.is_top" :active-value="1" :inactive-value="0" active-text="置顶" inactive-text="普通" />
            <div class="field-help">置顶公告会排在前台公告列表最上方。</div>
          </el-form-item>
          <el-form-item label="状态">
            <el-radio-group v-model="form.status">
              <el-radio :value="1">发布</el-radio>
              <el-radio :value="0">草稿</el-radio>
            </el-radio-group>
            <div class="field-help">{{ announcementStatusHelp }}</div>
          </el-form-item>
          <el-form-item label="内容" prop="content" class="span-2">
            <el-input v-model="form.content" type="textarea" :rows="8" placeholder="写清时间、地点、对象和办理方式" />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <div class="dialog-actions">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitLoading" @click="handleSubmit">保存公告</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick, onMounted } from 'vue'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import DataToolbar from '@/components/admin/DataToolbar.vue'
import StatusTag from '@/components/StatusTag.vue'
import { PUBLISH_STATUS, fmtDate, dictLabel } from '@/utils/format'

const list = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = 15
const total = ref(0)
const filters = reactive({ keyword: '', status: '' })
const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const formRef = ref()
const submitLoading = ref(false)

const form = reactive({ title: '', content: '', is_top: 0, status: 1 })
const rules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }],
}

const activePublishStatusLabel = computed(() => (
  filters.status !== '' ? dictLabel(PUBLISH_STATUS, filters.status) : '全部状态'
))

const announcementDialogIntro = computed(() => (
  isEdit.value
    ? '公告修改后会影响前台公告展示，置顶状态也会立即同步。'
    : '公告适合发布活动、补贴、领养日等短信息，内容尽量直接可执行。'
))

const announcementStatusHelp = computed(() => (
  form.status === 1 ? '发布后前台用户可见。' : '草稿仅后台保留，不会展示到前台。'
))

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
    const res = await request.get('/content/announcements/all', { params: { ...filters, page: page.value, pageSize } })
    list.value = res.data?.list || []
    total.value = res.data?.total || 0
  } finally {
    loading.value = false
  }
}

async function openDialog(row) {
  isEdit.value = !!row
  editId.value = row?.id
  Object.assign(form, row || { title: '', content: '', is_top: 0, status: 1 })
  dialogVisible.value = true
  await nextTick()
  formRef.value?.clearValidate()
}

async function handleSubmit() {
  await formRef.value?.validate()
  submitLoading.value = true
  try {
    if (isEdit.value) {
      await request.put(`/content/announcements/${editId.value}`, form)
    } else {
      await request.post('/content/announcements', form)
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadData()
  } finally {
    submitLoading.value = false
  }
}

async function handleDelete(id) {
  await request.delete(`/content/announcements/${id}`)
  ElMessage.success('删除成功')
  loadData()
}
</script>

<style scoped>
.muted { color: var(--text-placeholder); }
</style>
