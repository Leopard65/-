/**
 * 领养回访模型（对应 adoption_followups 表）
 */
const db = require('../config/db');

// 安全地把 photos 字段（JSON 字符串）解析为数组，脏数据返回空数组
function parsePhotos(raw) {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

const Followup = {
  // 新增一条回访记录
  async create({ application_id, visit_date, content, animal_condition, photos, operator_id, next_visit_date }) {
    const [result] = await db.execute(
      `INSERT INTO adoption_followups
        (application_id, visit_date, content, animal_condition, next_visit_date, photos, operator_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        application_id, visit_date, content,
        animal_condition || '', next_visit_date || null, photos || null, operator_id || null,
      ]
    );
    return result.insertId;
  },

  // 查询某个领养申请的全部回访记录（按回访日期倒序），photos 解析为数组
  async findByApplication(applicationId) {
    const [rows] = await db.execute(
      `SELECT f.*, u.nickname AS operator_name
       FROM adoption_followups f
       LEFT JOIN users u ON f.operator_id = u.id
       WHERE f.application_id = ?
       ORDER BY f.visit_date DESC, f.id DESC`,
      [applicationId]
    );
    return rows.map((r) => ({ ...r, photos: parsePhotos(r.photos) }));
  },

  async findById(id) {
    const [rows] = await db.execute('SELECT * FROM adoption_followups WHERE id = ?', [id]);
    return rows[0] || null;
  },

  // 近期计划回访：未来 daysAhead 天内有计划回访日期的记录（用于后台看板提醒）
  async findUpcoming(daysAhead = 30) {
    const n = Math.max(1, Number(daysAhead) || 30);
    const [rows] = await db.execute(
      `SELECT f.id, f.application_id, f.next_visit_date,
              DATEDIFF(f.next_visit_date, CURDATE()) AS days_until,
              aa.applicant_name, aa.phone, aa.animal_id,
              a.name AS animal_name
       FROM adoption_followups f
       JOIN adoption_applications aa ON f.application_id = aa.id
       LEFT JOIN animals a ON aa.animal_id = a.id
       WHERE f.next_visit_date IS NOT NULL
         AND f.next_visit_date >= CURDATE()
         AND f.next_visit_date <= DATE_ADD(CURDATE(), INTERVAL ${n} DAY)
       ORDER BY f.next_visit_date ASC`
    );
    return rows;
  },

  async delete(id) {
    const [result] = await db.execute('DELETE FROM adoption_followups WHERE id = ?', [id]);
    return result.affectedRows;
  },
};

module.exports = Followup;
