/**
 * 统一格式化：金额 / 数量 / 时间
 * 全站显示口径一致，避免各页面各写一套 toFixed / 日期拼接。
 */

/** 金额：¥1,234.50（千分位，两位小数）。空值返回 ¥0.00 */
export function formatMoney(value, { symbol = '¥' } = {}) {
  const n = Number(value)
  if (!Number.isFinite(n)) return `${symbol}0.00`
  return symbol + n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** 数量：整数千分位（可带单位）。 */
export function formatNumber(value, unit = '') {
  const n = Number(value)
  const s = Number.isFinite(n) ? n.toLocaleString('zh-CN') : '0'
  return unit ? `${s} ${unit}` : s
}

/** 时间：YYYY-MM-DD HH:mm（接受 Date / 时间戳 / 可解析字符串）。 */
export function formatDateTime(value) {
  if (!value) return '-'
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  const p = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** 仅日期：YYYY-MM-DD */
export function formatDate(value) {
  if (!value) return '-'
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  const p = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
