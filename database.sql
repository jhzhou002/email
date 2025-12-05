-- ==========================================
-- 子邮箱验证码接收系统 - 数据库设计
-- ==========================================

-- 1. 用户表
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL UNIQUE COMMENT '子邮箱地址',
  `password_hash` VARCHAR(255) NOT NULL COMMENT 'bcrypt加密后的密码',
  `is_admin` TINYINT(1) DEFAULT 0 COMMENT '是否管理员 0否 1是',
  `status` TINYINT(1) DEFAULT 0 COMMENT '账号状态 0正常 1禁用',
  `failed_login_count` INT DEFAULT 0 COMMENT '登录失败次数',
  `locked_until` DATETIME NULL COMMENT '锁定结束时间',
  `last_login_at` DATETIME NULL COMMENT '最后登录时间',
  `last_login_ip` VARCHAR(45) NULL COMMENT '最后登录IP',
  `language_preference` VARCHAR(10) DEFAULT 'zh' COMMENT '语言偏好 zh/en',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_email` (`email`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 2. 子邮箱池表
CREATE TABLE IF NOT EXISTS `subemails` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL UNIQUE COMMENT '子邮箱地址',
  `is_assigned` TINYINT(1) DEFAULT 0 COMMENT '是否已分配 0否 1是',
  `assigned_user_id` INT NULL COMMENT '分配给的用户ID',
  `remark` VARCHAR(255) DEFAULT '' COMMENT '备注',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '生成时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_is_assigned` (`is_assigned`),
  FOREIGN KEY (`assigned_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='子邮箱池';

-- 3. 邮件标签表
CREATE TABLE IF NOT EXISTS `tags` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name_zh` VARCHAR(50) NOT NULL COMMENT '中文标签名',
  `name_en` VARCHAR(50) NOT NULL COMMENT '英文标签名',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邮件标签';

-- 4. 邮件表
CREATE TABLE IF NOT EXISTS `emails` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL COMMENT '所属用户ID',
  `from_addr` VARCHAR(255) NOT NULL COMMENT '发件人',
  `to_addr` VARCHAR(255) NOT NULL COMMENT '收件人（子邮箱）',
  `subject` VARCHAR(500) DEFAULT '' COMMENT '邮件标题',
  `body_html` LONGTEXT COMMENT 'HTML正文',
  `body_text` TEXT COMMENT '纯文本正文',
  `extracted_code` VARCHAR(20) NULL COMMENT '自动提取的验证码',
  `is_read` TINYINT(1) DEFAULT 0 COMMENT '是否已读 0否 1是',
  `tag_id` INT NULL COMMENT '标签ID',
  `priority` TINYINT(1) DEFAULT 0 COMMENT '优先级 0普通 1验证码',
  `received_at` DATETIME NOT NULL COMMENT '邮件接收时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '入库时间',
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_received_at` (`received_at`),
  INDEX `idx_is_read` (`is_read`),
  INDEX `idx_priority` (`priority`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邮件表';

-- 5. 系统配置表
CREATE TABLE IF NOT EXISTS `settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(100) NOT NULL UNIQUE COMMENT '配置键',
  `value` TEXT COMMENT '配置值',
  `description` VARCHAR(255) COMMENT '配置说明',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- 6. 系统日志表
CREATE TABLE IF NOT EXISTS `logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `type` VARCHAR(50) NOT NULL COMMENT '日志类型 login/admin_op/email_fetch/error',
  `user_id` INT NULL COMMENT '关联用户ID',
  `content` TEXT NOT NULL COMMENT '日志内容',
  `ip` VARCHAR(45) NULL COMMENT 'IP地址',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_type` (`type`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_created_at` (`created_at`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统日志表';

-- ==========================================
-- 初始化数据
-- ==========================================

-- 插入默认管理员账号 (密码: admin123 需要在后端首次运行时生成hash)
-- INSERT INTO `users` (`email`, `password_hash`, `is_admin`, `status`)
-- VALUES ('admin@aihubzone.shop', '$2b$10$placeholder', 1, 0);

-- 插入默认标签
INSERT INTO `tags` (`name_zh`, `name_en`) VALUES
('验证码', 'Verification Code'),
('通知', 'Notification'),
('广告', 'Advertisement');

-- 插入默认系统配置（仅保留实际使用的配置项）
INSERT INTO `settings` (`key`, `value`, `description`) VALUES
('imap_server', '', 'IMAP服务器地址'),
('imap_port', '993', 'IMAP端口'),
('imap_user', '', 'IMAP用户名'),
('imap_pass', '', 'IMAP密码/授权码'),
('smtp_server', '', 'SMTP服务器地址'),
('smtp_port', '587', 'SMTP端口'),
('smtp_user', '', 'SMTP用户名'),
('smtp_pass', '', 'SMTP密码/授权码'),
('main_domain', '', '主域名/二级域名，用于生成子邮箱');
