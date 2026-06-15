/**
 * 通用验证工具
 */

// 分页参数解析
const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize) || 10));
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
};

// 清理搜索关键词
const sanitizeSearch = (keyword) => {
  if (!keyword) return '';
  return keyword.trim().replace(/[%_]/g, '\\$&');
};

module.exports = { parsePagination, sanitizeSearch };
