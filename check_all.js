
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT,
    });

    try {
        const [tables] = await pool.query('SHOW TABLES');
        const tableNames = tables.map(t => Object.values(t)[0]);
        for (const t of tableNames) {
            try {
                const [rows] = await pool.query(`SELECT COUNT(*) as c FROM ${t}`);
                console.log(`Table ${t} has ${rows[0].c} records.`);
            } catch (err) {
                console.log(`Error checking table ${t}: ${err.message}`);
            }
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}
check();
