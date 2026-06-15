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

  uploadDir: process.env.UPLOAD_DIR || 'uploads',
};
