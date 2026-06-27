<template>
  <div class="admin-layout">
    <!-- 侧边栏 -->
    <aside class="sidebar" :class="{ collapsed: isCollapsed }">
      <div class="sidebar-header">
        <span class="sidebar-logo" aria-hidden="true">
          <el-icon><FirstAidKit /></el-icon>
        </span>
        <span v-if="!isCollapsed" class="sidebar-title">救助管理后台</span>
      </div>

      <el-menu
        :default-active="$route.path"
        router
        :collapse="isCollapsed"
        background-color="#1e3a33"
        text-color="#b3c2bc"
        active-text-color="#5fd0b6"
      >
        <el-menu-item index="/admin">
          <el-icon><DataBoard /></el-icon>
          <span>数据看板</span>
        </el-menu-item>

        <el-sub-menu index="animal-mgmt">
          <template #title>
            <el-icon><Promotion /></el-icon>
            <span>动物管理</span>
          </template>
          <el-menu-item index="/admin/animals">动物列表</el-menu-item>
          <el-menu-item index="/admin/animals/add">录入动物</el-menu-item>
          <el-menu-item index="/admin/categories">分类管理</el-menu-item>
        </el-sub-menu>

        <el-menu-item index="/admin/adoptions">
          <el-icon><Document /></el-icon>
          <span>领养管理</span>
        </el-menu-item>

        <el-menu-item index="/admin/rescues">
          <el-icon><FirstAidKit /></el-icon>
          <span>救助管理</span>
        </el-menu-item>

        <el-menu-item index="/admin/users">
          <el-icon><User /></el-icon>
          <span>用户管理</span>
        </el-menu-item>

        <el-sub-menu index="content-mgmt">
          <template #title>
            <el-icon><Notebook /></el-icon>
            <span>内容管理</span>
          </template>
          <el-menu-item index="/admin/announcements">公告管理</el-menu-item>
          <el-menu-item index="/admin/articles">文章管理</el-menu-item>
          <el-menu-item index="/admin/banners">轮播图管理</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </aside>

    <!-- 右侧主区域 -->
    <div class="main-area">
      <!-- 顶部栏 -->
      <header class="admin-header">
        <div class="header-left">
          <button
            class="icon-btn collapse-btn"
            type="button"
            :aria-label="isCollapsed ? '展开侧边栏' : '收起侧边栏'"
            @click="toggleSidebar"
          >
            <el-icon>
              <Fold v-if="!isCollapsed" />
              <Expand v-else />
            </el-icon>
          </button>
          <el-breadcrumb :separator-icon="ArrowRight" class="crumb">
            <el-breadcrumb-item>后台管理</el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <button
            class="icon-btn theme-btn"
            type="button"
            :title="isDark ? '切换到浅色' : '切换到深色'"
            :aria-label="isDark ? '切换到浅色' : '切换到深色'"
            @click="toggleTheme"
          >
            <el-icon>
              <Moon v-if="!isDark" />
              <Sunny v-else />
            </el-icon>
          </button>
          <el-button text class="front-link" @click="$router.push('/')">
            <el-icon class="front-link__icon"><Back /></el-icon>
            <span class="front-link__text">返回前台</span>
          </el-button>
          <el-dropdown trigger="click">
            <span class="admin-user">
              <el-avatar :size="28">{{ (userStore.userInfo?.nickname || 'A')[0] }}</el-avatar>
              <span class="admin-name">{{ userStore.userInfo?.nickname || '管理员' }}</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleLogout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <!-- 页面内容 -->
      <main class="admin-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { shallowRef, computed, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useRouter, useRoute } from 'vue-router'
import {
  DataBoard, Promotion, Document, FirstAidKit, User, Notebook,
  Fold, Expand, ArrowDown, ArrowRight, Back, Moon, Sunny,
} from '@element-plus/icons-vue'
import { useTheme } from '@/composables/useTheme'

const userStore = useUserStore()
const router = useRouter()
const route = useRoute()
const isCollapsed = shallowRef(false)
const { isDark, toggleTheme } = useTheme()

const currentTitle = computed(() => route.meta?.title || '数据看板')

function toggleSidebar() {
  isCollapsed.value = !isCollapsed.value
}

function handleLogout() {
  userStore.logout()
  router.push('/')
}

// 窄屏自动折叠侧边栏
function handleResize() {
  isCollapsed.value = window.innerWidth < 992
}
onMounted(() => {
  handleResize()
  window.addEventListener('resize', handleResize)
})
onUnmounted(() => window.removeEventListener('resize', handleResize))
</script>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(47, 158, 135, 0.10), transparent 34%),
    var(--bg-page);
}

.sidebar {
  width: 228px;
  background:
    linear-gradient(180deg, rgba(21, 64, 55, 0.96), rgba(24, 48, 43, 0.98)),
    #1e3a33;
  transition: width var(--dur) var(--ease);
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 12px 0 28px rgba(16, 39, 34, 0.14);
  position: relative;
}
.sidebar.collapsed {
  width: 64px;
}
.sidebar-header {
  height: var(--header-h);
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  padding: 0 18px;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.sidebar.collapsed .sidebar-header {
  justify-content: center;
  padding: 0;
}
.sidebar-logo {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  color: #eafff9;
  background: linear-gradient(135deg, rgba(95, 208, 182, 0.28), rgba(255, 255, 255, 0.10));
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
  font-size: 18px;
}
.sidebar-title {
  white-space: nowrap;
  letter-spacing: 0;
}
/* 选中项左侧品牌色高亮条 */
.sidebar :deep(.el-menu) {
  border-right: none;
  background: transparent !important;
  padding: 10px 8px;
}
.sidebar :deep(.el-menu-item),
.sidebar :deep(.el-sub-menu__title) {
  height: 46px;
  border-radius: 8px;
  margin: 2px 0;
  transition: background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease);
}
.sidebar :deep(.el-menu-item:hover),
.sidebar :deep(.el-sub-menu__title:hover) {
  background: rgba(255, 255, 255, 0.08) !important;
  color: #ecfffb !important;
}
.sidebar :deep(.el-menu-item.is-active) {
  background: rgba(95, 208, 182, 0.17) !important;
  color: #74e1c9 !important;
  box-shadow: inset 3px 0 0 #74e1c9;
}
.sidebar.collapsed :deep(.el-menu) {
  padding: 10px 6px;
}

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-page);
  min-width: 0;
}

.admin-header {
  height: var(--header-h);
  background: var(--bg-header);
  backdrop-filter: blur(14px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 1px solid var(--border-light);
  box-shadow: 0 8px 24px rgba(44, 40, 32, 0.06);
  position: sticky;
  top: 0;
  z-index: 10;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}
.icon-btn {
  width: 40px;
  height: 40px;
  border: 1px solid var(--border);
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-card);
  color: var(--text-regular);
  cursor: pointer;
  transition:
    color var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease),
    background var(--dur-fast) var(--ease),
    transform var(--dur-fast) var(--ease);
}
.icon-btn:hover,
.icon-btn:focus-visible {
  color: var(--brand);
  border-color: var(--el-color-primary-light-7);
  background: var(--brand-lighter);
  outline: none;
}
.icon-btn:active {
  transform: scale(0.97);
}
.collapse-btn {
  font-size: 20px;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.theme-btn {
  font-size: 19px;
}
.front-link {
  min-height: 40px;
  border-radius: 8px;
}
.front-link__icon {
  margin-right: 4px;
}
.admin-user {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-main);
  min-height: 40px;
  padding: 0 6px;
  border-radius: 8px;
  transition: background var(--dur-fast) var(--ease);
}
.admin-user:hover {
  background: var(--bg-soft);
}

.admin-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  min-width: 0;
}

@media (max-width: 768px) {
  .crumb {
    display: none;
  }
  .admin-name {
    display: none;
  }
  .front-link__text {
    display: none;
  }
  .front-link__icon {
    margin-right: 0;
  }
  .admin-header {
    padding: 0 12px;
  }
  .header-left {
    gap: 8px;
  }
  .header-right {
    gap: 6px;
  }
  .admin-content {
    padding: 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sidebar,
  .icon-btn,
  .admin-user,
  .sidebar :deep(.el-menu-item),
  .sidebar :deep(.el-sub-menu__title) {
    transition: none;
  }
}
</style>
