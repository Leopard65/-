/**
 * 服务器共享配置
 * 集中管理环境变量和常量
 */

const config = {
  // JWT 配置
  JWT_SECRET: process.env.JWT_SECRET || 'supermarket-secret-key-2024',
  JWT_EXPIRES_IN: '24h',

  // 服务器配置
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // 数据库配置
  DB_PATH: process.env.DB_PATH || './supermarket.db',

  // 上传配置
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB

  // 分页默认值
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
};

module.exports = config;
