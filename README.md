# 子邮箱验证码接收系统

一个基于 Vue3 + Node.js + MySQL 的子邮箱验证码接收和管理系统

## 🎯 项目简介

本系统通过 Cloudflare Email Routing 接收邮件，用户可以注册子邮箱账号，登录后查看属于自己的验证码邮件。系统会自动提取邮件中的验证码，方便用户快速复制使用。

### 主要功能

**用户端:**
- ✅ 用户注册/登录（数学验证码）
- ✅ 邮件列表查看（分页、搜索、标签过滤）
- ✅ 邮件详情（HTML/纯文本、自动提取验证码）
- ✅ 邮件标签管理
- ✅ 手动刷新邮件
- ✅ 修改密码
- ✅ 中英文切换
- ✅ 浏览器通知

**管理员端:**
- ✅ 仪表盘（统计数据）
- ✅ 用户管理（禁用、删除、重置密码、解锁）
- ✅ 子邮箱生成与管理
- ✅ 全局邮件查看
- ✅ 标签管理
- ✅ 系统配置（IMAP/SMTP、域名）
- ✅ 系统日志查看

## 📦 技术栈

### 后端
- Node.js + TypeScript
- Express
- MySQL (mysql2)
- JWT认证
- IMAP邮件拉取 (imapflow)
- 邮件解析 (mailparser)
- bcrypt密码加密

### 前端
- Vue 3 + TypeScript
- Vite
- Element Plus
- Vue Router
- Pinia
- Axios
- Vue I18n

## 🚀 快速开始

### 1. 数据库初始化

```bash
# 登录MySQL
mysql -h 49.235.74.98 -u remote -p

# 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS email;

# 导入表结构
mysql -h 49.235.74.98 -u remote -p email < database.sql
```

### 2. 后端启动

```bash
cd backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 创建管理员账号
npm run init-admin

# 启动开发服务器
npm run dev
```

后端将运行在 `http://localhost:3000`

### 3. 前端启动

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端将运行在 `http://localhost:5173`

## 📁 项目结构

```
email/
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── config/          # 配置文件
│   │   ├── controllers/     # 控制器
│   │   ├── middleware/      # 中间件
│   │   ├── routes/          # 路由
│   │   ├── services/        # 业务逻辑
│   │   ├── utils/           # 工具函数
│   │   ├── types/           # TypeScript类型
│   │   ├── scripts/         # 脚本
│   │   └── main.ts          # 入口文件
│   ├── .env                 # 环境变量
│   └── package.json
│
├── frontend/                # 前端应用
│   ├── src/
│   │   ├── api/             # API接口
│   │   ├── components/      # 组件
│   │   ├── views/           # 页面
│   │   ├── router/          # 路由
│   │   ├── stores/          # 状态管理
│   │   ├── i18n/            # 国际化
│   │   ├── utils/           # 工具函数
│   │   └── main.ts          # 入口文件
│   └── package.json
│
├── database.sql             # 数据库脚本
└── README.md                # 项目文档
```

## 🔧 配置说明

### 后端环境变量 (.env)

```env
# 数据库配置
DB_HOST=49.235.74.98
DB_PORT=3306
DB_USER=remote
DB_PASSWORD=Zhjh0704.
DB_NAME=email

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# 服务器配置
PORT=3000
NODE_ENV=development

# CORS配置
CORS_ORIGIN=http://localhost:5173
```

### 系统配置（在管理员后台配置）

- IMAP服务器配置
- SMTP服务器配置（用于测试）
- 域名配置
- 邮件保留天数
- 登录失败次数限制

## 📖 API文档

详见 `backend/README.md`

## 🔐 安全特性

- ✅ JWT Token + Refresh Token
- ✅ bcrypt密码加密
- ✅ 数学验证码防护
- ✅ 登录失败3次锁定10分钟
- ✅ XSS防护（邮件HTML渲染）
- ✅ CORS限制
- ✅ 操作日志记录

## 📝 开发说明

### 后端开发

```bash
cd backend

# 开发模式（热重载）
npm run dev

# 构建
npm run build

# 生产模式
npm start

# 初始化管理员
npm run init-admin
```

### 前端开发

```bash
cd frontend

# 开发模式
npm run dev

# 构建
npm run build

# 预览构建结果
npm run preview
```

## 🌐 部署

### 后端部署

1. 构建项目：`npm run build`
2. 上传 `dist/` 目录到服务器
3. 安装生产依赖：`npm install --production`
4. 配置环境变量
5. 使用 PM2 启动：`pm2 start dist/main.js --name email-backend`

### 前端部署

1. 构建项目：`npm run build`
2. 将 `dist/` 目录部署到 Cloudflare Pages
3. 配置环境变量（API地址）

## ⚠️ 注意事项

1. **数据库安全**: 生产环境请修改数据库密码
2. **JWT密钥**: 必须修改 `JWT_SECRET` 为随机字符串
3. **IMAP配置**: 确保IMAP授权码正确
4. **邮件清理**: 邮件会在30天后自动删除
5. **Cloudflare配置**: 需要在Cloudflare配置Email Routing转发到主邮箱

## 🐛 常见问题

### 1. 邮件拉取失败

检查IMAP配置是否正确，网络是否通畅

### 2. 验证码提取不准确

系统优先提取"验证码"关键词附近的6位数字，如果邮件格式特殊可能需要调整提取算法

### 3. 登录失败

检查是否账号被锁定，管理员可在后台解锁

## 📄 License

MIT

## 👥 作者

开发完成于 2025年

## 🎉 致谢

感谢使用本系统！
