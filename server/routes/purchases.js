const express = require('express');
const router = express.Router();
const db = require('../db');

// 获取进货记录（支持分页）
router.get('/', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;

    const total = db.prepare('SELECT COUNT(*) as count FROM purchases').get().count;
    const purchases = db.prepare(`
      SELECT p.*, s.name as supplier_name,
        GROUP_CONCAT(
          pi.id || ',' || pi.product_id || ',' || pr.name || ',' || pi.quantity || ',' || pi.cost
          SEPARATOR ';'
        ) as items_str
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN purchase_items pi ON p.id = pi.purchase_id
      LEFT JOIN products pr ON pi.product_id = pr.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(pageSize, offset);

    // 解析 items_str 为数组
    const data = purchases.map(p => ({
      ...p,
      items: p.items_str ? p.items_str.split(';').map(item => {
        const [id, product_id, product_name, quantity, cost] = item.split(',');
        return { id: +id, product_id: +product_id, product_name, quantity: +quantity, cost: +cost };
      }) : []
    }));
    data.forEach(r => delete r.items_str);

    res.json({ data, total, page, pageSize });
  } catch (err) {
    console.error('获取进货记录失败:', err);
    res.status(500).json({ error: '获取进货记录失败' });
  }
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
    console.error('创建进货单失败:', e);
    res.status(500).json({ error: '创建进货单失败' });
  }
});

module.exports = router;
