<template>
  <div class="adopt-apply-page form-page">
    <PageHeader title="领养申请" subtitle="填写真实信息，帮助我们为它找到合适的归宿" />

    <div v-if="animal" class="brief">
      <el-image v-if="animal.image_url" :src="animal.image_url" fit="cover" class="brief-img">
        <template #error><div class="brief-img paw-mini">🐾</div></template>
      </el-image>
      <div v-else class="brief-img paw-mini">🐾</div>
      <div class="brief-info">
        <h3>{{ animal.name }}</h3>
        <p>{{ animal.category_name }} · {{ animal.breed_name || '未知品种' }}</p>
        <StatusTag kind="animal" :value="animal.status" size="small" />
      </div>
    </div>

    <div class="form-card">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="申请人姓名" prop="applicant_name">
          <el-input v-model="form.applicant_name" />
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="form.phone" />
        </el-form-item>
        <el-form-item label="身份证号">
          <el-input v-model="form.id_card" placeholder="选填，仅用于领养核验" />
        </el-form-item>
        <el-form-item label="居住地址">
          <el-input v-model="form.address" />
        </el-form-item>
        <el-form-item label="住房类型">
          <el-radio-group v-model="form.housing_type">
            <el-radio value="自有">自有</el-radio>
            <el-radio value="租房">租房</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="养宠经验">
          <el-switch v-model="form.has_pet_exp" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item v-if="form.has_pet_exp" label="经验描述">
          <el-input v-model="form.pet_experience" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="领养理由" prop="reason">
          <el-input v-model="form.reason" type="textarea" :rows="4" placeholder="请说明您想领养的原因以及能提供的照顾条件" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSubmit">提交申请</el-button>
          <el-button @click="$router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'

const route = useRoute()
const router = useRouter()
const animal = ref(null)
const formRef = ref()
const loading = ref(false)

const form = reactive({
  applicant_name: '', phone: '', id_card: '', address: '',
  housing_type: '', has_pet_exp: 0, pet_experience: '', reason: '',
})

const rules = {
  applicant_name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [{ required: true, message: '请输入电话', trigger: 'blur' }],
  reason: [{ required: true, message: '请输入领养理由', trigger: 'blur' }],
}

onMounted(async () => {
  const res = await request.get(`/animals/${route.params.id}`)
  animal.value = res.data
})

async function handleSubmit() {
  await formRef.value?.validate()
  loading.value = true
  try {
    await request.post('/adoptions/apply', {
      ...form,
      animal_id: Number(route.params.id),
    })
    ElMessage.success('申请提交成功！')
    router.push('/adopt/mine')
  } catch (e) {
    // handled
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.brief {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--bg-card);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  padding: 16px;
  margin-bottom: 16px;
}
.brief-img {
  width: 84px;
  height: 84px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  flex-shrink: 0;
}
.paw-mini {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-soft);
  font-size: 32px;
}
.brief-info h3 {
  font-size: 18px;
  margin-bottom: 4px;
}
.brief-info p {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}
</style>
