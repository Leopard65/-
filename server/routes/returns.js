const express = require('express');
const router = express.Router();
const db = require('../db');
const { logOperation } = require('../utils/logger');

// 获取退单列表（支持分页）
router.get('/', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;
    const { status, start_date, end_date } = req.query;

    let where = 'WHERE 1=1';
    const params = [];
    if (status) {
      where += ' AND r.status = ?';
      params.push(status);
    }
    if (start_date) {
      where += ' AND DATE(r.created_at) >= ?';
      params.push(start_date);
    }
    if (end_date) {
      where += ' AND DATE(r.created_at) <= ?';
      params.push(end_date);
    }

    const total = db.prepare(`SELECT COUNT(*) as count FROM returns r ${where}`).get(...params).count;
    const returns = db.prepare(`
      SELECT r.*, s.total as sale_total, s.payment, m.name as member_name,
        GROUP_CONCAT(
          ri.id || ',' || ri.product_id || ',' || p.name || ',' || ri.quantity || ',' || ri.price, ';'
        ) as items_str
      FROM returns r
      LEFT JOIN sales s ON r.sale_id = s.id
      LEFT JOIN members m ON s.member_id = m.id
      LEFT JOIN return_items ri ON r.id = ri.return_id
      LEFT JOIN products p ON ri.product_id = p.id
      ${where}
      GROUP BY r.id
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset);

    const data = returns.map(r => ({
      ...r,
      items: r.items_str ? r.items_str.split(';').map(item => {
        const [id, product_id, product_name, quantity, price] = item.split(',');
        return { id: +id, product_id: +product_id, product_name, quantity: +quantity, price: +price };
      }) : []
    }));
    data.forEach(r => delete r.items_str);

    res.json({ data, total, page, pageSize });
  } catch (err) {
    console.error('获取退单列表失败:', err);
    res.status(500).json({ error: '获取退单列表失败' });
  }
});

// 创建退单
router.post('/', (req, res) => {
  const { sale_id, items, reason } = req.body;

  if (!sale_id || !items || items.length === 0) {
    return res.status(400).json({ error: '请选择原订单和退货商品' });
  }

  try {
    // 验证原订单存在
    const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(sale_id);
    if (!sale) return res.status(404).json({ error: '原订单不存在' });

    // 原订单实际折扣比例 = 实收总额 / 明细原价合计（整单折扣口径）
    const saleLineSum = db.prepare(
      'SELECT COALESCE(SUM(price * quantity), 0) AS s FROM sale_items WHERE sale_id = ?'
    ).get(sale_id).s;
    const effectiveDiscount = saleLineSum > 0 ? sale.total / saleLineSum : 1;

    // 校验退货数量，并按服务端记录的原单单价计算（不信任前端传入的 price）
    let originalTotal = 0;
    const lines = [];
    for (const item of items) {
      const qty = parseInt(item.quantity);
      if (!qty || qty <= 0) {
        return res.status(400).json({ error: '退货数量不合法' });
      }

      const saleItem = db.prepare(
        'SELECT quantity, price FROM sale_items WHERE sale_id = ? AND product_id = ?'
      ).get(sale_id, item.product_id);

      if (!saleItem) {
        return res.status(400).json({ error: `商品ID ${item.product_id} 不在原订单中` });
      }

      // 计算已退货数量
      const returnedQty = db.prepare(`
        SELECT COALESCE(SUM(ri.quantity), 0) as returned
        FROM return_items ri
        JOIN returns r ON ri.return_id = r.id
        WHERE r.sale_id = ? AND ri.product_id = ? AND r.status != 'rejected'
      `).get(sale_id, item.product_id).returned;

      if (returnedQty + qty > saleItem.quantity) {
        return res.status(400).json({ error: `退货数量超过购买数量` });
      }

      // 明细记录原单单价，退款金额按整单折扣折算（折后退）
      originalTotal += saleItem.price * qty;
      lines.push({ product_id: item.product_id, quantity: qty, price: saleItem.price });
    }

    // 退款总额 = 原价合计 × 原单折扣
    const total = Math.round(originalTotal * effectiveDiscount * 100) / 100;

    // 使用事务处理
    const createReturn = db.transaction(() => {
      // 创建退单
      const result = db.prepare(
        'INSERT INTO returns (sale_id, reason, total, status, operator) VALUES (?, ?, ?, ?, ?)'
      ).run(sale_id, reason || '', total, 'pending', req.user?.username || 'system');

      const returnId = result.lastInsertRowid;

      // 创建退货明细
      const insertItem = db.prepare(
        'INSERT INTO return_items (return_id, product_id, quantity, price) VALUES (?, ?, ?, ?)'
      );
      lines.forEach(l => {
        insertItem.run(returnId, l.product_id, l.quantity, l.price);
      });

      return returnId;
    });

    const id = createReturn();

    // 记录操作日志
    logOperation({
      userId: req.user?.id,
      username: req.user?.username,
      action: 'create',
      module: 'returns',
      targetId: id,
      detail: {
        sale_id,
        items_count: items.length,
        total,
        reason
      },
      ip: req.ip
    });

    res.json({ id, total, message: '退单已创建，等待审核' });
  } catch (err) {
    console.error('创建退单失败:', err);
    res.status(500).json({ error: '创建退单失败' });
  }
});

// 审核退单
router.put('/:id/approve', (req, res) => {
  try {
    const returnRecord = db.prepare('SELECT * FROM returns WHERE id = ?').get(req.params.id);
    if (!returnRecord) return res.status(404).json({ error: '退单不存在' });
    if (returnRecord.status !== 'pending') {
      return res.status(400).json({ error: '该退单已被处理' });
    }

    const { action } = req.body; // 'approve' or 'reject'

    if (action === 'reject') {
      db.prepare('UPDATE returns SET status = ? WHERE id = ?').run('rejected', req.params.id);

      // 记录操作日志
      logOperation({
        userId: req.user?.id,
        username: req.user?.username,
        action: 'reject',
        module: 'returns',
        targetId: req.params.id,
        detail: { sale_id: returnRecord.sale_id, total: returnRecord.total },
        ip: req.ip
      });

      return res.json({ message: '退单已拒绝' });
    }

    // 审核通过，执行退款逻辑
    const approveReturn = db.transaction(() => {
      // 更新退单状态
      db.prepare('UPDATE returns SET status = ? WHERE id = ?').run('completed', req.params.id);

      // 获取退货明细
      const items = db.prepare('SELECT * FROM return_items WHERE return_id = ?').all(req.params.id);

      // 恢复库存
      const updateStock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
      items.forEach(item => {
        updateStock.run(item.quantity, item.product_id);
      });

      // 获取原订单信息
      const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(returnRecord.sale_id);

      // 如果有会员，回退积分与累计消费（按会员等级倍率，余额不为负）
      if (sale.member_id) {
        let pointsRate = 1;
        const member = db.prepare('SELECT level FROM members WHERE id = ?').get(sale.member_id);
        if (member && member.level) {
          const level = db.prepare('SELECT points_rate FROM member_levels WHERE name = ?').get(member.level);
          if (level) pointsRate = level.points_rate;
        }
        const points = Math.floor(returnRecord.total * pointsRate);
        db.prepare('UPDATE members SET points = MAX(0, points - ?), total_spent = MAX(0, total_spent - ?) WHERE id = ?')
          .run(points, returnRecord.total, sale.member_id);
      }
    });

    approveReturn();

    // 记录操作日志
    logOperation({
      userId: req.user?.id,
      username: req.user?.username,
      action: 'approve',
      module: 'returns',
      targetId: req.params.id,
      detail: { sale_id: returnRecord.sale_id, total: returnRecord.total },
      ip: req.ip
    });

    res.json({ message: '退单已审核通过，退款已完成' });
  } catch (err) {
    console.error('审核退单失败:', err);
    res.status(500).json({ error: '审核退单失败' });
  }
});

// 获取单个退单详情
router.get('/:id', (req, res) => {
  try {
    const returnRecord = db.prepare(`
      SELECT r.*, s.total as sale_total, s.payment, m.name as member_name
      FROM returns r
      LEFT JOIN sales s ON r.sale_id = s.id
      LEFT JOIN members m ON s.member_id = m.id
      WHERE r.id = ?
    `).get(req.params.id);

    if (!returnRecord) return res.status(404).json({ error: '退单不存在' });

    const items = db.prepare(`
      SELECT ri.*, p.name as product_name
      FROM return_items ri
      LEFT JOIN products p ON ri.product_id = p.id
      WHERE ri.return_id = ?
    `).all(req.params.id);

    res.json({ ...returnRecord, items });
  } catch (err) {
    console.error('获取退单详情失败:', err);
    res.status(500).json({ error: '获取退单详情失败' });
  }
});

module.exports = router;
