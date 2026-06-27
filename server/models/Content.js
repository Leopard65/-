/**
 * 内容模型（公告、文章、轮播图）
 */
const db = require('../config/db');

// ---- 公告 ----
const Announcement = {
  async findAll({ status, keyword, page, pageSize, offset }) {
    let where = 'WHERE 1=1';
    const params = [];
    if (status !== undefined && status !== '') { where += ' AND a.status = ?'; params.push(Number(status)); }
    if (keyword) { where += ' AND a.title LIKE ?'; params.push(`%${keyword}%`); }

    const [[{ total }]] = await db.execute(`SELECT COUNT(*) as total FROM announcements a ${where}`, params);
    const [rows] = await db.execute(
      `SELECT a.*, u.nickname as author_name
       FROM announcements a LEFT JOIN users u ON a.created_by = u.id
       ${where} ORDER BY a.is_top DESC, a.created_at DESC LIMIT ? OFFSET ?`,
      [...params, String(pageSize), String(offset)]
    );
    return { list: rows, total };
  },

  async findPublished() {
    const [rows] = await db.execute(
      "SELECT id, title, content, is_top, created_at FROM announcements WHERE status = 1 ORDER BY is_top DESC, created_at DESC LIMIT 10"
    );
    return rows;
  },

  async findById(id) {
    const [rows] = await db.execute('SELECT * FROM announcements WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async create({ title, content, is_top, status, created_by }) {
    const [result] = await db.execute(
      'INSERT INTO announcements (title, content, is_top, status, created_by) VALUES (?, ?, ?, ?, ?)',
      [title, content, is_top || 0, status ?? 1, created_by]
    );
    return result.insertId;
  },

  async update(id, { title, content, is_top, status }) {
    const fields = [];
    const values = [];
    if (title !== undefined) { fields.push('title = ?'); values.push(title); }
    if (content !== undefined) { fields.push('content = ?'); values.push(content); }
    if (is_top !== undefined) { fields.push('is_top = ?'); values.push(is_top); }
    if (status !== undefined) { fields.push('status = ?'); values.push(status); }
    if (fields.length === 0) return 0;
    values.push(id);
    const [result] = await db.execute(`UPDATE announcements SET ${fields.join(', ')} WHERE id = ?`, values);
    return result.affectedRows;
  },

  async delete(id) {
    const [result] = await db.execute('DELETE FROM announcements WHERE id = ?', [id]);
    return result.affectedRows;
  },
};

// ---- 文章 ----
const Article = {
  async findAll({ category, status, keyword, page, pageSize, offset }) {
    let where = 'WHERE 1=1';
    const params = [];
    if (category) { where += ' AND category = ?'; params.push(category); }
    if (status !== undefined && status !== '') { where += ' AND status = ?'; params.push(Number(status)); }
    if (keyword) { where += ' AND title LIKE ?'; params.push(`%${keyword}%`); }

    const [[{ total }]] = await db.execute(`SELECT COUNT(*) as total FROM articles ${where}`, params);
    const [rows] = await db.execute(
      `SELECT id, title, cover_image, category, status, view_count, created_at
       FROM articles ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, String(pageSize), String(offset)]
    );
    return { list: rows, total };
  },

  async findPublished({ category, page, pageSize, offset }) {
    let where = 'WHERE status = 1';
    const params = [];
    if (category) { where += ' AND category = ?'; params.push(category); }

    const [[{ total }]] = await db.execute(`SELECT COUNT(*) as total FROM articles ${where}`, params);
    const [rows] = await db.execute(
      `SELECT id, title, cover_image, category, view_count, created_at
       FROM articles ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, String(pageSize), String(offset)]
    );
    return { list: rows, total };
  },

  async findById(id) {
    const [rows] = await db.execute('SELECT * FROM articles WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async incrementView(id) {
    await db.execute('UPDATE articles SET view_count = view_count + 1 WHERE id = ?', [id]);
  },

  async create({ title, content, cover_image, category, status, created_by }) {
    const [result] = await db.execute(
      'INSERT INTO articles (title, content, cover_image, category, status, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [title, content, cover_image || '', category || 'knowledge', status ?? 1, created_by]
    );
    return result.insertId;
  },

  async update(id, data) {
    const fields = [];
    const values = [];
    const allowed = ['title', 'content', 'cover_image', 'category', 'status'];
    for (const key of allowed) {
      if (data[key] !== undefined) { fields.push(`${key} = ?`); values.push(data[key]); }
    }
    if (fields.length === 0) return 0;
    values.push(id);
    const [result] = await db.execute(`UPDATE articles SET ${fields.join(', ')} WHERE id = ?`, values);
    return result.affectedRows;
  },

  async delete(id) {
    const [result] = await db.execute('DELETE FROM articles WHERE id = ?', [id]);
    return result.affectedRows;
  },
};

// ---- 轮播图 ----
const Banner = {
  async findAll() {
    const [rows] = await db.execute('SELECT * FROM banners ORDER BY sort_order, id DESC');
    return rows;
  },

  async findActive() {
    const [rows] = await db.execute('SELECT * FROM banners WHERE status = 1 ORDER BY sort_order');
    return rows;
  },

  async create({ title, image_url, link_url, sort_order, status }) {
    const [result] = await db.execute(
      'INSERT INTO banners (title, image_url, link_url, sort_order, status) VALUES (?, ?, ?, ?, ?)',
      [title || '', image_url, link_url || '', sort_order || 0, status ?? 1]
    );
    return result.insertId;
  },

  async update(id, data) {
    const fields = [];
    const values = [];
    const allowed = ['title', 'image_url', 'link_url', 'sort_order', 'status'];
    for (const key of allowed) {
      if (data[key] !== undefined) { fields.push(`${key} = ?`); values.push(data[key]); }
    }
    if (fields.length === 0) return 0;
    values.push(id);
    const [result] = await db.execute(`UPDATE banners SET ${fields.join(', ')} WHERE id = ?`, values);
    return result.affectedRows;
  },

  async delete(id) {
    const [result] = await db.execute('DELETE FROM banners WHERE id = ?', [id]);
    return result.affectedRows;
  },
};

module.exports = { Announcement, Article, Banner };
