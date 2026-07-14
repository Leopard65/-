const express = require('express');
const router = express.Router();
const db = require('../db');
const { logOperation } = require('../utils/logger');

// 获取进货记录（支持分页）
router.get('/', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;

    const total = db.prepare('SELECT COUNT(*) as count FROM purchases').get().count;
    const purchases = db.prepare(`
      SELECT p.*, s.name as supplier_name
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(pageSize, offset);

    // 明细单独查询后按 purchase_id 分组（避免 GROUP_CONCAT 拼接分隔符与商品名中的逗号/分号冲突）
    const purchaseIds = purchases.map(p => p.id);
    const itemsByPurchase = new Map();
    if (purchaseIds.length) {
      const placeholders = purchaseIds.map(() => '?').join(',');
      const items = db.prepare(`
        SELECT pi.id, pi.purchase_id, pi.product_id, pr.name AS product_name, pi.quantity, pi.cost
        FROM purchase_items pi
        LEFT JOIN products pr ON pi.product_id = pr.id
        WHERE pi.purchase_id IN (${placeholders})
      `).all(...purchaseIds);
      items.forEach(it => {
        if (!itemsByPurchase.has(it.purchase_id)) itemsByPurchase.set(it.purchase_id, []);
        itemsByPurchase.get(it.purchase_id).push({
          id: it.id,
          product_id: it.product_id,
          product_name: it.product_name,
          quantity: it.quantity,
          cost: it.cost
        });
      });
    }

    const data = purchases.map(p => ({ ...p, items: itemsByPurchase.get(p.id) || [] }));

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
    const insertBatch = db.prepare(
      'INSERT INTO product_batches (product_id, batch_no, production_date, expiry_date, quantity, purchase_id) VALUES (?,?,?,?,?,?)'
    );

    items.forEach(item => {
      insertItem.run(purchaseId, item.product_id, item.quantity, item.cost);
      updateStock.run(item.quantity, item.product_id);
      updateCost.run(item.cost, item.product_id); // 更新最新成本价
      // 选填：录入了到期日则同时登记保质期批次（向后兼容，留空则不建批次）
      if (item.expiry_date) {
        insertBatch.run(item.product_id, item.batch_no || null, item.production_date || null, item.expiry_date, item.quantity, purchaseId);
      }
    });

    return purchaseId;
  });

  try {
    const id = createPurchase();

    // 记录操作日志
    logOperation({
      userId: req.user?.id,
      username: req.user?.username,
      action: 'create',
      module: 'purchases',
      targetId: id,
      detail: {
        supplier_id,
        items_count: items.length,
        total
      },
      ip: req.ip
    });

    res.json({ id, total });
  } catch (e) {
    console.error('创建进货单失败:', e);
    if (e.message && e.message.includes('FOREIGN KEY')) {
      res.status(400).json({ error: '商品或供应商不存在' });
    } else {
      res.status(500).json({ error: '创建进货单失败' });
    }
  }
});

module.exports = router;
