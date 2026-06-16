<template>
  <AuthShell headline="欢迎回来" text="登录后可申请领养、跟踪进度与查看回访记录。">
    <h2 class="auth-title">登录账号</h2>
    <p class="auth-sub">还没有账号？<router-link to="/register">立即注册</router-link></p>

    <el-form ref="formRef" :model="form" :rules="rules" label-width="0" size="large">
      <el-form-item prop="username">
        <el-input v-model="form.username" placeholder="用户名" :prefix-icon="User" />
      </el-form-item>
      <el-form-item prop="password">
        <el-input
          v-model="form.password"
          type="password"
          placeholder="密码"
          :prefix-icon="Lock"
          show-password
          @keyup.enter="handleLogin"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="loading" style="width: 100%" round @click="handleLogin">
          登 录
        </el-button>
      </el-form-item>
    </el-form>

    <router-link to="/" class="back-home">← 返回首页</router-link>
  </AuthShell>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { User, Lock } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import AuthShell from '@/components/AuthShell.vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const formRef = ref()
const loading = ref(false)

const form = reactive({ username: '', password: '' })
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function handleLogin() {
  await formRef.value?.validate()
  loading.value = true
  try {
    await userStore.login(form)
    ElMessage.success('登录成功')
    const redirect = route.query.redirect || '/'
    router.push(redirect)
  } catch (e) {
    // 错误已在拦截器中处理
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-title {
  font-size: 24px;
  margin-bottom: 6px;
}
.auth-sub {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 28px;
}
.auth-sub a {
  color: var(--brand);
}
.back-home {
  display: inline-block;
  margin-top: 12px;
  font-size: 13px;
  color: var(--text-secondary);
}
.back-home:hover {
  color: var(--brand);
}
</style>
