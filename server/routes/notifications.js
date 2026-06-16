/**
 * 站内通知路由
 */
const router = require('express').Router();
const ctrl = require('../controllers/notificationController');
const { authenticate } = require('../middlewares/auth');

router.get('/', authenticate, ctrl.list);
router.get('/unread-count', authenticate, ctrl.unreadCount);
router.put('/read-all', authenticate, ctrl.readAll);
router.put('/:id/read', authenticate, ctrl.read);

module.exports = router;
