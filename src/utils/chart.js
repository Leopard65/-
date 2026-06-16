/**
 * 统一 ECharts 视觉规范：配色与常用样式片段。
 * 所有图表共享同一调色板，避免各页面各写一套颜色，保证报表观感一致。
 * 注意：ECharts 需真实色值，无法直接吃 CSS 变量，故此处与 tokens.css 保持手工同步。
 */
export const CHART_PALETTE = [
  '#3b6fe0', // 主色
  '#11998e', // 墨青强调
  '#e6932e', // 橙
  '#2faa6e', // 绿
  '#e0564f', // 红
  '#8e7ce0', // 紫
  '#2fb3c4', // 青
  '#d98a3d'  // 琥珀
]

/** 折线/柱状常用网格（给坐标轴留足边距，避免标签拥挤）。 */
export const GRID = { left: 48, right: 24, top: 28, bottom: 32, containLabel: true }

/** 统一坐标轴/分割线样式片段。 */
export const AXIS_LINE = { lineStyle: { color: '#e5e6eb' } }
export const SPLIT_LINE = { lineStyle: { color: '#eef0f3' } }

/** 统一 tooltip 样式片段。 */
export const TOOLTIP = {
  backgroundColor: '#fff',
  borderColor: '#e5e6eb',
  textStyle: { color: '#1f2329' },
  extraCssText: 'box-shadow:0 4px 16px rgba(31,35,41,0.08);'
}
