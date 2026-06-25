/**
 * API 自检脚本
 *
 * 用法：
 *   npm run self-check
 *
 * 默认会先探测 http://127.0.0.1:3000：
 * - 如果后端已经启动，直接复用已有服务；
 * - 如果未启动，临时启动 app.js，跑完自检后自动关闭。
 */
const { spawn } = require('child_process');
const path = require('path');

const serverDir = path.resolve(__dirname, '..');
const appPath = path.join(serverDir, 'app.js');
const port = process.env.PORT || 3000;
const baseUrl = (process.env.SELF_CHECK_BASE_URL || `http://127.0.0.1:${port}`).replace(/\/+$/, '');
const adminUsername = process.env.SELF_CHECK_ADMIN_USERNAME || 'admin';
const adminPassword = process.env.SELF_CHECK_ADMIN_PASSWORD || 'admin123';

if (typeof fetch !== 'function') {
  console.error('❌ 当前 Node.js 不支持 fetch。请使用 Node.js 18 或更高版本后再运行自检。');
  process.exit(1);
}

let startedServer = null;
let serverLogs = '';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fail(message) {
  const err = new Error(message);
  err.isSelfCheckError = true;
  throw err;
}

async function request(endpoint, options = {}) {
  const {
    method = 'GET',
    body,
    token,
    headers = {},
    expectedStatus = 200,
    timeoutMs = 6000,
  } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const finalHeaders = { ...headers };
  if (token) finalHeaders.Authorization = `Bearer ${token}`;
  if (body !== undefined) finalHeaders['Content-Type'] = 'application/json';

  try {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers: finalHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    let json = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch (_) {
        json = null;
      }
    }

    if (res.status !== expectedStatus) {
      fail(`${method} ${endpoint} 期望 HTTP ${expectedStatus}，实际 HTTP ${res.status}：${text.slice(0, 200)}`);
    }
    return { status: res.status, json, text };
  } finally {
    clearTimeout(timer);
  }
}

function expectOk(label, payload) {
  if (!payload || payload.code !== 200) {
    fail(`${label} 响应格式异常，期望 { code: 200, ... }，实际：${JSON.stringify(payload).slice(0, 200)}`);
  }
}

function expectArray(label, value) {
  if (!Array.isArray(value)) {
    fail(`${label} 期望数组，实际：${JSON.stringify(value).slice(0, 200)}`);
  }
}

function expectObject(label, value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${label} 期望对象，实际：${JSON.stringify(value).slice(0, 200)}`);
  }
}

async function isServerHealthy() {
  try {
    const res = await request('/api/health', { timeoutMs: 1200 });
    return res.json && res.json.code === 200;
  } catch (_) {
    return false;
  }
}

async function startServerIfNeeded() {
  if (await isServerHealthy()) {
    console.log(`ℹ️  检测到已有后端服务：${baseUrl}`);
    return;
  }

  console.log('ℹ️  未检测到后端服务，临时启动 app.js ...');
  startedServer = spawn(process.execPath, [appPath], {
    cwd: serverDir,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  startedServer.stdout.on('data', (buf) => {
    serverLogs += buf.toString();
  });
  startedServer.stderr.on('data', (buf) => {
    serverLogs += buf.toString();
  });

  for (let i = 0; i < 30; i += 1) {
    if (startedServer.exitCode !== null) break;
    if (await isServerHealthy()) {
      console.log(`✅ 临时后端已启动：${baseUrl}`);
      return;
    }
    await sleep(1000);
  }

  fail(`后端服务启动失败或健康检查超时。\n${serverLogs.slice(-1200)}`);
}

async function stopStartedServer() {
  if (!startedServer || startedServer.exitCode !== null) return;

  startedServer.kill('SIGTERM');
  for (let i = 0; i < 10; i += 1) {
    if (startedServer.exitCode !== null) return;
    await sleep(200);
  }
  startedServer.kill('SIGKILL');
}

async function step(name, fn) {
  process.stdout.write(`- ${name} ... `);
  await fn();
  console.log('通过');
}

async function main() {
  console.log('🐾 流浪动物救助与领养管理系统 API 自检');
  console.log(`Base URL: ${baseUrl}`);

  await startServerIfNeeded();

  let token = '';

  await step('健康检查', async () => {
    const { json } = await request('/api/health');
    expectOk('健康检查', json);
  });

  await step('公开动物列表与分页', async () => {
    const { json } = await request('/api/animals?page=1&pageSize=3');
    expectOk('动物列表', json);
    expectObject('动物列表 data', json.data);
    expectArray('动物列表 data.list', json.data.list);
    if (typeof json.data.total !== 'number') fail('动物列表缺少 total 数字字段');
  });

  await step('动物统计与分类数据', async () => {
    const stats = await request('/api/animals/stats');
    expectOk('动物统计', stats.json);
    expectObject('动物统计 data', stats.json.data);

    const categories = await request('/api/categories');
    expectOk('分类列表', categories.json);
    expectArray('分类列表 data', categories.json.data);
  });

  await step('内容接口与匹配推荐', async () => {
    const banners = await request('/api/content/banners');
    expectOk('轮播图', banners.json);
    expectArray('轮播图 data', banners.json.data);

    const articles = await request('/api/content/articles?page=1&pageSize=3');
    expectOk('文章列表', articles.json);
    expectObject('文章列表 data', articles.json.data);
    expectArray('文章列表 data.list', articles.json.data.list);

    const recommend = await request('/api/animals/recommend', {
      method: 'POST',
      body: { type: 'cat', housing: 'apartment', experience: 'some', activity: 'medium' },
    });
    expectOk('匹配推荐', recommend.json);
    expectArray('匹配推荐 data', recommend.json.data);
  });

  await step('管理员登录', async () => {
    const { json } = await request('/api/auth/login', {
      method: 'POST',
      body: { username: adminUsername, password: adminPassword },
    });
    expectOk('管理员登录', json);
    token = json.data && json.data.token;
    if (!token) fail('管理员登录成功但未返回 token');
    if (!json.data.user || json.data.user.role !== 'admin') fail('登录账号不是管理员角色');
  });

  await step('管理员受保护接口', async () => {
    const profile = await request('/api/auth/profile', { token });
    expectOk('个人资料', profile.json);

    const users = await request('/api/users?page=1&pageSize=3', { token });
    expectOk('用户列表', users.json);
    expectObject('用户列表 data', users.json.data);
    expectArray('用户列表 data.list', users.json.data.list);

    const adoptions = await request('/api/adoptions/stats/trend', { token });
    expectOk('领养趋势', adoptions.json);
    expectArray('领养趋势 data', adoptions.json.data);

    const urgency = await request('/api/rescues/stats/urgency', { token });
    expectOk('救助紧急度统计', urgency.json);
    expectObject('救助紧急度统计 data', urgency.json.data);
  });

  await step('权限与错误处理', async () => {
    const unauthorized = await request('/api/users?page=1&pageSize=1', { expectedStatus: 401 });
    if (!unauthorized.json || unauthorized.json.code !== 401) fail('未登录访问管理员接口应返回 code=401');

    const missing = await request('/api/not-found', { expectedStatus: 404 });
    if (!missing.json || missing.json.code !== 404) fail('不存在的 API 应返回 code=404');

    const cors = await request('/api/health', {
      expectedStatus: 403,
      headers: { Origin: 'http://malicious.example' },
    });
    if (!cors.json || cors.json.code !== 403) fail('非法 Origin 应返回 code=403');
  });

  console.log('\n✅ API 自检全部通过。核心接口、鉴权、错误处理与 CORS 白名单工作正常。');
}

main()
  .catch((err) => {
    console.error(`\n❌ API 自检失败：${err.message}`);
    console.error('\n排查建议：');
    console.error('1. 确认 MySQL 服务已启动，server/.env 中 DB_PASSWORD 正确。');
    console.error('2. 先运行 npm run init-db，确保管理员 admin/admin123 已写入。');
    console.error('3. 如端口被占用，请修改 server/.env 的 PORT，或设置 SELF_CHECK_BASE_URL。');
    if (!err.isSelfCheckError) console.error(err.stack);
    process.exitCode = 1;
  })
  .finally(async () => {
    await stopStartedServer();
  });
