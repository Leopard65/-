/**
 * 列表导出工具（前端生成 CSV，无需后端）
 */
import request from '@/utils/request'

/**
 * 翻页拉取某分页接口的全部数据（后端 pageSize 上限 100，故自动翻页汇总）
 * @param {string} url 接口路径
 * @param {object} params 查询条件（筛选）
 * @returns {Promise<Array>}
 */
export async function fetchAllPages(url, params = {}, pageSize = 100) {
  const all = []
  let page = 1
  for (let guard = 0; guard < 1000; guard++) {
    const res = await request.get(url, { params: { ...params, page, pageSize } })
    const list = res.data?.list || []
    all.push(...list)
    const total = res.data?.total ?? all.length
    if (list.length === 0 || all.length >= total) break
    page++
  }
  return all
}

// 转义单个 CSV 单元格
function csvCell(v) {
  if (v === null || v === undefined) return ''
  const s = String(v)
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

/**
 * 生成并下载 CSV
 * @param {string} filename 文件名（含 .csv）
 * @param {Array<{label:string, value:(row)=>any}>} columns 列定义
 * @param {Array} rows 数据
 */
export function exportCsv(filename, columns, rows) {
  const header = columns.map((c) => csvCell(c.label)).join(',')
  const body = rows
    .map((r) => columns.map((c) => csvCell(c.value(r))).join(','))
    .join('\n')
  // 前置 BOM，确保 Excel 以 UTF-8 打开不乱码
  const csv = '﻿' + header + '\n' + body
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}
