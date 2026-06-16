import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    // 整站使用完整 Element Plus（含全部图标），其分包体积偏大属预期
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // 把大型第三方库拆成独立 chunk：改善缓存，并让 echarts 仅随看板按需加载
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('echarts') || id.includes('zrender')) return 'echarts'
          if (id.includes('element-plus') || id.includes('@element-plus')) return 'element-plus'
          if (id.includes('vue-router') || id.includes('/pinia') || id.includes('/@vue/') || id.includes('/vue/')) return 'vue-vendor'
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
