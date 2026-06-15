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
router.get('/:id', animalController.getDetail);

// 管理员接口
router.post('/', authenticate, requireAdmin, upload.single('image'), animalController.create);
router.put('/:id', authenticate, requireAdmin, upload.single('image'), animalController.update);
router.delete('/:id', authenticate, requireAdmin, animalController.delete);

module.exports = router;
