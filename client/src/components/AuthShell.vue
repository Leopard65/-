<template>
  <div class="auth-shell">
    <el-icon class="auth-theme-btn" :title="isDark ? '切换到浅色' : '切换到深色'" @click="toggleTheme">
      <Moon v-if="!isDark" />
      <Sunny v-else />
    </el-icon>

    <!-- 品牌侧 -->
    <div class="auth-brand">
      <div class="brand-inner">
        <router-link to="/" class="brand-logo">
          <span class="paw">🐾</span>
          <span>流浪动物救助中心</span>
        </router-link>
        <h1 class="brand-headline">{{ headline }}</h1>
        <p class="brand-text">{{ text }}</p>
        <ul class="brand-points">
          <li>科学领养匹配，找到合适的伙伴</li>
          <li>透明救助流程，每一步可追踪</li>
          <li>领养回访 + 电子证书，让爱有始有终</li>
        </ul>
      </div>
    </div>

    <!-- 表单侧 -->
    <div class="auth-form-side">
      <div class="auth-card">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup>
import { useTheme } from '@/composables/useTheme'

const { isDark, toggleTheme } = useTheme()

defineProps({
  headline: { type: String, default: '让每个生命都被温柔以待' },
  text: {
    type: String,
    default: '加入我们，给流浪的小生命一个温暖的家。',
  },
})
</script>

<style scoped>
.auth-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  position: relative;
}
.auth-theme-btn {
  position: absolute;
  top: 18px;
  right: 18px;
  z-index: 5;
  font-size: 20px;
  color: var(--text-secondary);
  cursor: pointer;
}
.auth-theme-btn:hover {
  color: var(--brand);
}

/* 品牌侧：温暖的关怀绿渐变 + 柔和爪印纹理 */
.auth-brand {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: #fff;
  background: linear-gradient(150deg, #2f9e87 0%, #3aa890 45%, #1f6757 100%);
  overflow: hidden;
}
.auth-brand::after {
  content: '🐾';
  position: absolute;
  right: -30px;
  bottom: -40px;
  font-size: 260px;
  opacity: 0.07;
  transform: rotate(-12deg);
}
.brand-inner {
  position: relative;
  max-width: 420px;
}
.brand-logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 36px;
}
.brand-logo .paw {
  font-size: 26px;
}
.brand-headline {
  font-size: 32px;
  line-height: 1.3;
  color: #fff;
  margin-bottom: 16px;
}
.brand-text {
  font-size: 15px;
  opacity: 0.92;
  margin-bottom: 28px;
}
.brand-points {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.brand-points li {
  position: relative;
  padding-left: 26px;
  font-size: 14px;
  opacity: 0.95;
}
.brand-points li::before {
  content: '✓';
  position: absolute;
  left: 0;
  top: 0;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 表单侧 */
.auth-form-side {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  background: var(--bg-page);
}
.auth-card {
  width: 100%;
  max-width: 380px;
}

@media (max-width: 860px) {
  .auth-shell {
    grid-template-columns: 1fr;
  }
  .auth-brand {
    padding: 32px 24px;
    min-height: 220px;
  }
  .brand-logo {
    margin-bottom: 18px;
  }
  .brand-headline {
    font-size: 24px;
  }
  .brand-points {
    display: none;
  }
}
</style>
