/**
 * 用户状态管理
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import request from '@/utils/request'
import { getStoredUser, setStoredUser } from '@/utils/storage'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref(getStoredUser())

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => userInfo.value?.role === 'admin')

  // 登录
  async function login(form) {
    const res = await request.post('/auth/login', form)
    token.value = res.data.token
    userInfo.value = res.data.user
    localStorage.setItem('token', res.data.token)
    setStoredUser(res.data.user)
    return res
  }

  // 注册
  async function register(form) {
    return await request.post('/auth/register', form)
  }

  // 获取个人信息
  async function fetchProfile() {
    const res = await request.get('/auth/profile')
    userInfo.value = res.data
    setStoredUser(res.data)
    return res
  }

  // 退出登录
  function logout() {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return { token, userInfo, isLoggedIn, isAdmin, login, register, fetchProfile, logout }
})
