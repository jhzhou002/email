-- ==========================================
-- 清理 settings 表中的无用配置项
-- ==========================================

-- 删除未使用的配置项
DELETE FROM `settings` WHERE `key` IN (
  'domain',
  'smtp_server',
  'smtp_port',
  'smtp_user',
  'smtp_pass',
  'email_retention_days',
  'imap_fetch_interval',
  'max_failed_login_attempts',
  'account_lock_duration',
  'check_interval',
  'supported_domains',
  'prefix_length',
  'retention_days',
  'enable_notification',
  'enable_logging'
);

-- 显示剩余的配置项
SELECT * FROM `settings` ORDER BY `key`;
