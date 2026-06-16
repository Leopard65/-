/**
 * 本地存储安全读写工具
 *
 * 直接对 localStorage 里的 user 执行 JSON.parse，在脏数据情况下（例如字符串
 * "undefined"、半截 JSON）会抛出 SyntaxError。由于路由守卫和 user store 初始化
 * 阶段都会读取它，一旦抛错会中断应用挂载，导致整页白屏。此处统一做容错解析，
 * 并在发现脏数据时自动清除，保证页面始终能正常显示。
 */

export function getStoredUser() {
  const raw = localStorage.getItem('user')
  if (!raw || raw === 'undefined' || raw === 'null') return null
  try {
    return JSON.parse(raw)
  } catch {
    localStorage.removeItem('user')
    return null
  }
}

export function setStoredUser(user) {
  if (user === undefined || user === null) {
    localStorage.removeItem('user')
  } else {
    localStorage.setItem('user', JSON.stringify(user))
  }
}
