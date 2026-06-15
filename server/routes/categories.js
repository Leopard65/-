/**
 * 分类与品种路由
 */
const router = require('express').Router();
const { Category, Breed } = require('../models/Category');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const { success, error } = require('../utils/response');

// 获取所有分类
router.get('/', async (req, res, next) => {
  try {
    const list = await Category.findAll();
    success(res, list);
  } catch (err) { next(err); }
});

// 获取分类下的品种
router.get('/:id/breeds', async (req, res, next) => {
  try {
    const list = await Breed.findByCategoryId(req.params.id);
    success(res, list);
  } catch (err) { next(err); }
});

// 获取所有品种（含分类名）
router.get('/breeds/all', async (req, res, next) => {
  try {
    const list = await Breed.findAll();
    success(res, list);
  } catch (err) { next(err); }
});

// 管理员：创建分类
router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, sort_order } = req.body;
    if (!name) return error(res, '分类名称不能为空');
    const id = await Category.create(name, sort_order);
    success(res, { id }, '创建成功');
  } catch (err) { next(err); }
});

// 管理员：删除分类
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const affected = await Category.delete(req.params.id);
    if (!affected) return error(res, '删除失败', 404);
    success(res, null, '删除成功');
  } catch (err) { next(err); }
});

// 管理员：创建品种
router.post('/breeds', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { category_id, name } = req.body;
    if (!category_id || !name) return error(res, '分类和品种名称不能为空');
    const id = await Breed.create(category_id, name);
    success(res, { id }, '创建成功');
  } catch (err) { next(err); }
});

// 管理员：删除品种
router.delete('/breeds/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const affected = await Breed.delete(req.params.id);
    if (!affected) return error(res, '删除失败', 404);
    success(res, null, '删除成功');
  } catch (err) { next(err); }
});

module.exports = router;
