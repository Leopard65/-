<template>
  <div class="animal-list-page">
    <h2 class="page-title">待领养动物</h2>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <el-select v-model="filters.category_id" placeholder="动物类型" clearable @change="loadAnimals">
        <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
      </el-select>
      <el-select v-model="filters.gender" placeholder="性别" clearable @change="loadAnimals">
        <el-option label="公" value="male" />
        <el-option label="母" value="female" />
      </el-select>
      <el-input v-model="filters.keyword" placeholder="搜索名称..." clearable @keyup.enter="loadAnimals" style="width: 200px">
        <template #append>
          <el-button @click="loadAnimals">搜索</el-button>
        </template>
      </el-input>
    </div>

    <!-- 动物列表 -->
    <div class="animal-grid" v-loading="loading">
      <div
        v-for="animal in animals"
        :key="animal.id"
        class="animal-card"
        @click="$router.push(`/animals/${animal.id}`)"
      >
        <div class="card-image">
          <img v-if="animal.image_url" :src="animal.image_url" :alt="animal.name" />
          <div v-else class="card-image-placeholder">🐾</div>
        </div>
        <div class="card-body">
          <h4>{{ animal.name }}</h4>
          <p>{{ animal.category_name }} · {{ animal.breed_name || '未知品种' }}</p>
          <p>{{ animal.gender === 'male' ? '公' : animal.gender === 'female' ? '母' : '未知' }} · {{ animal.age }}</p>
        </div>
      </div>
    </div>

    <el-empty v-if="!loading && animals.length === 0" description="暂无数据" />

    <!-- 分页 -->
    <div class="pagination" v-if="total > pageSize">
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next"
        @current-change="loadAnimals"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import request from '@/utils/request'

const animals = ref([])
const categories = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = 12
const total = ref(0)

const filters = reactive({
  category_id: '',
  gender: '',
  keyword: '',
})

onMounted(async () => {
  // 加载分类
  const catRes = await request.get('/categories')
  categories.value = catRes.data || []
  loadAnimals()
})

async function loadAnimals() {
  loading.value = true
  try {
    const res = await request.get('/animals', {
      params: { ...filters, status: 'available', page: page.value, pageSize },
    })
    animals.value = res.data?.list || []
    total.value = res.data?.total || 0
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.page-title {
  font-size: 24px;
  margin-bottom: 20px;
}

.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
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
  height: 200px;
  background: #f5f5f5;
  overflow: hidden;
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
  font-size: 56px;
  background: linear-gradient(135deg, #e8f5e9, #f1f8e9);
}

.card-body {
  padding: 12px 16px;
}

.card-body h4 {
  font-size: 16px;
  margin-bottom: 4px;
}

.card-body p {
  font-size: 13px;
  color: #999;
  margin-bottom: 2px;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}
</style>
