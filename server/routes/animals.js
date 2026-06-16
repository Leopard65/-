/**
 * 动物信息路由
 */
const router = require('express').Router();
const animalController = require('../controllers/animalController');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

// 公开接口
router.get('/', animalController.getList);
router.get('/stats', animalController.getStats);
router.post('/recommend', animalController.recommend);
router.get('/:id', animalController.getDetail);
router.get('/:id/events', animalController.listEvents);

// 管理员接口
router.post('/', authenticate, requireAdmin, upload.single('image'), animalController.create);
router.put('/:id', authenticate, requireAdmin, upload.single('image'), animalController.update);
router.delete('/:id', authenticate, requireAdmin, animalController.delete);

// 动物档案事件（管理员录入 / 删除）
router.post('/:id/events', authenticate, requireAdmin, animalController.addEvent);
router.delete('/:id/events/:eid', authenticate, requireAdmin, animalController.deleteEvent);

// 动物相册（管理员追加 / 删除多图）
router.post('/:id/images', authenticate, requireAdmin, upload.array('images', 8), animalController.addImages);
router.delete('/:id/images', authenticate, requireAdmin, animalController.deleteImage);

module.exports = router;
