import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function update() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT,
    });
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS escala_louvor_info (
                id INT AUTO_INCREMENT PRIMARY KEY,
                data DATE NOT NULL,
                paleta_cores VARCHAR(255),
                observacao TEXT
            )
        `);
        console.log('escala_louvor_info table created.');
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
update();
