/**
 * 领养管理路由
 */
const router = require('express').Router();
const adoptionController = require('../controllers/adoptionController');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

// 用户接口
router.post('/apply', authenticate, adoptionController.apply);
router.get('/mine', authenticate, adoptionController.getMyApplications);
// 管理员：回访提醒 / 趋势统计（需在 /:id 之前注册，避免被参数路由捕获）
router.get('/followup-reminders', authenticate, requireAdmin, adoptionController.getFollowupReminders);
router.get('/stats/trend', authenticate, requireAdmin, adoptionController.getTrend);
router.get('/:id', authenticate, adoptionController.getDetail);

// 领养回访
router.get('/:id/followups', authenticate, adoptionController.listFollowups);
router.post('/:id/followups', authenticate, requireAdmin, upload.array('photos', 6), adoptionController.addFollowup);
router.delete('/:id/followups/:fid', authenticate, requireAdmin, adoptionController.deleteFollowup);

// 管理员接口
router.get('/', authenticate, requireAdmin, adoptionController.getAll);
router.put('/:id/review', authenticate, requireAdmin, adoptionController.review);

module.exports = router;
