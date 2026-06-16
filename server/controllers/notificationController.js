/**
 * 站内通知控制器
 */
const Notification = require('../models/Notification');
const { success, paginated } = require('../utils/response');
const { parsePagination } = require('../utils/validator');

module.exports = {
  async list(req, res, next) {
    try {
      const { page, pageSize, offset } = parsePagination(req.query);
      const result = await Notification.findByUser(req.user.id, { pageSize, offset });
      paginated(res, { ...result, page, pageSize });
    } catch (err) { next(err); }
  },

  async unreadCount(req, res, next) {
    try {
      success(res, { count: await Notification.countUnread(req.user.id) });
    } catch (err) { next(err); }
  },

  async read(req, res, next) {
    try {
      await Notification.markRead(req.params.id, req.user.id);
      success(res, null, '已标记已读');
    } catch (err) { next(err); }
  },

  async readAll(req, res, next) {
    try {
      await Notification.markAllRead(req.user.id);
      success(res, null, '已全部标记已读');
    } catch (err) { next(err); }
  },
};
