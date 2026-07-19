import { defineStore } from 'pinia'
import { api } from '@/api/client'
import { ROUTES } from '@/constants/routes'
import { maskPhone } from '@/utils/format'
import { readAuthToken, readAuthUser, writeAuthSession, clearAuthSession } from '@/utils/auth'
import runtimeConfig from '@/config/runtime'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: readAuthToken(),
    userInfo: readAuthUser(),
    privacyStatus: null,
    authCheckedAt: 0,
    redirectUrl: ''
  }),

  getters: {
    isLogin: (state) => Boolean(state.token),
    avatar: (state) => state.userInfo?.avatar || '/static/default-avatar.png',
    nickname: (state) => state.userInfo?.nickname || '未登录',
    phone: (state) => maskPhone(state.userInfo?.mobile),
    roles: (state) => {
      const role = state.userInfo?.role || state.userInfo?.roles || []
      if (Array.isArray(role)) return role.filter(Boolean)
      return role ? [role] : []
    },
    isAdmin: (state) => {
      const role = state.userInfo?.role || state.userInfo?.roles || []
      const roles = Array.isArray(role) ? role : (role ? [role] : [])
      return roles.includes('admin') || roles.includes('operator') || state.userInfo?.mobile === runtimeConfig.demoAccount.mobile
    }
  },

  actions: {
    setLoginInfo(token, userInfo = null) {
      this.token = token
      this.userInfo = userInfo
      writeAuthSession(token, userInfo)
    },
    async loginBySms(params) {
      const res = await api.user.loginBySms(params)
      if (res && res.code === 0) {
        this.setLoginInfo(res.token || res.data?.token || 'mock-token', res.userInfo || res.data?.userInfo)
      }
      return res
    },
    async loginByPassword(params) {
      const res = await api.user.loginByPassword(params)
      if (res && res.code === 0) {
        this.setLoginInfo(res.token || res.data?.token || 'mock-token', res.userInfo || res.data?.userInfo)
        if (!this.userInfo) await this.getUserInfo()
      }
      return res
    },
    async register(params) {
      const res = await api.user.register(params)
      if (res && res.code === 0) {
        this.setLoginInfo(res.token || res.data?.token || 'mock-token', res.userInfo || res.data?.userInfo)
        if (!this.userInfo) await this.getUserInfo()
      }
      return res
    },
    async getUserInfo() {
      const res = await api.user.getUserInfo()
      if (res && res.code === 0) {
        this.userInfo = res.data?.userInfo || res.userInfo
        writeAuthSession(this.token, this.userInfo)
      }
      return res
    },
    async checkToken() {
      const res = await api.user.checkToken({}, { showError: false, handleAuthError: false })
      const userInfo = res?.data?.userInfo || res?.userInfo
      if (res?.code === 0 && userInfo) {
        this.userInfo = userInfo
        this.authCheckedAt = Date.now()
        writeAuthSession(this.token, this.userInfo)
      }
      if (res?.code === 401) await this.logout()
      return res
    },
    async refreshAuthStatus() {
      if (!this.token) return { code: 401, msg: '请先登录' }
      return this.checkToken()
    },
    async updateUserInfo(params) {
      const res = await api.user.updateUserInfo(params)
      if (res && res.code === 0) await this.getUserInfo()
      return res
    },
    async changePassword(params) {
      return api.user.changePassword(params)
    },
    async getPrivacyStatus() {
      const res = await api.user.getPrivacyStatus({}, { showError: false })
      if (res?.code === 0) {
        this.privacyStatus = res.data?.privacyStatus || res.privacyStatus || null
      }
      return res
    },
    async updatePrivacyStatus(params) {
      const res = await api.user.updatePrivacyStatus(params)
      if (res?.code === 0) {
        this.privacyStatus = res.data?.privacyStatus || res.privacyStatus || params
      }
      return res
    },
    async requestAccountCancel(params) {
      return api.user.requestAccountCancel(params)
    },
    async logout() {
      const res = await api.user.logout({}, { showError: false })
      this.logoutAndClear()
      return res
    },
    logoutAndClear() {
      this.token = ''
      this.userInfo = null
      this.privacyStatus = null
      this.authCheckedAt = 0
      clearAuthSession()
    },
    requireLogin(redirectUrl) {
      if (this.isLogin) return true
      const redirect = redirectUrl || ROUTES.home
      uni.navigateTo({ url: `${ROUTES.login}?redirect=${encodeURIComponent(redirect)}` })
      return false
    },
    checkLogin() {
      return this.requireLogin()
    }
  }
})
