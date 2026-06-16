/**
 * 领养申请模型
 */
const db = require('../config/db');

const Adoption = {
  // 创建申请
  async create(data) {
    const [result] = await db.execute(
      `INSERT INTO adoption_applications
       (user_id, animal_id, applicant_name, phone, id_card, address,
        housing_type, has_pet_exp, pet_experience, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.user_id, data.animal_id, data.applicant_name, data.phone,
       data.id_card || '', data.address || '', data.housing_type || '',
       data.has_pet_exp || 0, data.pet_experience || '', data.reason]
    );
    return result.insertId;
  },

  // 根据 ID 查找
  async findById(id) {
    const [rows] = await db.execute(
      `SELECT aa.*, a.name as animal_name, a.image_url as animal_image,
              u.nickname as user_nickname, u.phone as user_phone,
              r.nickname as reviewer_name
       FROM adoption_applications aa
       LEFT JOIN animals a ON aa.animal_id = a.id
       LEFT JOIN users u ON aa.user_id = u.id
       LEFT JOIN users r ON aa.reviewed_by = r.id
       WHERE aa.id = ?`, [id]
    );
    return rows[0] || null;
  },

  // 用户查询自己的申请
  async findByUserId(userId, { page, pageSize, offset }) {
    const [[{ total }]] = await db.execute(
      'SELECT COUNT(*) as total FROM adoption_applications WHERE user_id = ?', [userId]
    );
    const [rows] = await db.execute(
      `SELECT aa.*, a.name as animal_name, a.image_url as animal_image
       FROM adoption_applications aa
       LEFT JOIN animals a ON aa.animal_id = a.id
       WHERE aa.user_id = ? ORDER BY aa.created_at DESC LIMIT ? OFFSET ?`,
      [userId, String(pageSize), String(offset)]
    );
    return { list: rows, total };
  },

  // 管理员分页查询所有申请
  async findAll({ status, keyword, page, pageSize, offset }) {
    let where = 'WHERE 1=1';
    const params = [];
    if (status) { where += ' AND aa.status = ?'; params.push(status); }
    if (keyword) {
      where += ' AND (aa.applicant_name LIKE ? OR a.name LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw);
    }

    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) as total FROM adoption_applications aa
       LEFT JOIN animals a ON aa.animal_id = a.id ${where}`, params
    );

    const [rows] = await db.execute(
      `SELECT aa.*, a.name as animal_name, a.image_url as animal_image,
              u.nickname as user_nickname
       FROM adoption_applications aa
       LEFT JOIN animals a ON aa.animal_id = a.id
       LEFT JOIN users u ON aa.user_id = u.id
       ${where} ORDER BY aa.created_at DESC LIMIT ? OFFSET ?`,
      [...params, String(pageSize), String(offset)]
    );

    return { list: rows, total };
  },

  // 审核申请
  async review(id, { status, reject_reason, reviewed_by }) {
    const [result] = await db.execute(
      `UPDATE adoption_applications SET status = ?, reject_reason = ?, reviewed_by = ?, reviewed_at = NOW()
       WHERE id = ?`, [status, reject_reason || '', reviewed_by, id]
    );
    return result.affectedRows;
  },

  // 检查用户是否已对某动物提交过申请
  async hasApplied(userId, animalId) {
    const [rows] = await db.execute(
      "SELECT id FROM adoption_applications WHERE user_id = ? AND animal_id = ? AND status NOT IN ('rejected', 'cancelled')",
      [userId, animalId]
    );
    return rows.length > 0;
  },

  // 回访提醒：已通过满 30 天、且尚无任何回访记录的领养（按通过时间从早到晚）
  async findFollowupReminders() {
    const [rows] = await db.execute(
      `SELECT aa.id, aa.animal_id, a.name AS animal_name, aa.applicant_name, aa.phone,
              aa.reviewed_at, DATEDIFF(NOW(), aa.reviewed_at) AS days_since
       FROM adoption_applications aa
       LEFT JOIN animals a ON aa.animal_id = a.id
       WHERE aa.status = 'approved' AND aa.reviewed_at IS NOT NULL
         AND aa.reviewed_at <= DATE_SUB(NOW(), INTERVAL 30 DAY)
         AND NOT EXISTS (SELECT 1 FROM adoption_followups f WHERE f.application_id = aa.id)
       ORDER BY aa.reviewed_at ASC`
    );
    return rows;
  },

  // 按月统计申请数（用于趋势图）。monthsBack 为服务端常量，直接内联拼接安全。
  async monthlyCounts(monthsBack = 6) {
    const n = Math.max(1, Number(monthsBack)) - 1;
    const [rows] = await db.execute(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count
       FROM adoption_applications
       WHERE created_at >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL ${n} MONTH)
       GROUP BY month ORDER BY month`
    );
    return rows;
  },
};

module.exports = Adoption;
