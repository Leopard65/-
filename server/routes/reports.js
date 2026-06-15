const express = require('express');
const router = express.Router();
const db = require('../db');

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

module.exports = router;
