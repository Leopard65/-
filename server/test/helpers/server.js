/**
 * 集成测试公共辅助：在临时端口启动 Express app，提供带 baseUrl 的请求封装，
 * 并在测试结束后关闭 HTTP 服务与数据库连接池（否则测试进程不会退出）。
 *
 * 用法（node:test）：
 *   const { before, after } = require('node:test');
 *   const { startTestServer } = require('../helpers/server');
 *   let ctx;
 *   before(async () => { ctx = await startTestServer(); });
 *   after(async () => { await ctx.close(); });
 *   // ctx.api('/api/health') -> { status, json, text }
 *   // ctx.login('admin', 'admin123') -> token
 */
const app = require('../../app');
const pool = require('../../config/db');

async function startTestServer() {
  // 监听端口 0：让操作系统分配空闲端口，避免与已在跑的开发服务冲突。
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  async function api(endpoint, options = {}) {
    const {
      method = 'GET',
      body,
      token,
      headers = {},
      timeoutMs = 8000,
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
        try { json = JSON.parse(text); } catch (_) { json = null; }
      }
      return { status: res.status, json, text };
    } finally {
      clearTimeout(timer);
    }
  }

  async function login(username = 'admin', password = 'admin123') {
    const res = await api('/api/auth/login', {
      method: 'POST',
      body: { username, password },
    });
    if (!res.json || res.json.code !== 200 || !res.json.data || !res.json.data.token) {
      throw new Error(`测试登录失败（${username}）：${res.text.slice(0, 200)}`);
    }
    return res.json.data.token;
  }

  async function close() {
    await new Promise((resolve) => server.close(resolve));
    // 连接池是全局单例，仅在最后一个测试文件后关闭即可；这里每个文件都关，
    // node:test 每个文件独立进程，互不影响。
    try { await pool.end(); } catch (_) { /* 已关闭则忽略 */ }
  }

  return { app, server, baseUrl, api, login, close };
}

module.exports = { startTestServer };
