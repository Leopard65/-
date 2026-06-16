import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'

import App from './App.vue'
import router from './router'

// 图片加载失败兜底占位图（浅灰底 + 🐾），避免破图
const IMG_FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect width='100%25' height='100%25' fill='%23eef0f3'/%3E%3Ctext x='50%25' y='50%25' font-size='72' text-anchor='middle' dominant-baseline='central'%3E%F0%9F%90%BE%3C/text%3E%3C/svg%3E"

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ElementPlus, { locale: zhCn })

// v-imgfb：图片加载失败时替换为占位图（once 防止占位图再次触发）
app.directive('imgfb', {
  mounted(el) {
    el.addEventListener('error', () => {
      if (el.dataset.fb) return
      el.dataset.fb = '1'
      el.src = IMG_FALLBACK
    })
  },
})

app.mount('#app')
