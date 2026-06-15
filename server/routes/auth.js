const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config');
const authMiddleware = require('../middleware/auth');
const { logOperation } = require('../utils/logger');

// 简易登录失败限流（内存级，防暴力破解）：同 IP 在时间窗内失败达上限则暂时锁定
const LOGIN_MAX_FAILS = 5;
const LOGIN_WINDOW_MS = 10 * 60 * 1000; // 10 分钟
const loginAttempts = new Map();

function loginLocked(key) {
  const e = loginAttempts.get(key);
  if (!e) return false;
  if (Date.now() - e.firstAt >= LOGIN_WINDOW_MS) { loginAttempts.delete(key); return false; }
  return e.count >= LOGIN_MAX_FAILS;
}
function recordLoginFail(key) {
  const now = Date.now();
  const e = loginAttempts.get(key);
  if (!e || now - e.firstAt >= LOGIN_WINDOW_MS) loginAttempts.set(key, { count: 1, firstAt: now });
  else e.count++;
}
function clearLoginFails(key) { loginAttempts.delete(key); }

// 登录
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const ipKey = req.ip || 'unknown';
    if (loginLocked(ipKey)) {
      return res.status(429).json({ error: '登录失败次数过多，请稍后再试' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      recordLoginFail(ipKey);
      // 记录登录失败日志
      logOperation({
        userId: null,
        username,
        action: 'login',
        module: 'auth',
        detail: { success: false, reason: '用户名或密码错误' },
        ip: req.ip
      });
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 禁用账号不允许登录
    if (user.status === 0) {
      logOperation({
        userId: user.id,
        username,
        action: 'login',
        module: 'auth',
        detail: { success: false, reason: '账号已禁用' },
        ip: req.ip
      });
      return res.status(403).json({ error: '账号已被禁用，请联系管理员' });
    }

    clearLoginFails(ipKey);
    const token = jwt.sign({ id: user.id, role: user.role }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN });

    // 记录登录成功日志
    logOperation({
      userId: user.id,
      username: user.username,
      action: 'login',
      module: 'auth',
      detail: { success: true },
      ip: req.ip
    });

    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    console.error('登录失败:', err);
    res.status(500).json({ error: '登录失败' });
  }
});

// 获取当前用户信息
router.get('/me', authMiddleware, (req, res) => {
  try {
    const user = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    res.json(user);
  } catch (err) {
    console.error('获取用户信息失败:', err);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

// 修改密码
router.put('/password', authMiddleware, (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: '请输入原密码和新密码' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!bcrypt.compareSync(oldPassword, user.password)) {
      return res.status(400).json({ error: '原密码错误' });
    }

    const hashed = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, req.user.id);
    res.json({ message: '密码修改成功' });
  } catch (err) {
    console.error('修改密码失败:', err);
    res.status(500).json({ error: '修改密码失败' });
  }
});

module.exports = router;
