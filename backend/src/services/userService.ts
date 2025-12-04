import pool from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { ResultSetHeader } from 'mysql2';

export class UserService {
  /**
   * 用户修改密码
   */
  async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      // 获取用户信息
      const [users] = await pool.query<any[]>(
        'SELECT password_hash FROM users WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        return { success: false, message: 'User not found' };
      }

      // 验证旧密码
      const isValid = await comparePassword(oldPassword, users[0].password_hash);

      if (!isValid) {
        return { success: false, message: 'Old password is incorrect' };
      }

      // 更新密码
      const newPasswordHash = await hashPassword(newPassword);

      await pool.query<ResultSetHeader>(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [newPasswordHash, userId]
      );

      return { success: true, message: 'Password changed successfully' };
    } catch (error: any) {
      console.error('Change password error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  /**
   * 获取用户统计信息
   */
  async getUserStats(userId: number) {
    // 未读邮件数
    const [unreadEmails] = await pool.query<any[]>(
      'SELECT COUNT(*) as count FROM emails WHERE user_id = ? AND is_read = 0',
      [userId]
    );

    // 总邮件数
    const [totalEmails] = await pool.query<any[]>(
      'SELECT COUNT(*) as count FROM emails WHERE user_id = ?',
      [userId]
    );

    // 今日邮件数
    const [todayEmails] = await pool.query<any[]>(
      'SELECT COUNT(*) as count FROM emails WHERE user_id = ? AND DATE(received_at) = CURDATE()',
      [userId]
    );

    return {
      unreadCount: unreadEmails[0].count,
      totalCount: totalEmails[0].count,
      todayCount: todayEmails[0].count
    };
  }
}
