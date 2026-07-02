<template>
  <div class="login-page">
    <!-- 左侧品牌面板 -->
    <div class="login-brand">
      <div class="brand-inner">
        <div class="brand-logo"><el-icon><Shop /></el-icon></div>
        <h1 class="brand-title">超市管理系统</h1>
        <p class="brand-sub">StoreOps Console</p>
        <div class="shelf-strip" aria-hidden="true">
          <img src="/products/kelecola.jpg" alt="" />
          <img src="/products/yili.jpg" alt="" />
          <img src="/products/laoganma.jpg" alt="" />
          <img src="/products/vida.jpg" alt="" />
        </div>
        <ul class="brand-features">
          <li><span class="dot"></span>商品 · 库存 · 会员一体化管理</li>
          <li><span class="dot"></span>销售收银与多维报表分析</li>
          <li><span class="dot"></span>多角色权限 · 操作全程可追溯</li>
        </ul>
      </div>
      <div class="brand-foot">毕业设计演示系统 · v1.0</div>
    </div>

    <!-- 右侧登录表单 -->
    <div class="login-form-wrap">
      <div class="login-form">
        <h2 class="form-title">登录</h2>
        <p class="form-sub">欢迎回来，请登录以继续</p>
        <el-form :model="form" @keyup.enter="handleLogin">
          <el-form-item label="用户名">
            <el-input
              v-model="form.username"
              placeholder="请输入用户名"
              :prefix-icon="User"
              autocomplete="username"
              size="large"
            />
          </el-form-item>
          <el-form-item label="密码">
            <el-input
              v-model="form.password"
              placeholder="请输入密码"
              :prefix-icon="Lock"
              type="password"
              show-password
              autocomplete="current-password"
              size="large"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" size="large" class="login-submit" :loading="loading" @click="handleLogin">
              登录
            </el-button>
          </el-form-item>
        </el-form>
        <div class="form-tip">默认账号：admin / admin123</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Lock, Shop, User } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const form = ref({ username: '', password: '' })

const handleLogin = async () => {
  if (loading.value) return
  if (!form.value.username || !form.value.password) {
    return ElMessage.warning('请输入用户名和密码')
  }

  loading.value = true
  try {
    await userStore.login(form.value)
    ElMessage.success('登录成功')
    router.push('/')
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  min-height: 100dvh;
  background:
    linear-gradient(90deg, rgba(23, 107, 77, 0.06) 1px, transparent 1px),
    linear-gradient(180deg, rgba(23, 107, 77, 0.06) 1px, transparent 1px),
    var(--bg-page);
  background-size: 30px 30px;
}

.login-brand {
  flex: 1.1;
  background:
    linear-gradient(180deg, rgba(217, 154, 24, 0.12), transparent 42%),
    var(--sidebar-bg);
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 60px 56px;
  position: relative;
}
.brand-logo {
  width: 72px; height: 72px;
  border-radius: var(--radius-lg);
  background: rgba(217, 154, 24, 0.14);
  color: var(--color-accent);
  display: flex; align-items: center; justify-content: center;
  font-size: 40px;
}
.brand-title { font-size: 34px; font-weight: 800; margin: 22px 0 4px; letter-spacing: 0; }
.brand-sub { color: #9eb0a6; margin: 0 0 28px; font-size: 14px; font-family: var(--font-data); }
.shelf-strip {
  display: grid;
  grid-template-columns: repeat(4, 72px);
  gap: 12px;
  margin: 0 0 36px;
  padding: 14px;
  width: max-content;
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.05);
  box-shadow: inset 0 -4px 0 rgba(217, 154, 24, 0.16);
}
.shelf-strip img {
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: var(--radius-md);
  background: #fff;
}
.brand-features { list-style: none; padding: 0; margin: 0; }
.brand-features li {
  display: flex; align-items: center;
  margin-bottom: 18px; font-size: 15px; color: #c9d2de;
}
.brand-features .dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--color-accent); margin-right: 12px; flex-shrink: 0;
}
.brand-foot {
  position: absolute; bottom: 32px; left: 56px;
  color: #6b7a8d; font-size: 13px;
}

/* 右侧表单 */
.login-form-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
}
.login-form {
  width: min(380px, 100%);
  padding: 32px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--border-color-light);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}
.login-form :deep(.el-form-item__label) {
  color: var(--text-regular);
  font-weight: 600;
}
.form-title { margin: 0; font-size: 28px; color: var(--text-primary); font-weight: 800; }
.form-sub { color: var(--text-secondary); margin: 6px 0 28px; font-size: 14px; }
.login-submit { width: 100%; height: 44px; font-weight: 700; }
.form-tip { text-align: center; color: var(--text-placeholder); font-size: 12px; margin-top: 8px; }

/* 窄屏隐藏品牌面板 */
@media (max-width: 768px) {
  .login-brand { display: none; }
  .login-form-wrap { padding: 20px; }
  .login-form { padding: 24px; }
}
</style>
