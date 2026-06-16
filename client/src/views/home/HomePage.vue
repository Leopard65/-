<template>
  <div class="home-page">
    <!-- 轮播图 -->
    <section class="banner-section">
      <el-carousel height="400px" v-if="banners.length">
        <el-carousel-item v-for="item in banners" :key="item.id">
          <div class="banner-item" :style="{ backgroundImage: `url(${item.image_url})` }">
            <div class="banner-overlay">
              <h2>{{ item.title }}</h2>
            </div>
          </div>
        </el-carousel-item>
      </el-carousel>
      <div v-else class="banner-placeholder">
        <h1>🐾 流浪动物救助与领养中心</h1>
        <p>用爱守护每一个小生命</p>
      </div>
    </section>

    <!-- 公告 -->
    <section class="section" v-if="announcements.length">
      <h3 class="section-title">📢 最新公告</h3>
      <div class="announcement-list">
        <div v-for="item in announcements" :key="item.id" class="announcement-item">
          <el-tag v-if="item.is_top" type="danger" size="small">置顶</el-tag>
          <span class="ann-title">{{ item.title }}</span>
          <span class="ann-date">{{ item.created_at?.slice(0, 10) }}</span>
        </div>
      </div>
    </section>

    <!-- 待领养动物推荐 -->
    <section class="section">
      <div class="section-header">
        <h3 class="section-title">🏠 待领养动物</h3>
        <el-button text type="primary" @click="$router.push('/animals')">查看更多 →</el-button>
      </div>
      <div class="animal-grid">
        <div
          v-for="animal in animals"
          :key="animal.id"
          class="animal-card"
          @click="$router.push(`/animals/${animal.id}`)"
        >
          <div class="card-image">
            <img v-if="animal.image_url" v-imgfb :src="animal.image_url" :alt="animal.name" />
            <div v-else class="card-image-placeholder">🐾</div>
            <el-tag class="card-status" :type="statusTagType(animal.status)">
              {{ statusText(animal.status) }}
            </el-tag>
          </div>
          <div class="card-body">
            <h4>{{ animal.name }}</h4>
            <p class="card-info">
              {{ animal.category_name }} · {{ animal.breed_name || '未知品种' }} · {{ animal.gender === 'male' ? '公' : animal.gender === 'female' ? '母' : '未知' }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- 快捷入口 -->
    <section class="section quick-links">
      <div class="quick-link" @click="$router.push('/rescue')">
        <div class="ql-icon">🆘</div>
        <h4>发现流浪动物</h4>
        <p>提交救助信息，帮助它们</p>
      </div>
      <div class="quick-link" @click="$router.push('/animals')">
        <div class="ql-icon">🏠</div>
        <h4>我要领养</h4>
        <p>给它一个温暖的家</p>
      </div>
      <div class="quick-link" @click="$router.push('/articles')">
        <div class="ql-icon">📖</div>
        <h4>养宠知识</h4>
        <p>科学养宠，从这里开始</p>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '@/utils/request'

const banners = ref([])
const announcements = ref([])
const animals = ref([])

onMounted(async () => {
  // 获取轮播图
  request.get('/content/banners').then(res => { banners.value = res.data || [] }).catch(() => {})
  // 获取公告
  request.get('/content/announcements').then(res => { announcements.value = res.data || [] }).catch(() => {})
  // 获取可领养动物
  request.get('/animals', { params: { status: 'available', pageSize: 8 } }).then(res => {
    animals.value = res.data?.list || []
  }).catch(() => {})
})

function statusText(status) {
  const map = { rescued: '已救助', available: '可领养', adopted: '已领养', fostered: '寄养中' }
  return map[status] || status
}

function statusTagType(status) {
  const map = { rescued: 'warning', available: 'success', adopted: 'info', fostered: '' }
  return map[status] || ''
}
</script>

<style scoped>
.home-page {
  padding-bottom: 40px;
}

.banner-section {
  margin: -20px -20px 20px;
  border-radius: 0 0 12px 12px;
  overflow: hidden;
}

.banner-item {
  height: 400px;
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: flex-end;
}

.banner-overlay {
  width: 100%;
  padding: 30px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.6));
  color: #fff;
}

.banner-overlay h2 {
  font-size: 28px;
}

.banner-placeholder {
  height: 400px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.banner-placeholder h1 {
  font-size: 36px;
  margin-bottom: 12px;
}

.banner-placeholder p {
  font-size: 18px;
  opacity: 0.9;
}

.section {
  margin-top: 32px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  font-size: 20px;
  color: #333;
  margin-bottom: 16px;
}

.section-header .section-title {
  margin-bottom: 0;
}

.announcement-list {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.announcement-item {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.announcement-item:last-child {
  border-bottom: none;
}

.ann-title {
  flex: 1;
  font-size: 14px;
}

.ann-date {
  color: #999;
  font-size: 13px;
}

.animal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.animal-card {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.animal-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.card-image {
  height: 180px;
  position: relative;
  overflow: hidden;
  background: #f5f5f5;
}

.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  background: linear-gradient(135deg, #e8f5e9, #f1f8e9);
}

.card-status {
  position: absolute;
  top: 8px;
  right: 8px;
}

.card-body {
  padding: 12px 16px;
}

.card-body h4 {
  font-size: 16px;
  margin-bottom: 4px;
}

.card-info {
  font-size: 13px;
  color: #999;
}

.quick-links {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.quick-link {
  background: #fff;
  border-radius: 12px;
  padding: 32px 24px;
  text-align: center;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.quick-link:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.ql-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.quick-link h4 {
  font-size: 18px;
  margin-bottom: 4px;
}

.quick-link p {
  font-size: 13px;
  color: #999;
}
</style>
