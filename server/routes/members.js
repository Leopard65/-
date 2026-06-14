const express = require('express');
const router = express.Router();
const db = require('../db');
const { logOperation } = require('../utils/logger');

// 获取会员列表（支持搜索和分页）
router.get('/', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;
    const { keyword } = req.query;

    let where = 'WHERE status != -1';
    const params = [];
    if (keyword) {
      where += ' AND (name LIKE ? OR phone LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    const total = db.prepare(`SELECT COUNT(*) as count FROM members ${where}`).get(...params).count;
    const data = db.prepare(`
      SELECT * FROM members ${where}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset);

    res.json({ data, total, page, pageSize });
  } catch (err) {
    console.error('获取会员列表失败:', err);
    res.status(500).json({ error: '获取会员列表失败' });
  }
});

// 新增会员
router.post('/', (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) return res.status(400).json({ error: '姓名和手机号不能为空' });
  try {
    const result = db.prepare('INSERT INTO members (name, phone) VALUES (?,?)').run(name, phone);

    // 记录操作日志
    logOperation({
      userId: req.user?.id,
      username: req.user?.username,
      action: 'create',
      module: 'members',
      targetId: result.lastInsertRowid,
      detail: { name, phone },
      ip: req.ip
    });

    res.json({ id: result.lastInsertRowid });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: '手机号已存在' });
    console.error('新增会员失败:', e);
    res.status(500).json({ error: '新增会员失败' });
  }
});

// 修改会员
router.put('/:id', (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) return res.status(400).json({ error: '姓名和手机号不能为空' });
  try {
    // 获取修改前的数据用于日志
    const oldMember = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
    if (!oldMember) {
      return res.status(404).json({ error: '会员不存在' });
    }

    db.prepare('UPDATE members SET name=?, phone=? WHERE id=?').run(name, phone, req.params.id);

    // 记录操作日志
    logOperation({
      userId: req.user?.id,
      username: req.user?.username,
      action: 'update',
      module: 'members',
      targetId: req.params.id,
      detail: {
        name: { old: oldMember.name, new: name },
        phone: { old: oldMember.phone, new: phone }
      },
      ip: req.ip
    });

    res.json({ success: true });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: '手机号已存在' });
    console.error('修改会员失败:', e);
    res.status(500).json({ error: '修改会员失败' });
  }
});

// 删除会员（软删除）
router.delete('/:id', (req, res) => {
  try {
    const member = db.prepare('SELECT name FROM members WHERE id = ?').get(req.params.id);
    if (!member) {
      return res.status(404).json({ error: '会员不存在' });
    }

    db.prepare('UPDATE members SET status = -1 WHERE id=?').run(req.params.id);

    // 记录操作日志
    logOperation({
      userId: req.user?.id,
      username: req.user?.username,
      action: 'delete',
      module: 'members',
      targetId: req.params.id,
      detail: { name: member.name },
      ip: req.ip
    });

    res.json({ success: true });
  } catch (err) {
    console.error('删除会员失败:', err);
    res.status(500).json({ error: '删除会员失败' });
  }
});

// 恢复会员
router.put('/:id/restore', (req, res) => {
  try {
    const member = db.prepare('SELECT name FROM members WHERE id = ?').get(req.params.id);
    if (!member) {
      return res.status(404).json({ error: '会员不存在' });
    }

    db.prepare('UPDATE members SET status = 1 WHERE id=?').run(req.params.id);

    // 记录操作日志
    logOperation({
      userId: req.user?.id,
      username: req.user?.username,
      action: 'restore',
      module: 'members',
      targetId: req.params.id,
      detail: { name: member.name },
      ip: req.ip
    });

    res.json({ success: true });
  } catch (err) {
    console.error('恢复会员失败:', err);
    res.status(500).json({ error: '恢复会员失败' });
  }
});

module.exports = router;
