<template>
  <div class="animal-form">
    <h2>{{ isEdit ? '编辑动物' : '录入动物' }}</h2>
    <el-card>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" style="max-width: 700px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="分类" prop="category_id">
          <el-select v-model="form.category_id" @change="onCategoryChange">
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="品种">
          <el-select v-model="form.breed_id" clearable>
            <el-option v-for="b in breeds" :key="b.id" :label="b.name" :value="b.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="性别">
          <el-radio-group v-model="form.gender">
            <el-radio label="unknown">未知</el-radio>
            <el-radio label="male">公</el-radio>
            <el-radio label="female">母</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="年龄">
          <el-input v-model="form.age" placeholder="如：约2岁" />
        </el-form-item>
        <el-form-item label="体重(kg)">
          <el-input-number v-model="form.weight" :min="0" :precision="1" />
        </el-form-item>
        <el-form-item label="毛色">
          <el-input v-model="form.color" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status">
            <el-option label="已救助" value="rescued" />
            <el-option label="可领养" value="available" />
            <el-option label="已领养" value="adopted" />
            <el-option label="寄养中" value="fostered" />
          </el-select>
        </el-form-item>
        <el-form-item label="已绝育">
          <el-switch v-model="form.is_sterilized" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="已接种">
          <el-switch v-model="form.is_vaccinated" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="健康状况">
          <el-input v-model="form.health_status" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="性格描述">
          <el-input v-model="form.personality" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="详细描述">
          <el-input v-model="form.description" type="textarea" :rows="4" />
        </el-form-item>
        <el-form-item label="救助日期">
          <el-date-picker v-model="form.rescue_date" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="救助地点">
          <el-input v-model="form.location" />
        </el-form-item>
        <el-form-item label="封面图片">
          <el-upload
            action="/api/animals"
            :show-file-list="false"
            :before-upload="beforeUpload"
            :http-request="handleUpload"
          >
            <img v-if="imageUrl" :src="imageUrl" style="width: 150px; border-radius: 6px" />
            <el-button v-else>选择图片</el-button>
          </el-upload>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSubmit">保存</el-button>
          <el-button @click="$router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const isEdit = computed(() => !!route.params.id)
const formRef = ref()
const loading = ref(false)
const categories = ref([])
const breeds = ref([])
const imageUrl = ref('')
const imageFile = ref(null)

const form = reactive({
  name: '', category_id: '', breed_id: '', gender: 'unknown',
  age: '', weight: null, color: '', status: 'rescued',
  is_sterilized: 0, is_vaccinated: 0, health_status: '',
  personality: '', description: '', rescue_date: '', location: '',
})

const rules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  category_id: [{ required: true, message: '请选择分类', trigger: 'change' }],
}

onMounted(async () => {
  const catRes = await request.get('/categories')
  categories.value = catRes.data || []

  if (isEdit.value) {
    const res = await request.get(`/animals/${route.params.id}`)
    Object.assign(form, res.data)
    if (res.data.image_url) imageUrl.value = res.data.image_url
    if (form.category_id) loadBreeds(form.category_id)
  }
})

async function onCategoryChange(val) {
  form.breed_id = ''
  if (val) loadBreeds(val)
}

async function loadBreeds(categoryId) {
  const res = await request.get(`/categories/${categoryId}/breeds`)
  breeds.value = res.data || []
}

function beforeUpload(file) {
  const isImage = ['image/jpeg', 'image/png', 'image/gif'].includes(file.type)
  const isLt5M = file.size / 1024 / 1024 < 5
  if (!isImage) ElMessage.error('只能上传图片')
  if (!isLt5M) ElMessage.error('图片不能超过 5MB')
  return isImage && isLt5M
}

function handleUpload({ file }) {
  imageFile.value = file
  imageUrl.value = URL.createObjectURL(file)
}

async function handleSubmit() {
  await formRef.value?.validate()
  loading.value = true
  try {
    const formData = new FormData()
    for (const [key, val] of Object.entries(form)) {
      if (val !== null && val !== undefined) formData.append(key, val)
    }
    if (imageFile.value) formData.append('image', imageFile.value)

    if (isEdit.value) {
      await request.put(`/animals/${route.params.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      ElMessage.success('更新成功')
    } else {
      await request.post('/animals', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      ElMessage.success('录入成功')
    }
    router.push('/admin/animals')
  } catch (e) {
    // handled
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.animal-form h2 { margin-bottom: 16px; }
</style>
