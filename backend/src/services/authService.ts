import pool from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { User, JWTPayload } from '../types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class AuthService {
  /**
   * 用户注册
   */
  async register(email: string, password: string): Promise<{ success: boolean; message: string }> {
    const connection = await pool.getConnection();

    try {
      // 1. 检查邮箱格式
      if (!this.isValidEmail(email)) {
        return { success: false, message: 'Invalid email format' };
      }

      // 2. 检查邮箱是否在子邮箱池中
      const [subemails] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM subemails WHERE email = ? AND is_assigned = 0',
        [email]
      );

      if (subemails.length === 0) {
        return { success: false, message: 'Email not available or already assigned' };
      }

      // 3. 检查用户是否已存在
      const [existingUsers] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existingUsers.length > 0) {
        return { success: false, message: 'Email already registered' };
      }

      // 4. 创建用户
      const passwordHash = await hashPassword(password);
      const [result] = await connection.query<ResultSetHeader>(
        'INSERT INTO users (email, password_hash) VALUES (?, ?)',
        [email, passwordHash]
      );

      // 5. 标记子邮箱为已分配
      await connection.query(
        'UPDATE subemails SET is_assigned = 1, assigned_user_id = ? WHERE email = ?',
        [result.insertId, email]
      );

      return { success: true, message: 'Registration successful' };
    } finally {
      connection.release();
    }
  }

  /**
   * 用户登录
   */
  async login(
    email: string,
    password: string,
    captchaAnswer: number,
    captchaExpected: number,
    ip: string
  ): Promise<{ success: boolean; message: string; accessToken?: string; refreshToken?: string }> {
    const connection = await pool.getConnection();

    try {
      // 1. 验证数字验证码
      if (captchaAnswer !== captchaExpected) {
        return { success: false, message: 'Invalid captcha' };
      }

      // 2. 查询用户
      const [users] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );

      if (users.length === 0) {
        return { success: false, message: 'User not found' };
      }

      const user = users[0] as User;

      // 3. 检查账号状态
      if (user.status === 1) {
        return { success: false, message: 'Account is disabled' };
      }

      // 4. 检查账号是否锁定
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        const remainingMinutes = Math.ceil(
          (new Date(user.locked_until).getTime() - Date.now()) / 60000
        );
        return {
          success: false,
          message: `Account locked. Try again in ${remainingMinutes} minute(s)`
        };
      }

      // 5. 验证密码
      const isPasswordValid = await comparePassword(password, user.password_hash);

      if (!isPasswordValid) {
        // 登录失败，增加失败次数
        const newFailedCount = user.failed_login_count + 1;
        const maxAttempts = 3;

        if (newFailedCount >= maxAttempts) {
          // 锁定账号10分钟
          const lockUntil = new Date(Date.now() + 10 * 60 * 1000);
          await connection.query(
            'UPDATE users SET failed_login_count = ?, locked_until = ? WHERE id = ?',
            [newFailedCount, lockUntil, user.id]
          );

          // 记录日志
          await this.logAction('login', user.id, `Account locked due to ${maxAttempts} failed attempts`, ip);

          return {
            success: false,
            message: `Too many failed attempts. Account locked for 10 minutes`
          };
        } else {
          await connection.query(
            'UPDATE users SET failed_login_count = ? WHERE id = ?',
            [newFailedCount, user.id]
          );

          return {
            success: false,
            message: `Invalid password. ${maxAttempts - newFailedCount} attempt(s) remaining`
          };
        }
      }

      // 6. 登录成功，重置失败次数
      await connection.query(
        'UPDATE users SET failed_login_count = 0, locked_until = NULL, last_login_at = NOW(), last_login_ip = ? WHERE id = ?',
        [ip, user.id]
      );

      // 7. 生成Token
      const payload: JWTPayload = {
        userId: user.id,
        email: user.email,
        isAdmin: user.is_admin === 1
      };

      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);

      // 8. 记录登录日志
      await this.logAction('login', user.id, 'User logged in successfully', ip);

      return {
        success: true,
        message: 'Login successful',
        accessToken,
        refreshToken
      };
    } finally {
      connection.release();
    }
  }

  /**
   * 刷新Token
   */
  async refreshToken(oldRefreshToken: string): Promise<{ success: boolean; accessToken?: string; refreshToken?: string }> {
    try {
      const decoded = require('../utils/jwt').verifyToken(oldRefreshToken);

      const payload: JWTPayload = {
        userId: decoded.userId,
        email: decoded.email,
        isAdmin: decoded.isAdmin
      };

      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);

      return { success: true, accessToken, refreshToken };
    } catch (error) {
      return { success: false };
    }
  }

  /**
   * 验证邮箱格式
   */
  private isValidEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  /**
   * 记录日志
   */
  private async logAction(type: string, userId: number | null, content: string, ip: string | null) {
    await pool.query(
      'INSERT INTO logs (type, user_id, content, ip) VALUES (?, ?, ?, ?)',
      [type, userId, content, ip]
    );
  }
}
