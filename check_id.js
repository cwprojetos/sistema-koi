import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT || '3306')
    });
    const [rows] = await pool.query('SELECT id FROM afazeres_midia');
    console.log('Current IDs in afazeres_midia:', rows);
    
    const [status] = await pool.query("SHOW TABLE STATUS LIKE 'afazeres_midia'");
    console.log('Auto increment value:', status[0].Auto_increment);
    
    await pool.end();
}
check();
