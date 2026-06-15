/**
 * 冒烟测试：npm run smoke
 * ------------------------------------------------------------
 * 自启后端（隔离的 smoke-test.db + 端口 3100），通过 HTTP 跑核心流程断言，
 * 再关闭后端并清理临时库。覆盖 P1 销售/退货、P2 价格权威/用户权限、P3 仪表盘/会员分析/导入。
 * 不依赖、也不触碰正式 supermarket.db。
 * ------------------------------------------------------------
 */
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const Database = require('better-sqlite3');

const PORT = 3100;
const BASE = `http://localhost:${PORT}/api`;
const DB_FILE = path.resolve(__dirname, 'server', 'smoke-test.db');

let pass = 0, fail = 0;
const approx = (a, b) => Math.abs(a - b) < 0.005;
const check = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}  ${extra}`); }
};
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function cleanupDb() {
  for (const suffix of ['', '-shm', '-wal']) {
    try { fs.unlinkSync(DB_FILE + suffix); } catch {}
  }
}

async function req(method, p, token, body) {
  const res = await fetch(BASE + p, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

async function waitServer() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await req('POST', '/auth/login', null, { username: 'admin', password: 'admin123' });
      if (r.status === 200) return r.data.token;
    } catch {}
    await sleep(500);
  }
  throw new Error('服务器未在预期时间内就绪');
}

async function runChecks() {
  const token = await waitServer();
  console.log('登录 admin 成功\n');

  const db = new Database(DB_FILE);
  db.pragma('busy_timeout = 4000');

  const prod = db.prepare("SELECT id, price, stock FROM products WHERE name='伊利纯牛奶'").get();
  const adminId = db.prepare("SELECT id FROM users WHERE username='admin'").get().id;
  const memberId = db.prepare(
    "INSERT INTO members (name, phone, points, total_spent, level) VALUES ('烟测会员','19900000000',1000,6000,'金卡会员')"
  ).run().lastInsertRowid;
  const gold = db.prepare("SELECT discount, points_rate FROM member_levels WHERE name='金卡会员'").get();

  // ===== P2-1 服务端价格权威 + 折扣 =====
  console.log('[P1/P2] 下单（前端 price=999 应被忽略）');
  const sale = await req('POST', '/sales', token, {
    member_id: memberId, payment: 'cash',
    items: [{ product_id: prod.id, quantity: 2, price: 999 }],
  });
  const expFinal = Math.round(prod.price * 2 * gold.discount * 100) / 100;
  check('下单成功', sale.status === 200, JSON.stringify(sale.data));
  check(`订单按折后价=${expFinal}`, approx(sale.data.total, expFinal), `实际 ${sale.data && sale.data.total}`);
  const saleItem = db.prepare('SELECT * FROM sale_items WHERE sale_id=?').get(sale.data.id);
  const stockAfterSale = db.prepare('SELECT stock FROM products WHERE id=?').get(prod.id).stock;
  const memAfterSale = db.prepare('SELECT points, total_spent FROM members WHERE id=?').get(memberId);
  check('明细记服务端真实价(非999)', approx(saleItem.price, prod.price), `实际 ${saleItem.price}`);
  check('库存扣减2', stockAfterSale === prod.stock - 2, `实际 ${stockAfterSale}`);
  check('积分+floor(折后×倍率)', memAfterSale.points === 1000 + Math.floor(expFinal * gold.points_rate), `实际 ${memAfterSale.points}`);

  // ===== P2-1 退货折后退 =====
  console.log('\n[P1/P2] 退货折后退 + 审核回退');
  const ret = await req('POST', '/returns', token, {
    sale_id: sale.data.id, items: [{ product_id: prod.id, quantity: 1, price: 999 }], reason: 'smoke',
  });
  const expRefund = Math.round(prod.price * gold.discount * 100) / 100;
  check('退单创建成功', ret.status === 200, JSON.stringify(ret.data));
  check(`退款按折后价=${expRefund}`, approx(ret.data.total, expRefund), `实际 ${ret.data && ret.data.total}`);
  const retItem = db.prepare('SELECT * FROM return_items WHERE return_id=?').get(ret.data.id);
  check('退货明细记原单价(非999)', approx(retItem.price, prod.price), `实际 ${retItem.price}`);

  // P3 仪表盘待办：此时有一张待审退货
  const dashPending = await req('GET', '/dashboard', token);
  check('[P3] 仪表盘返回 pendingReturns≥1', dashPending.data.pendingReturns >= 1, `实际 ${dashPending.data.pendingReturns}`);
  check('[P3] 仪表盘返回 salesTarget(数字)', typeof dashPending.data.salesTarget === 'number');

  const appr = await req('PUT', `/returns/${ret.data.id}/approve`, token, { action: 'approve' });
  check('审核通过成功', appr.status === 200, JSON.stringify(appr.data));
  const stockFinal = db.prepare('SELECT stock FROM products WHERE id=?').get(prod.id).stock;
  const memFinal = db.prepare('SELECT points FROM members WHERE id=?').get(memberId);
  check('库存恢复1(净-1)', stockFinal === prod.stock - 1, `实际 ${stockFinal}`);
  check('积分回退floor(退款×倍率)', memFinal.points === memAfterSale.points - Math.floor(expRefund * gold.points_rate), `实际 ${memFinal.points}`);

  // ===== P2-3 用户权限 =====
  console.log('\n[P2] 用户管理与权限');
  const cu = await req('POST', '/users', token, { username: 'smoke_cashier', password: 'pass1234', role: 'cashier' });
  check('管理员可建收银员', cu.status === 200, JSON.stringify(cu.data));
  check('重复用户名被拒(400)', (await req('POST', '/users', token, { username: 'smoke_cashier', password: 'x', role: 'cashier' })).status === 400);
  const ctoken = (await req('POST', '/auth/login', null, { username: 'smoke_cashier', password: 'pass1234' })).data.token;
  check('收银员访问用户管理 403', (await req('GET', '/users', ctoken)).status === 403);
  check('[P2] 收银员访问会员等级 403', (await req('GET', '/member-levels', ctoken)).status === 403);
  await req('PUT', `/users/${cu.data.id}`, token, { status: 0 });
  check('被禁用账号登录 403', (await req('POST', '/auth/login', null, { username: 'smoke_cashier', password: 'pass1234' })).status === 403);
  check('不能禁用当前登录账号(400)', (await req('PUT', `/users/${adminId}`, token, { status: 0 })).status === 400);
  check('不能降级最后一个管理员(400)', (await req('PUT', `/users/${adminId}`, token, { role: 'cashier' })).status === 400);

  // ===== P3 会员分析 =====
  console.log('\n[P3] 会员分析接口');
  const ranking = await req('GET', '/reports/members/ranking?limit=10', token);
  check('消费排行返回数组且含烟测会员', Array.isArray(ranking.data) && ranking.data.some(m => m.id === memberId), JSON.stringify(ranking.data?.[0] || {}));
  const levels = await req('GET', '/reports/members/levels', token);
  check('等级分布返回数组', Array.isArray(levels.data) && levels.data.length > 0);
  const repurch = await req('GET', '/reports/members/repurchase', token);
  check('复购分析返回 totalBuyers/repurchaseRate', repurch.data && typeof repurch.data.repurchaseRate === 'number');
  check('会员分析对收银员 403(报表 admin 限定)', (await req('GET', '/reports/members/ranking', ctoken)).status === 403);

  // 会员列表带等级折扣/积分倍率（收银台实时预览依赖）
  const membersList = await req('GET', '/members?pageSize=1000', token);
  const goldMember = ((membersList.data && membersList.data.data) || []).find(m => m.id === memberId);
  check('[收银台] 会员列表带 level_discount', goldMember && approx(goldMember.level_discount, gold.discount), `实际 ${goldMember && goldMember.level_discount}`);
  check('[收银台] 会员列表带 level_points_rate', goldMember && goldMember.level_points_rate === gold.points_rate, `实际 ${goldMember && goldMember.level_points_rate}`);

  // ===== P3 商品导入 =====
  console.log('\n[P3] 商品批量导入');
  const imp = await req('POST', '/products/import', token, {
    items: [
      { name: '烟测进口饼干', barcode: '7700000000001', price: 9.9, cost: 5, stock: 50, min_stock: 8, unit: '盒' },
      { name: '烟测重复条码', barcode: '6901234567890', price: 1, cost: 0.5, stock: 10, unit: '袋' }, // 与种子可乐重复
      { name: '', price: 1 }, // 空名
    ],
  });
  check('导入成功1条', imp.data.successCount === 1, `实际 ${imp.data && imp.data.successCount}`);
  check('导入失败2条(重复条码+空名)', imp.data.failedCount === 2, `实际 ${imp.data && imp.data.failedCount}`);
  check('失败含「条码已存在」', (imp.data.failed || []).some(f => f.reason.includes('条码已存在')));

  db.close();
  console.log(`\n===== 冒烟结果：通过 ${pass} / 失败 ${fail} =====`);
}

(async () => {
  cleanupDb();
  const server = spawn(process.execPath, [path.join('server', 'index.js')], {
    env: { ...process.env, DB_PATH: './smoke-test.db', PORT: String(PORT), NODE_ENV: 'test' },
    stdio: ['ignore', 'ignore', 'inherit'],
  });

  let done = false;
  const shutdown = () => { if (!done) { done = true; try { server.kill(); } catch {} } };

  try {
    await runChecks();
  } catch (e) {
    console.error('冒烟测试异常:', e.message);
    fail++;
  } finally {
    shutdown();
    await sleep(300);
    cleanupDb();
  }
  process.exit(fail ? 1 : 0);
})();
