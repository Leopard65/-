<template>
  <el-card>
    <template #header>
      <span>会员等级管理</span>
    </template>

    <CrudTable
      :data="levels"
      :loading="loading"
      @add="openDialog()"
      @edit="openDialog"
      @delete="handleDelete"
    >
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="等级名称" />
      <el-table-column prop="min_spent" label="升级门槛（累计消费）" width="180">
        <template #default="{ row }">¥{{ row.min_spent?.toFixed(2) }}</template>
      </el-table-column>
      <el-table-column prop="discount" label="折扣" width="120">
        <template #default="{ row }">
          <span v-if="row.discount < 1">{{ (row.discount * 10).toFixed(2) }} 折</span>
          <span v-else>无折扣</span>
        </template>
      </el-table-column>
      <el-table-column prop="points_rate" label="积分倍率" width="120">
        <template #default="{ row }">×{{ row.points_rate }}</template>
      </el-table-column>
      <el-table-column prop="created_at" label="创建时间" width="180" />
    </CrudTable>

    <CrudDialog
      ref="dialogRef"
      :title="form.id ? '编辑会员等级' : '新增会员等级'"
      width="460px"
      label-width="140px"
      :rules="rules"
      :submit-fn="handleSave"
      @success="load"
    >
      <el-form-item label="等级名称" prop="name">
        <el-input v-model="form.name" placeholder="如：金卡会员" />
      </el-form-item>
      <el-form-item label="升级门槛" prop="min_spent">
        <el-input-number v-model="form.min_spent" :min="0" :step="100" :precision="2" style="width:100%" />
      </el-form-item>
      <el-form-item label="折扣（0.1~1）" prop="discount">
        <el-input-number v-model="form.discount" :min="0.1" :max="1" :step="0.01" :precision="2" style="width:100%" />
      </el-form-item>
      <el-form-item label="积分倍率" prop="points_rate">
        <el-input-number v-model="form.points_rate" :min="0" :step="0.5" :precision="1" style="width:100%" />
      </el-form-item>
    </CrudDialog>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { memberLevelsApi } from '@/api'
import CrudTable from '@/components/CrudTable.vue'
import CrudDialog from '@/components/CrudDialog.vue'

const levels = ref([])
const loading = ref(false)
const dialogRef = ref(null)
const form = ref({})

const rules = {
  name: [{ required: true, message: '请输入等级名称', trigger: 'blur' }],
  min_spent: [{ required: true, message: '请输入升级门槛', trigger: 'blur' }]
}

const load = async () => {
  loading.value = true
  try {
    levels.value = await memberLevelsApi.getMemberLevels()
  } finally {
    loading.value = false
  }
}

const openDialog = (row) => {
  form.value = row
    ? { ...row }
    : { name: '', min_spent: 0, discount: 1, points_rate: 1 }
  dialogRef.value?.open(form.value)
}

const handleSave = async (formData) => {
  if (formData.id) {
    await memberLevelsApi.updateMemberLevel(formData.id, formData)
  } else {
    await memberLevelsApi.addMemberLevel(formData)
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定删除「${row.name}」？已绑定该等级的会员不会自动降级，请谨慎操作`,
      '提示',
      { type: 'warning' }
    )
    await memberLevelsApi.deleteMemberLevel(row.id)
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
