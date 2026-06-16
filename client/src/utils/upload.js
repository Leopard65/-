/**
 * 图片上传校验工具（前端预校验，统一各处规则）
 */
import { ElMessage } from 'element-plus'

const DEFAULT_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

/**
 * 校验上传图片的类型与大小
 * @param {File} file
 * @param {object} opts { maxSize: MB, types: string[] }
 * @returns {boolean}
 */
export function validateImage(file, opts = {}) {
  const { maxSize = 5, types = DEFAULT_TYPES } = opts
  const okType = types.includes(file.type)
  const okSize = file.size / 1024 / 1024 < maxSize
  if (!okType) {
    ElMessage.error('只能上传 JPG / PNG / GIF / WebP 格式的图片')
    return false
  }
  if (!okSize) {
    ElMessage.error(`图片大小不能超过 ${maxSize}MB`)
    return false
  }
  return true
}
