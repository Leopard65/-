/**
 * 动物分类与品种模型
 */
const db = require('../config/db');

const Category = {
  // 获取所有分类
  async findAll() {
    const [rows] = await db.execute('SELECT * FROM animal_categories ORDER BY sort_order');
    return rows;
  },

  // 创建分类
  async create(name, sortOrder = 0) {
    const [result] = await db.execute(
      'INSERT INTO animal_categories (name, sort_order) VALUES (?, ?)', [name, sortOrder]
    );
    return result.insertId;
  },

  // 更新分类
  async update(id, { name, sort_order }) {
    const [result] = await db.execute(
      'UPDATE animal_categories SET name = ?, sort_order = ? WHERE id = ?',
      [name, sort_order, id]
    );
    return result.affectedRows;
  },

  // 删除分类
  async delete(id) {
    const [result] = await db.execute('DELETE FROM animal_categories WHERE id = ?', [id]);
    return result.affectedRows;
  },
};

const Breed = {
  // 根据分类获取品种
  async findByCategoryId(categoryId) {
    const [rows] = await db.execute(
      'SELECT * FROM animal_breeds WHERE category_id = ? ORDER BY id', [categoryId]
    );
    return rows;
  },

  // 获取所有品种（含分类名）
  async findAll() {
    const [rows] = await db.execute(
      `SELECT b.*, c.name as category_name
       FROM animal_breeds b
       LEFT JOIN animal_categories c ON b.category_id = c.id
       ORDER BY c.sort_order, b.id`
    );
    return rows;
  },

  // 创建品种
  async create(categoryId, name) {
    const [result] = await db.execute(
      'INSERT INTO animal_breeds (category_id, name) VALUES (?, ?)', [categoryId, name]
    );
    return result.insertId;
  },

  // 删除品种
  async delete(id) {
    const [result] = await db.execute('DELETE FROM animal_breeds WHERE id = ?', [id]);
    return result.affectedRows;
  },
};

module.exports = { Category, Breed };
