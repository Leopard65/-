/**
 * 演示数据生成脚本
 * ------------------------------------------------------------
 * 生成约 30 天的销售 / 进货 / 退货历史，用于毕业设计演示，
 * 让仪表盘趋势、报表图表、利润分析、会员积分等都有丰满数据。
 *
 * 用法： npm run seed:demo        （等价于 node server/seed-demo.js）
 *
 * ⚠️ 该脚本会清空并重建「交易类」数据（销售、进货、退货、操作日志），
 *    但不会删除商品、分类、供应商、会员、用户、会员等级等基础数据。
 *    运行前请确认——若要保留当前数据，请先备份 server/supermarket.db。
 * ------------------------------------------------------------
 */

const db = require('./db');

// ---------- 小工具 ----------
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const chance = (p) => Math.random() < p;
const round2 = (n) => Math.round(n * 100) / 100;

// 把 Date 格式化为 SQLite 'YYYY-MM-DD HH:MM:SS'（本地时间口径，与表默认一致）
function fmt(date) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ` +
         `${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`;
}
// n 天前的某个营业时段时间点
function dayAgo(n, hour = randInt(9, 21), min = randInt(0, 59), sec = randInt(0, 59)) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, min, sec, 0);
  return d;
}
// 相对今天偏移 days 天的日期（days>0 未来 / <0 过去），返回 'YYYY-MM-DD'
function dateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const DAYS = 30;

console.log('=== 开始生成演示数据 ===');

// ---------- 1. 清空交易类数据 ----------
const clear = db.transaction(() => {
  db.exec(`
    DELETE FROM product_batches;
    DELETE FROM return_items;
    DELETE FROM returns;
    DELETE FROM sale_items;
    DELETE FROM sales;
    DELETE FROM purchase_items;
    DELETE FROM purchases;
    DELETE FROM operation_logs;
  `);
});
clear();
console.log('已清空：销售 / 进货 / 退货 / 批次 / 操作日志');

// ---------- 2. 补充会员（让会员分析更丰富）----------
const extraMembers = [
  ['赵敏', '13900003333'],
  ['孙强', '13900004444'],
  ['周婷', '13900005555'],
  ['吴磊', '13900006666'],
];
const insMember = db.prepare('INSERT OR IGNORE INTO members (name, phone) VALUES (?, ?)');
extraMembers.forEach(([n, p]) => insMember.run(n, p));

// ---------- 3. 基础数据快照 ----------
const products = db.prepare('SELECT * FROM products WHERE status = 1').all();
const members = db.prepare('SELECT * FROM members WHERE status != -1').all();
const suppliers = db.prepare('SELECT * FROM suppliers WHERE status != -1').all();
const levels = db.prepare('SELECT * FROM member_levels ORDER BY min_spent DESC').all();

if (products.length === 0) {
  console.error('没有可用商品，请先运行后端初始化基础数据');
  process.exit(1);
}

// 给所有商品一个充足的库存基线，避免生成销售时中途缺货
db.prepare('UPDATE products SET stock = ?').run(0); // 先清零再按商品设充足基线
const baseStock = db.prepare('UPDATE products SET stock = ? WHERE id = ?');
products.forEach((p) => baseStock.run(randInt(400, 700), p.id));
// 同步内存快照里的库存
const stockMap = new Map(products.map((p) => [p.id, db.prepare('SELECT stock FROM products WHERE id=?').get(p.id).stock]));

// 折扣/积分倍率：按会员当前等级取
function levelOf(member) {
  if (!member || !member.level) return { discount: 1, points_rate: 1 };
  const lv = db.prepare('SELECT * FROM member_levels WHERE name = ?').get(member.level);
  return lv ? { discount: lv.discount, points_rate: lv.points_rate } : { discount: 1, points_rate: 1 };
}
function autoUpgrade(memberId) {
  const m = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId);
  if (!m) return;
  const nl = levels.find((l) => m.total_spent >= l.min_spent);
  if (nl && nl.name !== m.level) db.prepare('UPDATE members SET level = ? WHERE id = ?').run(nl.name, memberId);
}

// 预编译语句
const insSale = db.prepare('INSERT INTO sales (member_id, total, payment, status, created_at) VALUES (?,?,?,?,?)');
const insSaleItem = db.prepare('INSERT INTO sale_items (sale_id, product_id, quantity, price) VALUES (?,?,?,?)');
const decStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
const addMemberStats = db.prepare('UPDATE members SET points = points + ?, total_spent = total_spent + ? WHERE id = ?');

const insPurchase = db.prepare('INSERT INTO purchases (supplier_id, total, status, created_at) VALUES (?,?,?,?)');
const insPurchaseItem = db.prepare('INSERT INTO purchase_items (purchase_id, product_id, quantity, cost) VALUES (?,?,?,?)');
const incStock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
const setCost = db.prepare('UPDATE products SET cost = ? WHERE id = ?');

const payments = ['cash', 'cash', 'wechat', 'wechat', 'wechat', 'alipay']; // 加权：现金/微信多一些

// ---------- 4. 重置会员消费/积分（重新累计）----------
db.prepare("UPDATE members SET points = 0, total_spent = 0, level = '普通会员'").run();

// ---------- 5. 生成数据（单事务，快）----------
const saleRows = []; // 记录已生成销售，供退货引用 { id, created_at, member_id, items:[{product_id, quantity, price}] }

const generate = db.transaction(() => {
  // 5.1 进货：最近 30 天里每 3~4 天一单
  for (let d = DAYS; d >= 0; d -= randInt(3, 4)) {
    if (suppliers.length === 0) break;
    const when = fmt(dayAgo(d, randInt(8, 11)));
    const n = randInt(2, 5);
    const chosen = [...products].sort(() => Math.random() - 0.5).slice(0, n);
    let total = 0;
    const pid = insPurchase.run(pick(suppliers).id, 0, 'completed', when).lastInsertRowid;
    chosen.forEach((p) => {
      const qty = randInt(50, 150);
      const cost = round2(p.cost * (0.9 + Math.random() * 0.15));
      insPurchaseItem.run(pid, p.id, qty, cost);
      incStock.run(qty, p.id);
      setCost.run(cost, p.id);
      stockMap.set(p.id, (stockMap.get(p.id) || 0) + qty);
      total += qty * cost;
    });
    db.prepare('UPDATE purchases SET total = ? WHERE id = ?').run(round2(total), pid);
  }

  // 5.2 销售：每天 3~12 单
  for (let d = DAYS; d >= 0; d--) {
    const orders = randInt(3, 12);
    for (let o = 0; o < orders; o++) {
      const when = fmt(dayAgo(d));
      const lineN = randInt(1, 4);
      const chosen = [...products].sort(() => Math.random() - 0.5).slice(0, lineN);
      const items = [];
      let originalTotal = 0;
      chosen.forEach((p) => {
        const avail = stockMap.get(p.id) || 0;
        if (avail <= 5) return;
        const qty = randInt(1, Math.min(5, avail - 1));
        items.push({ product_id: p.id, quantity: qty, price: p.price });
        originalTotal += qty * p.price;
      });
      if (items.length === 0) continue;

      // 约 45% 绑定会员
      const member = chance(0.45) ? pick(members) : null;
      const { discount, points_rate } = levelOf(member);
      const finalTotal = round2(originalTotal * discount);

      const saleId = insSale.run(member ? member.id : null, finalTotal, pick(payments), 'completed', when).lastInsertRowid;
      items.forEach((it) => {
        insSaleItem.run(saleId, it.product_id, it.quantity, it.price);
        decStock.run(it.quantity, it.product_id);
        stockMap.set(it.product_id, stockMap.get(it.product_id) - it.quantity);
      });

      if (member) {
        const points = Math.floor(finalTotal * points_rate);
        addMemberStats.run(points, finalTotal, member.id);
        autoUpgrade(member.id);
        // 刷新内存中的 member.level，后续单据用最新等级
        member.level = db.prepare('SELECT level FROM members WHERE id = ?').get(member.id).level;
        member.total_spent = db.prepare('SELECT total_spent FROM members WHERE id = ?').get(member.id).total_spent;
      }

      saleRows.push({ id: saleId, created_at: when, member_id: member ? member.id : null, items });
    }
  }

  // 5.3 退货：从较早的销售里挑约 8 单，退其中 1 个商品（已审核通过）
  const insReturn = db.prepare('INSERT INTO returns (sale_id, reason, total, status, operator, created_at) VALUES (?,?,?,?,?,?)');
  const insReturnItem = db.prepare('INSERT INTO return_items (return_id, product_id, quantity, price) VALUES (?,?,?,?)');
  const reasons = ['商品质量问题', '顾客不满意', '临期商品', '包装破损', '买错了'];
  const candidates = saleRows.filter((s) => s.items.length > 0).slice(0, Math.floor(saleRows.length * 0.6));
  const returnCount = Math.min(8, candidates.length);
  const shuffled = [...candidates].sort(() => Math.random() - 0.5).slice(0, returnCount);

  shuffled.forEach((s) => {
    const it = pick(s.items);
    const qty = 1;
    const total = round2(qty * it.price);
    // 退货时间：销售之后 0~3 天
    const sDate = new Date(s.created_at.replace(' ', 'T'));
    sDate.setDate(sDate.getDate() + randInt(0, 3));
    sDate.setHours(randInt(9, 20), randInt(0, 59), 0, 0);
    const when = fmt(sDate);

    const rid = insReturn.run(s.sale_id || s.id, pick(reasons), total, 'completed', 'admin', when).lastInsertRowid;
    insReturnItem.run(rid, it.product_id, qty, it.price);
    incStock.run(qty, it.product_id); // 审核通过恢复库存
    // 会员积分/消费回退（与 returns.js 一致，做非负保护）
    if (s.member_id) {
      const back = Math.floor(total);
      db.prepare('UPDATE members SET points = MAX(0, points - ?), total_spent = MAX(0, total_spent - ?) WHERE id = ?')
        .run(back, total, s.member_id);
    }
  });

  // 5.4 制造少量低库存，触发库存预警演示
  const lowOnes = [...products].sort(() => Math.random() - 0.5).slice(0, 3);
  lowOnes.forEach((p) => {
    const target = Math.max(0, p.min_stock - randInt(0, Math.ceil(p.min_stock / 2)));
    db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(target, p.id);
  });

  // 5.5 写入若干操作日志样例，避免日志页空白
  const insLog = db.prepare('INSERT INTO operation_logs (user_id, username, action, module, target_id, detail, ip, created_at) VALUES (?,?,?,?,?,?,?,?)');
  const logSamples = [
    ['create', 'products', '新增商品'],
    ['update', 'products', '修改商品价格'],
    ['create', 'members', '新增会员'],
    ['approve', 'returns', '审核退货'],
    ['create', 'purchases', '新建进货单'],
    ['login', 'auth', '管理员登录'],
  ];
  logSamples.forEach((l, i) => {
    insLog.run(1, 'admin', l[0], l[1], i + 1, JSON.stringify({ note: l[2] }), '127.0.0.1', fmt(dayAgo(randInt(0, DAYS))));
  });
});

generate();

// ---------- 5.7 生成商品批次/保质期（覆盖 过期/临期/正常 三档）----------
// 仅对非「日用百货」的食品生鲜类商品造批次，贴合保质期主题
const perishable = db.prepare(`
  SELECT p.id, p.name FROM products p
  LEFT JOIN categories c ON p.category_id = c.id
  WHERE p.status = 1 AND (c.name IS NULL OR c.name != '日用百货')
`).all();
const purchaseIds = db.prepare('SELECT id FROM purchases').all().map(r => r.id);
const insBatch = db.prepare(`
  INSERT INTO product_batches (product_id, batch_no, production_date, expiry_date, quantity, purchase_id, status)
  VALUES (?,?,?,?,?,?, 'active')
`);

const seedBatches = db.transaction(() => {
  let seq = 1;
  perishable.forEach((p, idx) => {
    const offsets = [];
    // 按索引轮转，确保整体覆盖 过期 / 临期 / 正常
    const mod = idx % 5;
    if (mod === 0) offsets.push(-randInt(1, 12));      // 已过期
    else if (mod === 1) offsets.push(randInt(2, 14));  // 临期（近）
    else if (mod === 2) offsets.push(randInt(15, 28)); // 临期（中）
    else offsets.push(randInt(60, 280));               // 正常
    // 约半数再加一个远期正常批次，丰富列表
    if (chance(0.5)) offsets.push(randInt(90, 320));

    offsets.forEach((off) => {
      const expiry = dateOffset(off);
      const prod = dateOffset(off - randInt(90, 365)); // 生产日期 = 到期日 - 保质期
      const qty = randInt(20, 90);
      const pid = purchaseIds.length && chance(0.7) ? pick(purchaseIds) : null;
      const batchNo = `B${expiry.replace(/-/g, '')}-${String(seq++).padStart(3, '0')}`;
      insBatch.run(p.id, batchNo, prod, expiry, qty, pid);
    });
  });
});
seedBatches();

// ---------- 6. 汇总输出 ----------
const sum = (q) => db.prepare(q).get().c;
console.log('—— 生成结果 ——');
console.log('销售单：', sum('SELECT COUNT(*) c FROM sales'));
console.log('销售明细：', sum('SELECT COUNT(*) c FROM sale_items'));
console.log('进货单：', sum('SELECT COUNT(*) c FROM purchases'));
console.log('退货单（已通过）：', sum("SELECT COUNT(*) c FROM returns WHERE status='completed'"));
console.log('库存预警商品：', sum('SELECT COUNT(*) c FROM products WHERE stock <= min_stock AND status = 1'));
console.log('商品批次：', sum('SELECT COUNT(*) c FROM product_batches'));
console.log('临期/过期批次：', sum("SELECT COUNT(*) c FROM product_batches WHERE status='active' AND date(expiry_date) <= date('now','localtime','+30 days')"));
const topMember = db.prepare('SELECT name, level, points, total_spent FROM members ORDER BY total_spent DESC LIMIT 1').get();
console.log('消费最高会员：', topMember ? `${topMember.name} / ${topMember.level} / 积分${topMember.points} / 消费¥${round2(topMember.total_spent)}` : '无');
console.log('=== 演示数据生成完成 ===');
process.exit(0);
