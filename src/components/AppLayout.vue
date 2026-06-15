<template>
  <el-container style="height: 100vh">
    <!-- 侧边栏 -->
    <el-aside :width="isCollapse ? '64px' : '220px'" style="transition: width 0.3s; background: #304156">
      <div style="height: 60px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 18px; font-weight: bold; white-space: nowrap; overflow: hidden">
        <span v-if="!isCollapse">🛒 超市管理系统</span>
        <span v-else>🛒</span>
      </div>
      <el-menu
        :default-active="$route.path"
        :collapse="isCollapse"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
        router
      >
        <el-menu-item v-for="item in menuItems" :key="item.path" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <template #title>
            <span>{{ item.title }}</span>
            <el-badge v-if="item.path === '/inventory' && warningCount > 0" :value="warningCount" class="warning-badge" />
          </template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 主内容区 -->
    <el-container>
      <el-header style="display:flex; align-items:center; justify-content:space-between; background:#fff; border-bottom:1px solid #eee; padding:0 20px">
        <div style="display:flex;align-items:center">
          <el-icon style="cursor:pointer; font-size:20px" @click="toggleSidebar">
            <Fold v-if="!isCollapse" />
            <Expand v-else />
          </el-icon>
          <el-breadcrumb separator="/" style="margin-left: 20px">
            <el-breadcrumb-item>{{ $route.meta.title }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div style="display:flex;align-items:center;gap:15px">
          <el-tag v-if="userStore.isLoggedIn" :type="userStore.isAdmin ? 'danger' : 'info'" size="small">
            {{ userStore.isAdmin ? '管理员' : '收银员' }}
          </el-tag>
          <el-dropdown @command="handleCommand">
            <span style="cursor:pointer;display:flex;align-items:center">
              <el-icon style="margin-right:5px"><User /></el-icon>
              {{ userStore.username || '未登录' }}
              <el-icon style="margin-left:5px"><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main style="background: #f0f2f5; padding: 20px">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { Monitor, Goods, Menu, ShoppingCart, Box, User, Van, Fold, Expand, ArrowDown, RefreshLeft, DataAnalysis, Document, Warning, Medal, UserFilled } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { reportsApi } from '@/api'

const router = useRouter()
const userStore = useUserStore()
const isCollapse = ref(localStorage.getItem('sidebarCollapsed') === 'true')
const warningCount = ref(0)
let warningInterval = null

// 图标映射
const iconMap = { Monitor, Goods, Menu, ShoppingCart, Box, User, Van, RefreshLeft, Warning, DataAnalysis, Document, Medal, UserFilled }

// 基于角色过滤菜单
const menuItems = computed(() => {
  const userRole = userStore.role || 'cashier'

  return router.options.routes
    .find(r => r.path === '/')
    ?.children
    ?.filter(child => {
      const roles = child.meta?.roles
      return !roles || roles.includes(userRole)
    })
    ?.map(child => ({
      path: `/${child.path}`,
      title: child.meta?.title,
      icon: iconMap[child.meta?.icon] || Monitor
    })) || []
})

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
    if (!userStore.isLoggedIn) return
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
.warning-badge {
  margin-left: 8px;
}
</style>
