/**
 * 内容管理控制器（公告、文章、轮播图）
 */
const { Announcement, Article, Banner } = require('../models/Content');
const { success, paginated, error } = require('../utils/response');
const { parsePagination, sanitizeSearch } = require('../utils/validator');
const { fileWebPath } = require('../utils/file');

const contentController = {
  // ========== 公告 ==========
  async getAnnouncementList(req, res, next) {
    try {
      const { page, pageSize, offset } = parsePagination(req.query);
      const result = await Announcement.findAll({ page, pageSize, offset });
      paginated(res, { ...result, page, pageSize });
    } catch (err) { next(err); }
  },

  async getPublishedAnnouncements(req, res, next) {
    try {
      const list = await Announcement.findPublished();
      success(res, list);
    } catch (err) { next(err); }
  },

  async createAnnouncement(req, res, next) {
    try {
      const id = await Announcement.create({ ...req.body, created_by: req.user.id });
      success(res, { id }, '发布成功');
    } catch (err) { next(err); }
  },

  async updateAnnouncement(req, res, next) {
    try {
      const affected = await Announcement.update(req.params.id, req.body);
      if (!affected) return error(res, '更新失败', 404);
      success(res, null, '更新成功');
    } catch (err) { next(err); }
  },

  async deleteAnnouncement(req, res, next) {
    try {
      const affected = await Announcement.delete(req.params.id);
      if (!affected) return error(res, '删除失败', 404);
      success(res, null, '删除成功');
    } catch (err) { next(err); }
  },

  // ========== 文章 ==========
  async getArticleList(req, res, next) {
    try {
      const { page, pageSize, offset } = parsePagination(req.query);
      const { category, status, keyword } = req.query;
      const result = await Article.findAll({
        category, status, keyword: sanitizeSearch(keyword),
        page, pageSize, offset,
      });
      paginated(res, { ...result, page, pageSize });
    } catch (err) { next(err); }
  },

  async getPublishedArticles(req, res, next) {
    try {
      const { page, pageSize, offset } = parsePagination(req.query);
      const { category } = req.query;
      const result = await Article.findPublished({ category, page, pageSize, offset });
      paginated(res, { ...result, page, pageSize });
    } catch (err) { next(err); }
  },

  async getArticleDetail(req, res, next) {
    try {
      const article = await Article.findById(req.params.id);
      if (!article) return error(res, '文章不存在', 404);
      // 管理员打开（用于编辑回填）不计入浏览量
      if (!req.user || req.user.role !== 'admin') {
        await Article.incrementView(req.params.id);
      }
      success(res, article);
    } catch (err) { next(err); }
  },

  async createArticle(req, res, next) {
    try {
      if (req.file) req.body.cover_image = fileWebPath(req.file);
      const id = await Article.create({ ...req.body, created_by: req.user.id });
      success(res, { id }, '创建成功');
    } catch (err) { next(err); }
  },

  async updateArticle(req, res, next) {
    try {
      if (req.file) req.body.cover_image = fileWebPath(req.file);
      const affected = await Article.update(req.params.id, req.body);
      if (!affected) return error(res, '更新失败', 404);
      success(res, null, '更新成功');
    } catch (err) { next(err); }
  },

  async deleteArticle(req, res, next) {
    try {
      const affected = await Article.delete(req.params.id);
      if (!affected) return error(res, '删除失败', 404);
      success(res, null, '删除成功');
    } catch (err) { next(err); }
  },

  // ========== 轮播图 ==========
  async getBannerList(req, res, next) {
    try {
      const list = await Banner.findAll();
      success(res, list);
    } catch (err) { next(err); }
  },

  async getActiveBanners(req, res, next) {
    try {
      const list = await Banner.findActive();
      success(res, list);
    } catch (err) { next(err); }
  },

  async createBanner(req, res, next) {
    try {
      if (req.file) req.body.image_url = fileWebPath(req.file);
      const id = await Banner.create(req.body);
      success(res, { id }, '创建成功');
    } catch (err) { next(err); }
  },

  async updateBanner(req, res, next) {
    try {
      if (req.file) req.body.image_url = fileWebPath(req.file);
      const affected = await Banner.update(req.params.id, req.body);
      if (!affected) return error(res, '更新失败', 404);
      success(res, null, '更新成功');
    } catch (err) { next(err); }
  },

  async deleteBanner(req, res, next) {
    try {
      const affected = await Banner.delete(req.params.id);
      if (!affected) return error(res, '删除失败', 404);
      success(res, null, '删除成功');
    } catch (err) { next(err); }
  },
};

module.exports = contentController;
