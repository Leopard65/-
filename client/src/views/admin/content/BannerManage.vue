<template>
  <div class="banner-manage">
    <div class="page-header">
      <h2>轮播图管理</h2>
      <el-button type="primary" @click="openDialog()">添加轮播图</el-button>
    </div>

    <el-card>
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column label="图片" width="150">
          <template #default="{ row }">
            <img :src="row.image_url" style="width:120px;height:60px;border-radius:4px;object-fit:cover" />
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" />
        <el-table-column prop="link_url" label="链接" show-overflow-tooltip />
        <el-table-column prop="sort_order" label="排序" width="80" />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
              {{ row.status === 1 ? '显示' : '隐藏' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="openDialog(row)">编辑</el-button>
            <el-popconfirm title="确认删除？" @confirm="handleDelete(row.id)">
              <template #reference>
                <el-button text type="danger" size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑轮播图' : '添加轮播图'" width="500px">
      <el-form ref="formRef" :model="form" label-width="80px">
        <el-form-item label="标题">
          <el-input v-model="form.title" />
        </el-form-item>
        <el-form-item label="图片">
          <el-upload action="/api/content/banners" :show-file-list="false" :before-upload="beforeUpload" :http-request="handleUpload">
            <img v-if="imageUrl" :src="imageUrl" style="width: 200px; border-radius: 4px" />
            <el-button v-else>选择图片</el-button>
          </el-upload>
        </el-form-item>
        <el-form-item label="跳转链接">
          <el-input v-model="form.link_url" placeholder="选填" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort_order" :min="0" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio :label="1">显示</el-radio>
            <el-radio :label="0">隐藏</el-radio>
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

const list = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const formRef = ref()
const submitLoading = ref(false)
const imageUrl = ref('')
const imageFile = ref(null)

const form = reactive({ title: '', link_url: '', sort_order: 0, status: 1 })

onMounted(() => loadData())

async function loadData() {
  loading.value = true
  try {
    const res = await request.get('/content/banners/all')
    list.value = res.data || []
  } finally {
    loading.value = false
  }
}

function openDialog(row) {
  isEdit.value = !!row
  editId.value = row?.id
  Object.assign(form, row || { title: '', link_url: '', sort_order: 0, status: 1 })
  imageUrl.value = row?.image_url || ''
  imageFile.value = null
  dialogVisible.value = true
}

function beforeUpload(file) {
  const isImage = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)
  if (!isImage) ElMessage.error('只能上传图片')
  return isImage
}

function handleUpload({ file }) {
  imageFile.value = file
  imageUrl.value = URL.createObjectURL(file)
}

async function handleSubmit() {
  submitLoading.value = true
  try {
    const formData = new FormData()
    for (const [key, val] of Object.entries(form)) {
      formData.append(key, val)
    }
    if (imageFile.value) formData.append('image', imageFile.value)

    if (isEdit.value) {
      await request.put(`/content/banners/${editId.value}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    } else {
      await request.post('/content/banners', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadData()
  } finally {
    submitLoading.value = false
  }
}

async function handleDelete(id) {
  await request.delete(`/content/banners/${id}`)
  ElMessage.success('删除成功')
  loadData()
}
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
</style>
