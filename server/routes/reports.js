const express = require('express');
const router = express.Router();
const db = require('../db');

// 日销售报表
router.get('/sales/daily', (req, res) => {
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
        DATE(created_at) as date,
        COUNT(*) as order_count,
        SUM(total) as total_amount,
        COUNT(DISTINCT member_id) as member_count
      FROM sales
      ${where}
      GROUP BY DATE(created_at)
      ORDER BY date
    `).all(...params);

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

// 毛利润报表
router.get('/profit/gross', (req, res) => {
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
        DATE(s.created_at) as date,
        SUM(si.quantity * si.price) as revenue,
        SUM(si.quantity * p.cost) as cost,
        SUM(si.quantity * si.price) - SUM(si.quantity * p.cost) as gross_profit
      FROM sales s
      JOIN sale_items si ON s.id = si.sale_id
      JOIN products p ON si.product_id = p.id
      ${where}
      GROUP BY DATE(s.created_at)
      ORDER BY date
    `).all(...params);

    res.json(data);
  } catch (err) {
    console.error('获取毛利润报表失败:', err);
    res.status(500).json({ error: '获取毛利润报表失败' });
  }
});

// 月度利润汇总
router.get('/profit/monthly', (req, res) => {
  try {
    const { year } = req.query;
    let where = 'WHERE 1=1';
    const params = [];

    if (year) {
      where += ' AND substr(s.created_at, 1, 4) = ?';
      params.push(year);
    }

    const data = db.prepare(`
      SELECT
        substr(s.created_at, 1, 7) as month,
        SUM(si.quantity * si.price) as revenue,
        SUM(si.quantity * p.cost) as cost,
        SUM(si.quantity * si.price) - SUM(si.quantity * p.cost) as gross_profit,
        CASE
          WHEN SUM(si.quantity * si.price) > 0
          THEN ROUND((SUM(si.quantity * si.price) - SUM(si.quantity * p.cost)) / SUM(si.quantity * si.price) * 100, 2)
          ELSE 0
        END as profit_rate
      FROM sales s
      JOIN sale_items si ON s.id = si.sale_id
      JOIN products p ON si.product_id = p.id
      ${where}
      GROUP BY substr(s.created_at, 1, 7)
      ORDER BY month
    `).all(...params);

    res.json(data);
  } catch (err) {
    console.error('获取月度利润汇总失败:', err);
    res.status(500).json({ error: '获取月度利润汇总失败' });
  }
});

module.exports = router;
