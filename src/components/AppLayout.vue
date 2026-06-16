<template>
  <el-container class="layout">
    <!-- 侧边栏 -->
    <el-aside :width="isCollapse ? 'var(--layout-aside-collapsed)' : 'var(--layout-aside)'" class="sidebar">
      <div class="brand" :class="{ 'brand--collapsed': isCollapse }">
        <el-icon class="brand__mark"><Shop /></el-icon>
        <span v-if="!isCollapse" class="brand__name">超市管理系统</span>
      </div>

      <el-scrollbar class="menu-scroll">
        <el-menu
          :default-active="$route.path"
          :collapse="isCollapse"
          :collapse-transition="false"
          background-color="transparent"
          router
          class="side-menu"
        >
          <el-menu-item-group v-for="grp in menuGroups" :key="grp.group">
            <template #title>
              <span class="menu-group-title">{{ grp.group }}</span>
            </template>
            <el-menu-item v-for="item in grp.items" :key="item.path" :index="item.path">
              <el-icon><component :is="item.icon" /></el-icon>
              <template #title>
                <span class="menu-item-text">{{ item.title }}</span>
                <el-badge v-if="item.path === '/inventory' && warningCount > 0" :value="warningCount" class="warning-badge" />
              </template>
            </el-menu-item>
          </el-menu-item-group>
        </el-menu>
      </el-scrollbar>
    </el-aside>

    <!-- 主内容区 -->
    <el-container>
      <el-header class="topbar">
        <div class="topbar__left">
          <el-icon class="topbar__toggle" @click="toggleSidebar">
            <Fold v-if="!isCollapse" />
            <Expand v-else />
          </el-icon>
          <h1 class="topbar__title">{{ $route.meta.title || '超市管理系统' }}</h1>
        </div>

        <div class="topbar__right">
          <div class="topbar__biz">
            <span class="biz-dot"></span>
            <span class="biz-text">营业中</span>
            <el-divider direction="vertical" />
            <span class="biz-date">{{ todayText }}</span>
          </div>

          <el-divider direction="vertical" />

          <el-dropdown @command="handleCommand">
            <span class="user-chip">
              <el-avatar :size="28" class="user-chip__avatar">{{ userInitial }}</el-avatar>
              <span class="user-chip__name">{{ userStore.username || '未登录' }}</span>
              <el-tag :type="userStore.isAdmin ? 'primary' : 'info'" size="small" effect="light" class="user-chip__role">
                {{ userStore.isAdmin ? '管理员' : '收银员' }}
              </el-tag>
              <el-icon class="user-chip__caret"><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">
                  <el-icon><SwitchButton /></el-icon>退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { Monitor, Goods, Menu, ShoppingCart, Box, User, Van, Fold, Expand, ArrowDown, RefreshLeft, DataAnalysis, Document, Warning, Medal, UserFilled, Shop, SwitchButton } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { reportsApi } from '@/api'
import { formatDate } from '@/utils/format'

const router = useRouter()
const userStore = useUserStore()
const isCollapse = ref(localStorage.getItem('sidebarCollapsed') === 'true')
const warningCount = ref(0)
let warningInterval = null

// 图标映射
const iconMap = { Monitor, Goods, Menu, ShoppingCart, Box, User, Van, RefreshLeft, Warning, DataAnalysis, Document, Medal, UserFilled }

// 菜单分组顺序（与产品信息架构一致）
const groupOrder = ['经营看板', '收银业务', '商品库存', '会员供应商', '数据报表', '系统管理']

// 基于角色过滤菜单并按分组聚合（空分组自动隐藏）
const menuGroups = computed(() => {
  const userRole = userStore.role || 'cashier'
  const children = router.options.routes.find(r => r.path === '/')?.children || []
  const buckets = {}
  children
    .filter(child => {
      const roles = child.meta?.roles
      return !roles || roles.includes(userRole)
    })
    .forEach(child => {
      const group = child.meta?.group || '其他'
      ;(buckets[group] ||= []).push({
        path: `/${child.path}`,
        title: child.meta?.title,
        icon: iconMap[child.meta?.icon] || Monitor
      })
    })
  return groupOrder
    .filter(g => buckets[g]?.length)
    .map(g => ({ group: g, items: buckets[g] }))
})

const todayText = computed(() => {
  const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const now = new Date()
  return `${formatDate(now)} ${week[now.getDay()]}`
})

const userInitial = computed(() => (userStore.username || '?').charAt(0).toUpperCase())

const toggleSidebar = () => {
  isCollapse.value = !isCollapse.value
  localStorage.setItem('sidebarCollapsed', isCollapse.value)
}

const handleCommand = async (command) => {
  if (command === 'logout') {
    await ElMessageBox.confirm('确定退出登录？', '提示', { type: 'warning' })
    userStore.logout()
    router.push('/login')
  }
}

const fetchWarningCount = async () => {
  try {
    // 库存预警为管理员功能，仅管理员拉取角标，避免收银员触发 403 提示
    if (!userStore.isLoggedIn || !userStore.isAdmin) return
    const data = await reportsApi.getInventoryWarning()
    warningCount.value = data.length
  } catch {
    // 忽略错误
  }
}

onMounted(() => {
  fetchWarningCount()
  warningInterval = setInterval(fetchWarningCount, 5 * 60 * 1000)
})

onUnmounted(() => {
  if (warningInterval) {
    clearInterval(warningInterval)
  }
})
</script>

<style scoped>
.layout { height: 100vh; }

/* ===== 侧边栏 ===== */
.sidebar {
  background: var(--sidebar-bg);
  transition: width 0.25s;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.brand {
  height: var(--layout-header);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 20px;
  color: #fff;
  background: var(--sidebar-bg-deep);
  white-space: nowrap;
  overflow: hidden;
}
.brand--collapsed { justify-content: center; padding: 0; }
.brand__mark { font-size: 22px; color: var(--color-primary); flex-shrink: 0; }
.brand__name { font-size: 16px; font-weight: 600; letter-spacing: 0.5px; }

.menu-scroll { flex: 1; }
.side-menu { border-right: none; padding: 8px 0; }

.menu-group-title {
  font-size: 12px;
  color: var(--sidebar-text-muted);
  letter-spacing: 1px;
}
.menu-item-text { flex: 1; }

/* Element 菜单深色配色（scoped 下需穿透内部节点） */
.side-menu :deep(.el-menu-item) {
  color: var(--sidebar-text);
  height: 44px;
  margin: 2px 10px;
  border-radius: var(--radius-md);
}
.side-menu :deep(.el-menu-item:hover) {
  background: var(--sidebar-active-bg);
  color: #fff;
}
.side-menu :deep(.el-menu-item.is-active) {
  background: var(--color-primary);
  color: #fff;
}
.side-menu :deep(.el-menu-item.is-active .el-icon) { color: #fff; }
.side-menu :deep(.el-menu-item-group__title) {
  padding: 14px 20px 6px;
}
/* 折叠态隐藏分组标题留白 */
.el-menu--collapse :deep(.el-menu-item-group__title) { display: none; }

.warning-badge { margin-left: 8px; }

/* ===== 顶栏 ===== */
.topbar {
  height: var(--layout-header);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-color);
  padding: 0 20px;
}
.topbar__left { display: flex; align-items: center; gap: 16px; }
.topbar__toggle { font-size: 20px; cursor: pointer; color: var(--text-regular); }
.topbar__toggle:hover { color: var(--color-primary); }
.topbar__title { font-size: 17px; font-weight: 600; color: var(--text-primary); margin: 0; }

.topbar__right { display: flex; align-items: center; gap: 8px; }
.topbar__biz { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-secondary); }
.biz-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--color-success); box-shadow: 0 0 0 3px rgba(47, 170, 110, 0.18); }
.biz-text { color: var(--color-success); }
.biz-date { color: var(--text-secondary); }

.user-chip { display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 4px 6px; border-radius: var(--radius-md); }
.user-chip:hover { background: var(--bg-muted); }
.user-chip__avatar { background: var(--color-primary); color: #fff; font-size: 13px; }
.user-chip__name { font-size: 14px; color: var(--text-primary); }
.user-chip__caret { font-size: 12px; color: var(--text-secondary); }

/* ===== 内容区：统一底色 / 内边距 / 滚动 ===== */
.content {
  background: var(--bg-page);
  padding: var(--space-5);
  overflow-y: auto;
}
</style>
