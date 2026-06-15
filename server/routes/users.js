/**
 * 用户管理路由（管理员）
 */
const router = require('express').Router();
const userController = require('../controllers/userController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

router.get('/', authenticate, requireAdmin, userController.getList);
router.get('/:id', authenticate, requireAdmin, userController.getDetail);
router.put('/:id/status', authenticate, requireAdmin, userController.updateStatus);

module.exports = router;
