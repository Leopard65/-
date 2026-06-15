/**
 * 救助求助控制器
 */
const Rescue = require('../models/Rescue');
const { success, paginated, error } = require('../utils/response');
const { parsePagination, sanitizeSearch } = require('../utils/validator');
const { fileWebPath } = require('../utils/file');

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

  // 获取详情
  async getDetail(req, res, next) {
    try {
      const item = await Rescue.findById(req.params.id);
      if (!item) return error(res, '求助信息不存在', 404);
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

  // 更新状态（管理员）
  async updateStatus(req, res, next) {
    try {
      const { status, assigned_to } = req.body;
      const affected = await Rescue.updateStatus(req.params.id, { status, assigned_to });
      if (!affected) return error(res, '更新失败', 404);
      success(res, null, '状态更新成功');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = rescueController;
