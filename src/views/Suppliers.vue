<template>
  <PageHeader title="供应商管理" description="供应商信息与联系方式" />
  <el-card>
    <CrudTable
      :data="suppliers"
      :loading="loading"
      :pagination="{ page, pageSize, total }"
      @add="openDialog()"
      @edit="openDialog"
      @delete="handleDelete"
      @page-change="handlePageChange"
      @size-change="handleSizeChange"
    >
      <template #actions>
        <el-button type="success" @click="handleExport">
          <el-icon style="margin-right:5px"><Download /></el-icon>
          导出
        </el-button>
      </template>

      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="name" label="供应商名称" />
      <el-table-column prop="contact" label="联系人" width="120" />
      <el-table-column prop="phone" label="电话" width="140" />
      <el-table-column prop="address" label="地址" />
    </CrudTable>

    <CrudDialog
      ref="dialogRef"
      :title="form.id ? '编辑供应商' : '新增供应商'"
      width="500px"
      label-width="80px"
      :rules="rules"
      :submit-fn="handleSave"
      @success="load"
    >
      <el-form-item label="名称" prop="name">
        <el-input v-model="form.name" />
      </el-form-item>
      <el-form-item label="联系人" prop="contact">
        <el-input v-model="form.contact" />
      </el-form-item>
      <el-form-item label="电话" prop="phone">
        <el-input v-model="form.phone" />
      </el-form-item>
      <el-form-item label="地址" prop="address">
        <el-input v-model="form.address" />
      </el-form-item>
    </CrudDialog>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import { suppliersApi } from '@/api'
import { exportSuppliers } from '@/utils/export'
import CrudTable from '@/components/CrudTable.vue'
import CrudDialog from '@/components/CrudDialog.vue'
import PageHeader from '@/components/PageHeader.vue'

const suppliers = ref([])
const loading = ref(false)
const dialogRef = ref(null)
const form = ref({})
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const rules = {
  name: [
    { required: true, message: '请输入供应商名称', trigger: 'blur' }
  ]
}

const load = async () => {
  loading.value = true
  try {
    const res = await suppliersApi.getSuppliers({ page: page.value, pageSize: pageSize.value })
    suppliers.value = res.data
    total.value = res.total
  } finally {
    loading.value = false
  }
}

const handlePageChange = (val) => {
  page.value = val
  load()
}

const handleSizeChange = (val) => {
  pageSize.value = val
  page.value = 1
  load()
}

const openDialog = (row) => {
  form.value = row ? { ...row } : { name: '', contact: '', phone: '', address: '' }
  dialogRef.value?.open(form.value)
}

const handleSave = async (formData) => {
  if (formData.id) {
    await suppliersApi.updateSupplier(formData.id, formData)
  } else {
    await suppliersApi.addSupplier(formData)
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除「${row.name}」？删除后可在回收站恢复`, '提示', { type: 'warning' })
    await suppliersApi.deleteSupplier(row.id)
    ElMessage.success('已删除')
    load()
  } catch (err) {
    if (err !== 'cancel') {
      // 错误已由拦截器处理
    }
  }
}

const handleExport = () => {
  exportSuppliers(suppliers.value)
  ElMessage.success('导出成功')
}

onMounted(load)
</script>
