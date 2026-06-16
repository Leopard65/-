<template>
  <div class="not-found">
    <div class="nf-paw">🐾</div>
    <h1>404</h1>
    <p>抱歉，这个页面走丢了</p>
    <el-button type="primary" round @click="$router.push('/')">返回首页</el-button>
  </div>
</template>

<style scoped>
.not-found {
  text-align: center;
  padding: 90px 20px;
}
.nf-paw {
  font-size: 64px;
  opacity: 0.5;
  margin-bottom: 8px;
}
.not-found h1 {
  font-size: 72px;
  color: var(--brand);
  line-height: 1;
}
.not-found p {
  font-size: 17px;
  color: var(--text-secondary);
  margin: 12px 0 24px;
}
</style>
