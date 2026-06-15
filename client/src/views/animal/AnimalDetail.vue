<template>
  <div class="animal-detail" v-loading="loading">
    <template v-if="animal">
      <div class="detail-top">
        <div class="detail-image">
          <img v-if="animal.image_url" :src="animal.image_url" :alt="animal.name" />
          <div v-else class="image-placeholder">🐾</div>
        </div>
        <div class="detail-info">
          <h1>{{ animal.name }}</h1>
          <el-tag :type="statusTagType(animal.status)" size="large">{{ statusText(animal.status) }}</el-tag>

          <div class="info-grid">
            <div class="info-item"><label>类型</label><span>{{ animal.category_name }}</span></div>
            <div class="info-item"><label>品种</label><span>{{ animal.breed_name || '未知' }}</span></div>
            <div class="info-item"><label>性别</label><span>{{ genderText(animal.gender) }}</span></div>
            <div class="info-item"><label>年龄</label><span>{{ animal.age || '未知' }}</span></div>
            <div class="info-item"><label>毛色</label><span>{{ animal.color || '未知' }}</span></div>
            <div class="info-item"><label>体重</label><span>{{ animal.weight ? animal.weight + 'kg' : '未知' }}</span></div>
            <div class="info-item"><label>已绝育</label><span>{{ animal.is_sterilized ? '是' : '否' }}</span></div>
            <div class="info-item"><label>已接种</label><span>{{ animal.is_vaccinated ? '是' : '否' }}</span></div>
          </div>

          <el-button
            v-if="animal.status === 'available'"
            type="primary"
            size="large"
            @click="$router.push(`/adopt/apply/${animal.id}`)"
          >
            申请领养
          </el-button>
          <el-button v-else size="large" disabled>
            {{ animal.status === 'adopted' ? '已被领养' : '暂不可领养' }}
          </el-button>
        </div>
      </div>

      <div class="detail-bottom">
        <h3>详细介绍</h3>
        <p>{{ animal.description || '暂无详细描述' }}</p>

        <h3>健康状况</h3>
        <p>{{ animal.health_status || '暂无健康信息' }}</p>

        <h3>性格特点</h3>
        <p>{{ animal.personality || '暂无性格描述' }}</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import request from '@/utils/request'

const route = useRoute()
const animal = ref(null)
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    const res = await request.get(`/animals/${route.params.id}`)
    animal.value = res.data
  } finally {
    loading.value = false
  }
})

function statusText(s) {
  return { rescued: '已救助', available: '可领养', adopted: '已领养', fostered: '寄养中' }[s] || s
}
function statusTagType(s) {
  return { rescued: 'warning', available: 'success', adopted: 'info', fostered: '' }[s] || ''
}
function genderText(g) {
  return { male: '公', female: '母' }[g] || '未知'
}
</script>

<style scoped>
.detail-top {
  display: flex;
  gap: 32px;
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
}

.detail-image {
  width: 400px;
  height: 360px;
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
  background: #f5f5f5;
}

.detail-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 80px;
  background: linear-gradient(135deg, #e8f5e9, #f1f8e9);
}

.detail-info {
  flex: 1;
}

.detail-info h1 {
  font-size: 28px;
  margin-bottom: 8px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin: 20px 0;
}

.info-item {
  display: flex;
  gap: 8px;
}

.info-item label {
  color: #999;
  min-width: 56px;
}

.detail-bottom {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
}

.detail-bottom h3 {
  font-size: 18px;
  margin: 16px 0 8px;
  color: #409eff;
}

.detail-bottom h3:first-child {
  margin-top: 0;
}

.detail-bottom p {
  color: #666;
  line-height: 1.8;
}
</style>
