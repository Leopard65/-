const express = require('express');
const router = express.Router();
const db = require('../db');
const { logOperation } = require('../utils/logger');

// 获取所有分类
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM categories WHERE status != -1 ORDER BY id').all();
    res.json(rows);
  } catch (err) {
    console.error('获取分类列表失败:', err);
    res.status(500).json({ error: '获取分类列表失败' });
  }
});

// 新增分类
router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: '分类名称不能为空' });
  try {
    const result = db.prepare('INSERT INTO categories (name) VALUES (?)').run(name);

    // 记录操作日志
    logOperation({
      userId: req.user?.id,
      username: req.user?.username,
      action: 'create',
      module: 'categories',
      targetId: result.lastInsertRowid,
      detail: { name },
      ip: req.ip
    });

    res.json({ id: result.lastInsertRowid, name });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: '分类名称已存在' });
    console.error('新增分类失败:', e);
    res.status(500).json({ error: '新增分类失败' });
  }
});

// 修改分类
router.put('/:id', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: '分类名称不能为空' });
  try {
    // 获取修改前的数据用于日志
    const oldCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
    if (!oldCategory) {
      return res.status(404).json({ error: '分类不存在' });
    }

    db.prepare('UPDATE categories SET name=? WHERE id=?').run(name, req.params.id);

    // 记录操作日志
    logOperation({
      userId: req.user?.id,
      username: req.user?.username,
      action: 'update',
      module: 'categories',
      targetId: req.params.id,
      detail: { name: { old: oldCategory.name, new: name } },
      ip: req.ip
    });

    res.json({ success: true });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: '分类名称已存在' });
    console.error('修改分类失败:', e);
    res.status(500).json({ error: '修改分类失败' });
  }
});

// 删除分类（软删除）
router.delete('/:id', (req, res) => {
  try {
    const category = db.prepare('SELECT name FROM categories WHERE id = ?').get(req.params.id);
    if (!category) {
      return res.status(404).json({ error: '分类不存在' });
    }

    const count = db.prepare('SELECT COUNT(*) as c FROM products WHERE category_id=? AND status != -1').get(req.params.id).c;
    if (count > 0) return res.status(400).json({ error: '该分类下有商品，无法删除' });

    db.prepare('UPDATE categories SET status = -1 WHERE id=?').run(req.params.id);

    // 记录操作日志
    logOperation({
      userId: req.user?.id,
      username: req.user?.username,
      action: 'delete',
      module: 'categories',
      targetId: req.params.id,
      detail: { name: category.name },
      ip: req.ip
    });

    res.json({ success: true });
  } catch (err) {
    console.error('删除分类失败:', err);
    res.status(500).json({ error: '删除分类失败' });
  }
});

module.exports = router;
