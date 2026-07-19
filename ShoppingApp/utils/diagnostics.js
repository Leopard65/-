import { STORAGE_KEYS } from '@/constants/status'

const MAX_ERROR_LOGS = 8

const safeRead = (key, fallback) => {
  try {
    const value = uni.getStorageSync(key)
    return value || fallback
  } catch (error) {
    return fallback
  }
}

const safeWrite = (key, value) => {
  try {
    uni.setStorageSync(key, value)
  } catch (error) {
    // 本地诊断日志不能影响主流程。
  }
}

export const readApiErrorLogs = () => safeRead(STORAGE_KEYS.apiErrors, [])

export const clearApiErrorLogs = () => {
  try {
    uni.removeStorageSync(STORAGE_KEYS.apiErrors)
  } catch (error) {
    // ignore
  }
}

export const recordApiError = (entry = {}) => {
  const logs = readApiErrorLogs()
  const next = [
    {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      time: Date.now(),
      cloudFunction: entry.cloudFunction || '',
      action: entry.action || '',
      category: entry.category || 'unknown',
      code: entry.code || 0,
      msg: String(entry.msg || '接口调用失败').slice(0, 80)
    },
    ...logs
  ].slice(0, MAX_ERROR_LOGS)

  safeWrite(STORAGE_KEYS.apiErrors, next)
  return next
}
