import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    component: () => import('@/views/Layout.vue'),
    meta: { requiresAuth: true },
    redirect: '/dashboard',
    children: [
      {
        path: 'backups',
        name: 'Backups',
        component: () => import('@/views/Backups.vue'),
        meta: { title: '数据库备份', global: true },
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
      },
      {
        path: 'codes',
        name: 'Codes',
        component: () => import('@/views/Codes.vue'),
      },
      {
        path: 'orders',
        name: 'Orders',
        component: () => import('@/views/Orders.vue'),
        meta: { title: '订单管理' },
      },
      {
        path: 'plugin-analytics',
        name: 'PluginAnalytics',
        component: () => import('@/views/PluginAnalytics.vue'),
        meta: { title: '插件统计' },
      },
      {
        path: 'analytics-history',
        name: 'AnalyticsHistory',
        component: () => import('@/views/AnalyticsHistory.vue'),
        meta: { title: '历史统计归档' },
      },
      {
        path: 'plugin-newtab',
        name: 'PluginNewtab',
        component: () => import('@/views/PluginNewtab.vue'),
        meta: { title: '新标签页统计' },
      },
      {
        path: 'plugin-search',
        name: 'PluginSearch',
        component: () => import('@/views/PluginSearch.vue'),
        meta: { title: '搜索页统计' },
      },
      {
        path: 'plugin-uninstall',
        name: 'PluginUninstall',
        component: () => import('@/views/PluginUninstall.vue'),
        meta: { title: '插件卸载统计' },
      },
      {
        path: 'client-analytics',
        name: 'ClientAnalytics',
        component: () => import('@/views/ClientAnalytics.vue'),
        meta: { title: '客户端统计' },
      },
      {
        path: 'client-errors',
        name: 'ClientErrors',
        component: () => import('@/views/ClientErrors.vue'),
        meta: { title: '客户端错误' },
      },
      {
        path: 'keys',
        name: 'Keys',
        component: () => import('@/views/Keys.vue'),
      },
      {
        path: 'feedbacks',
        name: 'Feedbacks',
        component: () => import('@/views/Feedbacks.vue'),
        meta: { title: '工单反馈' },
      },
      {
        path: 'channels',
        name: 'Channels',
        component: () => import('@/views/Channels.vue'),
      },
      {
        path: 'products',
        name: 'Products',
        component: () => import('@/views/Products.vue'),
        meta: { title: '产品管理' },
      },
      {
        path: 'packages',
        name: 'Packages',
        component: () => import('@/views/Packages.vue'),
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

/** 路由守卫：未登录跳转登录页 */
router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('admin_token')
  if (to.meta.requiresAuth !== false && !token) {
    next({ path: '/login', query: { redirect: to.fullPath } })
  } else if (to.path === '/login' && token) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
