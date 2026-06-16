/**
 * 救助处理日志模型（对应 rescue_logs 表）
 * 记录救助求助从受理到解决的每一步，用于后台救助详情的进度时间线。
 */
const db = require('../config/db');

const RescueLog = {
  async create({ rescue_id, action, note, operator_id }) {
    const [result] = await db.execute(
      `INSERT INTO rescue_logs (rescue_id, action, note, operator_id)
       VALUES (?, ?, ?, ?)`,
      [rescue_id, action || 'note', note || '', operator_id || null]
    );
    return result.insertId;
  },

  // 某条救助的全部日志（按时间正序，呈现进度线）
  async findByRescue(rescueId) {
    const [rows] = await db.execute(
      `SELECT l.*, u.nickname AS operator_name
       FROM rescue_logs l
       LEFT JOIN users u ON l.operator_id = u.id
       WHERE l.rescue_id = ?
       ORDER BY l.created_at ASC, l.id ASC`,
      [rescueId]
    );
    return rows;
  },
};

module.exports = RescueLog;
