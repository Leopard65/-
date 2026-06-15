/**
 * 统一响应格式工具
 */

// 成功响应
const success = (res, data = null, message = '操作成功') => {
  res.json({ code: 200, message, data });
};

// 分页成功响应
const paginated = (res, { list, total, page, pageSize }) => {
  res.json({
    code: 200,
    message: '查询成功',
    data: { list, total, page: Number(page), pageSize: Number(pageSize) },
  });
};

// 错误响应
const error = (res, message = '操作失败', code = 400) => {
  res.status(code).json({ code, message });
};

module.exports = { success, paginated, error };
