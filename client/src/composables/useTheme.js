/**
 * 明暗主题切换（持久化到 localStorage，作用于 <html> 的 .dark class）
 * Element Plus 暗色变量 + 本项目 theme.css 中的 html.dark token 覆盖共同生效。
 */
import { ref } from 'vue'

const KEY = 'theme'
const isDark = ref(false)

function applyTheme(dark) {
  isDark.value = dark
  document.documentElement.classList.toggle('dark', dark)
}

// 应用启动时调用（在 mount 前），避免主题闪烁
export function initTheme() {
  applyTheme(localStorage.getItem(KEY) === 'dark')
}

export function useTheme() {
  function toggleTheme() {
    const next = !isDark.value
    applyTheme(next)
    localStorage.setItem(KEY, next ? 'dark' : 'light')
  }
  return { isDark, toggleTheme }
}
