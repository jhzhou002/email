import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: (to) => {
        const authStore = useAuthStore()
        if (!authStore.isLoggedIn) {
          return '/login'
        }
        return authStore.isAdmin ? '/admin/dashboard' : '/inbox'
      }
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/user/Login.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/register',
      name: 'Register',
      component: () => import('@/views/user/Register.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/inbox',
      name: 'Inbox',
      component: () => import('@/views/user/Inbox.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/email/:id',
      name: 'EmailView',
      component: () => import('@/views/user/EmailView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/settings',
      name: 'Settings',
      component: () => import('@/views/user/Settings.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/admin',
      component: () => import('@/views/admin/Layout.vue'),
      redirect: '/admin/dashboard',
      meta: { requiresAuth: true, requiresAdmin: true },
      children: [
        {
          path: 'dashboard',
          name: 'AdminDashboard',
          component: () => import('@/views/admin/Dashboard.vue'),
          meta: { requiresAuth: true, requiresAdmin: true }
        },
        {
          path: 'users',
          name: 'AdminUsers',
          component: () => import('@/views/admin/Users.vue'),
          meta: { requiresAuth: true, requiresAdmin: true }
        },
        {
          path: 'subemails',
          name: 'AdminSubemails',
          component: () => import('@/views/admin/Subemails.vue'),
          meta: { requiresAuth: true, requiresAdmin: true }
        },
        {
          path: 'emails',
          name: 'AdminEmails',
          component: () => import('@/views/admin/Emails.vue'),
          meta: { requiresAuth: true, requiresAdmin: true }
        },
        {
          path: 'tags',
          name: 'AdminTags',
          component: () => import('@/views/admin/Tags.vue'),
          meta: { requiresAuth: true, requiresAdmin: true }
        },
        {
          path: 'config',
          name: 'AdminConfig',
          component: () => import('@/views/admin/Config.vue'),
          meta: { requiresAuth: true, requiresAdmin: true }
        },
        {
          path: 'logs',
          name: 'AdminLogs',
          component: () => import('@/views/admin/Logs.vue'),
          meta: { requiresAuth: true, requiresAdmin: true }
        }
      ]
    }
  ]
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  console.log(`🔀 [Router] 导航: ${from.path} → ${to.path}`)
  console.log(`🔐 [Router] 已登录: ${authStore.isLoggedIn}, 是管理员: ${authStore.isAdmin}`)

  // 如果需要认证但未登录，跳转到登录页
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    console.log('⚠️ [Router] 需要认证但未登录，跳转到登录页')
    next('/login')
  }
  // 如果需要管理员权限但不是管理员，跳转到用户首页
  else if (to.meta.requiresAdmin && !authStore.isAdmin) {
    console.log('⚠️ [Router] 需要管理员权限但用户不是管理员，跳转到邮箱列表')
    next('/inbox')
  }
  // 如果已登录访问登录/注册页，根据角色跳转
  else if ((to.path === '/login' || to.path === '/register') && authStore.isLoggedIn) {
    console.log('ℹ️ [Router] 已登录用户访问认证页面，重定向到首页')
    if (authStore.isAdmin) {
      console.log('👑 [Router] 重定向管理员到: /admin/dashboard')
      next('/admin/dashboard')
    } else {
      console.log('👤 [Router] 重定向普通用户到: /inbox')
      next('/inbox')
    }
  }
  // 如果管理员访问用户页面，重定向到管理员仪表盘
  else if (
    (to.path === '/inbox' || to.path.startsWith('/email/') || to.path === '/settings') &&
    authStore.isLoggedIn &&
    authStore.isAdmin
  ) {
    console.log('👑 [Router] 管理员访问用户页面，重定向到管理员仪表盘')
    next('/admin/dashboard')
  }
  // 默认放行
  else {
    console.log('✅ [Router] 导航允许')
    next()
  }
})

export default router
