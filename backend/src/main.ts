import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import router from './routes';
import { EmailService } from './services/emailService';
import pool from './config/database';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger API 文档
const swaggerDocument = YAML.load(path.join(__dirname, '../swagger.yaml'));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: '子邮箱验证码接收系统 API 文档'
}));

// 路由
app.use('/api', router);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Email service is running' });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// 错误处理
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// 启动服务器
async function startServer() {
  try {
    // 测试数据库连接
    await pool.query('SELECT 1');
    console.log('✅ Database connected successfully');

    // 启动邮件拉取服务
    const emailService = new EmailService();
    await emailService.startEmailFetching();
    console.log('✅ Email fetching service started');

    // 启动每日清理任务（每天凌晨2点执行）
    setInterval(async () => {
      const now = new Date();
      if (now.getHours() === 2 && now.getMinutes() === 0) {
        console.log('🧹 Running daily email cleanup...');
        const deleted = await emailService.cleanupOldEmails();
        console.log(`🧹 Cleaned up ${deleted} old emails`);
      }
    }, 60000); // 每分钟检查一次

    // 启动HTTP服务器
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
      console.log(`📧 Email service is active`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/docs`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await pool.end();
  process.exit(0);
});

startServer();
