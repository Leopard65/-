import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  build: {
    // echarts 已按需引入；element-plus 作为整套 UI 框架单独成块(~0.9MB)属预期，阈值放宽到 1MB
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // 按依赖分包：把体积大的库拆成独立 chunk，按需加载、利于缓存
        manualChunks: {
          echarts: ['echarts'],
          xlsx: ['xlsx'],
          'element-plus': ['element-plus', '@element-plus/icons-vue'],
          vue: ['vue', 'vue-router', 'pinia']
        }
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
