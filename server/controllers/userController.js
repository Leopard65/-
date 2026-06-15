/**
 * 用户管理控制器（管理员用）
 */
const User = require('../models/User');
const { success, paginated, error } = require('../utils/response');
const { parsePagination, sanitizeSearch } = require('../utils/validator');

const userController = {
  // 获取用户列表
  async getList(req, res, next) {
    try {
      const { page, pageSize, offset } = parsePagination(req.query);
      const { keyword, status } = req.query;
      const result = await User.findAll({
        keyword: sanitizeSearch(keyword),
        status,
        page, pageSize, offset,
      });
      paginated(res, { ...result, page, pageSize });
    } catch (err) {
      next(err);
    }
  },

  // 获取用户详情
  async getDetail(req, res, next) {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return error(res, '用户不存在', 404);
      success(res, user);
    } catch (err) {
      next(err);
    }
  },

  // 更新用户状态（启用/禁用）
  async updateStatus(req, res, next) {
    try {
      const { status } = req.body;
      if (status !== 0 && status !== 1) return error(res, '状态值无效');
      if (Number(req.params.id) === req.user.id) return error(res, '不能修改自己的状态');

      const affected = await User.updateStatus(req.params.id, status);
      if (!affected) return error(res, '操作失败', 404);
      success(res, null, status === 1 ? '已启用' : '已禁用');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = userController;
