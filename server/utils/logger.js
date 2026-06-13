const db = require('../db');

/**
 * 记录操作日志
 * @param {Object} options - 日志选项
 * @param {number} options.userId - 用户ID
 * @param {string} options.username - 用户名
 * @param {string} options.action - 操作类型 (login, create, update, delete, restore, approve, reject)
 * @param {string} options.module - 模块名称 (auth, products, members, suppliers, sales, returns, categories)
 * @param {number} [options.targetId] - 操作对象ID
 * @param {Object} [options.detail] - 操作详情
 * @param {string} [options.ip] - IP地址
 */
function logOperation({ userId, username, action, module, targetId, detail, ip }) {
  try {
    db.prepare(`
      INSERT INTO operation_logs (user_id, username, action, module, target_id, detail, ip)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, username, action, module, targetId || null, JSON.stringify(detail || {}), ip || '');
  } catch (err) {
    console.error('记录操作日志失败:', err);
  }
}

/**
 * 获取操作日志（支持分页和筛选）
 * @param {Object} options - 查询选项
 * @param {number} options.page - 页码
 * @param {number} options.pageSize - 每页数量
 * @param {string} [options.username] - 用户名筛选
 * @param {string} [options.action] - 操作类型筛选
 * @param {string} [options.module] - 模块筛选
 * @param {string} [options.startDate] - 开始日期
 * @param {string} [options.endDate] - 结束日期
 */
function getOperationLogs({ page = 1, pageSize = 20, username, action, module, startDate, endDate }) {
  let where = 'WHERE 1=1';
  const params = [];

  if (username) {
    where += ' AND username LIKE ?';
    params.push(`%${username}%`);
  }
  if (action) {
    where += ' AND action = ?';
    params.push(action);
  }
  if (module) {
    where += ' AND module = ?';
    params.push(module);
  }
  if (startDate) {
    where += ' AND DATE(created_at) >= ?';
    params.push(startDate);
  }
  if (endDate) {
    where += ' AND DATE(created_at) <= ?';
    params.push(endDate);
  }

  const total = db.prepare(`SELECT COUNT(*) as count FROM operation_logs ${where}`).get(...params).count;
  const data = db.prepare(`
    SELECT * FROM operation_logs ${where}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, pageSize, (page - 1) * pageSize);

  return { data, total, page, pageSize };
}

module.exports = { logOperation, getOperationLogs };
