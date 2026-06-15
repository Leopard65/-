const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const authMiddleware = require('./middleware/auth');
const { roleMiddleware } = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json());

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// 认证路由（无需登录）
app.use('/api/auth', require('./routes/auth'));

// 上传路由（需要登录）
app.use('/api/upload', require('./routes/upload'));

// 普通业务路由（登录即可）
app.use('/api/categories', authMiddleware, require('./routes/categories'));
app.use('/api/products', authMiddleware, require('./routes/products'));
app.use('/api/members', authMiddleware, require('./routes/members'));
app.use('/api/sales', authMiddleware, require('./routes/sales'));
app.use('/api/returns', authMiddleware, require('./routes/returns'));
app.use('/api/dashboard', authMiddleware, require('./routes/dashboard'));

// 管理员专属路由
app.use('/api/member-levels', authMiddleware, roleMiddleware('admin'), require('./routes/member-levels'));
app.use('/api/users', authMiddleware, roleMiddleware('admin'), require('./routes/users'));
app.use('/api/suppliers', authMiddleware, roleMiddleware('admin'), require('./routes/suppliers'));
app.use('/api/purchases', authMiddleware, roleMiddleware('admin'), require('./routes/purchases'));
app.use('/api/reports', authMiddleware, roleMiddleware('admin'), require('./routes/reports'));
app.use('/api/logs', authMiddleware, roleMiddleware('admin'), require('./routes/logs'));

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(err.status || 500).json({ error: err.message || '服务器内部错误' });
});

const PORT = config.PORT;
app.listen(PORT, () => {
  console.log(`超市管理系统后端已启动: http://localhost:${PORT}`);
});
