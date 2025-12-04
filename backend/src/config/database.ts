import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '49.235.74.98',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'remote',
  password: process.env.DB_PASSWORD || 'Zhjh0704.',
  database: process.env.DB_NAME || 'email',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

export default pool;
