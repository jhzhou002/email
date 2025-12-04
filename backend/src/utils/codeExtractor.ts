/**
 * 从邮件正文中提取验证码
 * 优先提取"验证码"/"code"/"verification"关键词附近的6位数字
 */
export const extractVerificationCode = (text: string): string | null => {
  if (!text) return null;

  // 移除HTML标签
  const plainText = text.replace(/<[^>]*>/g, ' ');

  // 关键词列表（中英文）
  const keywords = [
    '验证码', 'code', 'verification', 'verify', '動態碼',
    'otp', 'pin', '认证码', '校验码', 'captcha'
  ];

  // 1. 优先查找关键词附近的6位数字
  for (const keyword of keywords) {
    const regex = new RegExp(`${keyword}[\\s\\S]{0,50}?(\\d{6})`, 'i');
    const match = plainText.match(regex);
    if (match && match[1]) {
      return match[1];
    }
  }

  // 2. 如果没找到，查找关键词后面的6位数字（放宽范围）
  for (const keyword of keywords) {
    const regex = new RegExp(`${keyword}[\\s\\S]{0,200}?(\\d{6})`, 'i');
    const match = plainText.match(regex);
    if (match && match[1]) {
      return match[1];
    }
  }

  // 3. 全文查找所有6位数字，取最后一个（通常验证码在邮件末尾）
  const allCodes = plainText.match(/\b\d{6}\b/g);
  if (allCodes && allCodes.length > 0) {
    return allCodes[allCodes.length - 1];
  }

  return null;
};

/**
 * 判断邮件是否为验证码邮件
 */
export const isVerificationEmail = (subject: string, body: string): boolean => {
  const text = (subject + ' ' + body).toLowerCase();
  const keywords = [
    '验证码', 'verification', 'code', 'verify', 'otp',
    'pin', '认证', 'authenticate', 'captcha', '動態碼'
  ];

  return keywords.some(keyword => text.includes(keyword));
};
