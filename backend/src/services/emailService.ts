import { ImapFlow } from 'imapflow';
import { simpleParser, ParsedMail } from 'mailparser';
import pool from '../config/database';
import { extractVerificationCode, isVerificationEmail } from '../utils/codeExtractor';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class EmailService {
  private imapClient: ImapFlow | null = null;
  private isRunning = false;           // 服务运行标志
  private isConnecting = false;        // 连接中标志
  private isFetching = false;          // 抓取互斥锁
  private consecutiveFailures = 0;     // 连续失败计数
  private retryCount = 0;              // 重连次数
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pollTimeout: NodeJS.Timeout | null = null;
  private watchdogInterval: NodeJS.Timeout | null = null; // 看门狗定时器
  private lastActivityTime: number = Date.now();       // 最后一次活动时间
  private useIdle = true;                              // 是否使用 IDLE 模式
  private readonly POLL_INTERVAL = 60000;              // 轮询间隔 60 秒（fallback 模式）
  private readonly IDLE_TIMEOUT = 14 * 60 * 1000;      // IDLE 最大持续时间（14分钟，防止 NAT 路由器静默断开）
  private readonly WATCHDOG_INTERVAL = 5 * 60 * 1000;  // 看门狗检查间隔（5分钟）
  private readonly WATCHDOG_TIMEOUT = 20 * 60 * 1000;  // 看门狗超时时间（20分钟无活动则强制重接）

  /**
   * 启动IMAP邮件拉取服务
   */
  async startEmailFetching() {
    console.log('Starting email fetching service...');

    const config = await this.getImapConfig();
    if (!config) {
      console.warn('⚠️  IMAP configuration not found. Email fetching disabled.');
      console.log('💡 Please configure IMAP settings in admin panel.');
      return;
    }

    this.isRunning = true;
    this.updateActivity();

    // 启动看门狗
    this.startWatchdog();

    // 启动主循环
    this.runMainLoop();

    console.log('✅ Email fetching service started');
    console.log('� Email service is active');
  }

  /**
   * 主循环：优先 IDLE，fallback 轮询
   */
  private async runMainLoop() {
    if (!this.isRunning) return;

    try {
      const config = await this.getImapConfig();
      if (!config) {
        this.scheduleNextPoll();
        return;
      }

      // 确保连接
      await this.ensureConnection(config);

      if (!this.imapClient || !this.imapClient.usable) {
        console.warn('⚠️ Connection not ready, will retry...');
        this.scheduleNextPoll();
        return;
      }

      // 先拉取新邮件
      await this.fetchNewEmails();

      // 尝试使用 IDLE 模式
      if (this.useIdle) {
        await this.runIdleMode();
      } else {
        this.scheduleNextPoll();
      }
    } catch (error: any) {
      console.error('❌ Main loop error:', error.message);
      this.handleConnectionError();
    }
  }

  /**
   * 更新最后活动时间
   */
  private updateActivity() {
    this.lastActivityTime = Date.now();
  }

  /**
   * 启动看门狗：定期检查连接是否僵死
   */
  private startWatchdog() {
    this.stopWatchdog();
    this.watchdogInterval = setInterval(() => {
      if (!this.isRunning) return;

      const now = Date.now();
      const timeSinceLastActivity = now - this.lastActivityTime;

      // 如果长时间没有活动（收邮件或心跳），可能连接已僵死
      if (timeSinceLastActivity > this.WATCHDOG_TIMEOUT) {
        console.error(`🚨 Watchdog triggered: No activity for ${Math.round(timeSinceLastActivity / 1000 / 60)} minutes. Forcing reconnect...`);
        this.updateActivity(); // 重置时间防止连续触发

        // 强制关闭当前可能有问题的连接，然后进入重连流程
        this.closeConnection().catch(() => { }).finally(() => {
          this.handleConnectionError();
        });
      }
    }, this.WATCHDOG_INTERVAL);
  }

  /**
   * 停止看门狗
   */
  private stopWatchdog() {
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval);
      this.watchdogInterval = null;
    }
  }

  /**
   * IDLE 模式：实时监听新邮件
   */
  private async runIdleMode() {
    if (!this.imapClient || !this.imapClient.usable || !this.isRunning) {
      this.scheduleNextPoll();
      return;
    }

    try {
      console.log('📨 Entering IDLE mode...');

      // 打开收件箱
      await this.imapClient.mailboxOpen('INBOX');

      // 进入 IDLE 循环
      while (this.isRunning && this.imapClient?.usable) {
        try {
          console.debug('💤 IDLE: Waiting for new emails or timeout...');

          this.updateActivity();

          // 使用 Promise.race 添加最大 IDLE 持续时间限制，防止被 NAT 层静默切断
          await Promise.race([
            this.imapClient.idle(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('IDLE_TIMEOUT_RESTART')), this.IDLE_TIMEOUT))
          ]);

          this.updateActivity();

          // IDLE 返回正常，说明有新邮件，拉取新邮件
          console.log('📬 IDLE returned normally, fetching new emails...');
          await this.fetchNewEmails();
        } catch (idleError: any) {
          this.updateActivity();

          // 如果是我们自己触发的定时强制唤醒
          if (idleError.message === 'IDLE_TIMEOUT_RESTART') {
            console.log('⏱️ IDLE duration limit reached. Breaking IDLE to send heartbeat/noop...');
            // 主动打破 idle 去抓一次（相当于一种深度的 NOOP）然后继续下一轮 while 循环
            await this.fetchNewEmails();
            continue;
          }

          // 检查是否不支持 IDLE
          if (idleError.message?.includes('IDLE') ||
            idleError.message?.includes('not supported')) {
            console.warn('⚠️ IDLE not supported, switching to polling mode');
            this.useIdle = false;
            break;
          }

          // 其他错误，可能是连接问题
          console.error('⚠️ IDLE error:', idleError.message);
          throw idleError;
        }
      }

      // IDLE 结束，调度下一次
      if (this.isRunning) {
        if (this.useIdle) {
          // 连接可能断了，重新进入主循环
          console.log('🔄 IDLE loop ended, restarting main loop...');
          this.scheduleReconnect();
        } else {
          // 降级到轮询
          this.scheduleNextPoll();
        }
      }
    } catch (error: any) {
      console.error('❌ IDLE mode error:', error.message);

      // 如果是 IDLE 不支持的错误，降级到轮询
      if (error.message?.includes('IDLE') || error.message?.includes('not supported')) {
        console.log('⚠️ IDLE not supported, falling back to polling mode');
        this.useIdle = false;
      }

      this.handleConnectionError();
    }
  }

  /**

  /**
   * 调度下一次轮询（链式调度，非固定 interval）
   */
  private scheduleNextPoll() {
    if (!this.isRunning) return;

    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
    }

    console.log(`⏰ Next poll in ${this.POLL_INTERVAL / 1000} seconds...`);

    this.pollTimeout = setTimeout(() => {
      this.pollTimeout = null;
      this.runMainLoop();
    }, this.POLL_INTERVAL);
  }

  /**
   * 停止邮件拉取
   */
  async stopEmailFetching() {
    console.log('Stopping email fetching service...');

    this.isRunning = false;
    this.stopWatchdog();

    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
      this.pollTimeout = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    await this.closeConnection();

    console.log('Email fetching service stopped');
  }

  /**
   * 确保 IMAP 连接
   */
  private async ensureConnection(config: any): Promise<void> {
    // 连接可用则直接返回
    if (this.imapClient?.usable) {
      return;
    }

    // 防止并发连接
    if (this.isConnecting) {
      // 等待连接完成（最多 10 秒）
      for (let i = 0; i < 100 && this.isConnecting; i++) {
        await new Promise(r => setTimeout(r, 100));
      }
      if (this.imapClient?.usable) return;
      throw new Error('Connection attempt timeout');
    }

    this.isConnecting = true;

    try {
      // 先关闭旧连接
      await this.closeConnection();

      console.log('🔄 Creating new IMAP connection...');

      this.imapClient = new ImapFlow({
        host: config.imap_server,
        port: parseInt(config.imap_port),
        secure: true,
        auth: {
          user: config.imap_user,
          pass: config.imap_pass
        },
        logger: false,
        tls: {
          rejectUnauthorized: true
        },
        // 增加超时时间
        socketTimeout: 30000,
        greetingTimeout: 15000
      });

      // 监听连接关闭
      this.imapClient.on('close', () => {
        console.log('📭 IMAP connection closed');
        this.imapClient = null;
        if (this.isRunning) {
          this.scheduleReconnect();
        }
      });

      // 监听错误
      this.imapClient.on('error', (err) => {
        console.error('📭 IMAP error:', err.message);
        this.imapClient = null;
        if (this.isRunning) {
          this.scheduleReconnect();
        }
      });

      await this.imapClient.connect();
      console.log('📬 IMAP connected successfully');

      // 重置计数器
      this.consecutiveFailures = 0;
      this.retryCount = 0;

    } catch (error: any) {
      this.imapClient = null;
      console.error('❌ IMAP connection failed:', error.message);
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * 关闭 IMAP 连接
   */
  private async closeConnection() {
    if (this.imapClient) {
      try {
        if (this.imapClient.usable) {
          await this.imapClient.logout();
        }
      } catch (e) {
        // 忽略关闭错误
      }
      this.imapClient = null;
    }
  }

  /**
   * 处理连接错误
   */
  private handleConnectionError() {
    this.consecutiveFailures++;

    // 提醒，但不退出程序，保持服务在后台自动重连
    if (this.consecutiveFailures % 10 === 0) {
      console.warn(`⚠️ High failure rate: ${this.consecutiveFailures} consecutive connection failures. Will keep retrying...`);
    }

    this.scheduleReconnect();
  }

  /**
   * 调度重连（指数退避）
   */
  private scheduleReconnect() {
    if (this.reconnectTimeout || !this.isRunning) return;

    // 最多延迟 5 分钟
    const MAX_DELAY = 5 * 60 * 1000;
    const delay = Math.min(MAX_DELAY, 1000 * Math.pow(2, this.retryCount));
    this.retryCount++;

    console.log(`🔄 Reconnecting in ${delay / 1000}s (attempt ${this.retryCount})...`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.runMainLoop();
    }, delay);
  }

  /**
   * 获取上次同步的 UID
   */
  private async getLastUid(): Promise<number> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        "SELECT `value` FROM settings WHERE `key` = 'last_imap_uid'"
      );
      return rows.length > 0 ? parseInt(rows[0].value) || 0 : 0;
    } catch {
      return 0;
    }
  }

  /**
   * 保存最后同步的 UID
   */
  private async saveLastUid(uid: number): Promise<void> {
    try {
      await pool.query(
        "INSERT INTO settings (`key`, `value`) VALUES ('last_imap_uid', ?) ON DUPLICATE KEY UPDATE `value` = ?",
        [uid.toString(), uid.toString()]
      );
    } catch (e) {
      console.error('Failed to save last UID');
    }
  }

  /**
   * 拉取新邮件（UID 增量同步）
   */
  private async fetchNewEmails(): Promise<number> {
    if (this.isFetching) {
      console.debug('⏭️ Fetch already in progress, skipping...');
      return 0;
    }

    if (!this.imapClient?.usable) {
      console.warn('⚠️ Connection not usable for fetching');
      return 0;
    }

    this.isFetching = true;
    let processedCount = 0;
    let maxUid = 0;

    try {
      // 获取上次同步的 UID
      const lastUid = await this.getLastUid();
      console.debug(`📥 Fetching emails with UID > ${lastUid}...`);

      // 打开收件箱（如果还没打开）
      try {
        await this.imapClient.mailboxOpen('INBOX');
      } catch {
        // 可能已经打开了
      }

      // 只拉取 UID 大于 lastUid 的新邮件
      const range = lastUid > 0 ? `${lastUid + 1}:*` : '1:*';

      // 第一次同步时，只拉最近 50 封
      let fetchCount = 0;
      const isFirstSync = lastUid === 0;
      const maxFirstSync = 50;

      for await (const message of this.imapClient.fetch(range, {
        uid: true,
        envelope: true,
        source: true
      })) {
        // 第一次同步限制数量
        if (isFirstSync && fetchCount >= maxFirstSync) {
          console.log(`⚠️ First sync: limiting to ${maxFirstSync} emails`);
          break;
        }
        fetchCount++;

        try {
          if (!message.source || !message.uid) continue;

          // 更新最大 UID
          maxUid = Math.max(maxUid, message.uid);

          // 解析邮件
          const parsed = await simpleParser(message.source);
          const toAddr = this.extractToAddress(parsed);
          if (!toAddr) continue;

          // 用 UID 检查是否已存在（更高效）
          const [existing] = await pool.query<RowDataPacket[]>(
            'SELECT id FROM emails WHERE imap_uid = ?',
            [message.uid]
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
          const priority = isVerificationEmail(parsed.subject || '', bodyText) ? 1 : 0;

          // 保存到数据库（包含 imap_uid）
          await pool.query(
            `INSERT INTO emails (user_id, from_addr, to_addr, subject, body_html, body_text, extracted_code, priority, received_at, imap_uid)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              userId,
              parsed.from?.text || '',
              toAddr,
              parsed.subject || '',
              bodyHtml || null,
              bodyText || null,
              extractedCode,
              priority,
              parsed.date || new Date(),
              message.uid
            ]
          );

          processedCount++;
          console.debug(`✅ Saved email: ${parsed.subject?.substring(0, 30)}...`);
        } catch (msgError: any) {
          console.error('Error processing email:', msgError.message);
        }
      }

      // 保存最大 UID
      if (maxUid > lastUid) {
        await this.saveLastUid(maxUid);
        console.log(`📊 Synced ${processedCount} new emails, last UID: ${maxUid}`);
      }

      // 更新状态
      this.updateActivity(); // 拉取成功更新活动时间
      await this.updateStatus('success');
      if (processedCount > 0) {
        await this.logFetch('success', `Fetched ${processedCount} new emails`);
      }

      this.consecutiveFailures = 0;
      return processedCount;

    } catch (error: any) {
      console.error('Email fetch error:', error.message);
      await this.updateStatus('failed');
      await this.logFetch('error', `Fetch failed: ${error.message}`);
      this.consecutiveFailures++;
      return 0;
    } finally {
      this.isFetching = false;
    }
  }

  /**
   * 手动触发邮件拉取
   */
  async manualFetch(): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      const config = await this.getImapConfig();
      if (!config) {
        return { success: false, message: 'IMAP not configured' };
      }

      await this.ensureConnection(config);
      const count = await this.fetchNewEmails();
      return { success: true, message: 'Fetch completed', count };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /**
   * 提取收件人地址
   */
  private extractToAddress(parsed: ParsedMail): string | null {
    if (parsed.to) {
      const toArray = Array.isArray(parsed.to) ? parsed.to : [parsed.to];
      if (toArray.length > 0 && toArray[0].value && toArray[0].value.length > 0) {
        return toArray[0].value[0].address || null;
      }
    }

    const deliveredTo = parsed.headers.get('delivered-to');
    if (deliveredTo) {
      return deliveredTo.toString();
    }

    return null;
  }

  /**
   * 更新状态
   */
  private async updateStatus(status: string) {
    try {
      await pool.query(
        "INSERT INTO settings (`key`, `value`) VALUES ('last_imap_check', ?) ON DUPLICATE KEY UPDATE `value` = ?",
        [status, status]
      );
    } catch {
      // 忽略
    }
  }

  /**
   * 获取IMAP配置
   */
  private async getImapConfig(): Promise<any> {
    const [settings] = await pool.query<RowDataPacket[]>(
      "SELECT `key`, `value` FROM settings WHERE `key` IN ('imap_server', 'imap_port', 'imap_user', 'imap_pass')"
    );

    if (settings.length === 0) return null;

    const config: any = {};
    settings.forEach((setting: any) => {
      config[setting.key] = setting.value;
    });

    // 验证必要字段
    if (!config.imap_server || !config.imap_user || !config.imap_pass) {
      return null;
    }

    return config;
  }

  /**
   * 记录拉取日志
   */
  private async logFetch(type: string, content: string) {
    try {
      await pool.query(
        'INSERT INTO logs (type, user_id, content, ip) VALUES (?, ?, ?, ?)',
        ['email_fetch', null, `[${type}] ${content}`, null]
      );
    } catch {
      // 忽略
    }
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
        try { await client.logout(); } catch { }
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

    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM emails ${whereClause}`,
      params
    );

    const total = countResult[0].total;

    const [emails] = await pool.query<RowDataPacket[]>(
      `SELECT id, from_addr, subject, extracted_code, is_read, tag_id, priority, received_at, created_at
       FROM emails ${whereClause}
       ORDER BY priority DESC, received_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return { total, page, pageSize, data: emails };
  }

  /**
   * 获取邮件详情
   */
  async getEmailById(emailId: number, userId: number) {
    const [emails] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM emails WHERE id = ? AND user_id = ?',
      [emailId, userId]
    );

    if (emails.length === 0) return null;

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
