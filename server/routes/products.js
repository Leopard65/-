const express = require('express');
const router = express.Router();
const db = require('../db');
const { logOperation } = require('../utils/logger');

// 获取商品列表（支持搜索、分类筛选和分页）
router.get('/', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;
    const { keyword, category_id, status } = req.query;

    let where = 'WHERE p.status != -1';
    const params = [];
    if (keyword) {
      where += ' AND (p.name LIKE ? OR p.barcode LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (category_id) {
      where += ' AND p.category_id = ?';
      params.push(category_id);
    }
    if (status !== undefined) {
      where += ' AND p.status = ?';
      params.push(status);
    }

    const total = db.prepare(`SELECT COUNT(*) as count FROM products p ${where}`).get(...params).count;
    const data = db.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${where}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset);

    res.json({ data, total, page, pageSize });
  } catch (err) {
    console.error('获取商品列表失败:', err);
    res.status(500).json({ error: '获取商品列表失败' });
  }
});

// 新增商品
router.post('/', (req, res) => {
  const { name, barcode, category_id, price, cost, stock, min_stock, unit, image } = req.body;
  if (!name) return res.status(400).json({ error: '商品名称不能为空' });
  try {
    const result = db.prepare(
      'INSERT INTO products (name,barcode,category_id,price,cost,stock,min_stock,unit,image) VALUES (?,?,?,?,?,?,?,?,?)'
    ).run(name, barcode || null, category_id || null, price || 0, cost || 0, stock || 0, min_stock || 10, unit || '个', image || null);

    // 记录操作日志
    logOperation({
      userId: req.user?.id,
      username: req.user?.username,
      action: 'create',
      module: 'products',
      targetId: result.lastInsertRowid,
      detail: { name, barcode, category_id, price, cost, stock },
      ip: req.ip
    });

    res.json({ id: result.lastInsertRowid });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: '条码已存在' });
    console.error('新增商品失败:', e);
    res.status(500).json({ error: '新增商品失败' });
  }
});

// 修改商品
router.put('/:id', (req, res) => {
  try {
    const { name, barcode, category_id, price, cost, stock, min_stock, unit, status, image } = req.body;

    // 获取修改前的数据用于日志
    const oldProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!oldProduct) {
      return res.status(404).json({ error: '商品不存在' });
    }

    db.prepare(
      'UPDATE products SET name=?,barcode=?,category_id=?,price=?,cost=?,stock=?,min_stock=?,unit=?,status=?,image=? WHERE id=?'
    ).run(name, barcode, category_id, price, cost, stock, min_stock, unit, status ?? 1, image || null, req.params.id);

    // 记录操作日志
    logOperation({
      userId: req.user?.id,
      username: req.user?.username,
      action: 'update',
      module: 'products',
      targetId: req.params.id,
      detail: {
        name: { old: oldProduct.name, new: name },
        price: { old: oldProduct.price, new: price },
        stock: { old: oldProduct.stock, new: stock }
      },
      ip: req.ip
    });

    res.json({ success: true });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: '条码已存在' });
    console.error('修改商品失败:', e);
    res.status(500).json({ error: '修改商品失败' });
  }
});

// 删除商品（软删除）
router.delete('/:id', (req, res) => {
  try {
    const product = db.prepare('SELECT name FROM products WHERE id = ?').get(req.params.id);
    if (!product) {
      return res.status(404).json({ error: '商品不存在' });
    }

    db.prepare('UPDATE products SET status = -1 WHERE id=?').run(req.params.id);

    // 记录操作日志
    logOperation({
      userId: req.user?.id,
      username: req.user?.username,
      action: 'delete',
      module: 'products',
      targetId: req.params.id,
      detail: { name: product.name },
      ip: req.ip
    });

    res.json({ success: true });
  } catch (err) {
    console.error('删除商品失败:', err);
    res.status(500).json({ error: '删除商品失败' });
  }
});

// 恢复商品
router.put('/:id/restore', (req, res) => {
  try {
    const product = db.prepare('SELECT name FROM products WHERE id = ?').get(req.params.id);
    if (!product) {
      return res.status(404).json({ error: '商品不存在' });
    }

    db.prepare('UPDATE products SET status = 1 WHERE id=?').run(req.params.id);

    // 记录操作日志
    logOperation({
      userId: req.user?.id,
      username: req.user?.username,
      action: 'restore',
      module: 'products',
      targetId: req.params.id,
      detail: { name: product.name },
      ip: req.ip
    });

    res.json({ success: true });
  } catch (err) {
    console.error('恢复商品失败:', err);
    res.status(500).json({ error: '恢复商品失败' });
  }
});

// 切换商品上下架状态
router.put('/:id/toggle-status', (req, res) => {
  try {
    const product = db.prepare('SELECT status, name FROM products WHERE id=?').get(req.params.id);
    if (!product) return res.status(404).json({ error: '商品不存在' });

    const newStatus = product.status === 1 ? 0 : 1;
    db.prepare('UPDATE products SET status=? WHERE id=?').run(newStatus, req.params.id);

    // 记录操作日志
    logOperation({
      userId: req.user?.id,
      username: req.user?.username,
      action: 'update',
      module: 'products',
      targetId: req.params.id,
      detail: { name: product.name, status: { old: product.status, new: newStatus } },
      ip: req.ip
    });

    res.json({ success: true, status: newStatus });
  } catch (err) {
    console.error('切换状态失败:', err);
    res.status(500).json({ error: '切换状态失败' });
  }
});

module.exports = router;
