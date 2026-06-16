/**
 * 路由配置
 */
import { createRouter, createWebHistory } from 'vue-router'
import { getStoredUser } from '@/utils/storage'

const routes = [
  // ===== 前台路由 =====
  {
    path: '/',
    component: () => import('@/layouts/FrontLayout.vue'),
    children: [
      { path: '', name: 'Home', component: () => import('@/views/home/HomePage.vue') },
      { path: 'animals', name: 'AnimalList', component: () => import('@/views/animal/AnimalList.vue') },
      { path: 'animals/:id', name: 'AnimalDetail', component: () => import('@/views/animal/AnimalDetail.vue') },
      { path: 'match', name: 'Match', component: () => import('@/views/match/MatchPage.vue') },
      { path: 'adopt/apply/:id', name: 'AdoptApply', component: () => import('@/views/adopt/AdoptApply.vue'), meta: { requireAuth: true } },
      { path: 'adopt/mine', name: 'AdoptMine', component: () => import('@/views/adopt/AdoptMine.vue'), meta: { requireAuth: true } },
      { path: 'rescue', name: 'RescueForm', component: () => import('@/views/rescue/RescueForm.vue') },
      { path: 'articles', name: 'Articles', component: () => import('@/views/home/Articles.vue') },
      { path: 'articles/:id', name: 'ArticleDetail', component: () => import('@/views/home/ArticleDetail.vue') },
    ],
  },

  // ===== 登录/注册 =====
  { path: '/login', name: 'Login', component: () => import('@/views/user/Login.vue') },
  { path: '/register', name: 'Register', component: () => import('@/views/user/Register.vue') },

  // 领养证书（独立打印页，不套前台布局）
  { path: '/adopt/certificate/:id', name: 'Certificate', component: () => import('@/views/adopt/Certificate.vue'), meta: { requireAuth: true } },

  // ===== 后台路由 =====
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { requireAuth: true, requireAdmin: true },
    children: [
      { path: '', name: 'Dashboard', component: () => import('@/views/admin/dashboard/Dashboard.vue') },
      { path: 'animals', name: 'AdminAnimals', component: () => import('@/views/admin/animal/AnimalManage.vue') },
      { path: 'animals/add', name: 'AdminAnimalAdd', component: () => import('@/views/admin/animal/AnimalForm.vue') },
      { path: 'animals/edit/:id', name: 'AdminAnimalEdit', component: () => import('@/views/admin/animal/AnimalForm.vue') },
      { path: 'adoptions', name: 'AdminAdoptions', component: () => import('@/views/admin/adopt/AdoptManage.vue') },
      { path: 'rescues', name: 'AdminRescues', component: () => import('@/views/admin/rescue/RescueManage.vue') },
      { path: 'users', name: 'AdminUsers', component: () => import('@/views/admin/user/UserManage.vue') },
      { path: 'announcements', name: 'AdminAnnouncements', component: () => import('@/views/admin/content/AnnouncementManage.vue') },
      { path: 'articles', name: 'AdminArticles', component: () => import('@/views/admin/content/ArticleManage.vue') },
      { path: 'banners', name: 'AdminBanners', component: () => import('@/views/admin/content/BannerManage.vue') },
      { path: 'categories', name: 'AdminCategories', component: () => import('@/views/admin/system/CategoryManage.vue') },
    ],
  },

  // 404
  { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('@/views/home/NotFound.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const user = getStoredUser()

  if (to.meta.requireAuth && !token) {
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }
  if (to.meta.requireAdmin && user?.role !== 'admin') {
    next('/')
    return
  }
  next()
})

export default router
