/**
 * 动物信息模型
 */
const db = require('../config/db');

// 安全解析 images（JSON 字符串）为数组，脏数据返回空数组
function parseImages(raw) {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

const Animal = {
  parseImages,
  // 创建动物记录
  async create(data) {
    const [result] = await db.execute(
      `INSERT INTO animals (name, category_id, breed_id, gender, age, weight, color,
        health_status, is_vaccinated, is_sterilized, personality, description,
        image_url, images, status, rescue_date, location, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name || '未命名', data.category_id, data.breed_id || null, data.gender || 'unknown',
        data.age || '未知', data.weight || null, data.color || '', data.health_status || '',
        data.is_vaccinated || 0, data.is_sterilized || 0, data.personality || '',
        data.description || null, data.image_url || '', data.images || '[]',
        data.status || 'rescued', data.rescue_date || null, data.location || '', data.created_by || null,
      ]
    );
    return result.insertId;
  },

  // 根据 ID 查找
  async findById(id) {
    const [rows] = await db.execute(
      `SELECT a.*, c.name as category_name, b.name as breed_name,
              u.nickname as creator_name
       FROM animals a
       LEFT JOIN animal_categories c ON a.category_id = c.id
       LEFT JOIN animal_breeds b ON a.breed_id = b.id
       LEFT JOIN users u ON a.created_by = u.id
       WHERE a.id = ?`, [id]
    );
    return rows[0] || null;
  },

  // 分页查询
  async findAll({ keyword, category_id, status, gender, page, pageSize, offset }) {
    let where = 'WHERE 1=1';
    const params = [];

    if (keyword) {
      where += ' AND (a.name LIKE ? OR a.description LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw);
    }
    if (category_id) { where += ' AND a.category_id = ?'; params.push(category_id); }
    if (status) { where += ' AND a.status = ?'; params.push(status); }
    if (gender) { where += ' AND a.gender = ?'; params.push(gender); }

    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) as total FROM animals a ${where}`, params
    );

    const [rows] = await db.execute(
      `SELECT a.*, c.name as category_name, b.name as breed_name
       FROM animals a
       LEFT JOIN animal_categories c ON a.category_id = c.id
       LEFT JOIN animal_breeds b ON a.breed_id = b.id
       ${where}
       ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,
      [...params, String(pageSize), String(offset)]
    );

    return { list: rows, total };
  },

  // 更新动物信息
  async update(id, data, executor = db) {
    const fields = [];
    const values = [];
    const allowedFields = [
      'name', 'category_id', 'breed_id', 'gender', 'age', 'weight', 'color',
      'health_status', 'is_vaccinated', 'is_sterilized', 'personality',
      'description', 'image_url', 'images', 'status', 'rescue_date', 'location',
    ];
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }
    if (fields.length === 0) return 0;
    values.push(id);
    const [result] = await executor.execute(`UPDATE animals SET ${fields.join(', ')} WHERE id = ?`, values);
    return result.affectedRows;
  },

  // 删除
  async delete(id) {
    const [result] = await db.execute('DELETE FROM animals WHERE id = ?', [id]);
    return result.affectedRows;
  },

  // 相册图片：覆盖保存为 JSON
  async setImages(id, arr) {
    const [result] = await db.execute(
      'UPDATE animals SET images = ? WHERE id = ?',
      [JSON.stringify(Array.isArray(arr) ? arr : []), id]
    );
    return result.affectedRows;
  },

  // 获取统计信息
  async getStats() {
    const [[total]] = await db.execute('SELECT COUNT(*) as count FROM animals');
    const [[rescued]] = await db.execute("SELECT COUNT(*) as count FROM animals WHERE status = 'rescued'");
    const [[available]] = await db.execute("SELECT COUNT(*) as count FROM animals WHERE status = 'available'");
    const [[adopted]] = await db.execute("SELECT COUNT(*) as count FROM animals WHERE status = 'adopted'");
    const [[fostered]] = await db.execute("SELECT COUNT(*) as count FROM animals WHERE status = 'fostered'");
    return {
      total: total.count, rescued: rescued.count, available: available.count,
      adopted: adopted.count, fostered: fostered.count,
    };
  },
};

module.exports = Animal;
