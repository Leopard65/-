/**
 * JWT 认证中间件
 */
const jwt = require('jsonwebtoken');
const config = require('../config');

// 验证 token
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '未登录或 token 无效' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded; // { id, username, role }
    next();
  } catch (err) {
    return res.status(401).json({ code: 401, message: 'token 已过期，请重新登录' });
  }
};

// 验证管理员角色
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ code: 403, message: '权限不足，需要管理员权限' });
  }
  next();
};

// 可选认证（有 token 就解析，没有也放行）
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = jwt.verify(token, config.jwt.secret);
    } catch (_) {
      // token 无效也放行
    }
  }
  next();
};

module.exports = { authenticate, requireAdmin, optionalAuth };
