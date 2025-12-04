import pool from '../config/database';
import { hashPassword } from '../utils/password';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function initAdmin() {
  try {
    console.log('=== Initialize Admin Account ===\n');

    // 检查是否已存在管理员
    const [existingAdmins] = await pool.query(
      'SELECT id, email FROM users WHERE is_admin = 1'
    );

    if ((existingAdmins as any[]).length > 0) {
      console.log('⚠️  Admin account already exists:');
      (existingAdmins as any[]).forEach((admin: any) => {
        console.log(`   - ${admin.email} (ID: ${admin.id})`);
      });

      const confirm = await question('\nDo you want to create another admin? (yes/no): ');
      if (confirm.toLowerCase() !== 'yes') {
        console.log('Operation cancelled.');
        rl.close();
        process.exit(0);
      }
    }

    // 获取管理员邮箱
    const email = await question('Admin email: ');

    if (!email || !email.includes('@')) {
      console.error('❌ Invalid email address');
      rl.close();
      process.exit(1);
    }

    // 检查邮箱是否已存在
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if ((existing as any[]).length > 0) {
      console.error('❌ This email is already registered');
      rl.close();
      process.exit(1);
    }

    // 获取密码
    const password = await question('Admin password (min 6 characters): ');

    if (!password || password.length < 6) {
      console.error('❌ Password must be at least 6 characters');
      rl.close();
      process.exit(1);
    }

    // 确认密码
    const confirmPassword = await question('Confirm password: ');

    if (password !== confirmPassword) {
      console.error('❌ Passwords do not match');
      rl.close();
      process.exit(1);
    }

    // 创建管理员
    const passwordHash = await hashPassword(password);

    await pool.query(
      'INSERT INTO users (email, password_hash, is_admin, status) VALUES (?, ?, 1, 0)',
      [email, passwordHash]
    );

    console.log('\n✅ Admin account created successfully!');
    console.log(`   Email: ${email}`);
    console.log(`   You can now login with this account.\n`);

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin account:', error);
    rl.close();
    process.exit(1);
  }
}

initAdmin();
