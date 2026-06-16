/**
 * 应用配置 - 从环境变量读取
 */
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123456',
    database: process.env.DB_NAME || 'stray_animal_rescue',
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'default_secret_change_me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // 允许跨域的来源白名单（逗号分隔）。同源访问、服务端调用（无 Origin）始终放行。
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000')
    .split(',').map((s) => s.trim()).filter(Boolean),

  uploadDir: process.env.UPLOAD_DIR || 'uploads',
};
