const express = require('express');
const router = express.Router();
const db = require('../db');
const { logOperation } = require('../utils/logger');
const { round2, daysToExpiry, expiryStatus } = require('../utils/calc');

// 本地时区今日（与 dashboard.js 口径一致），保质期状态以此为基准
function getToday() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const DEFAULT_WARN_DAYS = 30;

// 批次列表（按到期日升序，服务端统一计算 状态/剩余天数；支持状态筛选、商品筛选、分页）
router.get('/', (req, res) => {
  try {
    const today = getToday();
    const warnDays = parseInt(req.query.warn_days) || DEFAULT_WARN_DAYS;
    const filter = req.query.filter || 'all';          // all/near/expired/normal/cleared
    const productId = req.query.product_id ? parseInt(req.query.product_id) : null;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;

    let where = 'WHERE 1=1';
    const params = [];
    if (productId) { where += ' AND b.product_id = ?'; params.push(productId); }

    const rows = db.prepare(`
      SELECT b.*, p.name AS product_name, p.unit, p.cost
      FROM product_batches b
      JOIN products p ON b.product_id = p.id
      ${where}
      ORDER BY b.expiry_date ASC, b.id DESC
    `).all(...params);

    // 在 JS 层算状态再筛选/分页（数据量小，口径与 calc 纯函数统一、便于测试）
    const enriched = rows.map(r => ({
      ...r,
      days_left: daysToExpiry(r.expiry_date, today),
      expiry_status: expiryStatus({ expiryDate: r.expiry_date, today, warnDays })
    }));

    let filtered = enriched;
    if (filter === 'cleared') {
      filtered = enriched.filter(r => r.status === 'cleared');
    } else if (['near', 'expired', 'normal'].includes(filter)) {
      filtered = enriched.filter(r => r.status === 'active' && r.expiry_status === filter);
    }

    const total = filtered.length;
    const data = filtered.slice((page - 1) * pageSize, page * pageSize);
    res.json({ data, total, page, pageSize, warn_days: warnDays });
  } catch (err) {
    console.error('获取批次列表失败:', err);
    res.status(500).json({ error: '获取批次列表失败' });
  }
});

// 批次预警汇总（首页待办 + 本页 KPI）：临期数 / 过期数 / 临期+过期货值（预计损耗）
router.get('/summary', (req, res) => {
  try {
    const today = getToday();
    const warnDays = parseInt(req.query.warn_days) || DEFAULT_WARN_DAYS;
    const rows = db.prepare(`
      SELECT b.quantity, b.expiry_date, p.cost
      FROM product_batches b
      JOIN products p ON b.product_id = p.id
      WHERE b.status = 'active'
    `).all();

    let expired = 0, near = 0, lossAmount = 0;
    rows.forEach(r => {
      const s = expiryStatus({ expiryDate: r.expiry_date, today, warnDays });
      if (s === 'expired') { expired++; lossAmount += (r.quantity || 0) * (r.cost || 0); }
      else if (s === 'near') { near++; lossAmount += (r.quantity || 0) * (r.cost || 0); }
    });

    res.json({ expired, near, lossAmount: round2(lossAmount), warn_days: warnDays });
  } catch (err) {
    console.error('获取批次预警汇总失败:', err);
    res.status(500).json({ error: '获取批次预警汇总失败' });
  }
});

// 手工新增批次（商品 + 到期日必填）
router.post('/', (req, res) => {
  const { product_id, batch_no, production_date, expiry_date, quantity } = req.body;
  if (!product_id || !expiry_date) return res.status(400).json({ error: '商品和到期日不能为空' });

  try {
    const prod = db.prepare('SELECT id, name FROM products WHERE id = ?').get(product_id);
    if (!prod) return res.status(400).json({ error: '商品不存在' });

    const result = db.prepare(`
      INSERT INTO product_batches (product_id, batch_no, production_date, expiry_date, quantity)
      VALUES (?,?,?,?,?)
    `).run(product_id, batch_no || null, production_date || null, expiry_date, parseInt(quantity) || 0);

    logOperation({
      userId: req.user?.id, username: req.user?.username,
      action: 'create', module: 'batches', targetId: result.lastInsertRowid,
      detail: { product: prod.name, expiry_date, quantity: parseInt(quantity) || 0 }, ip: req.ip
    });

    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    console.error('新增批次失败:', err);
    res.status(500).json({ error: '新增批次失败' });
  }
});

// 编辑批次（不改库存，仅修正批次信息）
router.put('/:id', (req, res) => {
  const { batch_no, production_date, expiry_date, quantity } = req.body;
  try {
    const existing = db.prepare('SELECT * FROM product_batches WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: '批次不存在' });

    db.prepare(`
      UPDATE product_batches
      SET batch_no = ?, production_date = ?, expiry_date = ?, quantity = ?
      WHERE id = ?
    `).run(
      batch_no !== undefined ? (batch_no || null) : existing.batch_no,
      production_date !== undefined ? (production_date || null) : existing.production_date,
      expiry_date || existing.expiry_date,
      quantity != null ? parseInt(quantity) : existing.quantity,
      req.params.id
    );

    logOperation({
      userId: req.user?.id, username: req.user?.username,
      action: 'update', module: 'batches', targetId: Number(req.params.id),
      detail: { expiry_date: expiry_date || existing.expiry_date }, ip: req.ip
    });

    res.json({ success: true });
  } catch (err) {
    console.error('编辑批次失败:', err);
    res.status(500).json({ error: '编辑批次失败' });
  }
});

// 删除批次记录（仅纠错，不影响库存）
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM product_batches WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: '批次不存在' });

    db.prepare('DELETE FROM product_batches WHERE id = ?').run(req.params.id);

    logOperation({
      userId: req.user?.id, username: req.user?.username,
      action: 'delete', module: 'batches', targetId: Number(req.params.id), ip: req.ip
    });

    res.json({ success: true });
  } catch (err) {
    console.error('删除批次失败:', err);
    res.status(500).json({ error: '删除批次失败' });
  }
});

// 清理下架（报损）：标记 cleared，并按批次数量从库存扣减（不超过现库存），记录损耗与日志
router.post('/:id/clear', (req, res) => {
  try {
    const b = db.prepare(`
      SELECT b.*, p.cost, p.stock, p.name AS product_name
      FROM product_batches b
      JOIN products p ON b.product_id = p.id
      WHERE b.id = ?
    `).get(req.params.id);
    if (!b) return res.status(404).json({ error: '批次不存在' });
    if (b.status === 'cleared') return res.status(400).json({ error: '该批次已清理下架' });

    const doClear = db.transaction(() => {
      const qty = Math.min(b.quantity || 0, b.stock || 0); // 报损不超过现库存
      db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?').run(qty, b.product_id);
      db.prepare("UPDATE product_batches SET status = 'cleared' WHERE id = ?").run(b.id);
      return qty;
    });
    const clearedQty = doClear();
    const loss = round2(clearedQty * (b.cost || 0));

    logOperation({
      userId: req.user?.id, username: req.user?.username,
      action: 'clear', module: 'batches', targetId: b.id,
      detail: { product: b.product_name, qty: clearedQty, loss }, ip: req.ip
    });

    res.json({ success: true, cleared_qty: clearedQty, loss });
  } catch (err) {
    console.error('清理下架失败:', err);
    res.status(500).json({ error: '清理下架失败' });
  }
});

module.exports = router;
