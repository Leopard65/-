/**
 * 纯计算函数（无副作用、不依赖 db），便于单元测试与跨路由复用。
 * 业务口径集中于此，路由只负责取数与写库。
 */

// 保留两位小数（金额统一口径）
function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

// 整单应付额 = 原价合计 × 折扣（折扣为整单口径）
function applyDiscount(originalTotal, discount) {
  const d = discount == null ? 1 : Number(discount);
  return round2(originalTotal * d);
}

// 积分 = floor(金额 × 积分倍率)
function calcPoints(amount, pointsRate) {
  const r = pointsRate == null ? 1 : Number(pointsRate);
  return Math.floor((Number(amount) || 0) * r);
}

// 原单实际折扣比例 = 实收总额 / 明细原价合计（用于退货折后退）
function effectiveDiscount(saleTotal, saleLineSum) {
  return saleLineSum > 0 ? saleTotal / saleLineSum : 1;
}

// 折后退款额 = 退货原价合计 × 原单折扣
function calcRefund(originalLineSum, effDiscount) {
  return round2(originalLineSum * effDiscount);
}

/**
 * 智能补货建议
 * @param {number} stock 当前库存
 * @param {number} minStock 安全库存（预警值）
 * @param {number} avgDaily 近期日均销量
 * @param {number} leadDays 备货周期（天）
 * 目标库存 = 覆盖备货周期的销量 + 安全库存；建议补货 = max(0, ceil(目标 - 现库存))
 * @returns {{suggested:number, daysLeft:(number|null), avgDaily:number}}
 *   daysLeft 为预计可售天数；无销量时为 null（不会因销售缺货）
 */
function calcReplenish({ stock = 0, minStock = 0, avgDaily = 0, leadDays = 7 }) {
  const target = avgDaily * leadDays + minStock;
  const suggested = Math.max(0, Math.ceil(target - stock));
  const daysLeft = avgDaily > 0 ? Math.floor(stock / avgDaily) : null;
  return { suggested, daysLeft, avgDaily: round2(avgDaily) };
}

/**
 * RFM 客户分层（R×M 四象限）
 * @param {number} total 累计消费(M)
 * @param {number|null} lastDays 最近一次消费距今天数(R)
 * @param {number} valueSplit 高/低价值分界（如买家消费中位数）
 * @param {number} activeDays 活跃天数门槛
 * @returns {'核心客户'|'流失预警'|'潜力客户'|'沉睡客户'}
 */
function rfmSegment({ total = 0, lastDays = null, valueSplit = 0, activeDays = 14 }) {
  const highValue = total >= valueSplit;
  const active = lastDays != null && lastDays <= activeDays;
  if (highValue && active) return '核心客户';
  if (highValue && !active) return '流失预警';
  if (!highValue && active) return '潜力客户';
  return '沉睡客户';
}

module.exports = {
  round2,
  applyDiscount,
  calcPoints,
  effectiveDiscount,
  calcRefund,
  calcReplenish,
  rfmSegment,
};
