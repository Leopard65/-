<template>
  <div class="not-found">
    <h1>404</h1>
    <p>抱歉，您访问的页面不存在</p>
    <el-button type="primary" size="large" @click="$router.push('/')">
      <el-icon style="margin-right:8px"><HomeFilled /></el-icon>
      返回首页
    </el-button>
  </div>
</template>

<script setup>
import { HomeFilled } from '@element-plus/icons-vue'
</script>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: var(--bg-page);
  color: var(--text-regular);
}

h1 {
  font-size: 120px;
  margin: 0;
  font-weight: 700;
  color: var(--color-primary);
  letter-spacing: 4px;
}

p {
  font-size: 18px;
  margin: 12px 0 32px;
  color: var(--text-secondary);
}
</style>
