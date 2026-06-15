/**
 * 上传文件工具
 */
const path = require('path');
const config = require('../config');

// 上传根目录（与 middlewares/upload.js 保持一致）
const UPLOAD_ROOT = path.resolve(config.uploadDir);

/**
 * 把 multer 保存的文件转换为可通过 /uploads 访问的 Web 路径。
 * 由于上传按日期分目录存储（uploads/<日期>/<文件名>），
 * 必须基于 file.path 计算相对路径，不能只用 file.filename，
 * 否则生成的 URL 会丢失日期目录导致图片 404。
 * @param {Express.Multer.File|undefined} file
 * @returns {string} 形如 /uploads/2026-06-16/170000-123.jpg，无文件时返回 ''
 */
function fileWebPath(file) {
  if (!file || !file.path) return '';
  const rel = path.relative(UPLOAD_ROOT, file.path).split(path.sep).join('/');
  return `/uploads/${rel}`;
}

module.exports = { fileWebPath };
