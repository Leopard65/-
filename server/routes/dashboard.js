const express = require('express');
const router = express.Router();
const db = require('../db');
const { expiryStatus, rfmSegment, round2 } = require('../utils/calc');

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

function getRecentReturnRisk(today) {
  const sales = db.prepare(`
    SELECT COUNT(*) as orders, COALESCE(SUM(total), 0) as amount
    FROM sales
    WHERE date(created_at) >= date(?, '-6 days')
  `).get(today);

  const returns = db.prepare(`
    SELECT COUNT(*) as returns, COALESCE(SUM(total), 0) as amount
    FROM returns
    WHERE status = 'completed' AND date(created_at) >= date(?, '-6 days')
  `).get(today);

  const orderRate = sales.orders > 0 ? round2((returns.returns / sales.orders) * 100) : 0;
  const amountRate = sales.amount > 0 ? round2((returns.amount / sales.amount) * 100) : 0;

  return {
    orders_7d: sales.orders,
    returns_7d: returns.returns,
    refund_amount_7d: round2(returns.amount),
    return_rate: orderRate,
    refund_rate: amountRate,
    is_high: returns.returns >= 2 && orderRate >= 10
  };
}

function getMemberOpsSummary() {
  const activeDays = 14;
  const buyers = db.prepare(`
    SELECT m.id,
      COALESCE(SUM(sa.total), 0) AS total,
      CAST(julianday('now', 'localtime') - julianday(MAX(sa.created_at)) AS INTEGER) AS last_days
    FROM members m
    JOIN sales sa ON sa.member_id = m.id
    WHERE m.status != -1
    GROUP BY m.id
  `).all();

  const totals = buyers.map(b => b.total).sort((a, b) => a - b);
  const n = totals.length;
  const valueSplit = n === 0 ? 0
    : (n % 2 ? totals[(n - 1) / 2] : (totals[n / 2 - 1] + totals[n / 2]) / 2);

  const segments = buyers.reduce((acc, buyer) => {
    const segment = rfmSegment({ total: buyer.total, lastDays: buyer.last_days, valueSplit, activeDays });
    acc[segment] = (acc[segment] || 0) + 1;
    return acc;
  }, {});

  return {
    buyer_count: buyers.length,
    active_days: activeDays,
    value_split: round2(valueSplit),
    core_count: segments['核心客户'] || 0,
    churn_risk_count: segments['流失预警'] || 0,
    potential_count: segments['潜力客户'] || 0,
    sleeping_count: segments['沉睡客户'] || 0
  };
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

  const returnRisk = getRecentReturnRisk(today);
  const memberOps = getMemberOpsSummary();

  res.json({
    todaySales: todaySales.amount,
    todayOrders: todaySales.count,
    productCount,
    memberCount,
    pendingReturns,
    salesTarget,
    nearExpiry,
    expiredBatches,
    returnRisk,
    memberOps,
    lowStock,
    hotProducts,
    trend
  });
});

module.exports = router;
