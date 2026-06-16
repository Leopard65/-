<template>
  <div class="animal-list-page">
    <PageHeader title="待领养动物" subtitle="它们都已做好准备，期待与你相遇" />

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <el-select v-model="filters.category_id" placeholder="动物类型" clearable @change="onFilter" style="width: 150px">
        <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
      </el-select>
      <el-select v-model="filters.gender" placeholder="性别" clearable @change="onFilter" style="width: 120px">
        <el-option label="公" value="male" />
        <el-option label="母" value="female" />
      </el-select>
      <el-input
        v-model="filters.keyword"
        placeholder="搜索名称…"
        clearable
        @keyup.enter="onFilter"
        @clear="onFilter"
        style="width: 220px"
      >
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-button type="primary" @click="onFilter">搜索</el-button>
      <span v-if="!loading" class="result-count">共 {{ total }} 只</span>
    </div>

    <!-- 动物列表 -->
    <div class="list-body">
      <div v-if="loading" class="cards-grid">
        <CardSkeleton v-for="i in 8" :key="i" :height="170" />
      </div>
      <div v-else-if="animals.length" class="cards-grid">
        <AnimalCard v-for="animal in animals" :key="animal.id" :animal="animal" />
      </div>
      <EmptyState v-else description="没有符合条件的动物，换个筛选试试吧" />
    </div>

    <!-- 分页 -->
    <div v-if="total > pageSize" class="pagination pagination--center">
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
import PageHeader from '@/components/PageHeader.vue'
import AnimalCard from '@/components/AnimalCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import CardSkeleton from '@/components/CardSkeleton.vue'

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
  try {
    const catRes = await request.get('/categories')
    categories.value = catRes.data || []
  } catch { /* 忽略 */ }
  loadAnimals()
})

// 筛选条件变化：回到第一页再加载
function onFilter() {
  page.value = 1
  loadAnimals()
}

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
.filter-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  background: var(--bg-card);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  padding: 14px 18px;
  margin-bottom: 22px;
}
.result-count {
  margin-left: auto;
  font-size: 13px;
  color: var(--text-secondary);
}
.list-body {
  min-height: 200px;
}
@media (max-width: 768px) {
  .filter-bar {
    padding: 12px;
  }
  .result-count {
    margin-left: 0;
    width: 100%;
  }
}
</style>
