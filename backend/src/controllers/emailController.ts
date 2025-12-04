import { Response } from 'express';
import { EmailService } from '../services/emailService';
import { AuthRequest } from '../types';

const emailService = new EmailService();

export class EmailController {
  /**
   * 获取邮件列表
   */
  async getEmails(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const keyword = req.query.keyword as string;
      const tagId = req.query.tagId ? parseInt(req.query.tagId as string) : undefined;

      const result = await emailService.getEmails(userId, page, pageSize, keyword, tagId);

      return res.json(result);
    } catch (error: any) {
      console.error('Get emails error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * 获取邮件详情
   */
  async getEmailById(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const emailId = parseInt(req.params.id);

      const email = await emailService.getEmailById(emailId, userId);

      if (!email) {
        return res.status(404).json({ message: 'Email not found' });
      }

      return res.json(email);
    } catch (error: any) {
      console.error('Get email error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * 删除邮件
   */
  async deleteEmail(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const emailId = parseInt(req.params.id);

      const success = await emailService.deleteEmail(emailId, userId);

      if (!success) {
        return res.status(404).json({ message: 'Email not found' });
      }

      return res.json({ message: 'Email deleted successfully' });
    } catch (error: any) {
      console.error('Delete email error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * 为邮件打标签
   */
  async tagEmail(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const emailId = parseInt(req.params.id);
      const { tagId } = req.body;

      if (!tagId) {
        return res.status(400).json({ message: 'Tag ID is required' });
      }

      const success = await emailService.tagEmail(emailId, userId, parseInt(tagId));

      if (!success) {
        return res.status(404).json({ message: 'Email not found' });
      }

      return res.json({ message: 'Email tagged successfully' });
    } catch (error: any) {
      console.error('Tag email error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * 手动刷新邮件
   */
  async manualFetch(req: AuthRequest, res: Response) {
    try {
      const result = await emailService.manualFetch();

      if (!result.success) {
        return res.status(500).json({ message: result.message });
      }

      return res.json({ message: result.message, count: result.count });
    } catch (error: any) {
      console.error('Manual fetch error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
}
