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
        await pool.query("ALTER TABLE projetos_novos ADD COLUMN valor_necessario DECIMAL(10,2) DEFAULT 0.00;");
        await pool.query("ALTER TABLE projetos_novos ADD COLUMN valor_arrecadado DECIMAL(10,2) DEFAULT 0.00;");
        console.log('Columns added to projetos_novos');
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
update();
