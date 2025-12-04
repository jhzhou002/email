import api from './index'
import type { UserStats } from '@/types'

export const userAPI = {
  // 修改密码
  changePassword: (oldPassword: string, newPassword: string) => {
    return api.put('/user/password', { oldPassword, newPassword })
  },

  // 获取用户统计
  getStats: () => {
    return api.get<any, UserStats>('/user/stats')
  }
}
