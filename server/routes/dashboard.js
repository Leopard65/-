const express = require('express');
const router = express.Router();
const db = require('../db');

// 获取本地时区的今日日期
function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

router.get('/', (req, res) => {
  const today = getToday();

  // 今日销售额和订单数
  const todaySales = db.prepare(`
    SELECT COALESCE(SUM(total),0) as amount, COUNT(*) as count
    FROM sales WHERE date(created_at) = ?
  `).get(today);

  // 库存预警商品（仅统计在售商品，与报表/商品列表口径一致）
  const lowStock = db.prepare(`
    SELECT p.*, c.name as category_name FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.stock <= p.min_stock AND p.status = 1 ORDER BY p.stock ASC
  `).all();

  // 热销商品 TOP5
  const hotProducts = db.prepare(`
    SELECT p.name, SUM(si.quantity) as total_sold
    FROM sale_items si JOIN products p ON si.product_id = p.id
    GROUP BY si.product_id ORDER BY total_sold DESC LIMIT 5
  `).all();

  // 商品总数（排除软删除）
  const productCount = db.prepare('SELECT COUNT(*) as c FROM products WHERE status != -1').get().c;

  // 会员总数（排除软删除）
  const memberCount = db.prepare('SELECT COUNT(*) as c FROM members WHERE status != -1').get().c;

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
