<template>
  <div class="admin-layout">
    <!-- 侧边栏 -->
    <aside class="sidebar" :class="{ collapsed: isCollapsed }">
      <div class="sidebar-header">
        <span class="sidebar-logo">🐾</span>
        <span v-if="!isCollapsed" class="sidebar-title">后台管理</span>
      </div>

      <el-menu
        :default-active="$route.path"
        router
        :collapse="isCollapsed"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409eff"
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
        <el-icon class="collapse-btn" @click="isCollapsed = !isCollapsed">
          <Fold v-if="!isCollapsed" />
          <Expand v-else />
        </el-icon>
        <div class="header-right">
          <el-button text @click="$router.push('/')">返回前台</el-button>
          <el-dropdown trigger="click">
            <span class="admin-user">
              {{ userStore.userInfo?.nickname || '管理员' }}
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
import { ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import {
  DataBoard, Promotion, Document, FirstAidKit, User, Notebook,
  Fold, Expand, ArrowDown,
} from '@element-plus/icons-vue'

const userStore = useUserStore()
const router = useRouter()
const isCollapsed = ref(false)

function handleLogout() {
  userStore.logout()
  router.push('/')
}
</script>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 220px;
  background: #304156;
  transition: width 0.3s;
  overflow: hidden;
}

.sidebar.collapsed {
  width: 64px;
}

.sidebar-header {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-logo {
  font-size: 24px;
}

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f0f2f5;
}

.admin-header {
  height: 64px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.collapse-btn {
  font-size: 20px;
  cursor: pointer;
  color: #666;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.admin-user {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  color: #333;
}

.admin-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}
</style>
