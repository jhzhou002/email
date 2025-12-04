export interface User {
  id: number
  userId?: number
  email: string
  isAdmin: boolean
  status: number
  isLocked: boolean
  createdAt?: string
  lastLoginAt?: string | null
}

export interface Email {
  id: number
  userId: number
  fromAddr: string
  toAddr: string
  subject: string
  bodyHtml: string | null
  bodyText: string | null
  extractedCode: string | null
  isRead: number
  tagId: number | null
  priority: number
  receivedAt: string
  createdAt: string
}

export interface Tag {
  id: number
  nameZh: string
  nameEn: string
  createdAt: string
}

export interface PaginationData<T> {
  total: number
  page: number
  pageSize: number
  data: T[]
}

export interface LoginResponse {
  message: string
  accessToken: string
  refreshToken: string
}

export interface CaptchaResponse {
  question: string
  answer: number
}

export interface UserStats {
  unreadCount: number
  totalCount: number
  todayCount: number
}

export interface SystemSettings {
  imapServer?: string
  imapPort?: string
  imapUser?: string
  imapPass?: string
  checkInterval?: string
  smtpServer?: string
  smtpPort?: string
  smtpUser?: string
  smtpPass?: string
  mainDomain?: string
}

export interface DashboardStats {
  totalUsers: number
  newUsersToday: number
  totalEmails: number
  newEmailsToday: number
  totalSubemails: number
  assignedSubemails: number
  totalTags: number
  usedTags: number
  imapStatus: boolean
  databaseStatus: boolean
}

export interface Subemail {
  id: number
  email: string
  assignedUserId: number | null
  userEmail: string | null
  createdAt: string
}
