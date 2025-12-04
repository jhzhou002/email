import api from './index'
import type { LoginResponse, CaptchaResponse, User } from '@/types'

export const authAPI = {
  // 获取验证码
  getCaptcha: () => {
    return api.get<any, CaptchaResponse>('/captcha')
  },

  // 用户注册
  register: (email: string, password: string) => {
    return api.post('/auth/register', { email, password })
  },

  // 用户登录
  login: (email: string, password: string, captchaAnswer: number, captchaExpected: number) => {
    return api.post<any, LoginResponse>('/auth/login', {
      email,
      password,
      captchaAnswer,
      captchaExpected
    })
  },

  // 刷新Token
  refreshToken: (refreshToken: string) => {
    return api.post<any, LoginResponse>('/auth/refresh', { refreshToken })
  },

  // 获取当前用户信息
  getCurrentUser: () => {
    return api.get<any, { user: User }>('/auth/me')
  }
}
