/**
 * 领养回访模型（对应 adoption_followups 表）
 */
const db = require('../config/db');

const Followup = {
  // 新增一条回访记录
  async create({ application_id, visit_date, content, animal_condition, photos, operator_id }) {
    const [result] = await db.execute(
      `INSERT INTO adoption_followups
        (application_id, visit_date, content, animal_condition, photos, operator_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        application_id, visit_date, content,
        animal_condition || '', photos || null, operator_id || null,
      ]
    );
    return result.insertId;
  },

  // 查询某个领养申请的全部回访记录（按回访日期倒序）
  async findByApplication(applicationId) {
    const [rows] = await db.execute(
      `SELECT f.*, u.nickname AS operator_name
       FROM adoption_followups f
       LEFT JOIN users u ON f.operator_id = u.id
       WHERE f.application_id = ?
       ORDER BY f.visit_date DESC, f.id DESC`,
      [applicationId]
    );
    return rows;
  },

  async findById(id) {
    const [rows] = await db.execute('SELECT * FROM adoption_followups WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async delete(id) {
    const [result] = await db.execute('DELETE FROM adoption_followups WHERE id = ?', [id]);
    return result.affectedRows;
  },
};

module.exports = Followup;
