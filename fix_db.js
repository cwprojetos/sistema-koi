import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306')
};

async function fixDatabase() {
    console.log('Connecting to database:', dbConfig.host, dbConfig.database);
    const pool = mysql.createPool(dbConfig);
    
    try {
        const tablesToFix = [
            'agenda', 'avisos', 'escalas', 'pedidos_oracao', 'devocionais', 
            'escala_midia', 'afazeres_midia', 'financeiro_contas', 
            'financeiro_recibos', 'conteudo_pastor', 'escola_biblica_conteudo', 
            'escola_biblica_perguntas', 'escala_louvor', 'escala_louvor_info', 
            'musicas_louvor', 'participantes_conselho', 'planejamentos_conselho', 
            'reunioes_conselho', 'projetos_reunioes', 'projetos_novos', 
            'projetos_arrecadacoes', 'arrecadacao_itens', 'membros_igreja', 
            'frequencia_membros', 'sugestoes'
        ];

        console.log('--- Fixing church_id in all tables ---');
        for (const table of tablesToFix) {
            try {
                // Check if column exists
                const [cols] = await pool.query(`SHOW COLUMNS FROM ${table} LIKE 'church_id'`);
                if (cols.length === 0) {
                    console.log(`Adding church_id to ${table}...`);
                    await pool.query(`ALTER TABLE ${table} ADD COLUMN church_id INT DEFAULT 1`);
                } else {
                    console.log(`Table ${table} already has church_id.`);
                }
            } catch (err) {
                console.error(`Error checking/fixing table ${table}:`, err.message);
            }
        }

        console.log('\n--- Specifically fixing afazeres_midia fields ---');
        try {
            const [colsData] = await pool.query(`SHOW COLUMNS FROM afazeres_midia LIKE 'data'`);
            if (colsData.length === 0) {
                console.log('Adding data column to afazeres_midia...');
                await pool.query('ALTER TABLE afazeres_midia ADD COLUMN data DATE');
            }

            const [colsHorario] = await pool.query(`SHOW COLUMNS FROM afazeres_midia LIKE 'horario'`);
            if (colsHorario.length === 0) {
                console.log('Adding horario column to afazeres_midia...');
                await pool.query('ALTER TABLE afazeres_midia ADD COLUMN horario VARCHAR(20)');
            }
        } catch (err) {
            console.error('Error fixing specific afazeres_midia columns:', err.message);
        }

        console.log('\nDatabase synchronization complete!');
    } catch (err) {
        console.error('FATAL ERROR:', err.message);
    } finally {
        await pool.end();
    }
}

fixDatabase();
