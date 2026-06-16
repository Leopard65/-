<template>
  <div class="article-detail">
    <div v-if="loading && !article" class="article-body">
      <el-skeleton :rows="8" animated />
    </div>
    <template v-else-if="article">
      <el-button text class="back-btn" @click="$router.push('/articles')">
        <el-icon><ArrowLeft /></el-icon> 返回文章列表
      </el-button>

      <article class="article-body">
        <h1>{{ article.title }}</h1>
        <div class="meta">
          <StatusTag kind="article" :value="article.category" size="small" />
          <span>{{ article.created_at?.slice(0, 10) }}</span>
          <span><el-icon><View /></el-icon> 阅读 {{ article.view_count }}</span>
        </div>
        <div class="content" v-html="safeContent"></div>
      </article>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import DOMPurify from 'dompurify'
import request from '@/utils/request'
import StatusTag from '@/components/StatusTag.vue'

const route = useRoute()
const article = ref(null)
const loading = ref(false)

// 文章正文由后台富文本录入，渲染前用 DOMPurify 过滤，避免存储型 XSS
const safeContent = computed(() => DOMPurify.sanitize(article.value?.content || ''))

onMounted(async () => {
  loading.value = true
  try {
    const res = await request.get(`/content/articles/${route.params.id}`)
    article.value = res.data
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.back-btn {
  margin-bottom: 12px;
}
.article-body {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: 40px 48px;
  max-width: 820px;
  margin: 0 auto;
}
.article-body h1 {
  font-size: 26px;
  line-height: 1.4;
  margin-bottom: 14px;
}
.meta {
  display: flex;
  gap: 14px;
  align-items: center;
  font-size: 13px;
  color: var(--text-secondary);
  padding-bottom: 20px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--border-light);
}
.meta span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* 富文本正文排版 */
.content {
  line-height: 1.9;
  color: var(--text-regular);
  font-size: 15px;
}
.content :deep(h2),
.content :deep(h3) {
  color: var(--text-main);
  margin: 26px 0 12px;
}
.content :deep(p) {
  margin-bottom: 16px;
}
.content :deep(img) {
  max-width: 100%;
  border-radius: var(--radius);
  margin: 12px 0;
}
.content :deep(ul),
.content :deep(ol) {
  padding-left: 22px;
  margin-bottom: 16px;
}
.content :deep(li) {
  margin-bottom: 6px;
}
.content :deep(blockquote) {
  border-left: 3px solid var(--brand);
  background: var(--brand-lighter);
  padding: 10px 16px;
  border-radius: 0 8px 8px 0;
  color: var(--text-regular);
  margin: 16px 0;
}
.content :deep(a) {
  color: var(--brand);
}

@media (max-width: 768px) {
  .article-body {
    padding: 24px 18px;
  }
  .article-body h1 {
    font-size: 21px;
  }
}
</style>
