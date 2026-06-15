const express = require('express');
const router = express.Router();
const db = require('../db');
const { calcReplenish, rfmSegment } = require('../utils/calc');

// 日销售报表（含退款与净销售额）
router.get('/sales/daily', (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let saleWhere = 'WHERE 1=1';
    let retWhere = "WHERE status = 'completed'";
    const saleParams = [];
    const retParams = [];

    if (start_date) {
      saleWhere += ' AND DATE(created_at) >= ?'; saleParams.push(start_date);
      retWhere += ' AND DATE(created_at) >= ?'; retParams.push(start_date);
    }
    if (end_date) {
      saleWhere += ' AND DATE(created_at) <= ?'; saleParams.push(end_date);
      retWhere += ' AND DATE(created_at) <= ?'; retParams.push(end_date);
    }

    // 毛销售额来自 sales，退款来自已审核退货（按退货发生日），净额 = 毛额 - 退款
    const data = db.prepare(`
      SELECT d.date, d.order_count, d.total_amount, d.member_count,
        COALESCE(rf.refund, 0) as refund_amount,
        d.total_amount - COALESCE(rf.refund, 0) as net_amount
      FROM (
        SELECT
          DATE(created_at) as date,
          COUNT(*) as order_count,
          SUM(total) as total_amount,
          COUNT(DISTINCT member_id) as member_count
        FROM sales
        ${saleWhere}
        GROUP BY DATE(created_at)
      ) d
      LEFT JOIN (
        SELECT DATE(created_at) as date, SUM(total) as refund
        FROM returns
        ${retWhere}
        GROUP BY DATE(created_at)
      ) rf ON d.date = rf.date
      ORDER BY d.date
    `).all(...saleParams, ...retParams);

    res.json(data);
  } catch (err) {
    console.error('获取日销售报表失败:', err);
    res.status(500).json({ error: '获取日销售报表失败' });
  }
});

// 商品销售排行
router.get('/sales/products', (req, res) => {
  try {
    const { start_date, end_date, limit = 20 } = req.query;
    let where = 'WHERE 1=1';
    const params = [];

    if (start_date) {
      where += ' AND DATE(s.created_at) >= ?';
      params.push(start_date);
    }
    if (end_date) {
      where += ' AND DATE(s.created_at) <= ?';
      params.push(end_date);
    }

    const data = db.prepare(`
      SELECT
        p.id, p.name, p.barcode,
        SUM(si.quantity) as total_quantity,
        SUM(si.quantity * si.price) as total_amount,
        COUNT(DISTINCT s.id) as order_count
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      JOIN sales s ON si.sale_id = s.id
      ${where}
      GROUP BY p.id
      ORDER BY total_amount DESC
      LIMIT ?
    `).all(...params, parseInt(limit));

    res.json(data);
  } catch (err) {
    console.error('获取商品销售排行失败:', err);
    res.status(500).json({ error: '获取商品销售排行失败' });
  }
});

// 分类销售统计
router.get('/sales/categories', (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let where = 'WHERE 1=1';
    const params = [];

    if (start_date) {
      where += ' AND DATE(s.created_at) >= ?';
      params.push(start_date);
    }
    if (end_date) {
      where += ' AND DATE(s.created_at) <= ?';
      params.push(end_date);
    }

    const data = db.prepare(`
      SELECT
        c.id, c.name as category_name,
        SUM(si.quantity) as total_quantity,
        SUM(si.quantity * si.price) as total_amount,
        COUNT(DISTINCT s.id) as order_count
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      JOIN sales s ON si.sale_id = s.id
      ${where}
      GROUP BY c.id
      ORDER BY total_amount DESC
    `).all(...params);

    res.json(data);
  } catch (err) {
    console.error('获取分类销售统计失败:', err);
    res.status(500).json({ error: '获取分类销售统计失败' });
  }
});

// 支付方式统计
router.get('/sales/payments', (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let where = 'WHERE 1=1';
    const params = [];

    if (start_date) {
      where += ' AND DATE(created_at) >= ?';
      params.push(start_date);
    }
    if (end_date) {
      where += ' AND DATE(created_at) <= ?';
      params.push(end_date);
    }

    const data = db.prepare(`
      SELECT
        payment,
        COUNT(*) as order_count,
        SUM(total) as total_amount
      FROM sales
      ${where}
      GROUP BY payment
      ORDER BY total_amount DESC
    `).all(...params);

    res.json(data);
  } catch (err) {
    console.error('获取支付方式统计失败:', err);
    res.status(500).json({ error: '获取支付方式统计失败' });
  }
});

// 库存预警商品
router.get('/inventory/warning', (req, res) => {
  try {
    const data = db.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.stock <= p.min_stock AND p.status = 1
      ORDER BY p.stock ASC
    `).all();

    res.json(data);
  } catch (err) {
    console.error('获取库存预警失败:', err);
    res.status(500).json({ error: '获取库存预警失败' });
  }
});

// 库存价值统计
router.get('/inventory/value', (req, res) => {
  try {
    const data = db.prepare(`
      SELECT
        c.name as category_name,
        COUNT(p.id) as product_count,
        SUM(p.stock) as total_stock,
        SUM(p.stock * p.cost) as cost_value,
        SUM(p.stock * p.price) as retail_value
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 1
      GROUP BY c.id
      ORDER BY retail_value DESC
    `).all();

    res.json(data);
  } catch (err) {
    console.error('获取库存价值统计失败:', err);
    res.status(500).json({ error: '获取库存价值统计失败' });
  }
});

// 毛利润报表（净额：已扣除审核通过的退货）
router.get('/profit/gross', (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let saleWhere = 'WHERE 1=1';
    let retWhere = "WHERE r.status = 'completed'";
    const saleParams = [];
    const retParams = [];

    if (start_date) {
      saleWhere += ' AND DATE(s.created_at) >= ?'; saleParams.push(start_date);
      retWhere += ' AND DATE(r.created_at) >= ?'; retParams.push(start_date);
    }
    if (end_date) {
      saleWhere += ' AND DATE(s.created_at) <= ?'; saleParams.push(end_date);
      retWhere += ' AND DATE(r.created_at) <= ?'; retParams.push(end_date);
    }

    // 销售记为正、已审核退货记为负，按日聚合得到净收入/净成本/净毛利
    const data = db.prepare(`
      SELECT date,
        SUM(revenue) as revenue,
        SUM(cost) as cost,
        SUM(revenue) - SUM(cost) as gross_profit
      FROM (
        SELECT DATE(s.created_at) as date,
          si.quantity * si.price as revenue,
          si.quantity * p.cost as cost
        FROM sales s
        JOIN sale_items si ON s.id = si.sale_id
        JOIN products p ON si.product_id = p.id
        ${saleWhere}
        UNION ALL
        SELECT DATE(r.created_at) as date,
          -(ri.quantity * ri.price) as revenue,
          -(ri.quantity * p.cost) as cost
        FROM returns r
        JOIN return_items ri ON r.id = ri.return_id
        JOIN products p ON ri.product_id = p.id
        ${retWhere}
      )
      GROUP BY date
      ORDER BY date
    `).all(...saleParams, ...retParams);

    res.json(data);
  } catch (err) {
    console.error('获取毛利润报表失败:', err);
    res.status(500).json({ error: '获取毛利润报表失败' });
  }
});

// 月度利润汇总（净额：已扣除审核通过的退货）
router.get('/profit/monthly', (req, res) => {
  try {
    const { year } = req.query;
    let saleWhere = 'WHERE 1=1';
    let retWhere = "WHERE r.status = 'completed'";
    const saleParams = [];
    const retParams = [];

    if (year) {
      saleWhere += ' AND substr(s.created_at, 1, 4) = ?'; saleParams.push(year);
      retWhere += ' AND substr(r.created_at, 1, 4) = ?'; retParams.push(year);
    }

    const data = db.prepare(`
      SELECT month,
        SUM(revenue) as revenue,
        SUM(cost) as cost,
        SUM(revenue) - SUM(cost) as gross_profit,
        CASE
          WHEN SUM(revenue) > 0
          THEN ROUND((SUM(revenue) - SUM(cost)) / SUM(revenue) * 100, 2)
          ELSE 0
        END as profit_rate
      FROM (
        SELECT substr(s.created_at, 1, 7) as month,
          si.quantity * si.price as revenue,
          si.quantity * p.cost as cost
        FROM sales s
        JOIN sale_items si ON s.id = si.sale_id
        JOIN products p ON si.product_id = p.id
        ${saleWhere}
        UNION ALL
        SELECT substr(r.created_at, 1, 7) as month,
          -(ri.quantity * ri.price) as revenue,
          -(ri.quantity * p.cost) as cost
        FROM returns r
        JOIN return_items ri ON r.id = ri.return_id
        JOIN products p ON ri.product_id = p.id
        ${retWhere}
      )
      GROUP BY month
      ORDER BY month
    `).all(...saleParams, ...retParams);

    res.json(data);
  } catch (err) {
    console.error('获取月度利润汇总失败:', err);
    res.status(500).json({ error: '获取月度利润汇总失败' });
  }
});

// 智能补货建议（按近30天日均销量推算建议补货量与预计可售天数）
router.get('/inventory/replenish', (req, res) => {
  try {
    const leadDays = parseInt(req.query.lead_days) || 7;
    const rows = db.prepare(`
      SELECT p.id, p.name, p.unit, p.stock, p.min_stock, c.name AS category_name,
        COALESCE(s.sold, 0) AS sold_30d
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN (
        SELECT si.product_id, SUM(si.quantity) AS sold
        FROM sale_items si
        JOIN sales sa ON si.sale_id = sa.id
        WHERE DATE(sa.created_at) >= DATE('now', 'localtime', '-29 days')
        GROUP BY si.product_id
      ) s ON s.product_id = p.id
      WHERE p.status = 1
    `).all();

    const data = rows
      .map(r => {
        const { suggested, daysLeft, avgDaily } = calcReplenish({
          stock: r.stock,
          minStock: r.min_stock,
          avgDaily: r.sold_30d / 30,
          leadDays
        });
        return {
          id: r.id, name: r.name, unit: r.unit, category_name: r.category_name,
          stock: r.stock, min_stock: r.min_stock, sold_30d: r.sold_30d,
          avg_daily: avgDaily, days_left: daysLeft, suggested
        };
      })
      // 需补货：低于安全库存，或按销售速度预计可售天数 ≤ 备货周期
      .filter(d => d.stock <= d.min_stock || (d.days_left != null && d.days_left <= leadDays))
      // 紧急度排序：预计可售天数升序（无销量排最后），其次建议补货量降序
      .sort((a, b) => {
        const ad = a.days_left == null ? Infinity : a.days_left;
        const bd = b.days_left == null ? Infinity : b.days_left;
        return ad !== bd ? ad - bd : b.suggested - a.suggested;
      });

    res.json({ lead_days: leadDays, data });
  } catch (err) {
    console.error('获取智能补货建议失败:', err);
    res.status(500).json({ error: '获取智能补货建议失败' });
  }
});

// ===== 会员画像 =====

// 会员消费排行（按累计消费）
router.get('/members/ranking', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const data = db.prepare(`
      SELECT m.id, m.name, m.phone, m.level, m.points, m.total_spent,
        COUNT(s.id) as order_count
      FROM members m
      LEFT JOIN sales s ON s.member_id = m.id
      WHERE m.status != -1
      GROUP BY m.id
      ORDER BY m.total_spent DESC
      LIMIT ?
    `).all(limit);
    res.json(data);
  } catch (err) {
    console.error('获取会员消费排行失败:', err);
    res.status(500).json({ error: '获取会员消费排行失败' });
  }
});

// 会员等级分布
router.get('/members/levels', (req, res) => {
  try {
    const data = db.prepare(`
      SELECT level, COUNT(*) as count
      FROM members
      WHERE status != -1
      GROUP BY level
      ORDER BY count DESC
    `).all();
    res.json(data);
  } catch (err) {
    console.error('获取会员等级分布失败:', err);
    res.status(500).json({ error: '获取会员等级分布失败' });
  }
});

// 会员复购分析
router.get('/members/repurchase', (req, res) => {
  try {
    const perMember = db.prepare(`
      SELECT m.id, m.name, m.phone, COUNT(s.id) as order_count, COALESCE(SUM(s.total), 0) as total
      FROM members m
      JOIN sales s ON s.member_id = m.id
      WHERE m.status != -1
      GROUP BY m.id
    `).all();

    const totalBuyers = perMember.length;
    const repeatBuyers = perMember.filter(m => m.order_count > 1).length;
    const repurchaseRate = totalBuyers > 0 ? Math.round((repeatBuyers / totalBuyers) * 10000) / 100 : 0;
    const top = perMember
      .filter(m => m.order_count > 1)
      .sort((a, b) => b.order_count - a.order_count)
      .slice(0, 10);

    res.json({ totalBuyers, repeatBuyers, repurchaseRate, top });
  } catch (err) {
    console.error('获取会员复购分析失败:', err);
    res.status(500).json({ error: '获取会员复购分析失败' });
  }
});

// 会员 RFM 分层（R 最近消费天数 / F 订单数 / M 累计消费，按 R×M 四象限分层）
router.get('/members/rfm', (req, res) => {
  try {
    const activeDays = parseInt(req.query.active_days) || 14;
    const buyers = db.prepare(`
      SELECT m.id, m.name, m.phone, m.level,
        COUNT(sa.id) AS orders,
        COALESCE(SUM(sa.total), 0) AS total,
        CAST(julianday('now', 'localtime') - julianday(MAX(sa.created_at)) AS INTEGER) AS last_days
      FROM members m
      JOIN sales sa ON sa.member_id = m.id
      WHERE m.status != -1
      GROUP BY m.id
    `).all();

    // 价值分界 = 买家累计消费的中位数（相对阈值，避免写死）
    const totals = buyers.map(b => b.total).sort((a, b) => a - b);
    const n = totals.length;
    const valueSplit = n === 0 ? 0
      : (n % 2 ? totals[(n - 1) / 2] : (totals[n / 2 - 1] + totals[n / 2]) / 2);

    const members = buyers.map(b => ({
      ...b,
      segment: rfmSegment({ total: b.total, lastDays: b.last_days, valueSplit, activeDays })
    }));

    const order = ['核心客户', '流失预警', '潜力客户', '沉睡客户'];
    const segments = order.map(seg => {
      const list = members.filter(m => m.segment === seg);
      return {
        segment: seg,
        count: list.length,
        total: Math.round(list.reduce((s, m) => s + m.total, 0) * 100) / 100
      };
    });

    // 名单按累计消费降序，便于先看高价值
    members.sort((a, b) => b.total - a.total);

    res.json({ value_split: Math.round(valueSplit * 100) / 100, active_days: activeDays, segments, members });
  } catch (err) {
    console.error('获取会员 RFM 分层失败:', err);
    res.status(500).json({ error: '获取会员 RFM 分层失败' });
  }
});

module.exports = router;
