import api from './index'
import type { PaginationData } from '@/types'

export const adminAPI = {
  // 仪表盘
  getDashboard: () => {
    return api.get('/admin/dashboard')
  },

  // 生成子邮箱
  generateSubemails: (count: number, domain: string) => {
    return api.post('/admin/subemails/generate', { count, domain })
  },

  // 获取子邮箱列表
  getSubemails: (params: { page?: number; pageSize?: number; isAssigned?: boolean }) => {
    return api.get<any, PaginationData<any>>('/admin/subemails', { params })
  },

  // 获取用户列表
  getUsers: (params: { page?: number; pageSize?: number; keyword?: string }) => {
    return api.get<any, PaginationData<any>>('/admin/users', { params })
  },

  // 禁用/启用用户
  toggleUserStatus: (id: number, status: number) => {
    return api.put(`/admin/users/${id}/status`, { status })
  },

  // 删除用户
  deleteUser: (id: number) => {
    return api.delete(`/admin/users/${id}`)
  },

  // 重置用户密码
  resetUserPassword: (id: number, newPassword: string) => {
    return api.put(`/admin/users/${id}/password`, { newPassword })
  },

  // 解锁用户
  unlockUser: (id: number) => {
    return api.put(`/admin/users/${id}/unlock`)
  },

  // 获取所有邮件
  getAllEmails: (params: { page?: number; pageSize?: number }) => {
    return api.get<any, PaginationData<any>>('/admin/emails', { params })
  },

  // 删除邮件（管理员）
  deleteEmail: (id: number) => {
    return api.delete(`/emails/${id}`)
  },

  // 添加标签
  addTag: (nameZh: string, nameEn: string) => {
    return api.post('/admin/tags', { nameZh, nameEn })
  },

  // 更新标签
  updateTag: (id: number, nameZh: string, nameEn: string) => {
    return api.put(`/admin/tags/${id}`, { nameZh, nameEn })
  },

  // 删除标签
  deleteTag: (id: number) => {
    return api.delete(`/admin/tags/${id}`)
  },

  // 获取系统配置
  getSettings: () => {
    return api.get('/admin/settings')
  },

  // 更新系统配置
  updateSettings: (settings: Record<string, string>) => {
    return api.put('/admin/settings', settings)
  },

  // 测试IMAP连接
  testImap: (config: {
    imap_server: string
    imap_port: string
    imap_user: string
    imap_pass: string
  }) => {
    return api.post('/admin/settings/test-imap', config)
  },

  // 发送测试邮件
  sendTestEmail: (recipient: string) => {
    return api.post('/admin/settings/send-test-email', { recipient })
  },

  // 获取系统日志
  getLogs: (params: { page?: number; pageSize?: number; type?: string }) => {
    return api.get<any, PaginationData<any>>('/admin/logs', { params })
  }
}
