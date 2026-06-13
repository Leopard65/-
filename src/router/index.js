import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'

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
      { path: 'dashboard', name: 'Dashboard', component: () => import('../views/Dashboard.vue'), meta: { title: '首页仪表盘', icon: 'Monitor' } },
      { path: 'products', name: 'Products', component: () => import('../views/Products.vue'), meta: { title: '商品管理', icon: 'Goods' } },
      { path: 'categories', name: 'Categories', component: () => import('../views/Categories.vue'), meta: { title: '分类管理', icon: 'Menu' } },
      { path: 'sales', name: 'Sales', component: () => import('../views/Sales.vue'), meta: { title: '销售收银', icon: 'ShoppingCart' } },
      { path: 'purchases', name: 'Purchases', component: () => import('../views/Purchases.vue'), meta: { title: '进货管理', icon: 'Box' } },
      { path: 'members', name: 'Members', component: () => import('../views/Members.vue'), meta: { title: '会员管理', icon: 'User' } },
      { path: 'suppliers', name: 'Suppliers', component: () => import('../views/Suppliers.vue'), meta: { title: '供应商管理', icon: 'Van' } },
      { path: 'returns', name: 'Returns', component: () => import('../views/Returns.vue'), meta: { title: '退换货管理', icon: 'RefreshLeft' } },
      { path: 'inventory', name: 'Inventory', component: () => import('../views/Inventory.vue'), meta: { title: '库存预警', icon: 'Warning' } },
      { path: 'reports', name: 'Reports', component: () => import('../views/Reports.vue'), meta: { title: '报表统计', icon: 'DataAnalysis' } },
      { path: 'logs', name: 'Logs', component: () => import('../views/Logs.vue'), meta: { title: '操作日志', icon: 'Document' } },
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
  const token = localStorage.getItem('token')

  // 设置页面标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - 超市管理系统`
  }

  // 需要登录但未登录
  if (to.path !== '/login' && !token) {
    next('/login')
  }
  // 已登录但访问登录页
  else if (to.path === '/login' && token) {
    next('/')
  }
  else {
    next()
  }
})

export default router
