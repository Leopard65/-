<template>
  <PageHeader title="分类管理" description="维护商品分类，用于商品归类与筛选" />
  <el-card>
    <CrudTable
      :data="categories"
      :loading="loading"
      @add="openDialog()"
      @edit="openDialog"
      @delete="handleDelete"
    >
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="分类名称" />
      <el-table-column prop="created_at" label="创建时间" width="180" />
    </CrudTable>

    <CrudDialog
      ref="dialogRef"
      :title="form.id ? '编辑分类' : '新增分类'"
      width="400px"
      label-width="80px"
      :rules="rules"
      :submit-fn="handleSave"
      @success="load"
    >
      <el-form-item label="分类名称" prop="name">
        <el-input v-model="form.name" />
      </el-form-item>
    </CrudDialog>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { categoriesApi } from '@/api'
import CrudTable from '@/components/CrudTable.vue'
import CrudDialog from '@/components/CrudDialog.vue'
import PageHeader from '@/components/PageHeader.vue'

const categories = ref([])
const loading = ref(false)
const dialogRef = ref(null)
const form = ref({})

const rules = {
  name: [
    { required: true, message: '请输入分类名称', trigger: 'blur' }
  ]
}

const load = async () => {
  loading.value = true
  try {
    categories.value = await categoriesApi.getCategories()
  } finally {
    loading.value = false
  }
}

const openDialog = (row) => {
  form.value = row ? { ...row } : { name: '' }
  dialogRef.value?.open(form.value)
}

const handleSave = async (formData) => {
  if (formData.id) {
    await categoriesApi.updateCategory(formData.id, formData)
  } else {
    await categoriesApi.addCategory(formData)
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除「${row.name}」？删除后可在回收站恢复`, '提示', { type: 'warning' })
    await categoriesApi.deleteCategory(row.id)
    ElMessage.success('已删除')
    load()
  } catch (err) {
    if (err !== 'cancel') {
      // 错误已由拦截器处理
    }
  }
}

onMounted(load)
</script>
