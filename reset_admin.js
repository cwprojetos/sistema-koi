import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306')
};

async function resetPasswords() {
    try {
        const pool = mysql.createPool(dbConfig);
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('123456', salt);
        
        await pool.query('UPDATE users SET password_hash = ? WHERE role IN ("super_admin", "admin_igreja")', [hash]);
        console.log('Admin passwords reset to 123456');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

resetPasswords();
