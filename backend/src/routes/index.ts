import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { EmailController } from '../controllers/emailController';
import { AdminController } from '../controllers/adminController';
import { UserController } from '../controllers/userController';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

const router = Router();

const authController = new AuthController();
const emailController = new EmailController();
const adminController = new AdminController();
const userController = new UserController();

// ==================== 公共路由 ====================
// 生成验证码
router.get('/captcha', authController.generateCaptcha.bind(authController));

// 用户注册
router.post('/auth/register', authController.register.bind(authController));

// 用户登录
router.post('/auth/login', authController.login.bind(authController));

// 刷新Token
router.post('/auth/refresh', authController.refreshToken.bind(authController));

// ==================== 用户路由（需要登录）====================
// 获取当前用户信息
router.get('/auth/me', authMiddleware, authController.getCurrentUser.bind(authController));

// 获取邮件列表
router.get('/emails', authMiddleware, emailController.getEmails.bind(emailController));

// 获取邮件详情
router.get('/emails/:id', authMiddleware, emailController.getEmailById.bind(emailController));

// 删除邮件
router.delete('/emails/:id', authMiddleware, emailController.deleteEmail.bind(emailController));

// 为邮件打标签
router.put('/emails/:id/tag', authMiddleware, emailController.tagEmail.bind(emailController));

// 手动刷新邮件
router.post('/emails/fetch', authMiddleware, emailController.manualFetch.bind(emailController));

// 获取标签列表（用户也需要）
router.get('/tags', authMiddleware, adminController.getTags.bind(adminController));

// 用户修改密码
router.put('/user/password', authMiddleware, userController.changePassword.bind(userController));

// 获取用户统计信息
router.get('/user/stats', authMiddleware, userController.getStats.bind(userController));

// ==================== 管理员路由 ====================
// 仪表盘
router.get('/admin/dashboard', authMiddleware, adminMiddleware, adminController.getDashboard.bind(adminController));

// 子邮箱管理
router.post('/admin/subemails/generate', authMiddleware, adminMiddleware, adminController.generateSubemails.bind(adminController));
router.get('/admin/subemails', authMiddleware, adminMiddleware, adminController.getSubemails.bind(adminController));

// 用户管理
router.get('/admin/users', authMiddleware, adminMiddleware, adminController.getUsers.bind(adminController));
router.put('/admin/users/:id/status', authMiddleware, adminMiddleware, adminController.toggleUserStatus.bind(adminController));
router.delete('/admin/users/:id', authMiddleware, adminMiddleware, adminController.deleteUser.bind(adminController));
router.put('/admin/users/:id/password', authMiddleware, adminMiddleware, adminController.resetUserPassword.bind(adminController));
router.put('/admin/users/:id/unlock', authMiddleware, adminMiddleware, adminController.unlockUser.bind(adminController));

// 邮件管理
router.get('/admin/emails', authMiddleware, adminMiddleware, adminController.getAllEmails.bind(adminController));

// 标签管理
router.post('/admin/tags', authMiddleware, adminMiddleware, adminController.addTag.bind(adminController));
router.put('/admin/tags/:id', authMiddleware, adminMiddleware, adminController.updateTag.bind(adminController));
router.delete('/admin/tags/:id', authMiddleware, adminMiddleware, adminController.deleteTag.bind(adminController));

// 系统配置
router.get('/admin/settings', authMiddleware, adminMiddleware, adminController.getSettings.bind(adminController));
router.put('/admin/settings', authMiddleware, adminMiddleware, adminController.updateSettings.bind(adminController));
router.post('/admin/settings/test-imap', authMiddleware, adminMiddleware, adminController.testImap.bind(adminController));
router.post('/admin/settings/send-test-email', authMiddleware, adminMiddleware, adminController.sendTestEmail.bind(adminController));

// 系统日志
router.get('/admin/logs', authMiddleware, adminMiddleware, adminController.getLogs.bind(adminController));

export default router;
