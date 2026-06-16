<template>
  <div class="login-page">
    <!-- 左侧品牌面板 -->
    <div class="login-brand">
      <div class="brand-inner">
        <div class="brand-logo"><el-icon><Shop /></el-icon></div>
        <h1 class="brand-title">超市管理系统</h1>
        <p class="brand-sub">Supermarket Management System</p>
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
          <el-form-item>
            <el-input v-model="form.username" placeholder="用户名" prefix-icon="User" size="large" />
          </el-form-item>
          <el-form-item>
            <el-input v-model="form.password" placeholder="密码" prefix-icon="Lock" type="password" show-password size="large" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" size="large" style="width:100%" :loading="loading" @click="handleLogin">
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
import { Shop } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const form = ref({ username: '', password: '' })

const handleLogin = async () => {
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
  min-height: 100vh;
  background: #f0f2f5;
}

/* 左侧品牌面板：复用侧栏深色，专业克制，无渐变 */
.login-brand {
  flex: 1.1;
  background: var(--sidebar-bg);
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
  background: rgba(59, 111, 224, 0.16);
  color: var(--color-primary);
  display: flex; align-items: center; justify-content: center;
  font-size: 40px;
}
.brand-title { font-size: 32px; font-weight: 600; margin: 22px 0 4px; }
.brand-sub { color: #9aa7b8; letter-spacing: 1px; margin: 0 0 44px; font-size: 14px; }
.brand-features { list-style: none; padding: 0; margin: 0; }
.brand-features li {
  display: flex; align-items: center;
  margin-bottom: 18px; font-size: 15px; color: #c9d2de;
}
.brand-features .dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--color-primary); margin-right: 12px; flex-shrink: 0;
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
}
.login-form { width: 340px; }
.form-title { margin: 0; font-size: 26px; color: var(--text-primary); }
.form-sub { color: var(--text-secondary); margin: 6px 0 28px; font-size: 14px; }
.form-tip { text-align: center; color: var(--text-placeholder); font-size: 12px; margin-top: 8px; }

/* 窄屏隐藏品牌面板 */
@media (max-width: 768px) {
  .login-brand { display: none; }
}
</style>
