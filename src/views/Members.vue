<template>
  <el-card>
    <template #header>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span>会员管理</span>
        <div style="display:flex;gap:10px">
          <el-input v-model="keyword" placeholder="搜索姓名/手机号" clearable style="width:200px" @clear="load" @keyup.enter="load" />
          <el-button type="primary" @click="openDialog()">新增会员</el-button>
        </div>
      </div>
    </template>

    <el-table :data="members" stripe border style="width:100%">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="name" label="姓名" />
      <el-table-column prop="phone" label="手机号" width="140" />
      <el-table-column prop="points" label="积分" width="100">
        <template #default="{ row }">
          <el-tag type="success">{{ row.points }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="total_spent" label="累计消费" width="120">
        <template #default="{ row }">¥{{ row.total_spent?.toFixed(2) }}</template>
      </el-table-column>
      <el-table-column prop="created_at" label="注册时间" width="180" />
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button size="small" @click="openDialog(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑会员' : '新增会员'" width="400px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="姓名" required>
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="手机号" required>
          <el-input v-model="form.phone" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api'

const members = ref([])
const keyword = ref('')
const dialogVisible = ref(false)
const form = ref({})

const load = async () => { members.value = await api.getMembers({ keyword: keyword.value }) }

const openDialog = (row) => {
  form.value = row ? { ...row } : { name: '', phone: '' }
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!form.value.name || !form.value.phone) return ElMessage.warning('请填写完整')
  try {
    if (form.value.id) {
      await api.updateMember(form.value.id, form.value)
    } else {
      await api.addMember(form.value)
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    load()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '操作失败')
  }
}

const handleDelete = async (row) => {
  await ElMessageBox.confirm(`确定删除会员「${row.name}」？`, '提示', { type: 'warning' })
  await api.deleteMember(row.id)
  ElMessage.success('已删除')
  load()
}

onMounted(load)
</script>
