const express = require('express');
const router = express.Router();
const db = require('../db');

// 获取所有分类
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM categories ORDER BY id').all();
  res.json(rows);
});

// 新增分类
router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: '分类名称不能为空' });
  const result = db.prepare('INSERT INTO categories (name) VALUES (?)').run(name);
  res.json({ id: result.lastInsertRowid, name });
});

// 修改分类
router.put('/:id', (req, res) => {
  const { name } = req.body;
  db.prepare('UPDATE categories SET name=? WHERE id=?').run(name, req.params.id);
  res.json({ success: true });
});

// 删除分类
router.delete('/:id', (req, res) => {
  const count = db.prepare('SELECT COUNT(*) as c FROM products WHERE category_id=?').get(req.params.id).c;
  if (count > 0) return res.status(400).json({ error: '该分类下有商品，无法删除' });
  db.prepare('DELETE FROM categories WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
