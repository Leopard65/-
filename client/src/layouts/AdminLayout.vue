<template>
  <div class="admin-layout">
    <!-- 侧边栏 -->
    <aside class="sidebar" :class="{ collapsed: isCollapsed }">
      <div class="sidebar-header">
        <span class="sidebar-logo">🐾</span>
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
          <el-icon class="collapse-btn" @click="isCollapsed = !isCollapsed">
            <Fold v-if="!isCollapsed" />
            <Expand v-else />
          </el-icon>
          <el-breadcrumb :separator-icon="ArrowRight" class="crumb">
            <el-breadcrumb-item>后台管理</el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-icon class="theme-btn" :title="isDark ? '切换到浅色' : '切换到深色'" @click="toggleTheme">
            <Moon v-if="!isDark" />
            <Sunny v-else />
          </el-icon>
          <el-button text @click="$router.push('/')">
            <el-icon style="margin-right: 4px"><Back /></el-icon> 返回前台
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
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
const isCollapsed = ref(false)
const { isDark, toggleTheme } = useTheme()

const currentTitle = computed(() => route.meta?.title || '数据看板')

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
}

.sidebar {
  width: 220px;
  background: #1e3a33;
  transition: width 0.3s;
  overflow: hidden;
  flex-shrink: 0;
}
.sidebar.collapsed {
  width: 64px;
}
.sidebar-header {
  height: var(--header-h);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.sidebar-logo {
  font-size: 24px;
}
/* 选中项左侧品牌色高亮条 */
.sidebar :deep(.el-menu) {
  border-right: none;
}
.sidebar :deep(.el-menu-item.is-active) {
  background: rgba(95, 208, 182, 0.14) !important;
  border-left: 3px solid var(--brand);
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
  background: var(--bg-card);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  position: sticky;
  top: 0;
  z-index: 10;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}
.collapse-btn {
  font-size: 20px;
  cursor: pointer;
  color: var(--text-regular);
}
.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.theme-btn {
  font-size: 19px;
  color: var(--text-regular);
  cursor: pointer;
}
.theme-btn:hover {
  color: var(--brand);
}
.admin-user {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-main);
}

.admin-content {
  flex: 1;
  padding: 22px;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .crumb {
    display: none;
  }
  .admin-name {
    display: none;
  }
  .admin-content {
    padding: 14px;
  }
}
</style>
