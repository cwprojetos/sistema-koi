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
        await pool.query("ALTER TABLE arrecadacao_itens MODIFY COLUMN status ENUM('disponivel', 'vendido', 'reservado') DEFAULT 'disponivel'");
        console.log('Success');
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
update();
