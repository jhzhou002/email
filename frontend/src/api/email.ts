import api from './index'
import type { Email, PaginationData, Tag } from '@/types'

export const emailAPI = {
  // 获取邮件列表
  getEmails: (params: {
    page?: number
    pageSize?: number
    keyword?: string
    tagId?: number
  }) => {
    return api.get<any, PaginationData<Email>>('/emails', { params })
  },

  // 获取邮件详情
  getEmailById: (id: number) => {
    return api.get<any, Email>(`/emails/${id}`)
  },

  // 删除邮件
  deleteEmail: (id: number) => {
    return api.delete(`/emails/${id}`)
  },

  // 为邮件打标签
  tagEmail: (id: number, tagId: number | null) => {
    return api.put(`/emails/${id}/tag`, { tagId })
  },

  // 手动刷新邮件
  manualFetch: () => {
    return api.post<any, { message: string; count: number }>('/emails/fetch')
  },

  // 获取标签列表
  getTags: () => {
    return api.get<any, Tag[]>('/tags')
  }
}
