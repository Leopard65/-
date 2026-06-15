/**
 * 内容管理路由（公告、文章、轮播图）
 */
const router = require('express').Router();
const contentController = require('../controllers/contentController');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

// ===== 公告 =====
router.get('/announcements', contentController.getPublishedAnnouncements);
router.get('/announcements/all', authenticate, requireAdmin, contentController.getAnnouncementList);
router.post('/announcements', authenticate, requireAdmin, contentController.createAnnouncement);
router.put('/announcements/:id', authenticate, requireAdmin, contentController.updateAnnouncement);
router.delete('/announcements/:id', authenticate, requireAdmin, contentController.deleteAnnouncement);

// ===== 文章 =====
router.get('/articles', contentController.getPublishedArticles);
router.get('/articles/all', authenticate, requireAdmin, contentController.getArticleList);
router.get('/articles/:id', contentController.getArticleDetail);
router.post('/articles', authenticate, requireAdmin, upload.single('cover'), contentController.createArticle);
router.put('/articles/:id', authenticate, requireAdmin, upload.single('cover'), contentController.updateArticle);
router.delete('/articles/:id', authenticate, requireAdmin, contentController.deleteArticle);

// ===== 轮播图 =====
router.get('/banners', contentController.getActiveBanners);
router.get('/banners/all', authenticate, requireAdmin, contentController.getBannerList);
router.post('/banners', authenticate, requireAdmin, upload.single('image'), contentController.createBanner);
router.put('/banners/:id', authenticate, requireAdmin, upload.single('image'), contentController.updateBanner);
router.delete('/banners/:id', authenticate, requireAdmin, contentController.deleteBanner);

module.exports = router;
