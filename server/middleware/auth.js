const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');

// JWT 认证中间件
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '未登录' });

  try {
    const payload = jwt.verify(token, config.JWT_SECRET);
    const user = db.prepare('SELECT id, username, role, status FROM users WHERE id = ?').get(payload.id);

    if (!user) {
      return res.status(401).json({ error: '用户不存在，请重新登录' });
    }
    if (user.status === 0) {
      return res.status(403).json({ error: '账号已被禁用，请联系管理员' });
    }

    req.user = { id: user.id, username: user.username, role: user.role };
    next();
  } catch {
    res.status(401).json({ error: '登录已过期' });
  }
}

// 角色权限中间件
function roleMiddleware(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: '权限不足' });
    }
    next();
  };
}

module.exports = authMiddleware;
module.exports.roleMiddleware = roleMiddleware;
