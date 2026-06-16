<template>
  <div class="front-layout">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="header-inner">
        <router-link to="/" class="logo">
          <span class="logo-icon">🐾</span>
          <span class="logo-text">流浪动物救助中心</span>
        </router-link>

        <nav class="nav-menu">
          <router-link to="/">首页</router-link>
          <router-link to="/animals">待领养动物</router-link>
          <router-link to="/match">领养匹配</router-link>
          <router-link to="/rescue">救助求助</router-link>
          <router-link to="/articles">科普文章</router-link>
        </nav>

        <div class="header-right">
          <template v-if="userStore.isLoggedIn">
            <el-popover placement="bottom" :width="330" trigger="click" @show="loadNotifications">
              <template #reference>
                <el-badge :value="unreadCount" :hidden="unreadCount === 0" :max="99" class="noti-bell">
                  <span class="bell-icon">🔔</span>
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
            <el-button type="primary" @click="$router.push('/login')">登录</el-button>
            <el-button @click="$router.push('/register')">注册</el-button>
          </template>
        </div>
      </div>
    </header>

    <!-- 主内容 -->
    <main class="main-content">
      <router-view />
    </main>

    <!-- 底部 -->
    <footer class="footer">
      <p>© 2024 流浪动物救助与领养管理系统 | 让每个生命都被温柔以待</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import request from '@/utils/request'

const userStore = useUserStore()
const router = useRouter()

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
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: bold;
  color: #409eff;
}

.logo-icon {
  font-size: 24px;
}

.nav-menu {
  display: flex;
  gap: 32px;
}

.nav-menu a {
  color: #666;
  font-size: 15px;
  padding: 8px 0;
  border-bottom: 2px solid transparent;
  transition: all 0.3s;
}

.nav-menu a:hover,
.nav-menu a.router-link-active {
  color: #409eff;
  border-bottom-color: #409eff;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.noti-bell { cursor: pointer; }
.bell-icon { font-size: 20px; display: inline-block; line-height: 1; }
.noti-panel .noti-head { display: flex; justify-content: space-between; align-items: center; font-weight: bold; margin-bottom: 6px; }
.noti-empty { color: #999; text-align: center; padding: 20px 0; font-size: 13px; }
.noti-item { padding: 10px 8px; border-bottom: 1px solid #f0f0f0; cursor: pointer; border-radius: 4px; }
.noti-item:hover { background: #f5f7fa; }
.noti-item.unread { background: #ecf5ff33; }
.noti-row { display: flex; align-items: center; gap: 6px; }
.noti-dot { width: 7px; height: 7px; border-radius: 50%; background: #f56c6c; flex-shrink: 0; }
.noti-title { font-size: 14px; color: #303133; font-weight: 500; }
.noti-content { font-size: 12px; color: #909399; margin: 3px 0; line-height: 1.5; }
.noti-time { font-size: 11px; color: #c0c4cc; }

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.user-name {
  font-size: 14px;
  color: #333;
}

.main-content {
  flex: 1;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 20px;
}

.footer {
  background: #333;
  color: #999;
  text-align: center;
  padding: 20px;
  font-size: 13px;
}
</style>
