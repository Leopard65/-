/**
 * calc.js 单元测试（Node 内置测试运行器，零依赖）
 * 运行： npm test   （等价 node --test server/）
 */
const { test } = require('node:test');
const assert = require('node:assert');
const calc = require('./calc');

const approx = (a, b) => Math.abs(a - b) < 1e-9;

test('round2 两位小数', () => {
  assert.strictEqual(calc.round2(11.025), 11.03);
  assert.strictEqual(calc.round2(5.684), 5.68);
  assert.strictEqual(calc.round2(10), 10);
  assert.strictEqual(calc.round2('abc'), 0);
});

test('applyDiscount 折后应付', () => {
  assert.strictEqual(calc.applyDiscount(11.6, 0.95), 11.02);
  assert.strictEqual(calc.applyDiscount(10, 1), 10);
  assert.strictEqual(calc.applyDiscount(10, null), 10); // 无折扣
  assert.strictEqual(calc.applyDiscount(100, 0.9), 90);
});

test('calcPoints floor(金额×倍率)', () => {
  assert.strictEqual(calc.calcPoints(11.02, 2), 22);
  assert.strictEqual(calc.calcPoints(5.51, 1.5), 8); // floor(8.265)
  assert.strictEqual(calc.calcPoints(10, null), 10);
  assert.strictEqual(calc.calcPoints(0, 3), 0);
});

test('effectiveDiscount 原单实际折扣', () => {
  assert.ok(approx(calc.effectiveDiscount(11.02, 11.6), 0.95));
  assert.strictEqual(calc.effectiveDiscount(5, 0), 1);  // 防除零
  assert.strictEqual(calc.effectiveDiscount(10, 10), 1);
});

test('calcRefund 折后退款', () => {
  assert.strictEqual(calc.calcRefund(5.8, 0.95), 5.51);
  assert.strictEqual(calc.calcRefund(11.6, 1), 11.6);
  assert.strictEqual(calc.calcRefund(0, 0.95), 0);
});

test('calcReplenish 智能补货', () => {
  // 缺货中：现5 安全10 日均3 备货7 → 目标31 建议26 可售1天
  let r = calc.calcReplenish({ stock: 5, minStock: 10, avgDaily: 3, leadDays: 7 });
  assert.strictEqual(r.suggested, 26);
  assert.strictEqual(r.daysLeft, 1);
  // 库存充足无销量：建议0 可售天数null
  r = calc.calcReplenish({ stock: 100, minStock: 10, avgDaily: 0, leadDays: 7 });
  assert.strictEqual(r.suggested, 0);
  assert.strictEqual(r.daysLeft, null);
  // 正常补货
  r = calc.calcReplenish({ stock: 50, minStock: 20, avgDaily: 5, leadDays: 7 });
  assert.strictEqual(r.suggested, 5); // ceil(5*7+20-50)=ceil(5)
  assert.strictEqual(r.daysLeft, 10);
});

test('rfmSegment 客户分层', () => {
  const split = 1000;
  assert.strictEqual(calc.rfmSegment({ total: 2000, lastDays: 5, valueSplit: split }), '核心客户');
  assert.strictEqual(calc.rfmSegment({ total: 2000, lastDays: 40, valueSplit: split }), '流失预警');
  assert.strictEqual(calc.rfmSegment({ total: 100, lastDays: 5, valueSplit: split }), '潜力客户');
  assert.strictEqual(calc.rfmSegment({ total: 100, lastDays: 40, valueSplit: split }), '沉睡客户');
  assert.strictEqual(calc.rfmSegment({ total: 100, lastDays: null, valueSplit: split }), '沉睡客户');
});

test('daysToExpiry 距到期天数', () => {
  assert.strictEqual(calc.daysToExpiry('2026-06-20', '2026-06-17'), 3);   // 未到期
  assert.strictEqual(calc.daysToExpiry('2026-06-17', '2026-06-17'), 0);   // 今日到期
  assert.strictEqual(calc.daysToExpiry('2026-06-15', '2026-06-17'), -2);  // 已过期
  assert.strictEqual(calc.daysToExpiry('2026-07-17 09:30:00', '2026-06-17'), 30); // 带时间只取日期
  assert.strictEqual(calc.daysToExpiry('', '2026-06-17'), null);          // 非法入参
});

test('expiryStatus 保质期状态', () => {
  const today = '2026-06-17';
  assert.strictEqual(calc.expiryStatus({ expiryDate: '2026-06-10', today }), 'expired'); // 过期
  assert.strictEqual(calc.expiryStatus({ expiryDate: '2026-06-17', today }), 'near');     // 今日到期=临期
  assert.strictEqual(calc.expiryStatus({ expiryDate: '2026-07-10', today }), 'near');     // 23 天内
  assert.strictEqual(calc.expiryStatus({ expiryDate: '2026-07-17', today }), 'near');     // 第30天含边界
  assert.strictEqual(calc.expiryStatus({ expiryDate: '2026-08-01', today }), 'normal');   // 远期
  assert.strictEqual(calc.expiryStatus({ expiryDate: '2026-06-20', today, warnDays: 2 }), 'normal'); // 自定义阈值外
});
