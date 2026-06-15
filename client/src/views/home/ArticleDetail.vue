<template>
  <div class="article-detail" v-loading="loading">
    <template v-if="article">
      <h1>{{ article.title }}</h1>
      <p class="meta">
        <el-tag size="small">{{ catText(article.category) }}</el-tag>
        <span>{{ article.created_at?.slice(0, 10) }}</span>
        <span>阅读 {{ article.view_count }}</span>
      </p>
      <div class="content" v-html="article.content"></div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import request from '@/utils/request'

const route = useRoute()
const article = ref(null)
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    const res = await request.get(`/content/articles/${route.params.id}`)
    article.value = res.data
  } finally {
    loading.value = false
  }
})

function catText(c) {
  return { guide: '领养须知', knowledge: '科普', story: '故事' }[c] || c
}
</script>

<style scoped>
.article-detail { background: #fff; border-radius: 12px; padding: 32px; max-width: 800px; margin: 0 auto; }
.article-detail h1 { margin-bottom: 12px; }
.meta { display: flex; gap: 12px; align-items: center; font-size: 13px; color: #999; margin-bottom: 24px; }
.content { line-height: 1.8; color: #333; }
.content :deep(img) { max-width: 100%; border-radius: 8px; }
</style>
