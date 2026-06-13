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
      <el-table-column prop="level" label="等级" width="100">
        <template #default="{ row }">
          <el-tag :type="levelType(row.level)">{{ levelText(row.level) }}</el-tag>
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
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button size="small" @click="openDialog(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div style="display:flex;justify-content:flex-end;margin-top:15px">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="load"
        @current-change="load"
      />
    </div>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑会员' : '新增会员'" width="400px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
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
const formRef = ref(null)
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

const levelType = (level) => {
  const map = { normal: 'info', silver: '', gold: 'warning', diamond: 'danger' }
  return map[level] || 'info'
}

const levelText = (level) => {
  const map = { normal: '普通', silver: '银卡', gold: '金卡', diamond: '钻石' }
  return map[level] || '普通'
}

const load = async () => {
  const res = await api.getMembers({ page: page.value, pageSize: pageSize.value, keyword: keyword.value })
  members.value = res.data
  total.value = res.total
}

const openDialog = (row) => {
  form.value = row ? { ...row } : { name: '', phone: '' }
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }

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
    // 错误已由拦截器处理
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除会员「${row.name}」？删除后可在回收站恢复`, '提示', { type: 'warning' })
    await api.deleteMember(row.id)
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
