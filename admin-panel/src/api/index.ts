import axios from 'axios'
import router from '@/router'

/** 管理员 API 的 axios 实例 */
const api = axios.create({
  baseURL: '/api/admin',
  timeout: 15000,
})

/** 请求拦截器：自动附加 JWT token */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  const product = localStorage.getItem('admin_active_product')
  const productScopedRoutes = ['/dashboard', '/client-analytics', '/client-errors', '/codes', '/orders', '/packages']
  if (product && config.method === 'get' && productScopedRoutes.some((path) => config.url?.startsWith(path))) {
    config.params = { ...(config.params ?? {}), product }
  }
  return config
})

/** 响应拦截器：统一解包后端 { success, data, message } 结构；401 自动跳转登录页 */
api.interceptors.response.use(
  (response) => {
    // blob 类型的响应（如 CSV 导出）不解包，直接返回
    if (response.config.responseType === 'blob') {
      return response
    }

    // 后端统一返回 { success: boolean, data: T, message?: string } 结构
    // 在拦截器中解包，让 response.data 直接是业务数据
    if (response.data && typeof response.data === 'object' && 'success' in response.data && 'data' in response.data) {
      // success 为 false 时视为业务错误
      if (response.data.success === false) {
        const errMsg = response.data.message || response.data.error_code || '请求失败'
        return Promise.reject(new Error(errMsg))
      }
      // 解包：将 response.data.data 提升为 response.data
      response.data = response.data.data
    }

    // 兜底：确保 data 字段至少为 null 而非 undefined
    if (response.data === undefined) {
      response.data = null
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_username')
      if (router.currentRoute.value.path !== '/login') {
        router.push({ path: '/login', query: { redirect: router.currentRoute.value.fullPath } })
      }
    }
    return Promise.reject(error)
  },
)

export default api
