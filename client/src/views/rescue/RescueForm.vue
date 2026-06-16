<template>
  <div class="rescue-form-page form-page">
    <PageHeader
      title="发现流浪动物？提交救助信息"
      subtitle="留下线索，我们的救助团队会尽快跟进处理"
    />

    <!-- 信任引导条 -->
    <div class="trust-bar">
      <div class="trust-item"><el-icon><Promotion /></el-icon><div><b>快速响应</b><span>工作时间内尽快联系您核实</span></div></div>
      <div class="trust-item"><el-icon><Lock /></el-icon><div><b>信息保密</b><span>联系方式仅用于本次救助</span></div></div>
      <div class="trust-item"><el-icon><Phone /></el-icon><div><b>紧急热线</b><span>400-000-0000（9:00-18:00）</span></div></div>
    </div>

    <!-- 提交成功 -->
    <div v-if="submitted" class="surface-card success-card">
      <el-result icon="success" title="求助信息已提交" sub-title="感谢你的爱心，我们会尽快处理并与你联系。">
        <template #extra>
          <el-button type="primary" @click="resetForm">再提交一条</el-button>
          <el-button @click="$router.push('/')">返回首页</el-button>
        </template>
      </el-result>
    </div>

    <!-- 表单 -->
    <div v-else class="form-card">
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <div class="group-title">你的联系方式</div>
        <div class="grid-2">
          <el-form-item label="姓名" prop="reporter_name">
            <el-input v-model="form.reporter_name" placeholder="如何称呼你" />
          </el-form-item>
          <el-form-item label="联系电话" prop="phone">
            <el-input v-model="form.phone" placeholder="便于我们联系你核实" />
          </el-form-item>
        </div>

        <div class="group-title">动物情况</div>
        <el-form-item label="发现地点" prop="location">
          <el-input v-model="form.location" placeholder="请尽量详细，如：XX 路 XX 小区南门附近">
            <template #prefix><el-icon><LocationInformation /></el-icon></template>
          </el-input>
        </el-form-item>
        <el-form-item label="动物类型">
          <el-input v-model="form.animal_type" placeholder="如：猫、狗、兔子等" />
        </el-form-item>
        <el-form-item label="紧急程度">
          <el-radio-group v-model="form.urgency">
            <el-radio-button v-for="u in urgencyOptions" :key="u.value" :value="u.value">
              {{ u.label }}
            </el-radio-button>
          </el-radio-group>
          <p class="urgency-hint">{{ urgencyHint }}</p>
        </el-form-item>
        <el-form-item label="情况描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="5"
            placeholder="请描述动物的状况、数量、是否受伤、当前位置是否安全等"
          />
        </el-form-item>
        <el-form-item label="现场照片">
          <ImageUpload v-model="imageUrl" :width="160" :height="120" placeholder="上传现场照片（选填）" @change="(f) => (imageFile = f)" />
        </el-form-item>

        <p class="privacy-note">
          <el-icon><InfoFilled /></el-icon>
          提交即表示你同意我们将所留联系方式用于本次救助沟通。
        </p>

        <el-form-item>
          <el-button type="primary" size="large" round :loading="loading" @click="handleSubmit">
            提交求助
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import ImageUpload from '@/components/ImageUpload.vue'

const formRef = ref()
const loading = ref(false)
const submitted = ref(false)
const imageUrl = ref('')
const imageFile = ref(null)

const urgencyOptions = [
  { value: 'low', label: '不急' },
  { value: 'medium', label: '一般' },
  { value: 'high', label: '较急' },
  { value: 'critical', label: '紧急' },
]
const urgencyHintMap = {
  low: '动物暂时安全，可从容安排处理。',
  medium: '希望尽快处理，但暂无生命危险。',
  high: '动物处境较差，需要较快介入。',
  critical: '危及生命（受伤 / 被困 / 恶劣天气），我们将优先处理。',
}
const urgencyHint = computed(() => urgencyHintMap[form.urgency] || '')

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
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ''))
    if (imageFile.value) fd.append('image', imageFile.value)
    await request.post('/rescues', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    ElMessage.success('求助信息已提交，我们会尽快处理！')
    submitted.value = true
  } catch (e) {
    // 错误已在拦截器中处理
  } finally {
    loading.value = false
  }
}

function resetForm() {
  submitted.value = false
  formRef.value?.resetFields()
  form.urgency = 'medium'
  imageUrl.value = ''
  imageFile.value = null
}
</script>

<style scoped>
.trust-bar {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 20px;
}
.trust-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--bg-card);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  padding: 14px 16px;
}
.trust-item .el-icon {
  font-size: 22px;
  color: var(--brand);
  flex-shrink: 0;
}
.trust-item b {
  display: block;
  font-size: 14px;
  color: var(--text-main);
}
.trust-item span {
  font-size: 12px;
  color: var(--text-secondary);
}

.group-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-main);
  padding-left: 10px;
  border-left: 3px solid var(--brand);
  margin: 6px 0 16px;
}
.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0 18px;
}
.urgency-hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 6px;
  line-height: 1.5;
}
.privacy-note {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--brand-lighter);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 18px;
}
.success-card {
  padding: 20px;
}

@media (max-width: 768px) {
  .trust-bar {
    grid-template-columns: 1fr;
  }
  .grid-2 {
    grid-template-columns: 1fr;
  }
}
</style>
