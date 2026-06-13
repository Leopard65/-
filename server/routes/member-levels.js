const express = require('express');
const router = express.Router();
const db = require('../db');

// 获取所有会员等级
router.get('/', (req, res) => {
  try {
    const levels = db.prepare('SELECT * FROM member_levels ORDER BY min_spent ASC').all();
    res.json(levels);
  } catch (err) {
    console.error('获取会员等级失败:', err);
    res.status(500).json({ error: '获取会员等级失败' });
  }
});

// 新增会员等级
router.post('/', (req, res) => {
  try {
    const { name, min_spent, discount, points_rate } = req.body;
    if (!name) return res.status(400).json({ error: '等级名称不能为空' });

    const result = db.prepare(
      'INSERT INTO member_levels (name, min_spent, discount, points_rate) VALUES (?, ?, ?, ?)'
    ).run(name, min_spent || 0, discount || 1.0, points_rate || 1.0);

    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    console.error('新增会员等级失败:', err);
    res.status(500).json({ error: '新增会员等级失败' });
  }
});

// 修改会员等级
router.put('/:id', (req, res) => {
  try {
    const { name, min_spent, discount, points_rate } = req.body;
    db.prepare(
      'UPDATE member_levels SET name=?, min_spent=?, discount=?, points_rate=? WHERE id=?'
    ).run(name, min_spent, discount, points_rate, req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('修改会员等级失败:', err);
    res.status(500).json({ error: '修改会员等级失败' });
  }
});

// 删除会员等级
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM member_levels WHERE id=?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('删除会员等级失败:', err);
    res.status(500).json({ error: '删除会员等级失败' });
  }
});

module.exports = router;
