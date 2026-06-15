<template>
  <PageHeader title="用户管理" description="系统账号、角色与启用状态" />
  <el-card>
    <CrudTable
      :data="users"
      :loading="loading"
      :show-actions="false"
      action-width="220"
      @add="openDialog()"
    >
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="username" label="用户名" />
      <el-table-column prop="role" label="角色" width="120">
        <template #default="{ row }">
          <el-tag :type="row.role === 'admin' ? 'danger' : 'info'">{{ roleText(row.role) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '启用' : '禁用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="创建时间" width="180" />
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" link @click="openDialog(row)">编辑</el-button>
          <el-button
            size="small"
            :type="row.status === 1 ? 'warning' : 'success'"
            link
            @click="toggleStatus(row)"
          >
            {{ row.status === 1 ? '禁用' : '启用' }}
          </el-button>
        </template>
      </el-table-column>
    </CrudTable>

    <CrudDialog
      ref="dialogRef"
      :title="form.id ? '编辑用户' : '新增用户'"
      width="460px"
      label-width="90px"
      :rules="rules"
      :submit-fn="handleSave"
      @success="load"
    >
      <el-form-item label="用户名" prop="username">
        <el-input v-model="form.username" :disabled="!!form.id" placeholder="登录账号" />
      </el-form-item>
      <el-form-item :label="form.id ? '重置密码' : '密码'" prop="password">
        <el-input
          v-model="form.password"
          type="password"
          show-password
          :placeholder="form.id ? '留空则不修改密码' : '请输入初始密码'"
        />
      </el-form-item>
      <el-form-item label="角色" prop="role">
        <el-select v-model="form.role" style="width:100%">
          <el-option label="管理员" value="admin" />
          <el-option label="收银员" value="cashier" />
        </el-select>
      </el-form-item>
    </CrudDialog>
  </el-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { usersApi } from '@/api'
import CrudTable from '@/components/CrudTable.vue'
import CrudDialog from '@/components/CrudDialog.vue'
import PageHeader from '@/components/PageHeader.vue'

const users = ref([])
const loading = ref(false)
const dialogRef = ref(null)
const form = ref({})

// 新增时用户名/密码必填；编辑时用户名只读、密码留空表示不改
const rules = computed(() => ({
  username: form.value.id ? [] : [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: form.value.id ? [] : [{ required: true, message: '请输入初始密码', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }]
}))

const roleText = (role) => ({ admin: '管理员', cashier: '收银员' }[role] || role)

const load = async () => {
  loading.value = true
  try {
    users.value = await usersApi.getUsers()
  } finally {
    loading.value = false
  }
}

const openDialog = (row) => {
  form.value = row
    ? { id: row.id, username: row.username, role: row.role, password: '' }
    : { username: '', password: '', role: 'cashier' }
  dialogRef.value?.open(form.value)
}

const handleSave = async (formData) => {
  if (formData.id) {
    const payload = { role: formData.role }
    if (formData.password) payload.password = formData.password
    await usersApi.updateUser(formData.id, payload)
  } else {
    await usersApi.addUser({
      username: formData.username,
      password: formData.password,
      role: formData.role
    })
  }
}

const toggleStatus = async (row) => {
  const next = row.status === 1 ? 0 : 1
  const verb = next === 1 ? '启用' : '禁用'
  try {
    await ElMessageBox.confirm(`确定${verb}用户「${row.username}」？`, '提示', { type: 'warning' })
    await usersApi.updateUser(row.id, { status: next })
    ElMessage.success(`已${verb}`)
    load()
  } catch (err) {
    if (err !== 'cancel') {
      // 错误已由拦截器处理
    }
  }
}

onMounted(load)
</script>
