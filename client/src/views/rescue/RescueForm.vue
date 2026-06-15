<template>
  <div class="rescue-form-page">
    <h2>🆘 发现流浪动物？提交救助信息</h2>
    <p class="desc">如果您发现了需要救助的流浪动物，请填写以下信息，我们会尽快安排处理。</p>

    <el-card class="form-card">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="您的姓名" prop="reporter_name">
          <el-input v-model="form.reporter_name" />
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="form.phone" />
        </el-form-item>
        <el-form-item label="发现地点" prop="location">
          <el-input v-model="form.location" placeholder="请尽量详细描述地点" />
        </el-form-item>
        <el-form-item label="动物类型">
          <el-input v-model="form.animal_type" placeholder="如：猫、狗、兔子等" />
        </el-form-item>
        <el-form-item label="紧急程度">
          <el-select v-model="form.urgency">
            <el-option label="低" value="low" />
            <el-option label="中" value="medium" />
            <el-option label="高" value="high" />
            <el-option label="紧急" value="critical" />
          </el-select>
        </el-form-item>
        <el-form-item label="情况描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="5" placeholder="请描述动物的状况、数量、是否受伤等" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSubmit">提交求助</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'

const formRef = ref()
const loading = ref(false)

const form = reactive({
  reporter_name: '', phone: '', location: '', animal_type: '',
  urgency: 'medium', description: '',
})

const rules = {
  reporter_name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [{ required: true, message: '请输入电话', trigger: 'blur' }],
  location: [{ required: true, message: '请输入地点', trigger: 'blur' }],
  description: [{ required: true, message: '请描述情况', trigger: 'blur' }],
}

async function handleSubmit() {
  await formRef.value?.validate()
  loading.value = true
  try {
    await request.post('/rescues', form)
    ElMessage.success('求助信息已提交，我们会尽快处理！')
    formRef.value?.resetFields()
  } catch (e) {
    // handled
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.rescue-form-page h2 { margin-bottom: 8px; }
.desc { color: #666; margin-bottom: 20px; }
.form-card { max-width: 700px; }
</style>
