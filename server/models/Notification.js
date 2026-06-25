/**
 * 站内通知模型
 */
const db = require('../config/db');

const Notification = {
  async create({ user_id, type, title, content, related_id }, executor = db) {
    if (!user_id || !title) return null;
    const [r] = await executor.execute(
      'INSERT INTO notifications (user_id, type, title, content, related_id) VALUES (?, ?, ?, ?, ?)',
      [user_id, type || 'system', title, content || '', related_id || null]
    );
    return r.insertId;
  },

  async findByUser(userId, { pageSize, offset }) {
    const [[{ total }]] = await db.execute('SELECT COUNT(*) AS total FROM notifications WHERE user_id = ?', [userId]);
    const [rows] = await db.execute(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, String(pageSize), String(offset)]
    );
    return { list: rows, total };
  },

  async countUnread(userId) {
    const [[{ c }]] = await db.execute('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0', [userId]);
    return c;
  },

  async markRead(id, userId) {
    const [r] = await db.execute('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, userId]);
    return r.affectedRows;
  },

  async markAllRead(userId) {
    const [r] = await db.execute('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [userId]);
    return r.affectedRows;
  },
};

module.exports = Notification;
