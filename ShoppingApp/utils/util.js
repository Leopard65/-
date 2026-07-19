import { readAuthToken } from '@/utils/auth'

/**
 * 工具函数
 */

// 格式化价格
export const formatPrice = (price) => {
  if (!price && price !== 0) return '0.00'
  return Number(price).toFixed(2)
}

// 格式化日期
export const formatDate = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  if (!date) return ''
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

// 格式化销量
export const formatSales = (sales) => {
  if (!sales) return '0'
  if (sales >= 10000) {
    return (sales / 10000).toFixed(1) + '万'
  }
  return sales.toString()
}

// 手机号验证
export const isValidPhone = (phone) => {
  return /^1[3-9]\d{9}$/.test(phone)
}

// 防抖
export const debounce = (fn, delay = 300) => {
  let timer = null
  return function (...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

// 节流
export const throttle = (fn, delay = 300) => {
  let last = 0
  return function (...args) {
    const now = Date.now()
    if (now - last >= delay) {
      last = now
      fn.apply(this, args)
    }
  }
}

// 检查登录状态
export const checkLogin = () => {
  const token = readAuthToken()
  if (!token) {
    uni.showModal({
      title: '提示',
      content: '请先登录',
      confirmText: '去登录',
      success: (res) => {
        if (res.confirm) {
          uni.navigateTo({ url: '/pages/login/login' })
        }
      }
    })
    return false
  }
  return true
}

// 跳转登录
export const goLogin = () => {
  uni.navigateTo({ url: '/pages/login/login' })
}

// 返回上一页或首页
export const goBack = () => {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.switchTab({ url: '/pages/index/index' })
  }
}

// 显示成功提示
export const showSuccess = (title = '操作成功') => {
  uni.showToast({ title, icon: 'success' })
}

// 显示错误提示
export const showError = (title = '操作失败') => {
  uni.showToast({ title, icon: 'none' })
}

// 确认对话框
export const confirm = (content, title = '提示') => {
  return new Promise((resolve) => {
    uni.showModal({
      title,
      content,
      success: (res) => {
        resolve(res.confirm)
      }
    })
  })
}

// 获取图片信息
export const getImageInfo = (src) => {
  return new Promise((resolve, reject) => {
    uni.getImageInfo({
      src,
      success: resolve,
      fail: reject
    })
  })
}

// 预览图片
export const previewImage = (urls, current = 0) => {
  uni.previewImage({
    urls,
    current: typeof current === 'number' ? urls[current] : current
  })
}
