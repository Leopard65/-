/**
 * 用户状态管理
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api'

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    localStorage.removeItem('user')
    return null
  }
}

export const useUserStore = defineStore('user', () => {
  // 状态
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref(readStoredUser())

  // 计算属性
  const isLoggedIn = computed(() => !!token.value)
  const username = computed(() => userInfo.value?.username || '')
  const role = computed(() => userInfo.value?.role || '')
  const isAdmin = computed(() => role.value === 'admin')

  // 登录
  async function login(credentials) {
    const data = await authApi.login(credentials)
    token.value = data.token
    userInfo.value = data.user
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    return data
  }

  // 登出
  function logout() {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  // 获取用户信息
  async function fetchUserInfo() {
    try {
      const data = await authApi.getMe()
      userInfo.value = data
      localStorage.setItem('user', JSON.stringify(data))
    } catch (error) {
      logout()
      throw error
    }
  }

  // 修改密码
  async function changePassword(passwordData) {
    return await authApi.changePassword(passwordData)
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    username,
    role,
    isAdmin,
    login,
    logout,
    fetchUserInfo,
    changePassword,
  }
})
