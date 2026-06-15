<template>
  <div class="adopt-apply-page">
    <h2>领养申请</h2>
    <el-card v-if="animal" class="animal-brief">
      <div class="brief-inner">
        <img v-if="animal.image_url" :src="animal.image_url" class="brief-img" />
        <div>
          <h3>{{ animal.name }}</h3>
          <p>{{ animal.category_name }} · {{ animal.breed_name || '未知品种' }}</p>
        </div>
      </div>
    </el-card>

    <el-card class="form-card">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="申请人姓名" prop="applicant_name">
          <el-input v-model="form.applicant_name" />
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="form.phone" />
        </el-form-item>
        <el-form-item label="身份证号">
          <el-input v-model="form.id_card" />
        </el-form-item>
        <el-form-item label="居住地址">
          <el-input v-model="form.address" />
        </el-form-item>
        <el-form-item label="住房类型">
          <el-radio-group v-model="form.housing_type">
            <el-radio label="自有">自有</el-radio>
            <el-radio label="租房">租房</el-radio>
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
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'

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
.adopt-apply-page h2 {
  margin-bottom: 16px;
}

.animal-brief {
  margin-bottom: 16px;
}

.brief-inner {
  display: flex;
  align-items: center;
  gap: 16px;
}

.brief-img {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  object-fit: cover;
}
</style>
