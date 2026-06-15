const express = require('express');
const router = express.Router();
const db = require('../db');
const { logOperation } = require('../utils/logger');
const { round2, applyDiscount, calcPoints } = require('../utils/calc');

// 获取销售记录（支持分页）
router.get('/', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;

    const total = db.prepare('SELECT COUNT(*) as count FROM sales').get().count;
    const sales = db.prepare(`
      SELECT s.*, m.name as member_name,
        GROUP_CONCAT(
          si.id || ',' || si.product_id || ',' || p.name || ',' || si.quantity || ',' || si.price, ';'
        ) as items_str
      FROM sales s
      LEFT JOIN members m ON s.member_id = m.id
      LEFT JOIN sale_items si ON s.id = si.sale_id
      LEFT JOIN products p ON si.product_id = p.id
      GROUP BY s.id
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `).all(pageSize, offset);

    // 解析 items_str 为数组
    const data = sales.map(s => ({
      ...s,
      items: s.items_str ? s.items_str.split(';').map(item => {
        const [id, product_id, product_name, quantity, price] = item.split(',');
        return { id: +id, product_id: +product_id, product_name, quantity: +quantity, price: +price };
      }) : []
    }));
    data.forEach(r => delete r.items_str);

    res.json({ data, total, page, pageSize });
  } catch (err) {
    console.error('获取销售记录失败:', err);
    res.status(500).json({ error: '获取销售记录失败' });
  }
});

// 获取单个销售详情
router.get('/:id', (req, res) => {
  try {
    const sale = db.prepare(`
      SELECT s.*, m.name as member_name
      FROM sales s
      LEFT JOIN members m ON s.member_id = m.id
      WHERE s.id = ?
    `).get(req.params.id);

    if (!sale) return res.status(404).json({ error: '订单不存在' });

    const items = db.prepare(`
      SELECT si.*, p.name as product_name
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
    `).all(req.params.id);

    res.json({ ...sale, items });
  } catch (err) {
    console.error('获取销售详情失败:', err);
    res.status(500).json({ error: '获取销售详情失败' });
  }
});

// 创建销售单
router.post('/', (req, res) => {
  const { member_id, payment, items } = req.body;
  if (!items || items.length === 0) return res.status(400).json({ error: '销售明细不能为空' });

  const createSale = db.transaction(() => {
    // 校验商品并按服务端当前价计算（不信任前端传入的 price，避免被篡改）
    let originalTotal = 0;
    const lines = [];
    for (const item of items) {
      const qty = parseInt(item.quantity);
      if (!qty || qty <= 0) throw new Error('商品数量不合法');

      const product = db.prepare('SELECT id, name, price, stock, status FROM products WHERE id=?').get(item.product_id);
      if (!product) throw new Error(`商品ID ${item.product_id} 不存在`);
      if (product.status !== 1) throw new Error(`${product.name} 已下架`);
      if (product.stock < qty) throw new Error(`${product.name} 库存不足（剩余${product.stock}）`);

      originalTotal += product.price * qty;
      lines.push({ product_id: product.id, quantity: qty, price: product.price });
    }
    originalTotal = round2(originalTotal);

    // 获取会员折扣和积分倍率
    let discount = 1;
    let pointsRate = 1;
    if (member_id) {
      const member = db.prepare('SELECT * FROM members WHERE id = ?').get(member_id);
      if (member && member.level) {
        const level = db.prepare('SELECT * FROM member_levels WHERE name = ?').get(member.level);
        if (level) {
          discount = level.discount;
          pointsRate = level.points_rate;
        }
      }
    }

    // 应用折扣
    const finalTotal = applyDiscount(originalTotal, discount);

    const result = db.prepare(
      'INSERT INTO sales (member_id, total, payment) VALUES (?,?,?)'
    ).run(member_id || null, finalTotal, payment || 'cash');
    const saleId = result.lastInsertRowid;

    const insertItem = db.prepare(
      'INSERT INTO sale_items (sale_id, product_id, quantity, price) VALUES (?,?,?,?)'
    );
    const updateStock = db.prepare(
      'UPDATE products SET stock = stock - ? WHERE id = ?'
    );

    // 明细单价记录服务端价（折扣为整单口径，不分摊到行）
    lines.forEach(l => {
      insertItem.run(saleId, l.product_id, l.quantity, l.price);
      updateStock.run(l.quantity, l.product_id);
    });

    // 会员积分（含倍率）
    if (member_id) {
      const points = calcPoints(finalTotal, pointsRate);
      db.prepare('UPDATE members SET points = points + ?, total_spent = total_spent + ? WHERE id = ?')
        .run(points, finalTotal, member_id);

      // 自动升级会员等级
      updateMemberLevel(member_id);
    }

    return { saleId, originalTotal, finalTotal, discount };
  });

  try {
    const { saleId, originalTotal, finalTotal, discount } = createSale();

    // 记录操作日志
    logOperation({
      userId: req.user?.id,
      username: req.user?.username,
      action: 'create',
      module: 'sales',
      targetId: saleId,
      detail: {
        member_id,
        payment,
        items_count: items.length,
        original_total: originalTotal,
        final_total: finalTotal,
        discount
      },
      ip: req.ip
    });

    res.json({
      id: saleId,
      originalTotal,
      total: finalTotal,
      discount,
      message: discount < 1 ? `会员享 ${discount * 10} 折优惠` : undefined
    });
  } catch (e) {
    console.error('创建销售单失败:', e);
    // 返回友好的错误信息，不泄露内部细节
    if (e.message && e.message.includes('库存不足')) {
      res.status(400).json({ error: e.message });
    } else if (e.message && e.message.includes('不存在')) {
      res.status(400).json({ error: e.message });
    } else {
      res.status(500).json({ error: '创建销售单失败' });
    }
  }
});

// 自动升级会员等级
function updateMemberLevel(memberId) {
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId);
  if (!member) return;

  const levels = db.prepare('SELECT * FROM member_levels ORDER BY min_spent DESC').all();
  const newLevel = levels.find(l => member.total_spent >= l.min_spent);

  if (newLevel && newLevel.name !== member.level) {
    db.prepare('UPDATE members SET level = ? WHERE id = ?').run(newLevel.name, memberId);
  }
}

module.exports = router;
