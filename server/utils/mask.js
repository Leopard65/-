/**
 * 敏感信息脱敏工具
 */

// 手机号脱敏：138****1111
function maskPhone(phone) {
  if (!phone) return '';
  const s = String(phone);
  if (s.length < 7) return s.replace(/.(?=.)/g, '*');
  return s.slice(0, 3) + '****' + s.slice(-4);
}

module.exports = { maskPhone };
