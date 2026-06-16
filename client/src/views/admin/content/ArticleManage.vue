<template>
  <div class="article-manage admin-view">
    <PageHeader title="文章管理" subtitle="维护领养须知、科普与故事文章">
      <el-button type="primary" @click="openDialog()">
        <el-icon style="margin-right: 4px"><Plus /></el-icon> 新建文章
      </el-button>
    </PageHeader>

    <div class="table-card">
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="title" label="标题" show-overflow-tooltip />
        <el-table-column label="分类" width="110">
          <template #default="{ row }"><StatusTag kind="article" :value="row.category" size="small" /></template>
        </el-table-column>
        <el-table-column prop="view_count" label="阅读" width="80" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }"><StatusTag kind="publish" :value="row.status" size="small" /></template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="160">
          <template #default="{ row }">{{ fmtDate(row.created_at, 16) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="openDialog(row)">编辑</el-button>
            <el-popconfirm title="确认删除该文章？" width="200" @confirm="handleDelete(row.id)">
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

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑文章' : '新建文章'" width="700px" top="5vh">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="form.category">
            <el-option v-for="(v, k) in ARTICLE_CATEGORY" :key="k" :label="v.label" :value="k" />
          </el-select>
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input v-model="form.content" type="textarea" :rows="12" placeholder="支持 HTML 格式，展示前会做安全过滤" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio :value="1">发布</el-radio>
            <el-radio :value="0">草稿</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import { ARTICLE_CATEGORY, fmtDate } from '@/utils/format'

const list = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = 15
const total = ref(0)
const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const formRef = ref()
const submitLoading = ref(false)

const form = reactive({ title: '', content: '', category: 'knowledge', status: 1 })
const rules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }],
}

onMounted(() => loadData())

async function loadData() {
  loading.value = true
  try {
    const res = await request.get('/content/articles/all', { params: { page: page.value, pageSize } })
    list.value = res.data?.list || []
    total.value = res.data?.total || 0
  } finally {
    loading.value = false
  }
}

async function openDialog(row) {
  isEdit.value = !!row
  editId.value = row?.id
  // 先用默认值/列表已有字段填充并打开弹窗
  Object.assign(form, {
    title: row?.title || '',
    content: '',
    category: row?.category || 'knowledge',
    status: row?.status ?? 1,
  })
  dialogVisible.value = true
  // 列表接口不返回 content，编辑时按 id 拉取完整详情回填正文
  if (row) {
    const res = await request.get(`/content/articles/${row.id}`)
    if (res?.data) {
      form.title = res.data.title
      form.content = res.data.content || ''
      form.category = res.data.category || 'knowledge'
      form.status = res.data.status
    }
  }
}

async function handleSubmit() {
  await formRef.value?.validate()
  submitLoading.value = true
  try {
    if (isEdit.value) {
      await request.put(`/content/articles/${editId.value}`, form)
    } else {
      await request.post('/content/articles', form)
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadData()
  } finally {
    submitLoading.value = false
  }
}

async function handleDelete(id) {
  await request.delete(`/content/articles/${id}`)
  ElMessage.success('删除成功')
  loadData()
}
</script>
