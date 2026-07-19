export const formatMoney = (value = 0) => {
  const amount = Number(value || 0)
  return amount.toFixed(2)
}

export const formatSales = (value = 0) => {
  const count = Number(value || 0)
  if (count >= 10000) return `${(count / 10000).toFixed(1)}万`
  return `${count}`
}

export const maskPhone = (phone = '') => {
  return phone ? phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : ''
}

export const formatDateTime = (timestamp = Date.now()) => {
  const date = new Date(timestamp)
  const pad = (num) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export const buildQuery = (params = {}) => {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&')
}

export const parseJsonParam = (value, fallback = null) => {
  if (!value) return fallback
  try {
    return JSON.parse(decodeURIComponent(value))
  } catch (error) {
    return fallback
  }
}
