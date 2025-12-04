import { Response } from 'express';
import { UserService } from '../services/userService';
import { AuthRequest } from '../types';

const userService = new UserService();

export class UserController {
  /**
   * 修改密码
   */
  async changePassword(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const { oldPassword, newPassword } = req.body;

      if (!oldPassword || !newPassword) {
        return res.status(400).json({ message: 'Old password and new password are required' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      }

      const result = await userService.changePassword(userId, oldPassword, newPassword);

      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }

      return res.json({ message: result.message });
    } catch (error: any) {
      console.error('Change password error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * 获取用户统计信息
   */
  async getStats(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const stats = await userService.getUserStats(userId);

      return res.json(stats);
    } catch (error: any) {
      console.error('Get user stats error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
}
