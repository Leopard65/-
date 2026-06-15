/**
 * 全局错误处理中间件
 */
const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err.message);
  console.error(err.stack);

  // 数据库错误
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(400).json({ code: 400, message: '数据已存在，请勿重复提交' });
  }

  // JWT 错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ code: 401, message: '认证失败' });
  }

  // 默认服务器错误
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    code: statusCode,
    message: err.message || '服务器内部错误',
  });
};

module.exports = errorHandler;
