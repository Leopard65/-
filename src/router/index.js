import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'

// 角色定义
export const ROLES = { ADMIN: 'admin', CASHIER: 'cashier' }

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/',
    component: AppLayout,
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'Dashboard', component: () => import('../views/Dashboard.vue'), meta: { title: '首页仪表盘', icon: 'Monitor', roles: [ROLES.ADMIN, ROLES.CASHIER] } },
      { path: 'products', name: 'Products', component: () => import('../views/Products.vue'), meta: { title: '商品管理', icon: 'Goods', roles: [ROLES.ADMIN, ROLES.CASHIER] } },
      { path: 'categories', name: 'Categories', component: () => import('../views/Categories.vue'), meta: { title: '分类管理', icon: 'Menu', roles: [ROLES.ADMIN, ROLES.CASHIER] } },
      { path: 'sales', name: 'Sales', component: () => import('../views/Sales.vue'), meta: { title: '销售收银', icon: 'ShoppingCart', roles: [ROLES.ADMIN, ROLES.CASHIER] } },
      { path: 'purchases', name: 'Purchases', component: () => import('../views/Purchases.vue'), meta: { title: '进货管理', icon: 'Box', roles: [ROLES.ADMIN] } },
      { path: 'members', name: 'Members', component: () => import('../views/Members.vue'), meta: { title: '会员管理', icon: 'User', roles: [ROLES.ADMIN, ROLES.CASHIER] } },
      { path: 'suppliers', name: 'Suppliers', component: () => import('../views/Suppliers.vue'), meta: { title: '供应商管理', icon: 'Van', roles: [ROLES.ADMIN] } },
      { path: 'returns', name: 'Returns', component: () => import('../views/Returns.vue'), meta: { title: '退换货管理', icon: 'RefreshLeft', roles: [ROLES.ADMIN, ROLES.CASHIER] } },
      { path: 'inventory', name: 'Inventory', component: () => import('../views/Inventory.vue'), meta: { title: '库存预警', icon: 'Warning', roles: [ROLES.ADMIN, ROLES.CASHIER] } },
      { path: 'reports', name: 'Reports', component: () => import('../views/Reports.vue'), meta: { title: '报表统计', icon: 'DataAnalysis', roles: [ROLES.ADMIN] } },
      { path: 'logs', name: 'Logs', component: () => import('../views/Logs.vue'), meta: { title: '操作日志', icon: 'Document', roles: [ROLES.ADMIN] } },
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFound.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - 超市管理系统`
  }

  // 登录页放行
  if (to.path === '/login') {
    const token = localStorage.getItem('token')
    token ? next('/') : next()
    return
  }

  // 未登录 -> 跳转登录
  const token = localStorage.getItem('token')
  if (!token) {
    next('/login')
    return
  }

  // 角色权限校验
  if (to.meta.roles) {
    let user = null
    try { user = JSON.parse(localStorage.getItem('user')) } catch {}
    if (!user || !to.meta.roles.includes(user.role)) {
      next('/dashboard')
      return
    }
  }

  next()
})

export default router
