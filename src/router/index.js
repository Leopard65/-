import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'

const routes = [
  {
    path: '/',
    component: AppLayout,
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'Dashboard', component: () => import('../views/Dashboard.vue'), meta: { title: '首页仪表盘' } },
      { path: 'products', name: 'Products', component: () => import('../views/Products.vue'), meta: { title: '商品管理' } },
      { path: 'categories', name: 'Categories', component: () => import('../views/Categories.vue'), meta: { title: '分类管理' } },
      { path: 'members', name: 'Members', component: () => import('../views/Members.vue'), meta: { title: '会员管理' } },
      { path: 'suppliers', name: 'Suppliers', component: () => import('../views/Suppliers.vue'), meta: { title: '供应商管理' } },
      { path: 'purchases', name: 'Purchases', component: () => import('../views/Purchases.vue'), meta: { title: '进货管理' } },
      { path: 'sales', name: 'Sales', component: () => import('../views/Sales.vue'), meta: { title: '销售收银' } },
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
