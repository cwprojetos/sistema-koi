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
            CREATE TABLE IF NOT EXISTS membros_igreja (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                documentos VARCHAR(100),
                endereco TEXT,
                aniversario DATE,
                estado_civil VARCHAR(50),
                renda_familiar DECIMAL(10,2),
                valor_dizimo DECIMAL(10,2) DEFAULT 0.00
            )
        `);
        console.log('membros_igreja table created.');
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
update();
