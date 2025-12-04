import pool from '../config/database';
import { hashPassword } from '../utils/password';

async function fixAdminAccount() {
  try {
    console.log('🔧 修复管理员账户...\n');

    // 1. 查找所有管理员账户
    const [admins] = await pool.query(
      'SELECT id, email, status FROM users WHERE is_admin = 1'
    );

    console.log(`找到 ${(admins as any[]).length} 个管理员账户\n`);

    // 2. 检查管理员状态
    for (const admin of admins as any[]) {
      console.log(`- ${admin.email}:`);
      if (admin.status === 1) {
        console.log('  ❌ 账户已禁用，正在启用...');
        
        await pool.query(
          'UPDATE users SET status = 0, failed_login_count = 0, locked_until = NULL WHERE id = ?',
          [admin.id]
        );
        
        console.log('  ✅ 已启用');
      } else {
        console.log('  ✅ 账户正常');
      }
    }

    // 3. 如果没有管理员，创建默认管理员
    if ((admins as any[]).length === 0) {
      console.log('\n⚠️  没有找到管理员账户，创建默认管理员...\n');
      
      const email = 'admin@example.com';
      const password = '123456';
      const passwordHash = await hashPassword(password);

      await pool.query(
        'INSERT INTO users (email, password_hash, is_admin, status) VALUES (?, ?, 1, 0)',
        [email, passwordHash]
      );

      console.log('✅ 默认管理员已创建');
      console.log(`   邮箱: ${email}`);
      console.log(`   密码: ${password}\n`);
    }

    console.log('✅ 管理员账户修复完成！\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

fixAdminAccount();
