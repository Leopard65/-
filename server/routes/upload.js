const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/image', authMiddleware, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '请选择图片' });
  }

  const imageUrl = `/uploads/products/${req.file.filename}`;
  res.json({ url: imageUrl });
});

module.exports = router;
