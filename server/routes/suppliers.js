const express = require('express');
const router = express.Router();
const db = require('../db');

// 获取供应商列表
router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM suppliers ORDER BY id DESC').all());
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

// 删除供应商
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM suppliers WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
