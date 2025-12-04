export interface User {
  userId: number
  email: string
  isAdmin: boolean
}

export interface Email {
  id: number
  user_id: number
  from_addr: string
  to_addr: string
  subject: string
  body_html: string | null
  body_text: string | null
  extracted_code: string | null
  is_read: number
  tag_id: number | null
  priority: number
  received_at: string
  created_at: string
}

export interface Tag {
  id: number
  name_zh: string
  name_en: string
  created_at: string
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
