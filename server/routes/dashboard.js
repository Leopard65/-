const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  // 今日销售额和订单数
  const todaySales = db.prepare(`
    SELECT COALESCE(SUM(total),0) as amount, COUNT(*) as count
    FROM sales WHERE date(created_at) = ?
  `).get(today);

  // 库存预警商品
  const lowStock = db.prepare(`
    SELECT p.*, c.name as category_name FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.stock <= p.min_stock ORDER BY p.stock ASC
  `).all();

  // 热销商品 TOP5
  const hotProducts = db.prepare(`
    SELECT p.name, SUM(si.quantity) as total_sold
    FROM sale_items si JOIN products p ON si.product_id = p.id
    GROUP BY si.product_id ORDER BY total_sold DESC LIMIT 5
  `).all();

  // 商品总数
  const productCount = db.prepare('SELECT COUNT(*) as c FROM products').get().c;

  // 会员总数
  const memberCount = db.prepare('SELECT COUNT(*) as c FROM members').get().c;

  // 近7天销售趋势
  const trend = db.prepare(`
    SELECT date(created_at) as date, SUM(total) as amount
    FROM sales WHERE date(created_at) >= date(?, '-6 days')
    GROUP BY date(created_at) ORDER BY date
  `).all(today);

  res.json({
    todaySales: todaySales.amount,
    todayOrders: todaySales.count,
    productCount,
    memberCount,
    lowStock,
    hotProducts,
    trend
  });
});

module.exports = router;
