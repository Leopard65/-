/**
 * 流浪动物救助与领养管理系统 - Express 后端入口
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// ===== 中间件 =====
app.use(cors({
  origin(origin, cb) {
    // 无 Origin（同源页面、curl、服务端转发）放行；白名单内放行；其余拒绝
    if (!origin || config.corsOrigins.includes(origin)) return cb(null, true);
    const err = new Error('CORS 不允许的来源: ' + origin);
    err.statusCode = 403;
    cb(err);
  },
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件（上传的图片）
app.use('/uploads', express.static(path.join(__dirname, config.uploadDir)));

// ===== API 路由 =====
app.use('/api/auth', require('./routes/auth'));
app.use('/api/animals', require('./routes/animals'));
app.use('/api/adoptions', require('./routes/adoptions'));
app.use('/api/rescues', require('./routes/rescues'));
app.use('/api/content', require('./routes/content'));
app.use('/api/users', require('./routes/users'));
app.use('/api/categories', require('./routes/categories'));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ code: 200, message: '服务运行正常', timestamp: new Date().toISOString() });
});

// 未命中的 API 路由统一返回 JSON 404（避免被下面的前端回退吞成 HTML）
app.use('/api', (req, res) => {
  res.status(404).json({ code: 404, message: '接口不存在' });
});

// ===== 前端静态托管（单端口部署）=====
// 构建后（client 目录执行 npm run build）会生成 client/dist。
// 若存在，则由本服务直接托管前端，并对所有非 /api、/uploads 的 GET 请求
// 回退到 index.html（支持前端 history 路由），这样只需 npm start 即可在
// http://localhost:3000 访问完整站点，/api 与 /uploads 天然同源、无需额外代理。
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      return res.sendFile(path.join(clientDist, 'index.html'));
    }
    next();
  });
} else {
  // 尚未构建前端：根路径给出友好提示，而不是 Express 默认的 "Cannot GET /"
  app.get('/', (req, res) => {
    res.type('html').send(
      '<h2>🐾 流浪动物救助与领养管理系统 · 后端服务运行中</h2>' +
      '<p>这是 API 服务（端口 ' + config.port + '），不是网页前台。</p>' +
      '<ul>' +
      '<li>开发模式：在 client 目录执行 <code>npm run dev</code>，浏览器打开 <b>http://localhost:5173</b></li>' +
      '<li>单端口部署：在 client 目录执行 <code>npm run build</code> 后重启本服务，即可在 <b>http://localhost:' + config.port + '</b> 直接访问完整站点</li>' +
      '<li>健康检查：<a href="/api/health">/api/health</a></li>' +
      '</ul>'
    );
  });
}

// ===== 错误处理 =====
app.use(errorHandler);

// ===== 启动服务 =====
app.listen(config.port, () => {
  console.log(`
  🐾 流浪动物救助与领养管理系统后端已启动
  📡 地址: http://localhost:${config.port}
  📋 API 文档: http://localhost:${config.port}/api/health
  `);
});

module.exports = app;
