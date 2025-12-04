# Email Backend Service

子邮箱验证码接收系统后端服务

## 技术栈

- Node.js + TypeScript
- Express
- MySQL (mysql2)
- JWT认证
- IMAP邮件拉取 (imapflow)
- 邮件解析 (mailparser)

## 安装依赖

```bash
npm install
```

## 配置

1. 复制 `.env.example` 到 `.env`
2. 修改数据库配置和其他环境变量

## 初始化数据库

```bash
# 在MySQL中执行
mysql -h 49.235.74.98 -u remote -p email < ../database.sql
```

## 创建管理员账号

```bash
npm run init-admin
```

## 运行

### 开发模式
```bash
npm run dev
```

### 生产模式
```bash
npm run build
npm start
```

## API文档

### 公共接口

- `GET /api/captcha` - 获取数学验证码
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/refresh` - 刷新Token

### 用户接口（需登录）

- `GET /api/auth/me` - 获取当前用户信息
- `GET /api/emails` - 获取邮件列表
- `GET /api/emails/:id` - 获取邮件详情
- `DELETE /api/emails/:id` - 删除邮件
- `PUT /api/emails/:id/tag` - 为邮件打标签
- `POST /api/emails/fetch` - 手动刷新邮件
- `GET /api/tags` - 获取标签列表
- `PUT /api/user/password` - 修改密码
- `GET /api/user/stats` - 获取用户统计

### 管理员接口（需管理员权限）

- `GET /api/admin/dashboard` - 仪表盘数据
- `POST /admin/subemails/generate` - 生成子邮箱
- `GET /admin/subemails` - 获取子邮箱列表
- `GET /admin/users` - 获取用户列表
- `PUT /admin/users/:id/status` - 禁用/启用用户
- `DELETE /admin/users/:id` - 删除用户
- `PUT /admin/users/:id/password` - 重置用户密码
- `PUT /admin/users/:id/unlock` - 解锁用户
- `GET /admin/emails` - 获取所有邮件
- `POST /admin/tags` - 添加标签
- `PUT /admin/tags/:id` - 更新标签
- `DELETE /admin/tags/:id` - 删除标签
- `GET /admin/settings` - 获取系统配置
- `PUT /admin/settings` - 更新系统配置
- `POST /admin/settings/test-imap` - 测试IMAP连接
- `GET /admin/logs` - 获取系统日志

## 功能特性

✅ 用户注册/登录认证
✅ JWT Token + Refresh Token
✅ 数学验证码防护
✅ 登录失败锁定机制
✅ IMAP邮件自动拉取（每10秒）
✅ 验证码自动提取
✅ 邮件标签管理
✅ 邮件搜索（关键词、标签）
✅ 30天自动清理
✅ 管理员用户管理
✅ 子邮箱生成与分配
✅ 系统配置管理
✅ 操作日志记录

## 目录结构

```
backend/
├── src/
│   ├── config/          # 配置文件
│   ├── controllers/     # 控制器
│   ├── middleware/      # 中间件
│   ├── routes/          # 路由
│   ├── services/        # 业务逻辑
│   ├── utils/           # 工具函数
│   ├── types/           # TypeScript类型定义
│   ├── scripts/         # 脚本文件
│   └── main.ts          # 入口文件
├── .env                 # 环境变量
├── package.json
└── tsconfig.json
```
