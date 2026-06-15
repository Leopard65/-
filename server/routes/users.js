const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { logOperation } = require('../utils/logger');

// 系统支持的角色（与前端、路由守卫保持一致）
const ROLES = ['admin', 'cashier'];

// 获取用户列表（不含密码）
router.get('/', (req, res) => {
  try {
    const users = db.prepare(
      'SELECT id, username, role, status, created_at, updated_at FROM users ORDER BY id'
    ).all();
    res.json(users);
  } catch (err) {
    console.error('获取用户列表失败:', err);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

// 新建用户
router.post('/', (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    if (!ROLES.includes(role)) {
      return res.status(400).json({ error: '角色不合法' });
    }

    const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (exists) {
      return res.status(400).json({ error: '用户名已存在' });
    }

    const hashed = bcrypt.hashSync(password, 10);
    const result = db.prepare(
      'INSERT INTO users (username, password, role, status) VALUES (?, ?, ?, 1)'
    ).run(username, hashed, role);

    logOperation({
      userId: req.user?.id,
      username: req.user?.username,
      action: 'create',
      module: 'users',
      targetId: result.lastInsertRowid,
      detail: { username, role },
      ip: req.ip
    });

    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    console.error('新建用户失败:', err);
    res.status(500).json({ error: '新建用户失败' });
  }
});

// 修改用户：改角色 / 启用停用 / 重置密码（按需传字段）
router.put('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { role, status, password } = req.body;

    const target = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!target) return res.status(404).json({ error: '用户不存在' });

    if (role !== undefined && !ROLES.includes(role)) {
      return res.status(400).json({ error: '角色不合法' });
    }

    const willBeAdmin = role !== undefined ? role === 'admin' : target.role === 'admin';
    const willBeActive = status !== undefined ? Number(status) === 1 : target.status === 1;

    // 不能降级 / 禁用当前登录账号，避免把自己锁在门外
    if (id === req.user.id && ((role !== undefined && role !== 'admin') || (status !== undefined && Number(status) === 0))) {
      return res.status(400).json({ error: '不能修改当前登录账号的角色或禁用自己' });
    }

    // 系统需至少保留一个启用的管理员
    if (target.role === 'admin' && target.status === 1 && !(willBeAdmin && willBeActive)) {
      const otherAdmins = db.prepare(
        "SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND status = 1 AND id != ?"
      ).get(id).c;
      if (otherAdmins === 0) {
        return res.status(400).json({ error: '系统需至少保留一个启用的管理员' });
      }
    }

    const fields = [];
    const params = [];
    if (role !== undefined) { fields.push('role = ?'); params.push(role); }
    if (status !== undefined) { fields.push('status = ?'); params.push(Number(status) ? 1 : 0); }
    if (password) { fields.push('password = ?'); params.push(bcrypt.hashSync(password, 10)); }

    if (fields.length === 0) {
      return res.status(400).json({ error: '没有需要更新的内容' });
    }

    params.push(id);
    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...params);

    logOperation({
      userId: req.user?.id,
      username: req.user?.username,
      action: 'update',
      module: 'users',
      targetId: id,
      detail: { username: target.username, role, status, reset_password: !!password },
      ip: req.ip
    });

    res.json({ success: true });
  } catch (err) {
    console.error('修改用户失败:', err);
    res.status(500).json({ error: '修改用户失败' });
  }
});

module.exports = router;
