/**
 * 领养管理控制器
 */
const Adoption = require('../models/Adoption');
const Animal = require('../models/Animal');
const Followup = require('../models/Followup');
const { success, paginated, error } = require('../utils/response');
const { parsePagination } = require('../utils/validator');

const adoptionController = {
  // 提交领养申请（用户）
  async apply(req, res, next) {
    try {
      const { animal_id } = req.body;
      if (!animal_id) return error(res, '请选择要领养的动物');

      // 检查动物是否存在且可领养
      const animal = await Animal.findById(animal_id);
      if (!animal) return error(res, '动物信息不存在', 404);
      if (animal.status === 'adopted') return error(res, '该动物已被领养');

      // 检查是否重复申请
      const hasApplied = await Adoption.hasApplied(req.user.id, animal_id);
      if (hasApplied) return error(res, '您已对该动物提交过申请，请勿重复提交');

      const id = await Adoption.create({
        ...req.body,
        user_id: req.user.id,
      });
      success(res, { id }, '申请提交成功，请等待审核');
    } catch (err) {
      next(err);
    }
  },

  // 查看我的申请（用户）
  async getMyApplications(req, res, next) {
    try {
      const { page, pageSize, offset } = parsePagination(req.query);
      const result = await Adoption.findByUserId(req.user.id, { page, pageSize, offset });
      paginated(res, { ...result, page, pageSize });
    } catch (err) {
      next(err);
    }
  },

  // 获取申请详情
  async getDetail(req, res, next) {
    try {
      const app = await Adoption.findById(req.params.id);
      if (!app) return error(res, '申请不存在', 404);
      // 非管理员只能看自己的
      if (req.user.role !== 'admin' && app.user_id !== req.user.id) {
        return error(res, '无权查看', 403);
      }
      success(res, app);
    } catch (err) {
      next(err);
    }
  },

  // 获取所有申请（管理员）
  async getAll(req, res, next) {
    try {
      const { page, pageSize, offset } = parsePagination(req.query);
      const { status, keyword } = req.query;
      const result = await Adoption.findAll({ status, keyword, page, pageSize, offset });
      paginated(res, { ...result, page, pageSize });
    } catch (err) {
      next(err);
    }
  },

  // 审核申请（管理员）
  async review(req, res, next) {
    try {
      const { status, reject_reason } = req.body;
      if (!['approved', 'rejected'].includes(status)) {
        return error(res, '状态值无效');
      }

      const app = await Adoption.findById(req.params.id);
      if (!app) return error(res, '申请不存在', 404);
      if (app.status !== 'pending') return error(res, '该申请已处理');

      await Adoption.review(req.params.id, {
        status,
        reject_reason,
        reviewed_by: req.user.id,
      });

      // 如果批准，更新动物状态为已领养
      if (status === 'approved') {
        await Animal.update(app.animal_id, { status: 'adopted' });
      }

      success(res, null, status === 'approved' ? '已批准' : '已拒绝');
    } catch (err) {
      next(err);
    }
  },

  // ===== 领养回访 =====

  // 查看某申请的回访记录（管理员或申请本人）
  async listFollowups(req, res, next) {
    try {
      const app = await Adoption.findById(req.params.id);
      if (!app) return error(res, '申请不存在', 404);
      if (req.user.role !== 'admin' && app.user_id !== req.user.id) {
        return error(res, '无权查看', 403);
      }
      const list = await Followup.findByApplication(req.params.id);
      success(res, list);
    } catch (err) {
      next(err);
    }
  },

  // 新增回访记录（管理员）
  async addFollowup(req, res, next) {
    try {
      const { visit_date, content, animal_condition } = req.body;
      if (!visit_date || !content) {
        return error(res, '回访日期和回访内容不能为空');
      }
      const app = await Adoption.findById(req.params.id);
      if (!app) return error(res, '申请不存在', 404);
      if (app.status !== 'approved' && app.status !== 'completed') {
        return error(res, '仅可对已通过的领养申请添加回访');
      }

      const id = await Followup.create({
        application_id: req.params.id,
        visit_date,
        content,
        animal_condition,
        operator_id: req.user.id,
      });
      success(res, { id }, '回访记录已保存');
    } catch (err) {
      next(err);
    }
  },

  // 删除回访记录（管理员）
  async deleteFollowup(req, res, next) {
    try {
      const followup = await Followup.findById(req.params.fid);
      if (!followup || String(followup.application_id) !== String(req.params.id)) {
        return error(res, '回访记录不存在', 404);
      }
      await Followup.delete(req.params.fid);
      success(res, null, '删除成功');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = adoptionController;
