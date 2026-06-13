const express = require('express');
const router = express.Router();
const db = require('../db');

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
  const result = db.prepare(
    'INSERT INTO suppliers (name, contact, phone, address) VALUES (?,?,?,?)'
  ).run(name, contact || '', phone || '', address || '');
  res.json({ id: result.lastInsertRowid });
});

// 修改供应商
router.put('/:id', (req, res) => {
  const { name, contact, phone, address } = req.body;
  db.prepare('UPDATE suppliers SET name=?,contact=?,phone=?,address=? WHERE id=?')
    .run(name, contact, phone, address, req.params.id);
  res.json({ success: true });
});

// 删除供应商（软删除）
router.delete('/:id', (req, res) => {
  try {
    db.prepare('UPDATE suppliers SET status = -1 WHERE id=?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('删除供应商失败:', err);
    res.status(500).json({ error: '删除供应商失败' });
  }
});

// 恢复供应商
router.put('/:id/restore', (req, res) => {
  try {
    db.prepare('UPDATE suppliers SET status = 1 WHERE id=?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('恢复供应商失败:', err);
    res.status(500).json({ error: '恢复供应商失败' });
  }
});

module.exports = router;
