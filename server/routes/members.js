const express = require('express');
const router = express.Router();
const db = require('../db');

// 获取会员列表
router.get('/', (req, res) => {
  const { keyword } = req.query;
  let sql = 'SELECT * FROM members WHERE 1=1';
  const params = [];
  if (keyword) {
    sql += ' AND (name LIKE ? OR phone LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  sql += ' ORDER BY id DESC';
  res.json(db.prepare(sql).all(...params));
});

// 新增会员
router.post('/', (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) return res.status(400).json({ error: '姓名和手机号不能为空' });
  try {
    const result = db.prepare('INSERT INTO members (name, phone) VALUES (?,?)').run(name, phone);
    res.json({ id: result.lastInsertRowid });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: '手机号已存在' });
    throw e;
  }
});

// 修改会员
router.put('/:id', (req, res) => {
  const { name, phone } = req.body;
  db.prepare('UPDATE members SET name=?, phone=? WHERE id=?').run(name, phone, req.params.id);
  res.json({ success: true });
});

// 删除会员
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM members WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
