import { ImapFlow } from 'imapflow';
import { simpleParser, ParsedMail } from 'mailparser';
import pool from '../config/database';
import { extractVerificationCode, isVerificationEmail } from '../utils/codeExtractor';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class EmailService {
  private imapClient: ImapFlow | null = null;
  private fetchInterval: NodeJS.Timeout | null = null;
  private consecutiveFailures = 0;
  private isConnecting = false;
  private lastConnectionAttempt = 0;

  /**
   * 启动IMAP邮件拉取定时任务
   */
  async startEmailFetching() {
    console.log('Starting email fetching service...');

    // 获取IMAP配置
    const config = await this.getImapConfig();

    if (!config) {
      console.warn('⚠️  IMAP configuration not found. Email fetching disabled.');
      console.log('💡 Please configure IMAP settings in admin panel.');
      return;
    }

    // 立即执行一次（忽略错误，不阻塞启动）
    try {
      await this.fetchEmails();
    } catch (error: any) {
      console.error('⚠️  Initial email fetch failed:', error.message);
      console.log('💡 Please check IMAP configuration. Service will continue running.');
    }

    // 每10秒执行一次
    this.fetchInterval = setInterval(async () => {
      await this.fetchEmails();
    }, 10000);
  }

  /**
   * 停止邮件拉取
   */
  async stopEmailFetching() {
    if (this.fetchInterval) {
      clearInterval(this.fetchInterval);
      this.fetchInterval = null;
    }

    await this.closeImapConnection();

    console.log('Email fetching service stopped');
  }

  /**
   * 安全关闭IMAP连接
   */
  private async closeImapConnection() {
    if (this.imapClient) {
      try {
        // 检查连接状态
        if (this.imapClient.usable) {
          await this.imapClient.logout();
        }
      } catch (error: any) {
        // 忽略关闭时的错误
        console.debug('Error closing IMAP connection:', error.message);
      } finally {
        this.imapClient = null;
      }
    }
  }

  /**
   * 手动触发邮件拉取
   */
  async manualFetch(): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      const count = await this.fetchEmails();
      return { success: true, message: 'Fetch completed', count };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /**
   * 连接或重连IMAP
   */
  private async ensureImapConnection(config: any): Promise<void> {
    // 防止并发连接
    if (this.isConnecting) {
      throw new Error('Connection attempt already in progress');
    }

    // 限制重连频率（至少间隔5秒）
    const now = Date.now();
    if (now - this.lastConnectionAttempt < 5000) {
      throw new Error('Too frequent connection attempts');
    }

    this.isConnecting = true;
    this.lastConnectionAttempt = now;

    try {
      // 检查现有连接是否可用
      if (this.imapClient && this.imapClient.usable) {
        this.isConnecting = false;
        return;
      }

      // 关闭旧连接
      await this.closeImapConnection();

      // 创建新连接
      this.imapClient = new ImapFlow({
        host: config.imap_server,
        port: parseInt(config.imap_port),
        secure: true,
        auth: {
          user: config.imap_user,
          pass: config.imap_pass
        },
        logger: false
      });

      // 监听连接关闭事件
      this.imapClient.on('close', () => {
        console.log('📭 IMAP connection closed');
        this.imapClient = null;
      });

      this.imapClient.on('error', (err) => {
        console.error('📭 IMAP connection error:', err.message);
        this.imapClient = null;
      });

      await this.imapClient.connect();
      console.log('📬 IMAP connected successfully');
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * 拉取邮件
   */
  private async fetchEmails(): Promise<number> {
    try {
      const config = await this.getImapConfig();

      if (!config) {
        throw new Error('IMAP configuration not found');
      }

      // 确保IMAP连接
      await this.ensureImapConnection(config);

      if (!this.imapClient) {
        throw new Error('Failed to establish IMAP connection');
      }

      // 打开收件箱
      await this.imapClient.mailboxOpen('INBOX');

      // 获取未读邮件（或最近的邮件）
      const messages = [];
      for await (const message of this.imapClient.fetch('1:*', {
        envelope: true,
        source: true
      })) {
        messages.push(message);
      }

      // 处理最新的50封邮件（避免一次性处理太多）
      const recentMessages = messages.slice(-50);
      let processedCount = 0;

      for (const message of recentMessages) {
        try {
          // 解析邮件
          const parsed = await simpleParser(message.source);

          // 提取收件人
          const toAddr = this.extractToAddress(parsed);

          if (!toAddr) continue;

          // 检查邮件是否已存在
          const [existing] = await pool.query<RowDataPacket[]>(
            'SELECT id FROM emails WHERE from_addr = ? AND subject = ? AND received_at = ?',
            [parsed.from?.text || '', parsed.subject || '', parsed.date || new Date()]
          );

          if (existing.length > 0) continue;

          // 查找对应用户
          const [users] = await pool.query<RowDataPacket[]>(
            'SELECT id FROM users WHERE email = ?',
            [toAddr]
          );

          if (users.length === 0) continue;

          const userId = users[0].id;

          // 提取验证码
          const bodyText = parsed.text || '';
          const bodyHtml = parsed.html || '';
          const extractedCode = extractVerificationCode(bodyText + ' ' + bodyHtml);

          // 判断是否为验证码邮件
          const priority = isVerificationEmail(parsed.subject || '', bodyText) ? 1 : 0;

          // 保存到数据库
          await pool.query(
            `INSERT INTO emails (user_id, from_addr, to_addr, subject, body_html, body_text, extracted_code, priority, received_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              userId,
              parsed.from?.text || '',
              toAddr,
              parsed.subject || '',
              bodyHtml || null,
              bodyText || null,
              extractedCode,
              priority,
              parsed.date || new Date()
            ]
          );

          processedCount++;
        } catch (error) {
          console.error('Error processing email:', error);
        }
      }

      // 重置失败计数
      this.consecutiveFailures = 0;

      // 更新IMAP检查状态为成功
      try {
        await pool.query(
          'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
          ['last_imap_check', 'success', 'success']
        );
      } catch (error) {
        // 忽略更新状态错误
      }

      // 记录日志
      await this.logFetch('success', `Fetched ${processedCount} new emails`);

      return processedCount;
    } catch (error: any) {
      this.consecutiveFailures++;

      console.error('Email fetch error:', error.message);

      // 更新IMAP检查状态为失败
      try {
        await pool.query(
          'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
          ['last_imap_check', 'failed', 'failed']
        );
      } catch (updateError) {
        // 忽略更新状态错误
      }

      // 记录错误日志
      try {
        await this.logFetch('error', `Failed to fetch emails: ${error.message}`);
      } catch (logError) {
        // 忽略日志记录错误
      }

      // 连续失败3次显示警告
      if (this.consecutiveFailures >= 3) {
        console.warn(`⚠️ Email fetching has failed ${this.consecutiveFailures} times consecutively`);
      }

      // 连续失败20次暂停服务（给更多重试机会）
      if (this.consecutiveFailures >= 20) {
        console.error('❌ Too many consecutive failures. Stopping email fetch service.');
        await this.stopEmailFetching();
      }

      // 关闭失败的连接
      await this.closeImapConnection();

      // 不抛出错误，让服务继续运行
      return 0;
    }
  }

  /**
   * 提取收件人地址
   */
  private extractToAddress(parsed: ParsedMail): string | null {
    // 从 To 字段提取
    if (parsed.to) {
      const toArray = Array.isArray(parsed.to) ? parsed.to : [parsed.to];
      if (toArray.length > 0 && toArray[0].value && toArray[0].value.length > 0) {
        return toArray[0].value[0].address || null;
      }
    }

    // 从 headers 中提取 Delivered-To
    const deliveredTo = parsed.headers.get('delivered-to');
    if (deliveredTo) {
      return deliveredTo.toString();
    }

    return null;
  }

  /**
   * 获取IMAP配置
   */
  private async getImapConfig(): Promise<any> {
    const [settings] = await pool.query<RowDataPacket[]>(
      `SELECT \`key\`, \`value\` FROM settings WHERE \`key\` IN ('imap_server', 'imap_port', 'imap_user', 'imap_pass')`
    );

    if (settings.length === 0) return null;

    const config: any = {};
    settings.forEach((setting: any) => {
      config[setting.key] = setting.value;
    });

    return config;
  }

  /**
   * 记录拉取日志
   */
  private async logFetch(type: string, content: string) {
    await pool.query(
      'INSERT INTO logs (type, user_id, content, ip) VALUES (?, ?, ?, ?)',
      ['email_fetch', null, `[${type}] ${content}`, null]
    );
  }

  /**
   * 测试IMAP连接
   */
  async testImapConnection(config: {
    imap_server: string;
    imap_port: string;
    imap_user: string;
    imap_pass: string;
  }): Promise<{ success: boolean; message: string }> {
    let client: ImapFlow | null = null;

    try {
      client = new ImapFlow({
        host: config.imap_server,
        port: parseInt(config.imap_port),
        secure: true,
        auth: {
          user: config.imap_user,
          pass: config.imap_pass
        },
        logger: false
      });

      await client.connect();
      await client.mailboxOpen('INBOX');

      await client.logout();

      return { success: true, message: 'IMAP connection successful' };
    } catch (error: any) {
      if (client) {
        try {
          await client.logout();
        } catch (e) {
          // 忽略
        }
      }

      return { success: false, message: `IMAP connection failed: ${error.message}` };
    }
  }

  /**
   * 获取邮件列表
   */
  async getEmails(userId: number, page: number = 1, pageSize: number = 20, keyword?: string, tagId?: number) {
    const offset = (page - 1) * pageSize;

    let whereClause = 'WHERE user_id = ?';
    const params: any[] = [userId];

    if (keyword) {
      whereClause += ' AND (subject LIKE ? OR from_addr LIKE ? OR body_text LIKE ?)';
      const keywordPattern = `%${keyword}%`;
      params.push(keywordPattern, keywordPattern, keywordPattern);
    }

    if (tagId) {
      whereClause += ' AND tag_id = ?';
      params.push(tagId);
    }

    // 获取总数
    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM emails ${whereClause}`,
      params
    );

    const total = countResult[0].total;

    // 获取列表
    const [emails] = await pool.query<RowDataPacket[]>(
      `SELECT id, from_addr, subject, extracted_code, is_read, tag_id, priority, received_at, created_at
       FROM emails ${whereClause}
       ORDER BY priority DESC, received_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return {
      total,
      page,
      pageSize,
      data: emails
    };
  }

  /**
   * 获取邮件详情
   */
  async getEmailById(emailId: number, userId: number) {
    const [emails] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM emails WHERE id = ? AND user_id = ?',
      [emailId, userId]
    );

    if (emails.length === 0) {
      return null;
    }

    // 标记为已读
    await pool.query('UPDATE emails SET is_read = 1 WHERE id = ?', [emailId]);

    return emails[0];
  }

  /**
   * 删除邮件
   */
  async deleteEmail(emailId: number, userId: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM emails WHERE id = ? AND user_id = ?',
      [emailId, userId]
    );

    return result.affectedRows > 0;
  }

  /**
   * 为邮件打标签
   */
  async tagEmail(emailId: number, userId: number, tagId: number | null): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE emails SET tag_id = ? WHERE id = ? AND user_id = ?',
      [tagId, emailId, userId]
    );

    return result.affectedRows > 0;
  }

  /**
   * 清理30天前的邮件
   */
  async cleanupOldEmails(): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM emails WHERE received_at < DATE_SUB(NOW(), INTERVAL 30 DAY)'
    );

    await this.logFetch('cleanup', `Cleaned up ${result.affectedRows} old emails`);

    return result.affectedRows;
  }
}
