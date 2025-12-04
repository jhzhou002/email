import { Request } from 'express';

// 用户类型
export interface User {
  id: number;
  email: string;
  password_hash: string;
  is_admin: number;
  status: number;
  failed_login_count: number;
  locked_until: Date | null;
  last_login_at: Date | null;
  last_login_ip: string | null;
  language_preference: string;
  created_at: Date;
  updated_at: Date;
}

// 子邮箱类型
export interface SubEmail {
  id: number;
  email: string;
  is_assigned: number;
  assigned_user_id: number | null;
  created_at: Date;
}

// 邮件类型
export interface Email {
  id: number;
  user_id: number;
  from_addr: string;
  to_addr: string;
  subject: string;
  body_html: string | null;
  body_text: string | null;
  extracted_code: string | null;
  is_read: number;
  tag_id: number | null;
  priority: number;
  received_at: Date;
  created_at: Date;
}

// 标签类型
export interface Tag {
  id: number;
  name_zh: string;
  name_en: string;
  created_at: Date;
}

// 系统配置类型
export interface Setting {
  id: number;
  key: string;
  value: string;
  description: string | null;
  updated_at: Date;
}

// 日志类型
export interface Log {
  id: number;
  type: string;
  user_id: number | null;
  content: string;
  ip: string | null;
  created_at: Date;
}

// JWT Payload
export interface JWTPayload {
  userId: number;
  email: string;
  isAdmin: boolean;
}

// 扩展Request类型
export interface AuthRequest extends Request {
  user?: JWTPayload;
}
