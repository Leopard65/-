const express = require('express');
const router = express.Router();
const db = require('../db');
const { expiryStatus } = require('../utils/calc');

// 批次临期预警阈值（天），与批次页/汇总口径一致
const WARN_DAYS = 30;

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

  // 待审核退货数（待办）
  const pendingReturns = db.prepare("SELECT COUNT(*) as c FROM returns WHERE status = 'pending'").get().c;

  // 今日销售目标：近30天「有销售的日子」的日均销售额（作为参考目标）
  const avgRow = db.prepare(`
    SELECT COALESCE(AVG(daily), 0) as avg FROM (
      SELECT SUM(total) as daily FROM sales
      WHERE date(created_at) >= date(?, '-29 days')
      GROUP BY date(created_at)
    )
  `).get(today);
  const salesTarget = Math.round(avgRow.avg);

  // 近7天销售趋势
  const trend = db.prepare(`
    SELECT date(created_at) as date, SUM(total) as amount
    FROM sales WHERE date(created_at) >= date(?, '-6 days')
    GROUP BY date(created_at) ORDER BY date
  `).all(today);

  // 批次保质期预警（在库批次按到期日计 临期/过期，待办用）
  const batchRows = db.prepare("SELECT expiry_date FROM product_batches WHERE status = 'active'").all();
  let nearExpiry = 0, expiredBatches = 0;
  batchRows.forEach(r => {
    const s = expiryStatus({ expiryDate: r.expiry_date, today, warnDays: WARN_DAYS });
    if (s === 'expired') expiredBatches++;
    else if (s === 'near') nearExpiry++;
  });

  res.json({
    todaySales: todaySales.amount,
    todayOrders: todaySales.count,
    productCount,
    memberCount,
    pendingReturns,
    salesTarget,
    nearExpiry,
    expiredBatches,
    lowStock,
    hotProducts,
    trend
  });
});

module.exports = router;
