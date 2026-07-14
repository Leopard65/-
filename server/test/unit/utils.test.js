/**
 * 纯函数工具单元测试
 *
 * 使用 Node.js 内置测试运行器（node:test + node:assert），无需任何第三方依赖。
 * 运行：node --test test/unit   或   npm test
 *
 * 这些工具函数不依赖数据库/网络，在任意机器上都能稳定运行。
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const { maskPhone } = require('../../utils/mask');
const { parsePagination, sanitizeSearch } = require('../../utils/validator');
const { scoreAnimal } = require('../../utils/match');
const { fileWebPath } = require('../../utils/file');

test('maskPhone - 标准 11 位手机号保留前 3 后 4', () => {
  assert.equal(maskPhone('13912341111'), '139****1111');
});

test('maskPhone - 空值返回空字符串', () => {
  assert.equal(maskPhone(''), '');
  assert.equal(maskPhone(null), '');
  assert.equal(maskPhone(undefined), '');
});

test('maskPhone - 数字类型入参也能处理', () => {
  assert.equal(maskPhone(13912341111), '139****1111');
});

test('maskPhone - 短号（<7 位）逐位打码但保留最后一位', () => {
  // 长度 6："123456" -> 除最后一位外全部替换为 *
  assert.equal(maskPhone('123456'), '*****6');
});

test('parsePagination - 默认值 page=1 pageSize=10 offset=0', () => {
  assert.deepEqual(parsePagination({}), { page: 1, pageSize: 10, offset: 0 });
});

test('parsePagination - 正常翻页计算 offset', () => {
  assert.deepEqual(parsePagination({ page: '3', pageSize: '20' }), {
    page: 3,
    pageSize: 20,
    offset: 40,
  });
});

test('parsePagination - page 下限保护为 1', () => {
  assert.deepEqual(parsePagination({ page: '0' }), { page: 1, pageSize: 10, offset: 0 });
  assert.deepEqual(parsePagination({ page: '-5' }), { page: 1, pageSize: 10, offset: 0 });
});

test('parsePagination - pageSize 上限截断为 100', () => {
  const r = parsePagination({ pageSize: '999' });
  assert.equal(r.pageSize, 100);
});

test('parsePagination - pageSize 下限保护为 1（负数被夹回 1）', () => {
  // 注意：parseInt('0')||10 会回退成 10，只有负数能触发 Math.max(1, n) 下限
  assert.equal(parsePagination({ pageSize: '-5' }).pageSize, 1);
});

test('parsePagination - 非法字符串回退默认值', () => {
  assert.deepEqual(parsePagination({ page: 'abc', pageSize: 'xyz' }), {
    page: 1,
    pageSize: 10,
    offset: 0,
  });
});

test('sanitizeSearch - 空值返回空字符串', () => {
  assert.equal(sanitizeSearch(''), '');
  assert.equal(sanitizeSearch(null), '');
  assert.equal(sanitizeSearch(undefined), '');
});

test('sanitizeSearch - 去除首尾空白', () => {
  assert.equal(sanitizeSearch('  小猫  '), '小猫');
});

test('sanitizeSearch - 转义 LIKE 通配符 % 和 _', () => {
  assert.equal(sanitizeSearch('50%_off'), '50\\%\\_off');
});

test('scoreAnimal - 返回结构包含 score 与 reasons', () => {
  const { score, reasons } = scoreAnimal({ category_id: 1 }, {});
  assert.equal(typeof score, 'number');
  assert.ok(Array.isArray(reasons));
});

test('scoreAnimal - 分数被夹在 10-100 之间', () => {
  const high = scoreAnimal(
    { category_id: 2, weight: 20, is_vaccinated: 1, is_sterilized: 1, personality: '亲人 温顺' },
    { category_id: 2, housing_type: '自有', has_experience: 'yes', activity: 'high', personality: ['亲人', '温顺'] }
  );
  assert.ok(high.score <= 100, '分数不应超过 100');
  assert.ok(high.score >= 10, '分数不应低于 10');

  const low = scoreAnimal({ category_id: 2, weight: 30 }, { housing_type: '租房', has_experience: 'no' });
  assert.ok(low.score >= 10, '分数不应低于 10');
});

test('scoreAnimal - 类型偏好命中会加分并给出理由', () => {
  const matched = scoreAnimal({ category_id: 1 }, { category_id: 1 });
  const unmatched = scoreAnimal({ category_id: 1 }, { category_id: 2 });
  assert.ok(matched.score > unmatched.score);
  assert.ok(matched.reasons.includes('符合你偏好的动物类型'));
});

test('scoreAnimal - 已接种且已绝育给出健康加成理由', () => {
  const { reasons } = scoreAnimal(
    { category_id: 1, is_vaccinated: 1, is_sterilized: 1 },
    {}
  );
  assert.ok(reasons.some((r) => r.includes('已接种、已绝育')));
});

test('fileWebPath - 无文件返回空字符串', () => {
  assert.equal(fileWebPath(undefined), '');
  assert.equal(fileWebPath({}), '');
  assert.equal(fileWebPath({ filename: 'x.jpg' }), '', '缺少 path 时应返回空');
});

test('fileWebPath - 生成 /uploads 前缀且使用正斜杠', () => {
  const path = require('path');
  const config = require('../../config');
  const abs = path.join(path.resolve(config.uploadDir), '2026-06-16', '170000-123.jpg');
  const web = fileWebPath({ path: abs });
  assert.equal(web, '/uploads/2026-06-16/170000-123.jpg');
  assert.ok(!web.includes('\\'), 'Web 路径不应包含反斜杠');
});
