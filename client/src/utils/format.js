/**
 * 集中字典与格式化工具
 * 统一全站的状态文案 / 标签颜色 / 性别 / 日期格式，避免各页面重复定义。
 *
 * 每个字典项：{ label: 展示文案, type: el-tag 颜色类型 }
 * el-tag type 合法值：'' | 'success' | 'info' | 'warning' | 'danger'
 */

// 动物状态
export const ANIMAL_STATUS = {
  rescued: { label: '已救助', type: 'warning' },
  available: { label: '可领养', type: 'success' },
  adopted: { label: '已领养', type: 'info' },
  fostered: { label: '寄养中', type: '' },
}

// 领养申请状态
export const ADOPTION_STATUS = {
  pending: { label: '待审核', type: 'warning' },
  approved: { label: '已通过', type: 'success' },
  rejected: { label: '已拒绝', type: 'danger' },
  completed: { label: '已完成', type: 'info' },
  cancelled: { label: '已取消', type: 'info' },
}

// 救助求助状态
export const RESCUE_STATUS = {
  pending: { label: '待处理', type: 'warning' },
  processing: { label: '处理中', type: '' },
  resolved: { label: '已解决', type: 'success' },
  closed: { label: '已关闭', type: 'info' },
}

// 紧急程度
export const URGENCY = {
  low: { label: '低', type: 'info' },
  medium: { label: '中', type: '' },
  high: { label: '高', type: 'warning' },
  critical: { label: '紧急', type: 'danger' },
}

// 文章分类
export const ARTICLE_CATEGORY = {
  guide: { label: '领养须知', type: 'success' },
  knowledge: { label: '科普知识', type: '' },
  story: { label: '领养故事', type: 'warning' },
}

// 发布状态（文章 / 公告 / 轮播）——数字键
export const PUBLISH_STATUS = {
  1: { label: '已发布', type: 'success' },
  0: { label: '草稿', type: 'info' },
}

// 动物档案事件类型
export const ANIMAL_EVENT_TYPE = {
  rescue: { label: '救助', type: 'warning' },
  checkup: { label: '体检', type: 'info' },
  vaccine: { label: '疫苗', type: 'success' },
  sterilize: { label: '绝育', type: 'success' },
  listing: { label: '上架', type: '' },
  adopted: { label: '领养', type: 'info' },
  followup: { label: '回访', type: '' },
  other: { label: '其他', type: 'info' },
}

// 救助处理日志动作
export const RESCUE_ACTION = {
  created: { label: '提交求助', type: 'info' },
  processing: { label: '受理处理', type: '' },
  resolved: { label: '已解决', type: 'success' },
  closed: { label: '已关闭', type: 'info' },
  note: { label: '处理备注', type: 'warning' },
}

// 性别
export const GENDER = { male: '公', female: '母', unknown: '未知' }

/** 取字典文案 */
export function dictLabel(map, value) {
  return map?.[value]?.label ?? value
}
/** 取字典颜色类型 */
export function dictType(map, value) {
  return map?.[value]?.type ?? ''
}

/** 性别文案 */
export function genderText(g) {
  return GENDER[g] || '未知'
}

/**
 * 日期裁剪：后端返回 ISO 字符串，按需取前 N 位
 * fmtDate(v)        -> 2026-06-17
 * fmtDate(v, 16)    -> 2026-06-17 10:30
 * fmtDate(v, 'md')  -> 06-17 10:30
 */
export function fmtDate(v, len = 10) {
  if (!v) return ''
  if (len === 'md') return String(v).slice(5, 16).replace('T', ' ')
  return String(v).slice(0, len).replace('T', ' ')
}
