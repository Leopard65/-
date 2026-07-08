import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

const devPort = Number(process.env.VITE_PORT) || 5173
const apiTarget = process.env.VITE_API_TARGET || 'http://localhost:3000'

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
    port: devPort,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true
      },
      '/uploads': {
        target: apiTarget,
        changeOrigin: true
      }
    }
  }
})
