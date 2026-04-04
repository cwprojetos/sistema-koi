
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306')
};

async function check() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected!');
        
        const [eb_cols] = await connection.query('SHOW COLUMNS FROM escola_biblica_conteudo');
        console.log('escola_biblica_conteudo columns:', eb_cols.map(c => c.Field).join(', '));
        
        const [q_cols] = await connection.query('SHOW COLUMNS FROM escola_biblica_perguntas');
        console.log('escola_biblica_perguntas columns:', q_cols.map(c => c.Field).join(', '));
        
        await connection.end();
    } catch (err) {
        console.error(err);
    }
}
check();
