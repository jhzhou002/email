import axios, { AxiosError } from 'axios'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useErrorLogStore } from '@/stores/errorLog'
import { convertKeysToCamelCase } from '@/utils/format'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    const token = authStore.accessToken

    console.log(`📤 [API] ${config.method?.toUpperCase()} ${config.url}`)

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.log('🔑 [API] 已附加 Authorization Header')
    }

    return config
  },
  (error) => {
    console.error('❌ [API] 请求拦截错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    console.log(`📥 [API] 响应状态: ${response.status}`, response.data)
    // 转换响应数据的键名从 snake_case 到 camelCase
    const convertedData = convertKeysToCamelCase(response.data)
    return convertedData
  },
  async (error: AxiosError<any>) => {
    const authStore = useAuthStore()
    const errorLogStore = useErrorLogStore()

    console.error(`❌ [API] 错误 ${error.response?.status}:`, error.message)

    // Token过期，尝试刷新
    if (error.response?.status === 401) {
      console.warn('⏰ [API] Token 已过期，尝试刷新...')
      const refreshToken = authStore.refreshToken

      if (refreshToken && !error.config?.url?.includes('/auth/refresh')) {
        try {
          console.log('🔄 [API] 正在刷新 Token...')
          const response = await axios.post(
            `${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/refresh`,
            { refreshToken }
          )

          console.log('✅ [API] Token 刷新成功')
          authStore.setTokens(response.data.accessToken, response.data.refreshToken)

          // 重试原请求
          if (error.config) {
            console.log('🔄 [API] 重试原请求...')
            error.config.headers.Authorization = `Bearer ${response.data.accessToken}`
            return api.request(error.config)
          }
        } catch (refreshError) {
          console.error('❌ [API] Token 刷新失败:', refreshError)
          authStore.logout()
          const msg = '登录已过期，请重新登录'
          ElMessage.error({
            message: msg,
            duration: 3000,
            showClose: true
          })
          // 延迟后跳转，确保消息显示
          setTimeout(() => {
            window.location.href = '/login'
          }, 500)
          return Promise.reject(refreshError)
        }
      } else {
        console.warn('❌ [API] 无法刷新 Token')
        authStore.logout()
        const msg = '登录已过期，请重新登录'
        ElMessage.error({
          message: msg,
          duration: 3000,
          showClose: true
        })
        // 延迟后跳转，确保消息显示
        setTimeout(() => {
          window.location.href = '/login'
        }, 500)
        return Promise.reject(error)
      }
    }

    // 其他错误处理
    const message = error.response?.data?.message || error.message || '请求失败'
    const errorDetail = {
      status: error.response?.status,
      message,
      data: error.response?.data,
      url: error.config?.url
    }
    
    console.error('❌ [API] 详细错误:', errorDetail)
    
    // 记录到错误日志 store
    errorLogStore.addError(message, 'error', errorDetail)
    
    // 登录/注册相关的错误要显示详细信息，保留时间长
    if (error.config?.url?.includes('/auth/')) {
      ElMessage.error({
        message: `${message}`,
        duration: 6000,
        showClose: true
      })
    } else {
      ElMessage.error({
        message,
        duration: 3000
      })
    }

    return Promise.reject(error)
  }
)

export default api
