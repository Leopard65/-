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
        <el-menu-item index="/dashboard">
          <el-icon><Monitor /></el-icon>
          <template #title>首页仪表盘</template>
        </el-menu-item>
        <el-menu-item index="/products">
          <el-icon><Goods /></el-icon>
          <template #title>商品管理</template>
        </el-menu-item>
        <el-menu-item index="/categories">
          <el-icon><Menu /></el-icon>
          <template #title>分类管理</template>
        </el-menu-item>
        <el-menu-item index="/sales">
          <el-icon><ShoppingCart /></el-icon>
          <template #title>销售收银</template>
        </el-menu-item>
        <el-menu-item index="/purchases">
          <el-icon><Box /></el-icon>
          <template #title>进货管理</template>
        </el-menu-item>
        <el-menu-item index="/members">
          <el-icon><User /></el-icon>
          <template #title>会员管理</template>
        </el-menu-item>
        <el-menu-item index="/suppliers">
          <el-icon><Van /></el-icon>
          <template #title>供应商管理</template>
        </el-menu-item>
        <el-menu-item index="/returns">
          <el-icon><RefreshLeft /></el-icon>
          <template #title>退换货管理</template>
        </el-menu-item>
        <el-menu-item index="/inventory">
          <el-icon><Warning /></el-icon>
          <template #title>
            <span>库存预警</span>
            <el-badge v-if="warningCount > 0" :value="warningCount" class="warning-badge" />
          </template>
        </el-menu-item>
        <el-menu-item index="/reports">
          <el-icon><DataAnalysis /></el-icon>
          <template #title>报表统计</template>
        </el-menu-item>
        <el-menu-item index="/logs">
          <el-icon><Document /></el-icon>
          <template #title>操作日志</template>
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
        <el-dropdown @command="handleCommand">
          <span style="cursor:pointer;display:flex;align-items:center">
            <el-icon style="margin-right:5px"><User /></el-icon>
            {{ currentUser?.username || '未登录' }}
            <el-icon style="margin-left:5px"><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
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
import { Monitor, Goods, Menu, ShoppingCart, Box, User, Van, Fold, Expand, ArrowDown, RefreshLeft, DataAnalysis, Document, Warning } from '@element-plus/icons-vue'
import api from '../api'

const router = useRouter()
const isCollapse = ref(localStorage.getItem('sidebarCollapsed') === 'true')
const warningCount = ref(0)
let warningInterval = null

const toggleSidebar = () => {
  isCollapse.value = !isCollapse.value
  localStorage.setItem('sidebarCollapsed', isCollapse.value)
}

const currentUser = computed(() => {
  try {
    return JSON.parse(localStorage.getItem('user'))
  } catch {
    return null
  }
})

const handleCommand = async (command) => {
  if (command === 'logout') {
    await ElMessageBox.confirm('确定退出登录？', '提示', { type: 'warning' })
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }
}

const fetchWarningCount = async () => {
  try {
    const token = localStorage.getItem('token')
    if (!token) return
    const data = await api.getInventoryWarning()
    warningCount.value = data.length
  } catch {
    // 忽略错误
  }
}

onMounted(() => {
  fetchWarningCount()
  // 每5分钟刷新一次
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
