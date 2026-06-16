/**
 * 动物管理控制器
 */
const Animal = require('../models/Animal');
const { success, paginated, error } = require('../utils/response');
const { parsePagination, sanitizeSearch } = require('../utils/validator');
const { fileWebPath } = require('../utils/file');
const { scoreAnimal } = require('../utils/match');
const AnimalEvent = require('../models/AnimalEvent');

const animalController = {
  // 获取动物列表（前台 + 后台通用）
  async getList(req, res, next) {
    try {
      const { page, pageSize, offset } = parsePagination(req.query);
      const { keyword, category_id, status, gender } = req.query;
      const result = await Animal.findAll({
        keyword: sanitizeSearch(keyword),
        category_id,
        status,
        gender,
        page, pageSize, offset,
      });
      paginated(res, { ...result, page, pageSize });
    } catch (err) {
      next(err);
    }
  },

  // 获取动物详情
  async getDetail(req, res, next) {
    try {
      const animal = await Animal.findById(req.params.id);
      if (!animal) return error(res, '动物信息不存在', 404);
      success(res, animal);
    } catch (err) {
      next(err);
    }
  },

  // 创建动物记录（管理员）
  async create(req, res, next) {
    try {
      const data = req.body;
      data.created_by = req.user.id;
      if (req.file) {
        data.image_url = fileWebPath(req.file);
      }
      const id = await Animal.create(data);
      success(res, { id }, '录入成功');
    } catch (err) {
      next(err);
    }
  },

  // 更新动物信息（管理员）
  async update(req, res, next) {
    try {
      const data = req.body;
      if (req.file) {
        data.image_url = fileWebPath(req.file);
      }
      const affected = await Animal.update(req.params.id, data);
      if (!affected) return error(res, '更新失败，记录不存在', 404);
      success(res, null, '更新成功');
    } catch (err) {
      next(err);
    }
  },

  // 删除动物记录（管理员）
  async delete(req, res, next) {
    try {
      const affected = await Animal.delete(req.params.id);
      if (!affected) return error(res, '删除失败，记录不存在', 404);
      success(res, null, '删除成功');
    } catch (err) {
      next(err);
    }
  },

  // 获取统计数据
  async getStats(req, res, next) {
    try {
      const stats = await Animal.getStats();
      success(res, stats);
    } catch (err) {
      next(err);
    }
  },

  // 智能领养匹配推荐（根据偏好为可领养动物打分排序）
  async recommend(req, res, next) {
    try {
      const prefs = req.body || {};
      const { list } = await Animal.findAll({ status: 'available', page: 1, pageSize: 100, offset: 0 });
      const scored = list
        .map((a) => {
          const { score, reasons } = scoreAnimal(a, prefs);
          return { ...a, matchScore: score, matchReasons: reasons };
        })
        .sort((x, y) => y.matchScore - x.matchScore);
      success(res, scored);
    } catch (err) {
      next(err);
    }
  },

  // ===== 动物档案事件（生命周期时间线）=====

  // 查看某动物的档案事件（公开）
  async listEvents(req, res, next) {
    try {
      const list = await AnimalEvent.findByAnimal(req.params.id);
      success(res, list);
    } catch (err) {
      next(err);
    }
  },

  // 新增档案事件（管理员）
  async addEvent(req, res, next) {
    try {
      const { event_type, event_date, title, description } = req.body;
      if (!event_date || !title) return error(res, '事件日期和标题不能为空');
      const animal = await Animal.findById(req.params.id);
      if (!animal) return error(res, '动物信息不存在', 404);
      const id = await AnimalEvent.create({
        animal_id: req.params.id,
        event_type, event_date, title, description,
        created_by: req.user.id,
      });
      success(res, { id }, '档案事件已添加');
    } catch (err) {
      next(err);
    }
  },

  // 删除档案事件（管理员）
  async deleteEvent(req, res, next) {
    try {
      const ev = await AnimalEvent.findById(req.params.eid);
      if (!ev || String(ev.animal_id) !== String(req.params.id)) {
        return error(res, '事件不存在', 404);
      }
      await AnimalEvent.delete(req.params.eid);
      success(res, null, '删除成功');
    } catch (err) {
      next(err);
    }
  },

  // ===== 动物相册（多图）=====

  // 追加相册图片（管理员，多文件）
  async addImages(req, res, next) {
    try {
      const animal = await Animal.findById(req.params.id);
      if (!animal) return error(res, '动物信息不存在', 404);
      const updated = Animal.parseImages(animal.images).concat((req.files || []).map(fileWebPath));
      await Animal.setImages(req.params.id, updated);
      success(res, updated, '图片已上传');
    } catch (err) {
      next(err);
    }
  },

  // 删除相册中的某张图片（管理员）
  async deleteImage(req, res, next) {
    try {
      const animal = await Animal.findById(req.params.id);
      if (!animal) return error(res, '动物信息不存在', 404);
      const updated = Animal.parseImages(animal.images).filter((u) => u !== req.body.url);
      await Animal.setImages(req.params.id, updated);
      success(res, updated, '图片已删除');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = animalController;
