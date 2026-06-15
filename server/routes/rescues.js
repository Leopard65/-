/**
 * 救助求助路由
 */
const router = require('express').Router();
const rescueController = require('../controllers/rescueController');
const { authenticate, requireAdmin, optionalAuth } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.post('/', optionalAuth, upload.single('image'), rescueController.create);
router.get('/', authenticate, requireAdmin, rescueController.getAll);
router.get('/:id', rescueController.getDetail);
router.put('/:id/status', authenticate, requireAdmin, rescueController.updateStatus);

module.exports = router;
