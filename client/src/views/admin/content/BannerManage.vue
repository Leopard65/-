<template>
  <div class="banner-manage admin-view">
    <PageHeader title="轮播图管理" subtitle="维护首页顶部轮播图">
      <el-button type="primary" @click="openDialog()">
        <el-icon style="margin-right: 4px"><Plus /></el-icon> 添加轮播图
      </el-button>
    </PageHeader>

    <div class="table-card">
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column label="图片" width="160">
          <template #default="{ row }">
            <el-image
              :src="row.image_url"
              fit="cover"
              class="banner-thumb"
              :preview-src-list="[row.image_url]"
              preview-teleported
            >
              <template #error><div class="banner-thumb paw-mini">🐾</div></template>
            </el-image>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" show-overflow-tooltip />
        <el-table-column prop="link_url" label="链接" show-overflow-tooltip />
        <el-table-column prop="sort_order" label="排序" width="80" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small" round>
              {{ row.status === 1 ? '显示' : '隐藏' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="openDialog(row)">编辑</el-button>
            <el-popconfirm title="确认删除该轮播图？" width="200" @confirm="handleDelete(row.id)">
              <template #reference>
                <el-button text type="danger" size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑轮播图' : '添加轮播图'" width="500px">
      <el-form ref="formRef" :model="form" label-width="80px">
        <el-form-item label="标题">
          <el-input v-model="form.title" />
        </el-form-item>
        <el-form-item label="图片">
          <ImageUpload v-model="imageUrl" :width="240" :height="110" placeholder="上传轮播图" @change="onImagePick" />
        </el-form-item>
        <el-form-item label="跳转链接">
          <el-input v-model="form.link_url" placeholder="选填" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort_order" :min="0" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio :value="1">显示</el-radio>
            <el-radio :value="0">隐藏</el-radio>
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
import ImageUpload from '@/components/ImageUpload.vue'

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

function onImagePick(file) {
  imageFile.value = file
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
.banner-thumb {
  width: 120px;
  height: 56px;
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
