/**
 * 领养管理控制器
 */
const Adoption = require('../models/Adoption');
const Animal = require('../models/Animal');
const Followup = require('../models/Followup');
const Notification = require('../models/Notification');
const { success, paginated, error } = require('../utils/response');
const { parsePagination } = require('../utils/validator');
const { fileWebPath } = require('../utils/file');

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

  // 回访提醒（管理员）：已通过满 30 天且无回访的领养
  async getFollowupReminders(req, res, next) {
    try {
      const list = await Adoption.findFollowupReminders();
      success(res, list);
    } catch (err) {
      next(err);
    }
  },

  // 近 6 个月领养申请趋势（管理员），缺失月份补 0
  async getTrend(req, res, next) {
    try {
      const rows = await Adoption.monthlyCounts(6);
      const map = Object.fromEntries(rows.map((r) => [r.month, Number(r.count)]));
      const now = new Date();
      const series = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        series.push({ month: key, count: map[key] || 0 });
      }
      success(res, series);
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

      // 给申请人发送站内通知
      await Notification.create({
        user_id: app.user_id,
        type: 'adoption',
        title: status === 'approved' ? '领养申请已通过' : '领养申请未通过',
        content: status === 'approved'
          ? `您领养「${app.animal_name}」的申请已通过审核，请及时联系工作人员办理后续手续。`
          : `很抱歉，您领养「${app.animal_name}」的申请未通过。${reject_reason ? '原因：' + reject_reason : ''}`,
        related_id: app.id,
      });

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
        photos: req.files && req.files.length ? JSON.stringify(req.files.map(fileWebPath)) : null,
        operator_id: req.user.id,
      });
      // 通知领养人有新回访
      await Notification.create({
        user_id: app.user_id,
        type: 'followup',
        title: '新的领养回访记录',
        content: `工作人员为您领养的「${app.animal_name}」添加了一条回访记录，快来看看吧。`,
        related_id: app.id,
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
