import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
    const dbConfig = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT || '3306')
    };

    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Migrating database for url_arquivo...');

        const [columns] = await connection.query('SHOW COLUMNS FROM conteudo_pastor LIKE "url_arquivo"');
        if (columns.length === 0) {
            await connection.query('ALTER TABLE conteudo_pastor ADD COLUMN url_arquivo TEXT');
            console.log('Column "url_arquivo" added to "conteudo_pastor" table.');
        } else {
            console.log('Column "url_arquivo" already exists.');
        }

        await connection.end();
        console.log('Migration complete.');
    } catch (err) {
        console.error('Migration error:', err.message);
        process.exit(1);
    }
}

migrate();
