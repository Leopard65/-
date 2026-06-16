/**
 * 救助求助控制器
 */
const Rescue = require('../models/Rescue');
const { success, paginated, error } = require('../utils/response');
const { parsePagination, sanitizeSearch } = require('../utils/validator');
const { fileWebPath } = require('../utils/file');
const RescueLog = require('../models/RescueLog');
const { maskPhone } = require('../utils/mask');

const rescueController = {
  // 提交求助（用户/匿名）
  async create(req, res, next) {
    try {
      const { reporter_name, phone, location, description } = req.body;
      if (!reporter_name || !phone || !location || !description) {
        return error(res, '请填写完整信息');
      }
      const data = { ...req.body };
      if (req.user) data.user_id = req.user.id;
      if (req.file) data.image_url = fileWebPath(req.file);
      const id = await Rescue.create(data);
      success(res, { id }, '求助信息已提交，我们会尽快处理');
    } catch (err) {
      next(err);
    }
  },

  // 获取详情（公开；非管理员/非本人时手机号脱敏）
  async getDetail(req, res, next) {
    try {
      const item = await Rescue.findById(req.params.id);
      if (!item) return error(res, '求助信息不存在', 404);
      const isAdmin = req.user && req.user.role === 'admin';
      const isOwner = req.user && item.user_id && req.user.id === item.user_id;
      if (!isAdmin && !isOwner) item.phone = maskPhone(item.phone);
      success(res, item);
    } catch (err) {
      next(err);
    }
  },

  // 获取列表（管理员）
  async getAll(req, res, next) {
    try {
      const { page, pageSize, offset } = parsePagination(req.query);
      const { status, urgency, keyword } = req.query;
      const result = await Rescue.findAll({
        status, urgency,
        keyword: sanitizeSearch(keyword),
        page, pageSize, offset,
      });
      paginated(res, { ...result, page, pageSize });
    } catch (err) {
      next(err);
    }
  },

  // 紧急程度分布统计（管理员，看板用）
  async getUrgencyStats(req, res, next) {
    try {
      const rows = await Rescue.urgencyStats();
      const map = { low: 0, medium: 0, high: 0, critical: 0 };
      rows.forEach((r) => { if (r.urgency in map) map[r.urgency] = Number(r.c); });
      success(res, map);
    } catch (err) {
      next(err);
    }
  },

  // 更新状态（管理员），并记录处理日志
  async updateStatus(req, res, next) {
    try {
      const { status, assigned_to, note } = req.body;
      const affected = await Rescue.updateStatus(req.params.id, { status, assigned_to });
      if (!affected) return error(res, '更新失败', 404);
      await RescueLog.create({
        rescue_id: req.params.id,
        action: status || 'note',
        note: note || '',
        operator_id: req.user.id,
      });
      success(res, null, '状态更新成功');
    } catch (err) {
      next(err);
    }
  },

  // 添加处理备注（管理员）
  async addNote(req, res, next) {
    try {
      const { note } = req.body;
      if (!note) return error(res, '请输入处理备注');
      await RescueLog.create({
        rescue_id: req.params.id,
        action: 'note',
        note,
        operator_id: req.user.id,
      });
      success(res, null, '处理记录已添加');
    } catch (err) {
      next(err);
    }
  },

  // 处理日志（管理员）
  async listLogs(req, res, next) {
    try {
      const list = await RescueLog.findByRescue(req.params.id);
      success(res, list);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = rescueController;
