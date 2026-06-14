const express = require('express');
const router = express.Router();
const db = require('../db');
const { logOperation } = require('../utils/logger');

// 获取供应商列表（支持分页）
router.get('/', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;

    const total = db.prepare('SELECT COUNT(*) as count FROM suppliers WHERE status != -1').get().count;
    const data = db.prepare(`
      SELECT * FROM suppliers
      WHERE status != -1
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(pageSize, offset);

    res.json({ data, total, page, pageSize });
  } catch (err) {
    console.error('获取供应商列表失败:', err);
    res.status(500).json({ error: '获取供应商列表失败' });
  }
});

// 新增供应商
router.post('/', (req, res) => {
  const { name, contact, phone, address } = req.body;
  if (!name) return res.status(400).json({ error: '供应商名称不能为空' });
  try {
    const result = db.prepare(
      'INSERT INTO suppliers (name, contact, phone, address) VALUES (?,?,?,?)'
    ).run(name, contact || '', phone || '', address || '');

    // 记录操作日志
    logOperation({
      userId: req.user?.id,
      username: req.user?.username,
      action: 'create',
      module: 'suppliers',
      targetId: result.lastInsertRowid,
      detail: { name, contact, phone, address },
      ip: req.ip
    });

    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    console.error('新增供应商失败:', err);
    res.status(500).json({ error: '新增供应商失败' });
  }
});

// 修改供应商
router.put('/:id', (req, res) => {
  const { name, contact, phone, address } = req.body;
  if (!name) return res.status(400).json({ error: '供应商名称不能为空' });
  try {
    // 获取修改前的数据用于日志
    const oldSupplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
    if (!oldSupplier) {
      return res.status(404).json({ error: '供应商不存在' });
    }

    db.prepare('UPDATE suppliers SET name=?,contact=?,phone=?,address=? WHERE id=?')
      .run(name, contact, phone, address, req.params.id);

    // 记录操作日志
    logOperation({
      userId: req.user?.id,
      username: req.user?.username,
      action: 'update',
      module: 'suppliers',
      targetId: req.params.id,
      detail: {
        name: { old: oldSupplier.name, new: name },
        contact: { old: oldSupplier.contact, new: contact },
        phone: { old: oldSupplier.phone, new: phone }
      },
      ip: req.ip
    });

    res.json({ success: true });
  } catch (err) {
    console.error('修改供应商失败:', err);
    res.status(500).json({ error: '修改供应商失败' });
  }
});

// 删除供应商（软删除）
router.delete('/:id', (req, res) => {
  try {
    const supplier = db.prepare('SELECT name FROM suppliers WHERE id = ?').get(req.params.id);
    if (!supplier) {
      return res.status(404).json({ error: '供应商不存在' });
    }

    db.prepare('UPDATE suppliers SET status = -1 WHERE id=?').run(req.params.id);

    // 记录操作日志
    logOperation({
      userId: req.user?.id,
      username: req.user?.username,
      action: 'delete',
      module: 'suppliers',
      targetId: req.params.id,
      detail: { name: supplier.name },
      ip: req.ip
    });

    res.json({ success: true });
  } catch (err) {
    console.error('删除供应商失败:', err);
    res.status(500).json({ error: '删除供应商失败' });
  }
});

// 恢复供应商
router.put('/:id/restore', (req, res) => {
  try {
    const supplier = db.prepare('SELECT name FROM suppliers WHERE id = ?').get(req.params.id);
    if (!supplier) {
      return res.status(404).json({ error: '供应商不存在' });
    }

    db.prepare('UPDATE suppliers SET status = 1 WHERE id=?').run(req.params.id);

    // 记录操作日志
    logOperation({
      userId: req.user?.id,
      username: req.user?.username,
      action: 'restore',
      module: 'suppliers',
      targetId: req.params.id,
      detail: { name: supplier.name },
      ip: req.ip
    });

    res.json({ success: true });
  } catch (err) {
    console.error('恢复供应商失败:', err);
    res.status(500).json({ error: '恢复供应商失败' });
  }
});

module.exports = router;
