const express = require('express');
const router = express.Router();
const db = require('../db');

// 获取商品列表（支持搜索和分类筛选）
router.get('/', (req, res) => {
  const { keyword, category_id } = req.query;
  let sql = `SELECT p.*, c.name as category_name FROM products p
             LEFT JOIN categories c ON p.category_id = c.id WHERE 1=1`;
  const params = [];
  if (keyword) {
    sql += ' AND (p.name LIKE ? OR p.barcode LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (category_id) {
    sql += ' AND p.category_id = ?';
    params.push(category_id);
  }
  sql += ' ORDER BY p.id DESC';
  res.json(db.prepare(sql).all(...params));
});

// 新增商品
router.post('/', (req, res) => {
  const { name, barcode, category_id, price, cost, stock, min_stock, unit } = req.body;
  if (!name) return res.status(400).json({ error: '商品名称不能为空' });
  try {
    const result = db.prepare(
      'INSERT INTO products (name,barcode,category_id,price,cost,stock,min_stock,unit) VALUES (?,?,?,?,?,?,?,?)'
    ).run(name, barcode || null, category_id || null, price || 0, cost || 0, stock || 0, min_stock || 10, unit || '个');
    res.json({ id: result.lastInsertRowid });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: '条码已存在' });
    throw e;
  }
});

// 修改商品
router.put('/:id', (req, res) => {
  const { name, barcode, category_id, price, cost, stock, min_stock, unit } = req.body;
  db.prepare(
    'UPDATE products SET name=?,barcode=?,category_id=?,price=?,cost=?,stock=?,min_stock=?,unit=? WHERE id=?'
  ).run(name, barcode, category_id, price, cost, stock, min_stock, unit, req.params.id);
  res.json({ success: true });
});

// 删除商品
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM products WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
