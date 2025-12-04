import pool from '../config/database';
import { hashPassword } from '../utils/password';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class AdminService {
  /**
   * 生成子邮箱
   */
  async generateSubemails(count: number, domain: string): Promise<string[]> {
    const generated: string[] = [];

    for (let i = 0; i < count; i++) {
      const randomStr = this.generateRandomString(8);
      const email = `${randomStr}@${domain}`;

      try {
        await pool.query(
          'INSERT INTO subemails (email) VALUES (?)',
          [email]
        );
        generated.push(email);
      } catch (error) {
        // 如果重复则跳过
        console.error(`Failed to generate ${email}:`, error);
      }
    }

    return generated;
  }

  /**
   * 获取子邮箱列表
   */
  async getSubemails(page: number = 1, pageSize: number = 20, isAssigned?: boolean) {
    const offset = (page - 1) * pageSize;

    let whereClause = '';
    const params: any[] = [];

    if (isAssigned !== undefined) {
      whereClause = 'WHERE is_assigned = ?';
      params.push(isAssigned ? 1 : 0);
    }

    // 获取总数
    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM subemails ${whereClause}`,
      params
    );

    const total = countResult[0].total;

    // 获取列表
    const [subemails] = await pool.query<RowDataPacket[]>(
      `SELECT s.*, u.email as user_email
       FROM subemails s
       LEFT JOIN users u ON s.assigned_user_id = u.id
       ${whereClause}
       ORDER BY s.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return {
      total,
      page,
      pageSize,
      data: subemails
    };
  }

  /**
   * 获取用户列表
   */
  async getUsers(page: number = 1, pageSize: number = 20, keyword?: string) {
    const offset = (page - 1) * pageSize;

    let whereClause = '';
    const params: any[] = [];

    if (keyword) {
      whereClause = 'WHERE email LIKE ?';
      params.push(`%${keyword}%`);
    }

    // 获取总数
    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      params
    );

    const total = countResult[0].total;

    // 获取列表（包含邮件数量）
    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT u.*,
       (SELECT COUNT(*) FROM emails WHERE user_id = u.id) as email_count
       FROM users u
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return {
      total,
      page,
      pageSize,
      data: users
    };
  }

  /**
   * 禁用/启用用户
   */
  async toggleUserStatus(userId: number, status: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE users SET status = ? WHERE id = ?',
      [status, userId]
    );

    return result.affectedRows > 0;
  }

  /**
   * 删除用户
   */
  async deleteUser(userId: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM users WHERE id = ?',
      [userId]
    );

    return result.affectedRows > 0;
  }

  /**
   * 管理员强制修改用户密码
   */
  async resetUserPassword(userId: number, newPassword: string): Promise<boolean> {
    const passwordHash = await hashPassword(newPassword);

    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [passwordHash, userId]
    );

    return result.affectedRows > 0;
  }

  /**
   * 解锁用户账号
   */
  async unlockUser(userId: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE users SET failed_login_count = 0, locked_until = NULL WHERE id = ?',
      [userId]
    );

    return result.affectedRows > 0;
  }

  /**
   * 获取所有邮件列表（管理员）
   */
  async getAllEmails(page: number = 1, pageSize: number = 20) {
    const offset = (page - 1) * pageSize;

    // 获取总数
    const [countResult] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM emails'
    );

    const total = countResult[0].total;

    // 获取列表
    const [emails] = await pool.query<RowDataPacket[]>(
      `SELECT e.*, u.email as user_email
       FROM emails e
       LEFT JOIN users u ON e.user_id = u.id
       ORDER BY e.received_at DESC
       LIMIT ? OFFSET ?`,
      [pageSize, offset]
    );

    return {
      total,
      page,
      pageSize,
      data: emails
    };
  }

  /**
   * 获取标签列表
   */
  async getTags() {
    const [tags] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM tags ORDER BY id ASC'
    );

    return tags;
  }

  /**
   * 添加标签
   */
  async addTag(nameZh: string, nameEn: string): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO tags (name_zh, name_en) VALUES (?, ?)',
      [nameZh, nameEn]
    );

    return result.insertId;
  }

  /**
   * 更新标签
   */
  async updateTag(tagId: number, nameZh: string, nameEn: string): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE tags SET name_zh = ?, name_en = ? WHERE id = ?',
      [nameZh, nameEn, tagId]
    );

    return result.affectedRows > 0;
  }

  /**
   * 删除标签
   */
  async deleteTag(tagId: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM tags WHERE id = ?',
      [tagId]
    );

    return result.affectedRows > 0;
  }

  /**
   * 获取系统配置
   */
  async getSettings() {
    const [settings] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM settings ORDER BY id ASC'
    );

    const config: any = {};
    settings.forEach((setting: any) => {
      config[setting.key] = setting.value;
    });

    return config;
  }

  /**
   * 更新系统配置
   */
  async updateSettings(settings: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(settings)) {
      await pool.query(
        'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
        [key, value, value]
      );
    }
  }

  /**
   * 发送测试邮件
   */
  async sendTestEmail(recipient: string): Promise<void> {
    const nodemailer = require('nodemailer');

    // 获取SMTP配置
    const [settings] = await pool.query<RowDataPacket[]>(
      'SELECT `key`, `value` FROM settings WHERE `key` IN ("smtp_server", "smtp_port", "smtp_user", "smtp_pass")'
    );

    const config: any = {};
    settings.forEach((setting: any) => {
      config[setting.key] = setting.value;
    });

    if (!config.smtp_server || !config.smtp_port || !config.smtp_user || !config.smtp_pass) {
      throw new Error('SMTP配置不完整，请先配置SMTP设置');
    }

    // 创建传输器
    const transporter = nodemailer.createTransport({
      host: config.smtp_server,
      port: parseInt(config.smtp_port),
      secure: parseInt(config.smtp_port) === 465, // 465端口使用SSL
      auth: {
        user: config.smtp_user,
        pass: config.smtp_pass
      }
    });

    // 发送测试邮件
    await transporter.sendMail({
      from: config.smtp_user,
      to: recipient,
      subject: '邮件系统测试 - Test Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #409EFF; border-bottom: 2px solid #409EFF; padding-bottom: 10px;">
            📧 邮件系统测试
          </h2>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            这是一封来自子邮箱验证码接收系统的测试邮件。
          </p>
          <div style="background-color: #f5f7fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>发送时间：</strong>${new Date().toLocaleString('zh-CN')}</p>
            <p style="margin: 5px 0;"><strong>SMTP服务器：</strong>${config.smtp_server}</p>
            <p style="margin: 5px 0;"><strong>发件人：</strong>${config.smtp_user}</p>
          </div>
          <p style="font-size: 14px; color: #666;">
            如果您收到这封邮件，说明SMTP配置正确，邮件发送功能正常运行。
          </p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">
            此邮件由子邮箱验证码接收系统自动发送，请勿回复
          </p>
        </div>
      `,
      text: `
邮件系统测试

这是一封来自子邮箱验证码接收系统的测试邮件。

发送时间：${new Date().toLocaleString('zh-CN')}
SMTP服务器：${config.smtp_server}
发件人：${config.smtp_user}

如果您收到这封邮件，说明SMTP配置正确，邮件发送功能正常运行。

此邮件由子邮箱验证码接收系统自动发送，请勿回复
      `
    });
  }

  /**
   * 获取系统日志
   */
  async getLogs(page: number = 1, pageSize: number = 50, type?: string) {
    const offset = (page - 1) * pageSize;

    let whereClause = '';
    const params: any[] = [];

    if (type) {
      whereClause = 'WHERE type = ?';
      params.push(type);
    }

    // 获取总数
    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM logs ${whereClause}`,
      params
    );

    const total = countResult[0].total;

    // 获取列表
    const [logs] = await pool.query<RowDataPacket[]>(
      `SELECT l.*, u.email as user_email
       FROM logs l
       LEFT JOIN users u ON l.user_id = u.id
       ${whereClause}
       ORDER BY l.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return {
      total,
      page,
      pageSize,
      data: logs
    };
  }

  /**
   * 获取仪表盘统计数据
   */
  async getDashboardStats() {
    try {
      // 用户总数
      const [totalUsers] = await pool.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM users WHERE is_admin = 0'
      );

      // 今日新增用户
      const [newUsersToday] = await pool.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM users WHERE is_admin = 0 AND DATE(created_at) = CURDATE()'
      );

      // 邮件总数
      const [totalEmails] = await pool.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM emails'
      );

      // 今日接收邮件数
      const [newEmailsToday] = await pool.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM emails WHERE DATE(received_at) = CURDATE()'
      );

      // 子邮箱总数
      const [totalSubemails] = await pool.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM subemails'
      );

      // 已分配子邮箱数
      const [assignedSubemails] = await pool.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM subemails WHERE assigned_user_id IS NOT NULL'
      );

      // 标签总数
      const [totalTags] = await pool.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM tags'
      );

      // 已使用标签数（至少有一封邮件使用的标签）
      const [usedTags] = await pool.query<RowDataPacket[]>(
        'SELECT COUNT(DISTINCT tag_id) as count FROM emails WHERE tag_id IS NOT NULL'
      );

      // 检查IMAP状态（查看最近一次IMAP检查是否成功）
      let imapStatus = false;
      try {
        const [lastImapCheck] = await pool.query<RowDataPacket[]>(
          'SELECT `value` FROM settings WHERE `key` = "last_imap_check"'
        );
        imapStatus = lastImapCheck.length > 0 && lastImapCheck[0].value === 'success';
      } catch (error) {
        console.error('Failed to check IMAP status:', error);
      }

      // 检查数据库状态（如果能查询就说明数据库正常）
      const databaseStatus = true;

      return {
        totalUsers: totalUsers[0]?.count || 0,
        newUsersToday: newUsersToday[0]?.count || 0,
        totalEmails: totalEmails[0]?.count || 0,
        newEmailsToday: newEmailsToday[0]?.count || 0,
        totalSubemails: totalSubemails[0]?.count || 0,
        assignedSubemails: assignedSubemails[0]?.count || 0,
        totalTags: totalTags[0]?.count || 0,
        usedTags: usedTags[0]?.count || 0,
        imapStatus,
        databaseStatus
      };
    } catch (error) {
      console.error('Failed to get dashboard stats:', error);
      // 返回默认值
      return {
        totalUsers: 0,
        newUsersToday: 0,
        totalEmails: 0,
        newEmailsToday: 0,
        totalSubemails: 0,
        assignedSubemails: 0,
        totalTags: 0,
        usedTags: 0,
        imapStatus: false,
        databaseStatus: false
      };
    }
  }

  /**
   * 生成随机字符串
   */
  private generateRandomString(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
