/**
 * 流浪动物救助与领养管理系统 - Express 后端入口
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// ===== 中间件 =====
app.use(cors());
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
