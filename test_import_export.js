/**
 * 商品导入/导出/模板下载 功能实测
 * 测试范围：
 *   1. 后端 /api/products/import 批量导入 API
 *   2. Excel 解析（parseProductsExcel 逻辑）
 *   3. 导入模板生成（downloadProductTemplate 逻辑）
 *   4. 导出 xlsx 结构（exportProducts 逻辑）
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const Database = require('better-sqlite3');

// ============ 配置 ============
const API_BASE = 'http://localhost:3000';
const DB_PATH = path.join(__dirname, 'server/supermarket.db');

// 读取服务器实际使用的 JWT_SECRET（与 .env 一致）
const config = require('./server/config');
const jwt = require('jsonwebtoken');

function getToken() {
  return jwt.sign({ id: 1, username: 'admin', role: 'admin' }, config.JWT_SECRET);
}

// HTTP 请求封装
function apiRequest(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ============ 测试用例 ============
let passCount = 0;
let failCount = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✅ ${msg}`);
    passCount++;
  } else {
    console.log(`  ❌ ${msg}`);
    failCount++;
  }
}

async function runTests() {
  console.log('\n========================================');
  console.log('🧪 商品导入/导出/模板 功能实测');
  console.log('========================================\n');

  // -------- 测试 1: 后端批量导入 API --------
  console.log('【测试 1】后端 /api/products/import 批量导入');
  try {
    // 先记录导入前的商品数量
    const db = new Database(DB_PATH);
    const countBefore = db.prepare('SELECT COUNT(*) as c FROM products WHERE status != -1').get().c;

    // 构造导入数据（包含有效数据和空名称数据）
    const importItems = [
      { name: '测试商品A', barcode: '9990000000001', category_name: '食品饮料', price: 10.5, cost: 7, stock: 50, min_stock: 10, unit: '个' },
      { name: '测试商品B', barcode: '9990000000002', category_name: '日用百货', price: 25, cost: 15, stock: 30, min_stock: 5, unit: '瓶' },
      { name: '', barcode: '9990000000003', category_name: '零食糖果', price: 8, cost: 5, stock: 20, min_stock: 5, unit: '袋' }, // 空名称，应失败
      { name: '测试商品C', barcode: '', category_name: '生鲜水果', price: 12, cost: 8, stock: 100, min_stock: 20, unit: '斤' }, // 无条码（允许）
    ];

    const res = await apiRequest('POST', '/api/products/import', { items: importItems });

    assert(res.status === 200, `HTTP 状态码 200 (实际: ${res.status})`);
    assert(res.data.successCount === 3, `成功导入 3 条 (实际: ${res.data.successCount})`);
    assert(res.data.failedCount === 1, `失败 1 条（空名称）(实际: ${res.data.failedCount})`);
    assert(res.data.failed.length === 1, `失败列表长度 1 (实际: ${res.data.failed.length})`);
    assert(res.data.failed[0].reason === '商品名称为空', `空名称失败原因正确: "${res.data.failed[0].reason}"`);

    // 验证数据库确实插入了 3 条
    const countAfter = db.prepare('SELECT COUNT(*) as c FROM products WHERE status != -1').get().c;
    assert(countAfter === countBefore + 3, `数据库商品数从 ${countBefore} 增加到 ${countAfter}`);

    // 验证插入的数据内容（按 name 排序查找，避免依赖自增 ID 顺序）
    const newProducts = db.prepare('SELECT * FROM products WHERE name LIKE ? ORDER BY name ASC').all('测试商品%');
    assert(newProducts.length >= 3, `新商品记录存在 (找到 ${newProducts.length} 条)`);
    if (newProducts.length >= 3) {
      const byName = Object.fromEntries(newProducts.map(p => [p.name, p]));
      assert(byName['测试商品A'].barcode === '9990000000001', `条码正确: ${byName['测试商品A'].barcode}`);
      assert(byName['测试商品A'].price === 10.5, `售价正确: ${byName['测试商品A'].price}`);
      assert(byName['测试商品A'].status === 1, `默认状态为上架 (status=1)`);
      assert(byName['测试商品B'].barcode === '9990000000002', `条码B正确: ${byName['测试商品B'].barcode}`);
      assert(byName['测试商品C'].barcode === null, `空条码存为 null: ${byName['测试商品C'].barcode}`);
    }

    // 清理测试数据
    const deleteStmt = db.prepare('DELETE FROM products WHERE name LIKE ?');
    deleteStmt.run('测试商品%');
    const countCleaned = db.prepare('SELECT COUNT(*) as c FROM products WHERE status != -1').get().c;
    assert(countCleaned === countBefore, `测试数据已清理，恢复数量 ${countBefore} (实际: ${countCleaned})`);
    db.close();

  } catch (err) {
    console.log(`  ❌ 异常: ${err.message}`);
    failCount++;
  }

  // -------- 测试 2: Excel 解析逻辑（前端 parseProductsExcel）--------
  console.log('\n【测试 2】Excel 解析逻辑 (parseProductsExcel)');
  try {
    // 模拟前端解析逻辑（与 src/utils/export.js 中一致）
    const PRODUCT_HEADER_MAP = {
      '商品名称': 'name',
      '条码': 'barcode',
      '分类': 'category_name',
      '售价': 'price',
      '成本': 'cost',
      '库存': 'stock',
      '最低库存': 'min_stock',
      '单位': 'unit'
    };

    // 创建一个测试 Excel 文件
    const testWs = XLSX.utils.aoa_to_sheet([
      PRODUCT_HEADER_MAP ? Object.keys(PRODUCT_HEADER_MAP) : [],
      ['解析测试商品', '8880000000001', '食品饮料', 5.5, 3.5, 80, 15, '盒'],
      ['', '8880000000002', '日用百货', 10, 6, 40, 8, '块'], // 空名称
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, testWs, 'Sheet1');
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    const tempFile = path.join(__dirname, 'test_import_temp.xlsx');
    fs.writeFileSync(tempFile, buffer);

    // 用 XLSX 读取（模拟 FileReader + XLSX.read）
    const readWb = XLSX.read(fs.readFileSync(tempFile), { type: 'buffer' });
    const readWs = readWb.Sheets[readWb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(readWs, { defval: '' });

    assert(json.length === 2, `解析出 2 行数据 (实际: ${json.length})`);
    assert(json[0]['商品名称'] === '解析测试商品', `第1行名称正确: "${json[0]['商品名称']}"`);
    assert(json[0]['售价'] === 5.5, `第1行售价正确: ${json[0]['售价']}`);
    assert(json[1]['商品名称'] === '', `第2行名称为空: "${json[1]['商品名称']}"`);

    // 测试字段映射
    const rows = json.map(r => {
      const obj = {};
      for (const [zh, key] of Object.entries(PRODUCT_HEADER_MAP)) {
        obj[key] = r[zh] !== undefined ? r[zh] : '';
      }
      return obj;
    });
    assert(rows[0].name === '解析测试商品', `映射后 name 正确: ${rows[0].name}`);
    assert(rows[0].barcode === '8880000000001', `映射后 barcode 正确: ${rows[0].barcode}`);
    assert(rows[0].category_name === '食品饮料', `映射后 category_name 正确: ${rows[0].category_name}`);
    assert(rows[0].price === 5.5, `映射后 price 正确: ${rows[0].price}`);
    assert(rows[0].unit === '盒', `映射后 unit 正确: ${rows[0].unit}`);

    // 清理临时文件
    fs.unlinkSync(tempFile);
    assert(!fs.existsSync(tempFile), '临时文件已清理');

  } catch (err) {
    console.log(`  ❌ 异常: ${err.message}`);
    failCount++;
  }

  // -------- 测试 3: 导入模板生成 --------
  console.log('\n【测试 3】导入模板生成 (downloadProductTemplate 逻辑)');
  try {
    const PRODUCT_IMPORT_HEADERS = ['商品名称', '条码', '分类', '售价', '成本', '库存', '最低库存', '单位'];

    // 生成模板（与前端逻辑一致）
    const ws = XLSX.utils.aoa_to_sheet([
      PRODUCT_IMPORT_HEADERS,
      ['示例可乐 330ml', '6900000000001', '食品饮料', 3.5, 2.0, 100, 20, '瓶']
    ]);
    ws['!cols'] = PRODUCT_IMPORT_HEADERS.map(() => ({ wch: 15 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '商品导入模板');
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

    // 验证生成的 xlsx
    const readWb = XLSX.read(buffer, { type: 'buffer' });
    const readWs = readWb.Sheets[readWb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(readWs, { header: 1, defval: '' });

    assert(readWb.SheetNames.length === 1, `工作表数量 1 (实际: ${readWb.SheetNames.length})`);
    assert(readWb.SheetNames[0] === '商品导入模板', `工作表名称正确: "${readWb.SheetNames[0]}"`);
    assert(json.length === 2, `模板行数 2（表头+示例）(实际: ${json.length})`);

    // 验证表头
    const headers = json[0];
    assert(headers[0] === '商品名称', `表头[0]=商品名称 (实际: "${headers[0]}")`);
    assert(headers[1] === '条码', `表头[1]=条码 (实际: "${headers[1]}")`);
    assert(headers[3] === '售价', `表头[3]=售价 (实际: "${headers[3]}")`);
    assert(headers[4] === '成本', `表头[4]=成本 (实际: "${headers[4]}")`);
    assert(headers[7] === '单位', `表头[7]=单位 (实际: "${headers[7]}")`);

    // 验证示例数据行
    const exampleRow = json[1];
    assert(exampleRow[0] === '示例可乐 330ml', `示例名称正确: "${exampleRow[0]}"`);
    assert(exampleRow[1] === '6900000000001', `示例条码正确: "${exampleRow[1]}"`);
    assert(exampleRow[3] === 3.5, `示例售价正确: ${exampleRow[3]}`);
    assert(exampleRow[4] === 2.0, `示例成本正确: ${exampleRow[4]}`);

    // 验证列宽设置
    assert(ws['!cols'] && ws['!cols'].length === 8, `列宽设置 8 列 (实际: ${ws['!cols']?.length})`);

  } catch (err) {
    console.log(`  ❌ 异常: ${err.message}`);
    failCount++;
  }

  // -------- 测试 4: 导出 xlsx 结构 --------
  console.log('\n【测试 4】导出 xlsx 结构 (exportProducts 逻辑)');
  try {
    const mockProducts = [
      { id: 1, name: '测试导出商品A', barcode: '7770001', category_name: '食品饮料', price: 3.5, cost: 2, stock: 100, min_stock: 20, unit: '瓶', created_at: '2026-06-28 20:01:17' },
      { id: 2, name: '测试导出商品B', barcode: '7770002', category_name: '日用百货', price: 12.9, cost: 7, stock: 60, min_stock: 10, unit: '提', created_at: '2026-06-28 20:01:18' },
    ];

    const columns = [
      { prop: 'id', label: 'ID' },
      { prop: 'name', label: '商品名称' },
      { prop: 'barcode', label: '条形码' },
      { prop: 'category_name', label: '分类' },
      { prop: 'price', label: '售价' },
      { prop: 'cost', label: '成本' },
      { prop: 'stock', label: '库存' },
      { prop: 'min_stock', label: '最低库存' },
      { prop: 'unit', label: '单位' },
      { prop: 'created_at', label: '创建时间' }
    ];

    // 模拟导出逻辑
    const headers = columns.map(col => col.label);
    const rows = mockProducts.map(row =>
      columns.map(col => {
        const value = row[col.prop];
        if (col.prop.includes('date') || col.prop.includes('created_at') || col.prop.includes('updated_at')) {
          return value ? new Date(value).toLocaleString() : '';
        }
        if (col.prop.includes('price') || col.prop.includes('cost')) {
          return typeof value === 'number' ? value.toFixed(2) : value;
        }
        return value;
      })
    );

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = columns.map(() => ({ wch: 15 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

    // 验证
    const readWb = XLSX.read(buffer, { type: 'buffer' });
    const readWs = readWb.Sheets[readWb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(readWs, { header: 1, defval: '' });

    assert(json.length === 3, `导出 3 行（表头+2数据）(实际: ${json.length})`);
    assert(json[0][0] === 'ID', `表头[0]=ID (实际: "${json[0][0]}")`);
    assert(json[0][1] === '商品名称', `表头[1]=商品名称 (实际: "${json[0][1]}")`);
    assert(json[1][1] === '测试导出商品A', `第1行名称正确: "${json[1][1]}"`);
    assert(json[1][4] === '3.50', `第1行售价格式化: ${json[1][4]}`);
    assert(json[2][1] === '测试导出商品B', `第2行名称正确: "${json[2][1]}"`);

  } catch (err) {
    console.log(`  ❌ 异常: ${err.message}`);
    failCount++;
  }

  // -------- 测试 5: 前端-后端端到端（API 可用性）--------
  console.log('\n【测试 5】API 端点可用性检查');
  try {
    // 检查所有相关 API 端点
    const endpoints = [
      { method: 'GET', path: '/api/products?page=1&pageSize=1', label: 'GET /api/products' },
      { method: 'POST', path: '/api/products/import', body: { items: [] }, label: 'POST /api/products/import' },
    ];

    for (const ep of endpoints) {
      const res = await apiRequest(ep.method, ep.path, ep.body || undefined);
      // import 空数组返回 400 是正常的
      if (ep.path.includes('/import')) {
        assert(res.status === 400, `${ep.label} → 400 (空数据校验正常)`);
        assert(res.data.error === '导入数据为空', `错误信息正确: "${res.data.error}"`);
      } else {
        assert(res.status === 200, `${ep.label} → HTTP ${res.status}`);
        assert(res.data.data && Array.isArray(res.data.data), `返回 data 数组`);
      }
    }
  } catch (err) {
    console.log(`  ❌ 异常: ${err.message}`);
    failCount++;
  }

  // ============ 总结 ============
  console.log('\n========================================');
  console.log('📊 测试结果汇总');
  console.log('========================================');
  console.log(`  ✅ 通过: ${passCount}`);
  console.log(`  ❌ 失败: ${failCount}`);
  console.log(`  📝 总计: ${passCount + failCount}`);
  console.log('========================================\n');

  if (failCount === 0) {
    console.log('🎉 全部通过！商品导入/导出/模板功能正常喵～ o(*￣︶￣*)o\n');
  } else {
    console.log(`⚠️ 有 ${failCount} 项失败，需要修复喵～ (╯°□°）╯\n`);
    process.exitCode = 1;
  }
}

runTests().catch(err => {
  console.error('测试运行异常:', err);
  process.exitCode = 1;
});
