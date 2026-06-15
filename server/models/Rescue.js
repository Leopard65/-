/**
 * 救助求助模型
 */
const db = require('../config/db');

const Rescue = {
  // 创建求助
  async create(data) {
    const [result] = await db.execute(
      `INSERT INTO rescue_requests (user_id, reporter_name, phone, location, description, image_url, animal_type, urgency)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.user_id || null, data.reporter_name, data.phone, data.location,
       data.description, data.image_url || '', data.animal_type || '', data.urgency || 'medium']
    );
    return result.insertId;
  },

  // 根据 ID 查找
  async findById(id) {
    const [rows] = await db.execute(
      `SELECT rr.*, u.nickname as reporter_nickname,
              a.nickname as assignee_name
       FROM rescue_requests rr
       LEFT JOIN users u ON rr.user_id = u.id
       LEFT JOIN users a ON rr.assigned_to = a.id
       WHERE rr.id = ?`, [id]
    );
    return rows[0] || null;
  },

  // 分页查询
  async findAll({ status, urgency, keyword, page, pageSize, offset }) {
    let where = 'WHERE 1=1';
    const params = [];
    if (status) { where += ' AND rr.status = ?'; params.push(status); }
    if (urgency) { where += ' AND rr.urgency = ?'; params.push(urgency); }
    if (keyword) {
      where += ' AND (rr.reporter_name LIKE ? OR rr.location LIKE ? OR rr.description LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw);
    }

    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) as total FROM rescue_requests rr ${where}`, params
    );

    const [rows] = await db.execute(
      `SELECT rr.*, u.nickname as reporter_nickname, a.nickname as assignee_name
       FROM rescue_requests rr
       LEFT JOIN users u ON rr.user_id = u.id
       LEFT JOIN users a ON rr.assigned_to = a.id
       ${where} ORDER BY rr.created_at DESC LIMIT ? OFFSET ?`,
      [...params, String(pageSize), String(offset)]
    );

    return { list: rows, total };
  },

  // 更新状态
  async updateStatus(id, { status, assigned_to }) {
    const fields = ['status = ?'];
    const values = [status];
    if (assigned_to) { fields.push('assigned_to = ?'); values.push(assigned_to); }
    if (status === 'resolved') { fields.push('resolved_at = NOW()'); }
    values.push(id);
    const [result] = await db.execute(`UPDATE rescue_requests SET ${fields.join(', ')} WHERE id = ?`, values);
    return result.affectedRows;
  },
};

module.exports = Rescue;
