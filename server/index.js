const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 挂载路由
app.use('/api/categories', require('./routes/categories'));
app.use('/api/products', require('./routes/products'));
app.use('/api/members', require('./routes/members'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/purchases', require('./routes/purchases'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/dashboard', require('./routes/dashboard'));

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`超市管理系统后端已启动: http://localhost:${PORT}`);
});
