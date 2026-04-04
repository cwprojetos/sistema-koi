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
            const [rows] = await pool.query('SELECT COUNT(*) as c FROM ' + t);
            if (rows[0].c > 0) {
                console.log(`\nTable ${t} has ${rows[0].c} records. Latest record:`);
                const [latest] = await pool.query(`SELECT * FROM ${t} ORDER BY id DESC LIMIT 1`);
                console.log(JSON.stringify(latest[0], null, 2));
            }
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

check();
