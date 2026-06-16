/**
 * 动物档案事件模型（对应 animal_events 表）
 * 记录一只动物从救助到领养/回访的生命周期事件，用于动物档案时间线。
 */
const db = require('../config/db');

const AnimalEvent = {
  // 新增事件
  async create({ animal_id, event_type, event_date, title, description, created_by }) {
    const [result] = await db.execute(
      `INSERT INTO animal_events
        (animal_id, event_type, event_date, title, description, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [animal_id, event_type || 'other', event_date, title, description || '', created_by || null]
    );
    return result.insertId;
  },

  // 查询某动物的全部档案事件（按事件日期正序，呈现生命线）
  async findByAnimal(animalId) {
    const [rows] = await db.execute(
      `SELECT e.*, u.nickname AS operator_name
       FROM animal_events e
       LEFT JOIN users u ON e.created_by = u.id
       WHERE e.animal_id = ?
       ORDER BY e.event_date ASC, e.id ASC`,
      [animalId]
    );
    return rows;
  },

  async findById(id) {
    const [rows] = await db.execute('SELECT * FROM animal_events WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async delete(id) {
    const [result] = await db.execute('DELETE FROM animal_events WHERE id = ?', [id]);
    return result.affectedRows;
  },
};

module.exports = AnimalEvent;
