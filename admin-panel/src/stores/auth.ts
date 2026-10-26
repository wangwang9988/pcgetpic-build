import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as loginApi } from '@/api/auth'

/** 管理员认证 Store */
export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('admin_token') || '')
  const username = ref(localStorage.getItem('admin_username') || '')

  /** 是否已登录 */
  const isLoggedIn = computed(() => !!token.value)

  /** 登录 */
  async function login(user: string, password: string) {
    // 拦截器已解包后端 { success, data } 结构，data 直接是 { token, expiresIn }
    const { data } = await loginApi({ username: user, password })
    if (data?.token) {
      token.value = data.token
      username.value = user
      localStorage.setItem('admin_token', data.token)
      localStorage.setItem('admin_username', user)
    } else {
      throw new Error('登录响应缺少 token')
    }
  }

  /** 退出登录 */
  function logout() {
    token.value = ''
    username.value = ''
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_username')
  }

  return { token, username, isLoggedIn, login, logout }
})
