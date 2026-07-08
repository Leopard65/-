const express = require('express');
const router = express.Router();
const db = require('../db');
const { logOperation } = require('../utils/logger');

const TYPE_TEXT = {
  count: '盘点',
  adjust: '调整',
  loss: '报损'
};

function normalizeType(type) {
  return ['count', 'adjust', 'loss'].includes(type) ? type : '';
}

router.get('/adjustments', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;
    const { product_id, type } = req.query;
    let where = 'WHERE 1=1';
    const params = [];

    if (product_id) {
      where += ' AND ia.product_id = ?';
      params.push(Number(product_id));
    }
    if (type) {
      where += ' AND ia.type = ?';
      params.push(type);
    }

    const total = db.prepare(`
      SELECT COUNT(*) as count
      FROM inventory_adjustments ia
      ${where}
    `).get(...params).count;

    const data = db.prepare(`
      SELECT ia.*, p.name as product_name, p.unit
      FROM inventory_adjustments ia
      LEFT JOIN products p ON ia.product_id = p.id
      ${where}
      ORDER BY ia.created_at DESC, ia.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset);

    res.json({ data, total, page, pageSize });
  } catch (err) {
    console.error('获取库存流水失败:', err);
    res.status(500).json({ error: '获取库存流水失败' });
  }
});

router.post('/adjustments', (req, res) => {
  const productId = Number(req.body.product_id);
  const type = normalizeType(req.body.type);
  const quantity = parseInt(req.body.quantity);
  const reason = String(req.body.reason || '').trim();

  if (!productId) return res.status(400).json({ error: '请选择商品' });
  if (!type) return res.status(400).json({ error: '库存操作类型不正确' });
  if (!Number.isInteger(quantity)) return res.status(400).json({ error: '数量必须为整数' });
  if (type === 'count' && quantity < 0) return res.status(400).json({ error: '盘点库存不能小于 0' });
  if (type !== 'count' && quantity <= 0) return res.status(400).json({ error: '调整/报损数量必须大于 0' });

  const applyAdjustment = db.transaction(() => {
    const product = db.prepare('SELECT id, name, stock FROM products WHERE id = ? AND status != -1').get(productId);
    if (!product) throw new Error('商品不存在');

    let afterStock = product.stock;
    if (type === 'count') afterStock = quantity;
    if (type === 'adjust') afterStock = product.stock + quantity;
    if (type === 'loss') afterStock = product.stock - quantity;

    if (afterStock < 0) throw new Error('库存不能小于 0');
    const delta = afterStock - product.stock;
    if (delta === 0) throw new Error('库存未发生变化');

    db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(afterStock, productId);
    const result = db.prepare(`
      INSERT INTO inventory_adjustments
        (product_id, type, quantity_delta, before_stock, after_stock, reason, operator)
      VALUES (?,?,?,?,?,?,?)
    `).run(
      productId,
      type,
      delta,
      product.stock,
      afterStock,
      reason || null,
      req.user?.username || null
    );

    return {
      id: result.lastInsertRowid,
      product_id: productId,
      product_name: product.name,
      type,
      type_text: TYPE_TEXT[type],
      quantity_delta: delta,
      before_stock: product.stock,
      after_stock: afterStock,
      reason
    };
  });

  try {
    const adjustment = applyAdjustment();
    logOperation({
      userId: req.user?.id,
      username: req.user?.username,
      action: adjustment.type,
      module: 'inventory',
      targetId: adjustment.id,
      detail: adjustment,
      ip: req.ip
    });
    res.json(adjustment);
  } catch (err) {
    console.error('库存操作失败:', err);
    if (['商品不存在', '库存不能小于 0', '库存未发生变化'].includes(err.message)) {
      res.status(400).json({ error: err.message });
    } else {
      res.status(500).json({ error: '库存操作失败' });
    }
  }
});

module.exports = router;
