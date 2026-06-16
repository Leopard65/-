import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'

// 全局样式（必须在 element-plus 之后，确保主题变量覆盖生效）
import './styles/theme.css'
import './styles/layout.css'
import './styles/admin.css'

import App from './App.vue'
import router from './router'
import { initTheme } from './composables/useTheme'

// 启动即应用已保存的明暗主题，避免首屏闪烁
initTheme()

// 图片加载失败兜底占位图（浅灰底 + 🐾），避免破图
const IMG_FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect width='100%25' height='100%25' fill='%23f3faf8'/%3E%3Ctext x='50%25' y='50%25' font-size='72' text-anchor='middle' dominant-baseline='central'%3E%F0%9F%90%BE%3C/text%3E%3C/svg%3E"

const app = createApp(App)

// 全局注册 Element Plus 图标（支持 <el-icon><User/></el-icon> 与 prefix-icon="User"）
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

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
