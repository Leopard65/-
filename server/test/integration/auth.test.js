/**
 * 认证模块集成测试（真实连接本机 MySQL）。
 *
 * 前置：MySQL 已启动、server/.env 配好、已 npm run init-db（管理员 admin/admin123 存在）。
 * 每个用例都不写入脏数据；注册用例用带时间戳的一次性用户名并在结束后清理。
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { startTestServer } = require('../helpers/server');

let ctx;
const createdUsernames = [];

before(async () => { ctx = await startTestServer(); });

after(async () => {
  // 清理本测试注册的临时用户，保持库回到初始状态。
  if (createdUsernames.length) {
    const pool = require('../../config/db');
    await pool.query(
      `DELETE FROM users WHERE username IN (${createdUsernames.map(() => '?').join(',')})`,
      createdUsernames
    );
  }
  await ctx.close();
});

test('健康检查返回 code=200', async () => {
  const { json } = await ctx.api('/api/health');
  assert.equal(json.code, 200);
});

test('管理员登录成功并返回 admin 角色的 token', async () => {
  const { json } = await ctx.api('/api/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'admin123' },
  });
  assert.equal(json.code, 200);
  assert.ok(json.data.token, '应返回 token');
  assert.equal(json.data.user.role, 'admin');
});

test('登录密码错误返回业务错误（非 200 code）', async () => {
  const { json } = await ctx.api('/api/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'wrong-password' },
  });
  assert.notEqual(json.code, 200);
  assert.match(json.message, /密码错误|用户名或密码/);
});

test('缺少用户名或密码返回校验错误', async () => {
  const { json } = await ctx.api('/api/auth/login', {
    method: 'POST',
    body: { username: 'admin' },
  });
  assert.notEqual(json.code, 200);
});

test('未带 token 访问 /api/auth/profile 返回 401', async () => {
  const { status, json } = await ctx.api('/api/auth/profile');
  assert.equal(status, 401);
  assert.equal(json.code, 401);
});

test('带 token 可获取当前用户资料', async () => {
  const token = await ctx.login();
  const { json } = await ctx.api('/api/auth/profile', { token });
  assert.equal(json.code, 200);
  assert.equal(json.data.username, 'admin');
});

test('注册新用户成功，重复注册同名返回错误', async () => {
  const username = `t_auth_${Date.now()}`;
  createdUsernames.push(username);

  const first = await ctx.api('/api/auth/register', {
    method: 'POST',
    body: { username, password: 'test123456', nickname: '测试用户' },
  });
  assert.equal(first.json.code, 200, `注册应成功：${first.text.slice(0, 200)}`);

  const dup = await ctx.api('/api/auth/register', {
    method: 'POST',
    body: { username, password: 'test123456' },
  });
  assert.notEqual(dup.json.code, 200);
  assert.match(dup.json.message, /已存在/);
});

test('注册密码过短被拒绝', async () => {
  const { json } = await ctx.api('/api/auth/register', {
    method: 'POST',
    body: { username: `t_short_${Date.now()}`, password: '123' },
  });
  assert.notEqual(json.code, 200);
});
