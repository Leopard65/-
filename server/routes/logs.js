const express = require('express');
const router = express.Router();
const { getOperationLogs } = require('../utils/logger');

// 获取操作日志（支持分页和筛选）
router.get('/', (req, res) => {
  try {
    const { page, pageSize, username, action, module, start_date, end_date } = req.query;
    const result = getOperationLogs({
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
      username,
      action,
      module,
      startDate: start_date,
      endDate: end_date
    });

    res.json(result);
  } catch (err) {
    console.error('获取操作日志失败:', err);
    res.status(500).json({ error: '获取操作日志失败' });
  }
});

module.exports = router;
