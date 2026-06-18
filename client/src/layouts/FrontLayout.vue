<template>
  <div class="front-layout">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="header-inner">
        <router-link to="/" class="logo">
          <span class="logo-icon">🐾</span>
          <span class="logo-text">流浪动物救助中心</span>
        </router-link>

        <!-- 桌面导航 -->
        <nav class="nav-menu">
          <router-link v-for="link in navLinks" :key="link.to" :to="link.to">
            {{ link.label }}
          </router-link>
        </nav>

        <div class="header-right">
          <el-icon class="theme-btn" :title="isDark ? '切换到浅色' : '切换到深色'" @click="toggleTheme">
            <Moon v-if="!isDark" />
            <Sunny v-else />
          </el-icon>
          <template v-if="userStore.isLoggedIn">
            <el-popover placement="bottom" :width="330" trigger="click" @show="loadNotifications">
              <template #reference>
                <el-badge :value="unreadCount" :hidden="unreadCount === 0" :max="99" class="noti-bell">
                  <el-icon class="bell-icon"><Bell /></el-icon>
                </el-badge>
              </template>
              <div class="noti-panel">
                <div class="noti-head">
                  <span>通知中心</span>
                  <el-button text type="primary" size="small" :disabled="unreadCount === 0" @click="markAll">全部已读</el-button>
                </div>
                <el-scrollbar max-height="320px">
                  <div v-if="notifications.length === 0" class="noti-empty">暂无通知</div>
                  <div
                    v-for="n in notifications"
                    :key="n.id"
                    class="noti-item"
                    :class="{ unread: !n.is_read }"
                    @click="openNoti(n)"
                  >
                    <div class="noti-row">
                      <span v-if="!n.is_read" class="noti-dot"></span>
                      <span class="noti-title">{{ n.title }}</span>
                    </div>
                    <div class="noti-content">{{ n.content }}</div>
                    <div class="noti-time">{{ (n.created_at || '').slice(5, 16) }}</div>
                  </div>
                </el-scrollbar>
              </div>
            </el-popover>
            <el-dropdown trigger="click">
              <span class="user-info">
                <el-avatar :size="32" :src="userStore.userInfo?.avatar || ''">
                  {{ userStore.userInfo?.nickname?.[0] || 'U' }}
                </el-avatar>
                <span class="user-name">{{ userStore.userInfo?.nickname || userStore.userInfo?.username }}</span>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="$router.push('/adopt/mine')">我的申请</el-dropdown-item>
                  <el-dropdown-item v-if="userStore.isAdmin" @click="$router.push('/admin')">后台管理</el-dropdown-item>
                  <el-dropdown-item divided @click="handleLogout">退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
          <template v-else>
            <el-button type="primary" round @click="$router.push('/login')">登录</el-button>
            <el-button class="hide-mobile" round @click="$router.push('/register')">注册</el-button>
          </template>

          <!-- 移动端菜单按钮 -->
          <el-icon class="menu-btn" @click="mobileNavOpen = true"><Menu /></el-icon>
        </div>
      </div>
    </header>

    <!-- 移动端抽屉导航 -->
    <el-drawer v-model="mobileNavOpen" direction="ltr" size="72%" :with-header="false">
      <div class="drawer-nav">
        <div class="drawer-brand">
          <span class="logo-icon">🐾</span> 流浪动物救助中心
        </div>
        <router-link
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="drawer-link"
          @click="mobileNavOpen = false"
        >
          {{ link.label }}
        </router-link>
      </div>
    </el-drawer>

    <!-- 主内容 -->
    <main class="main-content">
      <router-view />
    </main>

    <!-- 底部 -->
    <footer class="footer">
      <div class="footer-inner">
        <div class="footer-brand">
          <div class="footer-logo"><span>🐾</span> 流浪动物救助中心</div>
          <p>让每个生命都被温柔以待。<br />科学救助 · 透明领养 · 用心陪伴。</p>
        </div>
        <div class="footer-col">
          <h4>快速链接</h4>
          <router-link to="/animals">待领养动物</router-link>
          <router-link to="/match">领养匹配</router-link>
          <router-link to="/articles">科普文章</router-link>
        </div>
        <div class="footer-col">
          <h4>需要帮助</h4>
          <router-link to="/rescue">提交救助信息</router-link>
          <span class="footer-text">救助热线：400-000-0000</span>
          <span class="footer-text">服务时间：9:00 - 18:00</span>
        </div>
      </div>
      <div class="footer-bottom">
        © 2024-2026 流浪动物救助与领养管理系统 · 仅供学习与演示使用
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import request from '@/utils/request'
import { useTheme } from '@/composables/useTheme'

const userStore = useUserStore()
const router = useRouter()
const { isDark, toggleTheme } = useTheme()

const navLinks = [
  { to: '/', label: '首页' },
  { to: '/animals', label: '待领养动物' },
  { to: '/match', label: '领养匹配' },
  { to: '/rescue', label: '救助求助' },
  { to: '/articles', label: '科普文章' },
]
const mobileNavOpen = ref(false)

function handleLogout() {
  userStore.logout()
  router.push('/')
}

// ===== 站内通知 =====
const unreadCount = ref(0)
const notifications = ref([])
let timer = null

async function loadUnread() {
  if (!userStore.isLoggedIn) return
  try {
    const res = await request.get('/notifications/unread-count')
    unreadCount.value = res.data?.count || 0
  } catch { /* 忽略 */ }
}

async function loadNotifications() {
  try {
    const res = await request.get('/notifications', { params: { page: 1, pageSize: 10 } })
    notifications.value = res.data?.list || []
  } catch { /* 忽略 */ }
}

async function markAll() {
  await request.put('/notifications/read-all')
  notifications.value = notifications.value.map((n) => ({ ...n, is_read: 1 }))
  unreadCount.value = 0
}

async function openNoti(n) {
  if (!n.is_read) {
    try {
      await request.put(`/notifications/${n.id}/read`)
      n.is_read = 1
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    } catch { /* 忽略 */ }
  }
  if (n.type === 'adoption' || n.type === 'followup') router.push('/adopt/mine')
}

onMounted(() => {
  loadUnread()
  timer = setInterval(loadUnread, 60000)
})
onUnmounted(() => { if (timer) clearInterval(timer) })
</script>

<style scoped>
.front-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  background: var(--bg-header);
  backdrop-filter: saturate(180%) blur(8px);
  border-bottom: 1px solid var(--border-light);
  box-shadow: var(--shadow-sm);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-inner {
  max-width: var(--page-max);
  margin: 0 auto;
  padding: 0 20px;
  height: var(--header-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 700;
  color: var(--brand);
  white-space: nowrap;
}
.logo-icon {
  font-size: 24px;
}

.nav-menu {
  display: flex;
  gap: 30px;
  flex: 1;
  justify-content: center;
}
.nav-menu a {
  color: var(--text-regular);
  font-size: 15px;
  padding: 6px 0;
  border-bottom: 2px solid transparent;
  transition: color 0.25s, border-color 0.25s;
}
.nav-menu a:hover,
.nav-menu a.router-link-active {
  color: var(--brand);
  border-bottom-color: var(--brand);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.noti-bell { cursor: pointer; }
.bell-icon { font-size: 20px; color: var(--text-regular); }
.noti-panel .noti-head { display: flex; justify-content: space-between; align-items: center; font-weight: bold; margin-bottom: 6px; }
.noti-empty { color: var(--text-secondary); text-align: center; padding: 20px 0; font-size: 13px; }
.noti-item { padding: 10px 8px; border-bottom: 1px solid var(--border-light); cursor: pointer; border-radius: 4px; }
.noti-item:hover { background: var(--brand-lighter); }
.noti-item.unread { background: var(--brand-light); }
.noti-row { display: flex; align-items: center; gap: 6px; }
.noti-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--danger); flex-shrink: 0; }
.noti-title { font-size: 14px; color: var(--text-main); font-weight: 500; }
.noti-content { font-size: 12px; color: var(--text-secondary); margin: 3px 0; line-height: 1.5; }
.noti-time { font-size: 11px; color: var(--text-placeholder); }

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.user-name {
  font-size: 14px;
  color: var(--text-main);
}

.menu-btn {
  display: none;
  font-size: 24px;
  color: var(--text-regular);
  cursor: pointer;
}
.theme-btn {
  font-size: 19px;
  color: var(--text-regular);
  cursor: pointer;
}
.theme-btn:hover {
  color: var(--brand);
}

/* 移动端抽屉 */
.drawer-nav {
  display: flex;
  flex-direction: column;
  padding: 8px 4px;
}
.drawer-brand {
  font-size: 17px;
  font-weight: 700;
  color: var(--brand);
  padding: 8px 12px 16px;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 8px;
}
.drawer-link {
  padding: 14px 12px;
  font-size: 16px;
  color: var(--text-main);
  border-radius: 8px;
}
.drawer-link.router-link-active {
  color: var(--brand);
  background: var(--brand-light);
}

.main-content {
  flex: 1;
  max-width: var(--page-max);
  width: 100%;
  margin: 0 auto;
  padding: 24px 20px 40px;
}

/* 底部 */
.footer {
  background: #2a2622;
  color: #b9b2a8;
  margin-top: 40px;
}
.footer-inner {
  max-width: var(--page-max);
  margin: 0 auto;
  padding: 40px 20px 28px;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 32px;
}
.footer-logo {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 12px;
}
.footer-brand p {
  font-size: 13px;
  line-height: 1.8;
}
.footer-col h4 {
  color: #fff;
  font-size: 15px;
  margin-bottom: 14px;
}
.footer-col a,
.footer-col .footer-text {
  display: block;
  font-size: 13px;
  color: #b9b2a8;
  margin-bottom: 10px;
  transition: color 0.2s;
}
.footer-col a:hover {
  color: var(--brand);
}
.footer-bottom {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  text-align: center;
  padding: 16px;
  font-size: 12px;
  color: #7d766c;
}

@media (max-width: 768px) {
  .nav-menu,
  .hide-mobile,
  .user-name {
    display: none;
  }
  .menu-btn {
    display: inline-flex;
  }
  .main-content {
    padding: 16px 14px 32px;
  }
  .footer-inner {
    grid-template-columns: 1fr;
    gap: 24px;
    padding: 28px 20px 20px;
  }
}
</style>
