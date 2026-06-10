const express = require('express');
const router = express.Router();
const db = require('../db');

// 获取进货记录
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT p.*, s.name as supplier_name FROM purchases p
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    ORDER BY p.id DESC
  `).all();
  // 查询每个进货单的明细
  rows.forEach(row => {
    row.items = db.prepare(`
      SELECT pi.*, pr.name as product_name FROM purchase_items pi
      LEFT JOIN products pr ON pi.product_id = pr.id
      WHERE pi.purchase_id = ?
    `).all(row.id);
  });
  res.json(rows);
});

// 创建进货单
router.post('/', (req, res) => {
  const { supplier_id, items } = req.body;
  if (!items || items.length === 0) return res.status(400).json({ error: '进货明细不能为空' });

  const total = items.reduce((sum, item) => sum + item.quantity * item.cost, 0);

  const createPurchase = db.transaction(() => {
    const result = db.prepare(
      'INSERT INTO purchases (supplier_id, total) VALUES (?,?)'
    ).run(supplier_id || null, total);

    const purchaseId = result.lastInsertRowid;
    const insertItem = db.prepare(
      'INSERT INTO purchase_items (purchase_id, product_id, quantity, cost) VALUES (?,?,?,?)'
    );
    const updateStock = db.prepare(
      'UPDATE products SET stock = stock + ? WHERE id = ?'
    );
    const updateCost = db.prepare(
      'UPDATE products SET cost = ? WHERE id = ?'
    );

    items.forEach(item => {
      insertItem.run(purchaseId, item.product_id, item.quantity, item.cost);
      updateStock.run(item.quantity, item.product_id);
      updateCost.run(item.cost, item.product_id); // 更新最新成本价
    });

    return purchaseId;
  });

  try {
    const id = createPurchase();
    res.json({ id, total });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
