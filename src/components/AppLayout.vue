<template>
  <el-container class="layout" :class="{ 'layout--collapsed': isCollapse, 'layout--mobile': isMobile }">
    <!-- 侧边栏 -->
    <el-aside :width="isCollapse ? 'var(--layout-aside-collapsed)' : 'var(--layout-aside)'" class="sidebar">
      <div class="brand" :class="{ 'brand--collapsed': isCollapse }">
        <el-icon class="brand__mark"><Shop /></el-icon>
        <div v-if="!isCollapse" class="brand__copy">
          <span class="brand__name">超市管理系统</span>
          <span class="brand__sub">StoreOps Console</span>
        </div>
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
      <div v-if="isMobile && !isCollapse" class="sidebar-scrim" @click="toggleSidebar"></div>
      <el-header class="topbar">
        <div class="topbar__left">
          <el-button
            class="topbar__toggle"
            text
            :aria-label="isCollapse ? '展开侧边栏' : '收起侧边栏'"
            @click="toggleSidebar"
          >
            <Fold v-if="!isCollapse" />
            <Expand v-else />
          </el-button>
          <div class="topbar__heading">
            <span class="topbar__eyebrow">今日门店工作台</span>
            <h1 class="topbar__title">{{ $route.meta.title || '超市管理系统' }}</h1>
          </div>
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
import { Monitor, Goods, Menu, ShoppingCart, Box, User, Van, Fold, Expand, ArrowDown, RefreshLeft, DataAnalysis, Document, Warning, Medal, UserFilled, Shop, SwitchButton, Calendar } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { reportsApi } from '@/api'
import { formatDate } from '@/utils/format'

const router = useRouter()
const userStore = useUserStore()
const isCollapse = ref(localStorage.getItem('sidebarCollapsed') === 'true')
const isMobile = ref(false)
const warningCount = ref(0)
let warningInterval = null

// 图标映射
const iconMap = { Monitor, Goods, Menu, ShoppingCart, Box, User, Van, RefreshLeft, Warning, DataAnalysis, Document, Medal, UserFilled, Calendar }

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

const updateViewport = () => {
  const nextIsMobile = window.innerWidth <= 720
  if (nextIsMobile && !isMobile.value && !isCollapse.value) {
    isCollapse.value = true
    localStorage.setItem('sidebarCollapsed', 'true')
  }
  isMobile.value = nextIsMobile
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
  updateViewport()
  fetchWarningCount()
  warningInterval = setInterval(fetchWarningCount, 5 * 60 * 1000)
  window.addEventListener('resize', updateViewport)
})

onUnmounted(() => {
  if (warningInterval) {
    clearInterval(warningInterval)
  }
  window.removeEventListener('resize', updateViewport)
})
</script>

<style scoped>
.layout { height: 100vh; }

/* ===== 侧边栏 ===== */
.sidebar {
  background:
    linear-gradient(180deg, rgba(217, 154, 24, 0.08), transparent 180px),
    var(--sidebar-bg);
  transition: width 0.25s;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
}
.brand {
  height: var(--layout-header);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 18px;
  color: #fff;
  background: var(--sidebar-bg-deep);
  white-space: nowrap;
  overflow: hidden;
}
.brand--collapsed { justify-content: center; padding: 0; }
.brand__mark {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-md);
  color: var(--color-accent);
  background: rgba(217, 154, 24, 0.14);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}
.brand__copy { display: flex; flex-direction: column; line-height: 1.15; }
.brand__name { font-size: 15px; font-weight: 700; letter-spacing: 0; }
.brand__sub { margin-top: 3px; font-size: 11px; color: var(--sidebar-text-muted); font-family: var(--font-data); }

.menu-scroll { flex: 1; }
.side-menu { border-right: none; padding: 8px 0; }

.menu-group-title {
  font-size: 12px;
  color: var(--sidebar-text-muted);
  letter-spacing: 0;
}
.menu-item-text { flex: 1; }

/* Element 菜单深色配色（scoped 下需穿透内部节点） */
.side-menu :deep(.el-menu-item) {
  color: var(--sidebar-text);
  height: 44px;
  margin: 2px 10px;
  border-radius: var(--radius-md);
  transition: background var(--motion-fast), color var(--motion-fast), transform var(--motion-fast);
}
.side-menu :deep(.el-menu-item:hover) {
  background: var(--sidebar-active-bg);
  color: #fff;
  transform: translateX(2px);
}
.side-menu :deep(.el-menu-item.is-active) {
  background: linear-gradient(90deg, var(--color-primary), #1f805e);
  color: #fff;
  box-shadow: inset 3px 0 0 var(--color-accent);
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
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border-color);
  padding: 0 20px;
}
.topbar__left { display: flex; align-items: center; gap: 14px; min-width: 0; }
.topbar__toggle {
  width: 40px;
  height: 40px;
  color: var(--text-regular);
  border-radius: var(--radius-md);
}
.topbar__toggle:hover { color: var(--color-primary); background: var(--bg-muted); }
.topbar__heading { min-width: 0; }
.topbar__eyebrow {
  display: block;
  margin-bottom: 2px;
  color: var(--text-secondary);
  font-size: 11px;
  font-family: var(--font-data);
}
.topbar__title { font-size: 17px; font-weight: 600; color: var(--text-primary); margin: 0; }

.topbar__right { display: flex; align-items: center; gap: 8px; }
.topbar__biz { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-secondary); }
.biz-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--color-success); box-shadow: 0 0 0 3px rgba(25, 135, 84, 0.18); }
.biz-text { color: var(--color-success); }
.biz-date { color: var(--text-secondary); }

.user-chip { display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 5px 8px; border-radius: var(--radius-md); }
.user-chip:hover { background: var(--bg-muted); }
.user-chip__avatar { background: var(--color-primary); color: #fff; font-size: 13px; }
.user-chip__name { font-size: 14px; color: var(--text-primary); }
.user-chip__caret { font-size: 12px; color: var(--text-secondary); }

/* ===== 内容区：统一底色 / 内边距 / 滚动 ===== */
.content {
  background:
    linear-gradient(90deg, rgba(23, 107, 77, 0.035) 1px, transparent 1px),
    linear-gradient(180deg, rgba(23, 107, 77, 0.035) 1px, transparent 1px),
    var(--bg-page);
  background-size: 28px 28px;
  padding: var(--space-5);
  overflow-y: auto;
}

@media (max-width: 900px) {
  .topbar__biz,
  .user-chip__role,
  .biz-date {
    display: none;
  }

  .topbar {
    padding: 0 12px;
  }
}

@media (max-width: 720px) {
  .layout {
    position: relative;
  }

  .sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    width: var(--layout-aside) !important;
    height: 100dvh;
    z-index: 40;
    transform: translateX(0);
    box-shadow: 18px 0 40px rgba(16, 26, 22, 0.26);
  }

  .layout--collapsed .sidebar {
    transform: translateX(-100%);
  }

  .sidebar-scrim {
    position: fixed;
    inset: 0;
    z-index: 30;
    background: rgba(16, 26, 22, 0.36);
  }

  .topbar,
  .content {
    width: 100vw;
  }
}
</style>
