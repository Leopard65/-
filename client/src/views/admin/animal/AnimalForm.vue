<template>
  <div class="animal-form admin-view">
    <PageHeader :title="isEdit ? '编辑动物' : '录入动物'" :subtitle="isEdit ? '修改并保存动物档案' : '填写信息，为新成员建立档案'">
      <el-button @click="$router.back()">返回</el-button>
    </PageHeader>

    <div class="table-card">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" style="max-width: 720px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="给它起个名字" />
        </el-form-item>
        <el-form-item label="分类" prop="category_id">
          <el-select v-model="form.category_id" placeholder="请选择" @change="onCategoryChange">
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="品种">
          <el-select v-model="form.breed_id" clearable placeholder="请选择">
            <el-option v-for="b in breeds" :key="b.id" :label="b.name" :value="b.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="性别">
          <el-radio-group v-model="form.gender">
            <el-radio value="unknown">未知</el-radio>
            <el-radio value="male">公</el-radio>
            <el-radio value="female">母</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="年龄">
          <el-input v-model="form.age" placeholder="如：约 2 岁" />
        </el-form-item>
        <el-form-item label="体重(kg)">
          <el-input-number v-model="form.weight" :min="0" :precision="1" />
        </el-form-item>
        <el-form-item label="毛色">
          <el-input v-model="form.color" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status">
            <el-option v-for="(v, k) in ANIMAL_STATUS" :key="k" :label="v.label" :value="k" />
          </el-select>
        </el-form-item>
        <el-form-item label="健康情况">
          <el-space>
            <el-switch v-model="form.is_sterilized" :active-value="1" :inactive-value="0" active-text="已绝育" inline-prompt />
            <el-switch v-model="form.is_vaccinated" :active-value="1" :inactive-value="0" active-text="已接种" inline-prompt />
          </el-space>
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
          <ImageUpload v-model="imageUrl" :width="160" :height="120" placeholder="上传封面" @change="onImagePick" />
        </el-form-item>
        <el-form-item v-if="isEdit" label="相册图片">
          <div class="gallery-edit">
            <div v-for="(img, i) in galleryImages" :key="i" class="gimg">
              <el-image :src="img" fit="cover">
                <template #error><div class="gimg-ph">🐾</div></template>
              </el-image>
              <span class="gimg-del" title="删除" @click="removeImage(img)">×</span>
            </div>
          </div>
          <el-upload
            v-model:file-list="galleryFiles"
            :auto-upload="false"
            list-type="picture-card"
            accept="image/*"
            :limit="8"
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
          <el-button
            size="small"
            type="primary"
            style="margin-top: 8px"
            :loading="uploadingImages"
            :disabled="!galleryFiles.length"
            @click="uploadImages"
          >上传选中图片</el-button>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSubmit">保存</el-button>
          <el-button @click="$router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 救助档案事件（仅编辑模式可维护） -->
    <div v-if="isEdit" class="table-card archive-block">
      <div class="block-head">
        <span>救助档案事件</span>
        <span class="block-hint">记录体检、疫苗、绝育、上架等关键节点，将展示在动物详情页时间线</span>
      </div>

      <el-timeline v-if="events.length" class="ev-timeline">
        <el-timeline-item
          v-for="ev in events"
          :key="ev.id"
          :type="evType(ev.event_type)"
          :timestamp="fmtDate(ev.event_date)"
          placement="top"
        >
          <div class="ev-row">
            <StatusTag kind="animalEvent" :value="ev.event_type" size="small" />
            <span class="ev-title">{{ ev.title }}</span>
            <el-popconfirm title="确认删除该事件？" @confirm="deleteEvent(ev.id)">
              <template #reference>
                <el-button text type="danger" size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </div>
          <p v-if="ev.description" class="ev-desc">{{ ev.description }}</p>
        </el-timeline-item>
      </el-timeline>
      <EmptyState v-else description="暂无档案事件，添加第一条吧" :image-size="60" />

      <el-divider content-position="left">新增事件</el-divider>
      <el-form :model="eventForm" inline class="ev-form">
        <el-form-item label="类型">
          <el-select v-model="eventForm.event_type" style="width: 120px">
            <el-option v-for="(v, k) in ANIMAL_EVENT_TYPE" :key="k" :label="v.label" :value="k" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker v-model="eventForm.event_date" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 150px" />
        </el-form-item>
        <el-form-item label="标题">
          <el-input v-model="eventForm.title" placeholder="如：接种疫苗" style="width: 180px" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="eventForm.description" placeholder="选填" style="width: 220px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="savingEvent" @click="addEvent">添加</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import ImageUpload from '@/components/ImageUpload.vue'
import StatusTag from '@/components/StatusTag.vue'
import EmptyState from '@/components/EmptyState.vue'
import { ANIMAL_STATUS, ANIMAL_EVENT_TYPE, fmtDate } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const isEdit = computed(() => !!route.params.id)
const formRef = ref()
const loading = ref(false)
const categories = ref([])
const breeds = ref([])
const imageUrl = ref('')
const imageFile = ref(null)

// 相册图片
const galleryImages = ref([])
const galleryFiles = ref([])
const uploadingImages = ref(false)

// 档案事件
const events = ref([])
const savingEvent = ref(false)
const eventForm = reactive({ event_type: 'checkup', event_date: '', title: '', description: '' })

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
    galleryImages.value = parseList(res.data.images)
    if (form.category_id) loadBreeds(form.category_id)
    loadEvents()
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

// ImageUpload 已完成校验，仅需接收文件随表单提交
function onImagePick(file) {
  imageFile.value = file
}

// 相册：解析、上传、删除
function parseList(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try {
    const a = JSON.parse(raw)
    return Array.isArray(a) ? a : []
  } catch { return [] }
}

async function uploadImages() {
  if (!galleryFiles.value.length) return
  uploadingImages.value = true
  try {
    const fd = new FormData()
    galleryFiles.value.forEach((f) => { if (f.raw) fd.append('images', f.raw) })
    const res = await request.post(`/animals/${route.params.id}/images`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    galleryImages.value = res.data || []
    galleryFiles.value = []
    ElMessage.success('图片已上传')
  } finally {
    uploadingImages.value = false
  }
}

async function removeImage(url) {
  const res = await request.delete(`/animals/${route.params.id}/images`, { data: { url } })
  galleryImages.value = res.data || []
  ElMessage.success('图片已删除')
}

function evType(t) {
  return ANIMAL_EVENT_TYPE[t]?.type || 'primary'
}

async function loadEvents() {
  try {
    const res = await request.get(`/animals/${route.params.id}/events`)
    events.value = res.data || []
  } catch { events.value = [] }
}

async function addEvent() {
  if (!eventForm.event_date || !eventForm.title) {
    return ElMessage.warning('请填写事件日期和标题')
  }
  savingEvent.value = true
  try {
    await request.post(`/animals/${route.params.id}/events`, { ...eventForm })
    ElMessage.success('档案事件已添加')
    Object.assign(eventForm, { event_type: 'checkup', event_date: '', title: '', description: '' })
    loadEvents()
  } finally {
    savingEvent.value = false
  }
}

async function deleteEvent(eid) {
  await request.delete(`/animals/${route.params.id}/events/${eid}`)
  ElMessage.success('删除成功')
  loadEvents()
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
.archive-block {
  margin-top: 16px;
}
.block-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 16px;
  font-weight: 700;
  color: var(--text-main);
}
.block-hint {
  font-weight: 400;
  font-size: 12px;
  color: var(--text-secondary);
}
.ev-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ev-title {
  font-weight: 600;
  color: var(--text-main);
}
.ev-desc {
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 13px;
}
.ev-form {
  margin-top: 4px;
}
.gallery-edit {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}
.gimg {
  position: relative;
  width: 86px;
  height: 86px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-soft);
}
.gimg :deep(.el-image) {
  width: 100%;
  height: 100%;
}
.gimg-ph {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}
.gimg-del {
  position: absolute;
  top: 2px;
  right: 4px;
  width: 18px;
  height: 18px;
  line-height: 16px;
  text-align: center;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}
@media (max-width: 768px) {
  .block-hint { display: none; }
}
</style>
