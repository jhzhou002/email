import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { AuthRequest } from '../types';

const authService = new AuthService();

export class AuthController {
  /**
   * 用户注册
   */
  async register(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      }

      const result = await authService.register(email, password);

      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }

      return res.status(201).json({ message: result.message });
    } catch (error: any) {
      console.error('Register error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * 用户登录
   */
  async login(req: Request, res: Response) {
    try {
      const { email, password, captchaAnswer, captchaExpected } = req.body;

      if (!email || !password || captchaAnswer === undefined || captchaExpected === undefined) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const ip = req.ip || req.socket.remoteAddress || '';

      const result = await authService.login(
        email,
        password,
        parseInt(captchaAnswer),
        parseInt(captchaExpected),
        ip
      );

      if (!result.success) {
        return res.status(401).json({ message: result.message });
      }

      return res.json({
        message: result.message,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      });
    } catch (error: any) {
      console.error('Login error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * 刷新Token
   */
  async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token is required' });
      }

      const result = await authService.refreshToken(refreshToken);

      if (!result.success) {
        return res.status(401).json({ message: 'Invalid or expired refresh token' });
      }

      return res.json({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      });
    } catch (error: any) {
      console.error('Refresh token error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(req: AuthRequest, res: Response) {
    try {
      return res.json({ user: req.user });
    } catch (error: any) {
      console.error('Get current user error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * 生成数学验证码
   */
  generateCaptcha(req: Request, res: Response) {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const answer = num1 + num2;

    return res.json({
      question: `${num1} + ${num2} = ?`,
      answer // 前端需要将这个值传回验证
    });
  }
}
