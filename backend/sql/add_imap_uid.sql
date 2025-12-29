-- 添加 imap_uid 字段用于增量同步
-- 运行此脚本: mysql -u root -p email_db < add_imap_uid.sql

-- 添加 imap_uid 列
ALTER TABLE emails ADD COLUMN imap_uid BIGINT NULL AFTER received_at;

-- 创建索引加速查询
CREATE INDEX idx_emails_imap_uid ON emails(imap_uid);

-- 添加 last_imap_uid 配置项
INSERT INTO settings (`key`, `value`) VALUES ('last_imap_uid', '0')
ON DUPLICATE KEY UPDATE `value` = `value`;

-- 验证
SELECT 'Migration completed!' AS status;
