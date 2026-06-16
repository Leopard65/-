<template>
  <div class="articles-page">
    <PageHeader title="科普文章" subtitle="领养须知、科学养宠与温暖的领养故事" />

    <el-tabs v-model="category" @tab-change="onTab" class="cat-tabs">
      <el-tab-pane label="全部" name="" />
      <el-tab-pane label="领养须知" name="guide" />
      <el-tab-pane label="科普知识" name="knowledge" />
      <el-tab-pane label="领养故事" name="story" />
    </el-tabs>

    <div class="list-body">
      <div v-if="loading" class="article-grid">
        <CardSkeleton v-for="i in 6" :key="i" :height="150" />
      </div>
      <div v-else-if="articles.length" class="article-grid">
        <article
          v-for="item in articles"
          :key="item.id"
          class="article-card"
          @click="$router.push(`/articles/${item.id}`)"
        >
          <div class="ac-cover">
            <img v-if="item.cover_image" v-imgfb :src="item.cover_image" :alt="item.title" />
            <div v-else class="paw-ph"></div>
            <StatusTag kind="article" :value="item.category" size="small" class="ac-cat" />
          </div>
          <div class="ac-content">
            <h3>{{ item.title }}</h3>
            <div class="ac-foot">
              <span>{{ item.created_at?.slice(0, 10) }}</span>
              <span><el-icon><View /></el-icon> {{ item.view_count }}</span>
            </div>
          </div>
        </article>
      </div>
      <EmptyState v-else description="该分类下暂无文章" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '@/utils/request'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import EmptyState from '@/components/EmptyState.vue'
import CardSkeleton from '@/components/CardSkeleton.vue'

const articles = ref([])
const loading = ref(false)
const category = ref('')

onMounted(() => loadArticles())

function onTab() {
  loadArticles()
}

async function loadArticles() {
  loading.value = true
  try {
    const res = await request.get('/content/articles', { params: { category: category.value, pageSize: 20 } })
    articles.value = res.data?.list || []
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.cat-tabs {
  margin-bottom: 8px;
}
.list-body {
  min-height: 200px;
}
.article-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 20px;
}
.article-card {
  background: var(--bg-card);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: transform 0.25s, box-shadow 0.25s;
}
.article-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow-lg);
}
.ac-cover {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: var(--bg-soft);
}
.ac-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}
.article-card:hover .ac-cover img {
  transform: scale(1.05);
}
.ac-cat {
  position: absolute;
  top: 10px;
  left: 10px;
}
.ac-content {
  padding: 14px 16px 16px;
}
.ac-content h3 {
  font-size: 16px;
  line-height: 1.5;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.ac-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--text-secondary);
}
.ac-foot span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
</style>
