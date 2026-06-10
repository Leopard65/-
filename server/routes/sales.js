const express = require('express');
const router = express.Router();
const db = require('../db');

// 获取销售记录
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT s.*, m.name as member_name FROM sales s
    LEFT JOIN members m ON s.member_id = m.id
    ORDER BY s.id DESC
  `).all();
  rows.forEach(row => {
    row.items = db.prepare(`
      SELECT si.*, p.name as product_name FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
    `).all(row.id);
  });
  res.json(rows);
});

// 创建销售单
router.post('/', (req, res) => {
  const { member_id, payment, items } = req.body;
  if (!items || items.length === 0) return res.status(400).json({ error: '销售明细不能为空' });

  const total = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  const createSale = db.transaction(() => {
    // 检查库存
    for (const item of items) {
      const product = db.prepare('SELECT stock, name FROM products WHERE id=?').get(item.product_id);
      if (!product) throw new Error(`商品ID ${item.product_id} 不存在`);
      if (product.stock < item.quantity) throw new Error(`${product.name} 库存不足（剩余${product.stock}）`);
    }

    const result = db.prepare(
      'INSERT INTO sales (member_id, total, payment) VALUES (?,?,?)'
    ).run(member_id || null, total, payment || 'cash');
    const saleId = result.lastInsertRowid;

    const insertItem = db.prepare(
      'INSERT INTO sale_items (sale_id, product_id, quantity, price) VALUES (?,?,?,?)'
    );
    const updateStock = db.prepare(
      'UPDATE products SET stock = stock - ? WHERE id = ?'
    );

    items.forEach(item => {
      insertItem.run(saleId, item.product_id, item.quantity, item.price);
      updateStock.run(item.quantity, item.product_id);
    });

    // 会员积分（1元=1积分）
    if (member_id) {
      const points = Math.floor(total);
      db.prepare('UPDATE members SET points = points + ?, total_spent = total_spent + ? WHERE id = ?')
        .run(points, total, member_id);
    }

    return saleId;
  });

  try {
    const id = createSale();
    res.json({ id, total });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
