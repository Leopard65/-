/**
 * 用户模型
 */
const db = require('../config/db');

const User = {
  // 根据用户名查找
  async findByUsername(username) {
    const [rows] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
    return rows[0] || null;
  },

  // 根据 ID 查找（不含密码）
  async findById(id) {
    const [rows] = await db.execute(
      'SELECT id, username, nickname, email, phone, avatar, role, status, created_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  // 创建用户
  async create({ username, password, nickname, email, phone, role = 'user' }) {
    const [result] = await db.execute(
      'INSERT INTO users (username, password, nickname, email, phone, role) VALUES (?, ?, ?, ?, ?, ?)',
      [username, password, nickname || username, email || '', phone || '', role]
    );
    return result.insertId;
  },

  // 更新用户信息
  async update(id, { nickname, email, phone, avatar }) {
    const fields = [];
    const values = [];
    if (nickname !== undefined) { fields.push('nickname = ?'); values.push(nickname); }
    if (email !== undefined) { fields.push('email = ?'); values.push(email); }
    if (phone !== undefined) { fields.push('phone = ?'); values.push(phone); }
    if (avatar !== undefined) { fields.push('avatar = ?'); values.push(avatar); }
    if (fields.length === 0) return 0;
    values.push(id);
    const [result] = await db.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    return result.affectedRows;
  },

  // 修改密码
  async updatePassword(id, hashedPassword) {
    const [result] = await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);
    return result.affectedRows;
  },

  // 管理员更新用户状态
  async updateStatus(id, status) {
    const [result] = await db.execute('UPDATE users SET status = ? WHERE id = ?', [status, id]);
    return result.affectedRows;
  },

  // 分页查询（管理员用）
  async findAll({ keyword, status, page, pageSize, offset }) {
    let where = 'WHERE 1=1';
    const params = [];

    if (keyword) {
      where += ' AND (username LIKE ? OR nickname LIKE ? OR phone LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw);
    }
    if (status !== undefined && status !== '') {
      where += ' AND status = ?';
      params.push(Number(status));
    }

    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) as total FROM users ${where}`, params
    );

    const [rows] = await db.execute(
      `SELECT id, username, nickname, email, phone, avatar, role, status, created_at
       FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, String(pageSize), String(offset)]
    );

    return { list: rows, total };
  },
};

module.exports = User;
