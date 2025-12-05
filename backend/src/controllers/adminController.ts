import { Response } from 'express';
import { AdminService } from '../services/adminService';
import { EmailService } from '../services/emailService';
import { AuthRequest } from '../types';

const adminService = new AdminService();
const emailService = new EmailService();

export class AdminController {
  /**
   * 生成子邮箱
   */
  async generateSubemails(req: AuthRequest, res: Response) {
    try {
      const { count, domain } = req.body;

      if (!count || !domain) {
        return res.status(400).json({ message: 'Count and domain are required' });
      }

      if (count < 1 || count > 1000) {
        return res.status(400).json({ message: 'Count must be between 1 and 1000' });
      }

      const generated = await adminService.generateSubemails(parseInt(count), domain);

      return res.json({
        message: `Generated ${generated.length} subemails`,
        count: generated.length,
        subemails: generated
      });
    } catch (error: any) {
      console.error('Generate subemails error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * 获取子邮箱列表
   */
  async getSubemails(req: AuthRequest, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const isAssigned = req.query.isAssigned === 'true' ? true : req.query.isAssigned === 'false' ? false : undefined;

      const result = await adminService.getSubemails(page, pageSize, isAssigned);

      return res.json(result);
    } catch (error: any) {
      console.error('Get subemails error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * 添加子邮箱
   */
  async addSubemail(req: AuthRequest, res: Response) {
    try {
      const { email, remark } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      const id = await adminService.addSubemail(email, remark);

      return res.json({ message: 'Subemail added successfully', id });
    } catch (error: any) {
      console.error('Add subemail error:', error);
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ message: '该邮箱地址已存在' });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * 更新子邮箱
   */
  async updateSubemail(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const { email, remark } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      const success = await adminService.updateSubemail(id, email, remark);

      if (!success) {
        return res.status(404).json({ message: 'Subemail not found' });
      }

      return res.json({ message: 'Subemail updated successfully' });
    } catch (error: any) {
      console.error('Update subemail error:', error);
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ message: '该邮箱地址已存在' });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * 删除子邮箱
   */
  async deleteSubemail(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id);

      const success = await adminService.deleteSubemail(id);

      if (!success) {
        return res.status(404).json({ message: 'Subemail not found' });
      }

      return res.json({ message: 'Subemail deleted successfully' });
    } catch (error: any) {
      console.error('Delete subemail error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * 获取用户列表
   */
  async getUsers(req: AuthRequest, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const keyword = req.query.keyword as string;

      const result = await adminService.getUsers(page, pageSize, keyword);

      return res.json(result);
    } catch (error: any) {
      console.error('Get users error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * 禁用/启用用户
   */
  async toggleUserStatus(req: AuthRequest, res: Response) {
    try {
      const userId = parseInt(req.params.id);
      const { status } = req.body;

      if (status !== 0 && status !== 1) {
        return res.status(400).json({ message: 'Invalid status value' });
      }

      const success = await adminService.toggleUserStatus(userId, status);

      if (!success) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.json({ message: 'User status updated successfully' });
    } catch (error: any) {
      console.error('Toggle user status error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * 删除用户
   */
  async deleteUser(req: AuthRequest, res: Response) {
    try {
      const userId = parseInt(req.params.id);

      const success = await adminService.deleteUser(userId);

      if (!success) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.json({ message: 'User deleted successfully' });
    } catch (error: any) {
      console.error('Delete user error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * 重置用户密码
   */
  async resetUserPassword(req: AuthRequest, res: Response) {
    try {
      const userId = parseInt(req.params.id);
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      }

      const success = await adminService.resetUserPassword(userId, newPassword);

      if (!success) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.json({ message: 'Password reset successfully' });
    } catch (error: any) {
      console.error('Reset password error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * 解锁用户
   */
  async unlockUser(req: AuthRequest, res: Response) {
    try {
      const userId = parseInt(req.params.id);

      const success = await adminService.unlockUser(userId);

      if (!success) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.json({ message: 'User unlocked successfully' });
    } catch (error: any) {
      console.error('Unlock user error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * 获取所有邮件
   */
  async getAllEmails(req: AuthRequest, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;

      const result = await adminService.getAllEmails(page, pageSize);

      return res.json(result);
    } catch (error: any) {
      console.error('Get all emails error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * 获取标签列表
   */
  async getTags(req: AuthRequest, res: Response) {
    try {
      const tags = await adminService.getTags();
      return res.json(tags);
    } catch (error: any) {
      console.error('Get tags error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * 添加标签
   */
  async addTag(req: AuthRequest, res: Response) {
    try {
      const { nameZh, nameEn } = req.body;

      if (!nameZh || !nameEn) {
        return res.status(400).json({ message: 'Name (Chinese and English) are required' });
      }

      const tagId = await adminService.addTag(nameZh, nameEn);

      return res.json({ message: 'Tag added successfully', tagId });
    } catch (error: any) {
      console.error('Add tag error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * 更新标签
   */
  async updateTag(req: AuthRequest, res: Response) {
    try {
      const tagId = parseInt(req.params.id);
      const { nameZh, nameEn } = req.body;

      if (!nameZh || !nameEn) {
        return res.status(400).json({ message: 'Name (Chinese and English) are required' });
      }

      const success = await adminService.updateTag(tagId, nameZh, nameEn);

      if (!success) {
        return res.status(404).json({ message: 'Tag not found' });
      }

      return res.json({ message: 'Tag updated successfully' });
    } catch (error: any) {
      console.error('Update tag error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * 删除标签
   */
  async deleteTag(req: AuthRequest, res: Response) {
    try {
      const tagId = parseInt(req.params.id);

      const success = await adminService.deleteTag(tagId);

      if (!success) {
        return res.status(404).json({ message: 'Tag not found' });
      }

      return res.json({ message: 'Tag deleted successfully' });
    } catch (error: any) {
      console.error('Delete tag error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * 获取系统配置
   */
  async getSettings(req: AuthRequest, res: Response) {
    try {
      const settings = await adminService.getSettings();
      return res.json(settings);
    } catch (error: any) {
      console.error('Get settings error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * 更新系统配置
   */
  async updateSettings(req: AuthRequest, res: Response) {
    try {
      const settings = req.body;

      if (!settings || Object.keys(settings).length === 0) {
        return res.status(400).json({ message: 'Settings are required' });
      }

      await adminService.updateSettings(settings);

      return res.json({ message: 'Settings updated successfully' });
    } catch (error: any) {
      console.error('Update settings error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * 测试IMAP连接
   */
  async testImap(req: AuthRequest, res: Response) {
    try {
      const { imap_server, imap_port, imap_user, imap_pass } = req.body;

      if (!imap_server || !imap_port || !imap_user || !imap_pass) {
        return res.status(400).json({ message: 'All IMAP fields are required' });
      }

      const result = await emailService.testImapConnection({
        imap_server,
        imap_port,
        imap_user,
        imap_pass
      });

      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }

      return res.json({ message: result.message });
    } catch (error: any) {
      console.error('Test IMAP error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * 发送测试邮件
   */
  async sendTestEmail(req: AuthRequest, res: Response) {
    try {
      const { recipient } = req.body;

      if (!recipient) {
        return res.status(400).json({ message: 'Recipient email is required' });
      }

      await adminService.sendTestEmail(recipient);

      return res.json({ message: 'Test email sent successfully' });
    } catch (error: any) {
      console.error('Send test email error:', error);
      return res.status(500).json({ message: error.message || 'Failed to send test email' });
    }
  }

  /**
   * 获取系统日志
   */
  async getLogs(req: AuthRequest, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 50;
      const type = req.query.type as string;

      const result = await adminService.getLogs(page, pageSize, type);

      return res.json(result);
    } catch (error: any) {
      console.error('Get logs error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * 获取仪表盘数据
   */
  async getDashboard(req: AuthRequest, res: Response) {
    try {
      const stats = await adminService.getDashboardStats();
      return res.json(stats);
    } catch (error: any) {
      console.error('Get dashboard error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
}
