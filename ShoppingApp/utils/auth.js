import { STORAGE_KEYS } from '@/constants/status'

export const AUTH_TOKEN_KEYS = [
  STORAGE_KEYS.token,
  'uni_id_token',
  'uniIdToken',
  'token'
]

export const AUTH_USER_KEYS = [
  STORAGE_KEYS.userInfo,
  'userInfo'
]

const readFirst = (keys) => {
  for (const key of keys) {
    const value = uni.getStorageSync(key)
    if (value) return value
  }
  return null
}

export const readAuthToken = () => {
  const value = readFirst(AUTH_TOKEN_KEYS)
  if (!value) return ''
  if (typeof value === 'string') return value
  return value.token || ''
}

export const readAuthUser = () => readFirst(AUTH_USER_KEYS)

export const writeAuthSession = (token, userInfo = null) => {
  if (token) {
    for (const key of AUTH_TOKEN_KEYS) {
      uni.setStorageSync(key, token)
    }
  }

  if (userInfo) {
    for (const key of AUTH_USER_KEYS) {
      uni.setStorageSync(key, userInfo)
    }
  } else {
    for (const key of AUTH_USER_KEYS) {
      uni.removeStorageSync(key)
    }
  }
}

export const clearAuthSession = () => {
  for (const key of AUTH_TOKEN_KEYS) {
    uni.removeStorageSync(key)
  }
  for (const key of AUTH_USER_KEYS) {
    uni.removeStorageSync(key)
  }
}
