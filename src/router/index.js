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
      { path: 'dashboard', name: 'Dashboard', component: () => import('../views/Dashboard.vue'), meta: { title: '首页仪表盘', icon: 'Monitor', group: '经营看板', roles: [ROLES.ADMIN, ROLES.CASHIER] } },
      { path: 'sales', name: 'Sales', component: () => import('../views/Sales.vue'), meta: { title: '销售收银', icon: 'ShoppingCart', group: '收银业务', roles: [ROLES.ADMIN, ROLES.CASHIER] } },
      { path: 'returns', name: 'Returns', component: () => import('../views/Returns.vue'), meta: { title: '退换货管理', icon: 'RefreshLeft', group: '收银业务', roles: [ROLES.ADMIN, ROLES.CASHIER] } },
      { path: 'products', name: 'Products', component: () => import('../views/Products.vue'), meta: { title: '商品管理', icon: 'Goods', group: '商品库存', roles: [ROLES.ADMIN, ROLES.CASHIER] } },
      { path: 'categories', name: 'Categories', component: () => import('../views/Categories.vue'), meta: { title: '分类管理', icon: 'Menu', group: '商品库存', roles: [ROLES.ADMIN, ROLES.CASHIER] } },
      { path: 'inventory', name: 'Inventory', component: () => import('../views/Inventory.vue'), meta: { title: '库存预警', icon: 'Warning', group: '商品库存', roles: [ROLES.ADMIN] } },
      { path: 'batches', name: 'Batches', component: () => import('../views/Batches.vue'), meta: { title: '批次/保质期', icon: 'Calendar', group: '商品库存', roles: [ROLES.ADMIN] } },
      { path: 'purchases', name: 'Purchases', component: () => import('../views/Purchases.vue'), meta: { title: '进货管理', icon: 'Box', group: '商品库存', roles: [ROLES.ADMIN] } },
      { path: 'members', name: 'Members', component: () => import('../views/Members.vue'), meta: { title: '会员管理', icon: 'User', group: '会员供应商', roles: [ROLES.ADMIN, ROLES.CASHIER] } },
      { path: 'member-levels', name: 'MemberLevels', component: () => import('../views/MemberLevels.vue'), meta: { title: '会员等级', icon: 'Medal', group: '会员供应商', roles: [ROLES.ADMIN] } },
      { path: 'suppliers', name: 'Suppliers', component: () => import('../views/Suppliers.vue'), meta: { title: '供应商管理', icon: 'Van', group: '会员供应商', roles: [ROLES.ADMIN] } },
      { path: 'reports', name: 'Reports', component: () => import('../views/Reports.vue'), meta: { title: '报表统计', icon: 'DataAnalysis', group: '数据报表', roles: [ROLES.ADMIN] } },
      { path: 'logs', name: 'Logs', component: () => import('../views/Logs.vue'), meta: { title: '操作日志', icon: 'Document', group: '系统管理', roles: [ROLES.ADMIN] } },
      { path: 'users', name: 'Users', component: () => import('../views/Users.vue'), meta: { title: '用户管理', icon: 'UserFilled', group: '系统管理', roles: [ROLES.ADMIN] } },
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
