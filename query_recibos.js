import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 3306
  });
  try {
    const [rows] = await pool.query('SELECT id, descricao, valor, data, tipo FROM financeiro_recibos');
    console.table(rows);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
check();
