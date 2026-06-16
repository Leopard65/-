<template>
  <div class="articles-page">
    <h2>科普文章</h2>
    <el-tabs v-model="category" @tab-change="loadArticles">
      <el-tab-pane label="全部" name="" />
      <el-tab-pane label="领养须知" name="guide" />
      <el-tab-pane label="科普知识" name="knowledge" />
      <el-tab-pane label="领养故事" name="story" />
    </el-tabs>

    <div class="article-list" v-loading="loading">
      <div v-for="item in articles" :key="item.id" class="article-item" @click="$router.push(`/articles/${item.id}`)">
        <img v-if="item.cover_image" v-imgfb :src="item.cover_image" class="article-cover" />
        <div class="article-info">
          <h3>{{ item.title }}</h3>
          <p class="article-meta">
            <el-tag size="small" :type="catType(item.category)">{{ catText(item.category) }}</el-tag>
            <span>{{ item.created_at?.slice(0, 10) }}</span>
            <span>阅读 {{ item.view_count }}</span>
          </p>
        </div>
      </div>
    </div>
    <el-empty v-if="!loading && articles.length === 0" description="暂无文章" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '@/utils/request'

const articles = ref([])
const loading = ref(false)
const category = ref('')

onMounted(() => loadArticles())

async function loadArticles() {
  loading.value = true
  try {
    const res = await request.get('/content/articles', { params: { category: category.value, pageSize: 20 } })
    articles.value = res.data?.list || []
  } finally {
    loading.value = false
  }
}

function catText(c) {
  return { guide: '领养须知', knowledge: '科普', story: '故事' }[c] || c
}
function catType(c) {
  return { guide: 'success', knowledge: 'primary', story: 'warning' }[c] || ''
}
</script>

<style scoped>
.articles-page h2 { margin-bottom: 16px; }
.article-item {
  display: flex;
  gap: 16px;
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: box-shadow 0.2s;
}
.article-item:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.article-cover { width: 160px; height: 100px; border-radius: 6px; object-fit: cover; }
.article-info { flex: 1; }
.article-info h3 { margin-bottom: 8px; }
.article-meta { display: flex; gap: 12px; align-items: center; font-size: 13px; color: #999; }
</style>
