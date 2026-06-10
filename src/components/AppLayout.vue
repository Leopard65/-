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
      </el-menu>
    </el-aside>

    <!-- 主内容区 -->
    <el-container>
      <el-header style="display:flex; align-items:center; background:#fff; border-bottom:1px solid #eee; padding:0 20px">
        <el-icon style="cursor:pointer; font-size:20px" @click="isCollapse = !isCollapse">
          <Fold v-if="!isCollapse" />
          <Expand v-else />
        </el-icon>
        <el-breadcrumb separator="/" style="margin-left: 20px">
          <el-breadcrumb-item>{{ $route.meta.title }}</el-breadcrumb-item>
        </el-breadcrumb>
      </el-header>
      <el-main style="background: #f0f2f5; padding: 20px">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref } from 'vue'
import { Monitor, Goods, Menu, ShoppingCart, Box, User, Van, Fold, Expand } from '@element-plus/icons-vue'

const isCollapse = ref(false)
</script>
