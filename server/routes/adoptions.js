/**
 * 领养管理路由
 */
const router = require('express').Router();
const adoptionController = require('../controllers/adoptionController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

// 用户接口
router.post('/apply', authenticate, adoptionController.apply);
router.get('/mine', authenticate, adoptionController.getMyApplications);
router.get('/:id', authenticate, adoptionController.getDetail);

// 领养回访
router.get('/:id/followups', authenticate, adoptionController.listFollowups);
router.post('/:id/followups', authenticate, requireAdmin, adoptionController.addFollowup);
router.delete('/:id/followups/:fid', authenticate, requireAdmin, adoptionController.deleteFollowup);

// 管理员接口
router.get('/', authenticate, requireAdmin, adoptionController.getAll);
router.put('/:id/review', authenticate, requireAdmin, adoptionController.review);

module.exports = router;
