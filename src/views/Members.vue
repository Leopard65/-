<template>
  <el-card>
    <template #header>
      <span>会员管理</span>
    </template>

    <CrudTable
      :data="members"
      :loading="loading"
      :pagination="{ page, pageSize, total }"
      @add="openDialog()"
      @edit="openDialog"
      @delete="handleDelete"
      @page-change="handlePageChange"
      @size-change="handleSizeChange"
      @search="load"
      @reset="handleReset"
    >
      <template #search>
        <el-input v-model="keyword" placeholder="搜索姓名/手机号" clearable style="width:200px" @clear="load" @keyup.enter="load" />
      </template>

      <template #actions>
        <el-button type="success" @click="handleExport">
          <el-icon style="margin-right:5px"><Download /></el-icon>
          导出
        </el-button>
      </template>

      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="name" label="姓名" />
      <el-table-column prop="phone" label="手机号" width="140" />
      <el-table-column prop="level" label="等级" width="100">
        <template #default="{ row }">
          <el-tag :type="getLevelType(row.level)">{{ getLevelText(row.level) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="points" label="积分" width="100">
        <template #default="{ row }">
          <el-tag type="success">{{ row.points }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="total_spent" label="累计消费" width="120">
        <template #default="{ row }">¥{{ row.total_spent?.toFixed(2) }}</template>
      </el-table-column>
      <el-table-column prop="created_at" label="注册时间" width="180" />
    </CrudTable>

    <CrudDialog
      ref="dialogRef"
      :title="form.id ? '编辑会员' : '新增会员'"
      width="400px"
      label-width="80px"
      :rules="rules"
      :submit-fn="handleSave"
      @success="load"
    >
      <el-form-item label="姓名" prop="name">
        <el-input v-model="form.name" />
      </el-form-item>
      <el-form-item label="手机号" prop="phone">
        <el-input v-model="form.phone" />
      </el-form-item>
    </CrudDialog>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import { membersApi } from '@/api'
import { exportMembers } from '@/utils/export'
import CrudTable from '@/components/CrudTable.vue'
import CrudDialog from '@/components/CrudDialog.vue'

const members = ref([])
const keyword = ref('')
const loading = ref(false)
const dialogRef = ref(null)
const form = ref({})
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const rules = {
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }
  ]
}

// 会员等级类型映射（支持中文和英文）
const getLevelType = (level) => {
  const map = {
    // 英文键
    normal: 'info',
    silver: '',
    gold: 'warning',
    diamond: 'danger',
    // 中文键
    '普通会员': 'info',
    '银卡会员': '',
    '金卡会员': 'warning',
    '钻石会员': 'danger'
  }
  return map[level] || 'info'
}

// 会员等级文本映射（支持中文和英文）
const getLevelText = (level) => {
  const map = {
    // 英文键 -> 中文显示
    normal: '普通会员',
    silver: '银卡会员',
    gold: '金卡会员',
    diamond: '钻石会员',
    // 中文键 -> 直接显示
    '普通会员': '普通会员',
    '银卡会员': '银卡会员',
    '金卡会员': '金卡会员',
    '钻石会员': '钻石会员'
  }
  return map[level] || '普通会员'
}

const load = async () => {
  loading.value = true
  try {
    const res = await membersApi.getMembers({ page: page.value, pageSize: pageSize.value, keyword: keyword.value })
    members.value = res.data
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

const handleReset = () => {
  keyword.value = ''
  page.value = 1
  load()
}

const openDialog = (row) => {
  form.value = row ? { ...row } : { name: '', phone: '' }
  dialogRef.value?.open(form.value)
}

const handleSave = async (formData) => {
  if (formData.id) {
    await membersApi.updateMember(formData.id, formData)
  } else {
    await membersApi.addMember(formData)
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除会员「${row.name}」？删除后可在回收站恢复`, '提示', { type: 'warning' })
    await membersApi.deleteMember(row.id)
    ElMessage.success('已删除')
    load()
  } catch (err) {
    if (err !== 'cancel') {
      // 错误已由拦截器处理
    }
  }
}

const handleExport = () => {
  exportMembers(members.value)
  ElMessage.success('导出成功')
}

onMounted(load)
</script>
