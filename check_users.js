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

async function checkUsers() {
    try {
        const pool = mysql.createPool(dbConfig);
        const [users] = await pool.query('SELECT id, email, role, password_hash FROM users');
        console.log('Users:', users);
        
        // Let's test if password '123456' works
        for (const user of users) {
             const isValid = await bcrypt.compare('123456', user.password_hash);
             console.log(`User ${user.email} password '123456' is valid: ${isValid}`);
             const isValidAdmin = await bcrypt.compare('admin', user.password_hash);
             console.log(`User ${user.email} password 'admin' is valid: ${isValidAdmin}`);
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkUsers();
