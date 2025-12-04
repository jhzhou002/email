import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string>(localStorage.getItem('accessToken') || '')
  const refreshToken = ref<string>(localStorage.getItem('refreshToken') || '')

  // 从localStorage恢复user信息
  const storedUser = localStorage.getItem('user')
  const user = ref<User | null>(storedUser ? JSON.parse(storedUser) : null)

  const isLoggedIn = computed(() => !!accessToken.value)
  const isAdmin = computed(() => user.value?.isAdmin || false)

  function setTokens(access: string, refresh: string) {
    console.log('🔑 [AuthStore] 设置 Token')
    accessToken.value = access
    refreshToken.value = refresh
    localStorage.setItem('accessToken', access)
    localStorage.setItem('refreshToken', refresh)
    console.log('✅ [AuthStore] Token 已保存到 localStorage')
  }

  function setUser(userData: User) {
    console.log('👤 [AuthStore] 设置用户信息:', userData)
    user.value = userData
    localStorage.setItem('user', JSON.stringify(userData))
    console.log('✅ [AuthStore] 用户信息已保存到 localStorage')
  }

  function logout() {
    console.log('🚪 [AuthStore] 执行登出')
    accessToken.value = ''
    refreshToken.value = ''
    user.value = null
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    console.log('✅ [AuthStore] 已清除所有认证数据')
  }

  return {
    accessToken,
    refreshToken,
    user,
    isLoggedIn,
    isAdmin,
    setTokens,
    setUser,
    logout
  }
})
