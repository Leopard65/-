/**
 * 救助求助路由
 */
const router = require('express').Router();
const rescueController = require('../controllers/rescueController');
const { authenticate, requireAdmin, optionalAuth } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.post('/', optionalAuth, upload.single('image'), rescueController.create);
router.get('/', authenticate, requireAdmin, rescueController.getAll);
router.get('/stats/urgency', authenticate, requireAdmin, rescueController.getUrgencyStats);
router.get('/:id', optionalAuth, rescueController.getDetail);
router.put('/:id/status', authenticate, requireAdmin, rescueController.updateStatus);
// 救助处理日志（进度时间线）
router.get('/:id/logs', authenticate, requireAdmin, rescueController.listLogs);
router.post('/:id/logs', authenticate, requireAdmin, rescueController.addNote);

module.exports = router;
