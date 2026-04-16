
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { uploadToDrive } from './googleDrive.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_666';

app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
app.use('/uploads', express.static(uploadDir));

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadDir),
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, uniqueSuffix + path.extname(file.originalname));
        }
    }),
    limits: { fileSize: 100 * 1024 * 1024 }
});

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306')
};

let pool;
try {
    pool = mysql.createPool(dbConfig);
    // Check connection at startup
    pool.getConnection()
        .then(conn => {
            console.log('Successfully connected to MySQL database');
            conn.release();
        })
        .catch(err => {
            console.error('DATABASE CONNECTION FAILED:', err.message);
        });
} catch (err) {
    console.error('Error creating pool:', err.message);
}

// PUBLIC ROUTES
app.get('/api/public/churches', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, name FROM churches ORDER BY name');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/visitante', async (req, res) => {
    const { church_id } = req.body;
    if (!church_id) return res.status(400).json({ error: 'Church ID is required' });
    
    try {
        const [churches] = await pool.query('SELECT name FROM churches WHERE id = ?', [church_id]);
        if (churches.length === 0) return res.status(404).json({ error: 'Church not found' });

        const token = jwt.sign({ 
            id: 0, // Virtual user ID for visitors
            email: 'visitante@public.com', 
            church_id: parseInt(church_id), 
            role: 'visitante',
            permissions: {
                agenda: 'read',
                oracao: 'read',
                escola_biblica: 'read',
                pastor: 'read',
                projetos: 'read',
                estudos: 'read'
            }
        }, JWT_SECRET, { expiresIn: '12h' });

        res.json({ token, user: { id: 0, name: 'Visitante', role: 'visitante', church_id: parseInt(church_id) } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Auth Middlewares
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Access Forbidden' });
        req.user = user;
        next();
    });
};

const authorize = (moduleName, level = 'read') => {
    return async (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
        
        // Super admin has full control
        if (req.user.role === 'super_admin') return next();
        
        // Church Admin has full control of everything within their church
        if (req.user.role === 'admin_igreja') return next();

        // Visitor specific rule
        if (req.user.role === 'visitante') {
            const visitorModules = ['agenda', 'oracao', 'escola_biblica', 'pastor', 'projetos', 'estudos'];
            // Allow reading permitted modules
            if (visitorModules.includes(moduleName) && level === 'read') return next();
            
            // ALLOW VISITORS TO ASK QUESTIONS (POST /api/escola_biblica_perguntas)
            if (moduleName === 'escola_biblica' && level === 'write' && req.method === 'POST' && req.path.includes('perguntas')) {
                return next();
            }
            
            return res.status(403).json({ error: 'Access denied for visitors' });
        }
        
        const [perms] = await pool.query('SELECT module_name, permission_level FROM user_permissions WHERE user_id = ?', [req.user.id]);
        const permissions = perms.reduce((acc, p) => ({ ...acc, [p.module_name]: p.permission_level }), {});
        
        let userLevel = permissions[moduleName] || 'none';

        // SPECIAL CASE: Escalas can be edited by Secretaria or Midia roles too
        if (moduleName === 'escalas') {
            const secLevel = permissions['secretaria'] || 'none';
            const midiaLevel = permissions['midia'] || 'none';
            const prio = { 'none': 0, 'read': 1, 'write': 2 };
            const maxLevel = Math.max(prio[userLevel], prio[secLevel], prio[midiaLevel]);
            userLevel = Object.keys(prio).find(key => prio[key] === maxLevel);
        }

        const priority = { 'none': 0, 'read': 1, 'write': 2 };
        if (priority[userLevel] >= priority[level]) return next();

        return res.status(403).json({ error: 'Permission denied' });
    };
};

// --- AUTH ROUTES ---
app.get('/api/me', authenticateToken, async (req, res) => {
    try {
        if (req.user.role === 'visitante') {
            return res.json({ id: 0, name: 'Visitante', role: 'visitante', church_id: req.user.church_id });
        }
        const [users] = await pool.query('SELECT id, name, email, role, church_id, avatar_url FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(users[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(401).json({ error: 'User not found' });
        
        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(401).json({ error: 'Invalid password' });

        // Fetch permissions
        const [perms] = await pool.query('SELECT module_name, permission_level FROM user_permissions WHERE user_id = ?', [user.id]);
        const permissions = perms.reduce((acc, p) => ({ ...acc, [p.module_name]: p.permission_level }), {});

        const token = jwt.sign({ 
            id: user.id, 
            email: user.email, 
            church_id: user.church_id, 
            role: user.role,
            permissions
        }, JWT_SECRET, { expiresIn: '12h' });

        res.json({ token, user: { id: user.id, name: user.name, role: user.role, church_id: user.church_id }, permissions });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/visitante', async (req, res) => {
    const { church_id } = req.body;
    try {
        const [churches] = await pool.query('SELECT * FROM churches WHERE id = ?', [church_id]);
        if (churches.length === 0) return res.status(404).json({ error: 'Igreja não encontrada' });
        
        const token = jwt.sign({ 
            id: 0, 
            email: 'visitante@publico.com', 
            church_id: parseInt(church_id), 
            role: 'visitante',
            permissions: {
                agenda: 'read',
                oracao: 'read',
                escola_biblica: 'read',
                pastor: 'read',
                projetos: 'read',
                estudos: 'read'
            }
        }, JWT_SECRET, { expiresIn: '12h' });

        res.json({ token, user: { id: 0, name: 'Visitante', role: 'visitante', church_id: parseInt(church_id) } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) return res.status(404).json({ error: 'User not found' });
        
        const user = users[0];
        // Don't require current password for visitors or if it's a super-admin override (though this is for user self-service)
        if (req.user.role !== 'visitante') {
            const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
            if (!isMatch) return res.status(401).json({ error: 'Current password incorrect' });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(newPassword, salt);
        await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, req.user.id]);
        res.json({ success: true, message: 'Password updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Public church list for visitor mode
app.get('/api/churches/public', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, name, logo_url FROM churches');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin-protected churches
app.get('/api/churches', authenticateToken, async (req, res) => {
    if (req.user.role !== 'super_admin') return res.status(403).json({ error: 'Permission denied' });
    try {
        const [rows] = await pool.query('SELECT * FROM churches');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/churches', authenticateToken, async (req, res) => {
    if (req.user.role !== 'super_admin') return res.status(403).json({ error: 'Permission denied' });
    const [result] = await pool.query('INSERT INTO churches SET ?', [req.body]);
    res.json({ id: result.insertId, ...req.body });
});

app.put('/api/churches/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'super_admin') return res.status(403).json({ error: 'Permission denied' });
    const { id } = req.params;
    await pool.query('UPDATE churches SET ? WHERE id = ?', [req.body, id]);
    res.json({ id, ...req.body });
});

app.delete('/api/churches/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'super_admin') return res.status(403).json({ error: 'Permission denied' });
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM churches WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Cannot delete church with existing data. Clear its users first." });
    }
});

app.get('/api/users', authenticateToken, async (req, res) => {
    let query = 'SELECT u.id, u.name, u.email, u.role, u.church_id, u.avatar_url, c.name as church_name FROM users u LEFT JOIN churches c ON u.church_id = c.id';
    let params = [];
    
    const canManage = req.user.role === 'super_admin' || req.user.role === 'admin_igreja' || (req.user.permissions && req.user.permissions.secretaria === 'write');
    
    if (!canManage) return res.status(403).json({ error: 'Permission denied' });

    if (req.user.role !== 'super_admin') {
        query += ' WHERE u.church_id = ?';
        params.push(req.user.church_id);
    }
    const [rows] = await pool.query(query, params);
    res.json(rows);
});

app.post('/api/users', authenticateToken, async (req, res) => {
    const { name, email, password, role, church_id, avatar_url, permissions } = req.body;
    
    const canManage = req.user.role === 'super_admin' || req.user.role === 'admin_igreja' || (req.user.permissions && req.user.permissions.secretaria === 'write');
    if (!canManage) return res.status(403).json({ error: 'Permission denied' });
    
    const finalChurchId = req.user.role === 'super_admin' ? (church_id || null) : req.user.church_id;
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    try {
        const [result] = await pool.query('INSERT INTO users (name, email, password_hash, role, church_id, avatar_url) VALUES (?, ?, ?, ?, ?, ?)', [name, email, password_hash, role, finalChurchId, avatar_url]);
        const userId = result.insertId;

        if (permissions && Array.isArray(permissions)) {
            for (const p of permissions) {
                await pool.query('INSERT INTO user_permissions (user_id, module_name, permission_level) VALUES (?, ?, ?)', [userId, p.module_name, p.permission_level]);
            }
        }

        res.json({ id: userId, name, email, role, church_id: finalChurchId, avatar_url });
    } catch (err) {
        console.error('User creation error:', err);
        res.status(400).json({ error: 'User already exists or database error' });
    }
});

app.put('/api/users/:id', authenticateToken, async (req, res) => {
    const canManage = req.user.role === 'super_admin' || req.user.role === 'admin_igreja' || (req.user.permissions && req.user.permissions.secretaria === 'write');
    if (!canManage) return res.status(403).json({ error: 'Permission denied' });
    
    const { id } = req.params;
    const { name, email, role, church_id, password, avatar_url } = req.body;
    
    // Authorization check
    const [existing] = await pool.query('SELECT church_id FROM users WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ error: 'User not found' });
    
    if (req.user.role !== 'super_admin' && existing[0].church_id !== req.user.church_id) {
        return res.status(403).json({ error: 'Permission denied' });
    }

    try {
        const updates = { name, email, role, avatar_url };
        if (req.user.role === 'super_admin') {
            updates.church_id = church_id || null;
        }
        
        if (password) {
            const salt = await bcrypt.genSalt(10);
            updates.password_hash = await bcrypt.hash(password, salt);
        }

        await pool.query('UPDATE users SET ? WHERE id = ?', [updates, id]);

        if (req.body.permissions && Array.isArray(req.body.permissions)) {
            for (const p of req.body.permissions) {
                await pool.query('INSERT INTO user_permissions (user_id, module_name, permission_level) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE permission_level = ?', [id, p.module_name, p.permission_level, p.permission_level]);
            }
        }

        res.json({ id, ...updates });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/users/:id', authenticateToken, async (req, res) => {
    try {
        const canManage = req.user.role === 'super_admin' || req.user.role === 'admin_igreja' || (req.user.permissions && req.user.permissions.secretaria === 'write');
        if (!canManage) return res.status(403).json({ error: 'Permission denied' });
        
        const { id } = req.params;
        const [existing] = await pool.query('SELECT church_id FROM users WHERE id = ?', [id]);
        if (existing.length === 0) return res.status(404).json({ error: 'User not found' });
        
        if (req.user.role !== 'super_admin' && existing[0].church_id !== req.user.church_id) {
            return res.status(403).json({ error: 'Permission denied' });
        }

        await pool.query('DELETE FROM users WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ error: 'Falha ao excluir usuário', details: err.message });
    }
});

// --- PERMISSIONS ROUTES ---
app.get('/api/permissions/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Authorization: super_admin can see all, admin_igreja/secretaria only same church
        if (req.user.role !== 'super_admin') {
            const [targetUser] = await pool.query('SELECT church_id FROM users WHERE id = ?', [userId]);
            if (targetUser.length === 0) return res.status(404).json({ error: 'User not found' });
            if (targetUser[0].church_id !== req.user.church_id) {
                return res.status(403).json({ error: 'Permission denied - User from another church' });
            }
        }

        const [rows] = await pool.query('SELECT * FROM user_permissions WHERE user_id = ?', [userId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/permissions/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const { permissions } = req.body; // Array of { module_name, permission_level }

        // Authorization check
        if (req.user.role === 'user') return res.status(403).json({ error: 'Permission denied' });
        
        if (req.user.role !== 'super_admin') {
            const [targetUser] = await pool.query('SELECT church_id FROM users WHERE id = ?', [userId]);
            if (targetUser.length === 0) return res.status(404).json({ error: 'User not found' });
            if (targetUser[0].church_id !== req.user.church_id) {
                return res.status(403).json({ error: 'Permission denied - User from another church' });
            }
        }

        for (const p of permissions) {
            await pool.query('INSERT INTO user_permissions (user_id, module_name, permission_level) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE permission_level = ?', [userId, p.module_name, p.permission_level, p.permission_level]);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- UPDATED CRUD SYSTEM WITH CHURCH ISOLATION ---
const createCrudRoutes = (tableName, moduleName, orderField = 'id', postAuthLevel = 'write') => {
    app.get(`/api/${tableName}`, authenticateToken, authorize(moduleName, 'read'), async (req, res) => {
        try {
            let query = `SELECT * FROM ${tableName}`;
            let params = [];
            
            if (req.user.role !== 'super_admin') {
                query += ' WHERE church_id = ?';
                params.push(req.user.church_id);
            }
            
            query += ` ORDER BY ${orderField}`;
            const [rows] = await pool.query(query, params);
            res.json(rows);
        } catch (err) {
            console.error(`Error fetching ${tableName}:`, err.message);
            res.status(500).json({ error: `Failed to fetch ${tableName}`, details: err.message });
        }
    });

    app.post(`/api/${tableName}`, authenticateToken, authorize(moduleName, postAuthLevel), async (req, res) => {
        try {
            const finalChurchId = req.user.role === 'super_admin' ? (req.body.church_id || 1) : req.user.church_id;
            
            // Sanitize data: convert empty strings to null and ensure church_id is set
            const data = { ...req.body };
            delete data.id; // PROTECT AGAINST EXPLICIT ID INSERTS - USE AUTO-INCREMENT
            
            Object.keys(data).forEach(key => {
                if (data[key] === '') data[key] = null;
            });
            data.church_id = finalChurchId;

            console.log(`INSERTING INTO ${tableName}:`, data);
            const [result] = await pool.query(`INSERT INTO ${tableName} SET ?`, [data]);
            res.json({ id: result.insertId, ...data });
        } catch (err) {
            console.error(`ERROR creating ${tableName}:`, err);
            res.status(500).json({ 
                error: `Failed to create ${tableName}`, 
                details: err.message,
                sqlMessage: err.sqlMessage 
            });
        }
    });

    app.put(`/api/${tableName}/:id`, authenticateToken, authorize(moduleName, 'write'), async (req, res) => {
        try {
            const { id } = req.params;
            const data = { ...req.body };
            delete data.id; // Prevent updating the ID column itself
            
            let query = `UPDATE ${tableName} SET ? WHERE id = ?`;
            let params = [data, id];

            if (req.user.role !== 'super_admin') {
                query += ' AND church_id = ?';
                params.push(req.user.church_id);
            }

            const [result] = await pool.query(query, params);
            res.json({ id, ...req.body });
        } catch (err) {
            console.error(`ERROR updating ${tableName}:`, err);
            res.status(500).json({ error: `Failed to update ${tableName}`, details: err.message });
        }
    });

    app.delete(`/api/${tableName}/:id`, authenticateToken, authorize(moduleName, 'write'), async (req, res) => {
        try {
            const { id } = req.params;
            let query = `DELETE FROM ${tableName} WHERE id = ?`;
            let params = [id];

            if (req.user.role !== 'super_admin') {
                query += ' AND church_id = ?';
                params.push(req.user.church_id);
            }

            const [result] = await pool.query(query, params);
            console.log(`DELETE SUCCESS: table=${tableName}, id=${id}, affectedRows=${result.affectedRows}`);
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Registro não encontrado ou você não tem permissão para excluí-lo' });
            }
            res.json({ success: true });
        } catch (err) {
            console.error(`ERROR deleting ${tableName}:`, err);
            res.status(500).json({ error: `Failed to delete ${tableName}`, details: err.message });
        }
    });
};

// Initialize All Routes with isolation
createCrudRoutes('agenda', 'agenda', 'data');
createCrudRoutes('avisos', 'agenda', 'id');
createCrudRoutes('escalas', 'escalas', 'data');
createCrudRoutes('pedidos_oracao', 'oracao', 'data', 'read');
createCrudRoutes('devocionais', 'pastor', 'data');
createCrudRoutes('escala_midia', 'midia', 'data');
createCrudRoutes('afazeres_midia', 'midia', 'id');
createCrudRoutes('financeiro_contas', 'financeiro', 'vencimento');
createCrudRoutes('financeiro_recibos', 'financeiro', 'data');
createCrudRoutes('conteudo_pastor', 'pastor', 'data');
createCrudRoutes('escola_biblica_conteudo', 'escola_biblica', 'data');
createCrudRoutes('escola_biblica_perguntas', 'escola_biblica', 'data DESC');
createCrudRoutes('escala_louvor', 'louvor', 'data');
createCrudRoutes('escala_louvor_info', 'louvor', 'data');
createCrudRoutes('musicas_louvor', 'louvor', 'id');
createCrudRoutes('participantes_conselho', 'conselho', 'id');
createCrudRoutes('planejamentos_conselho', 'conselho', 'id');
createCrudRoutes('reunioes_conselho', 'conselho', 'data');
createCrudRoutes('projetos_reunioes', 'conselho', 'data');
createCrudRoutes('projetos_novos', 'projetos', 'inicio');
createCrudRoutes('projetos_arrecadacoes', 'projetos', 'id');
createCrudRoutes('arrecadacao_itens', 'projetos', 'id');
createCrudRoutes('membros_igreja', 'secretaria', 'nome');
createCrudRoutes('frequencia_membros', 'secretaria', 'data');
createCrudRoutes('sugestoes', 'agenda', 'data DESC', 'read');

// Specialized route for Tithes (Dízimos)
app.post('/api/membros_igreja/dizimo', authenticateToken, authorize('financeiro', 'write'), async (req, res) => {
    const { membroId, nomeMembro, valor, data_pagamento, url_arquivo, recebido_por } = req.body;
    try {
        const finalChurchId = req.user.role === 'super_admin' ? (req.body.church_id || 1) : req.user.church_id;
        
        // 1. (Optional) Update member record with last tithe info if needed
        // For now, only recording the financial entrance is the priority
        
        // 2. Create entrance receipt
        const [result] = await pool.query(`
            INSERT INTO financeiro_recibos 
            (descricao, valor, data, tipo, url_arquivo, recebido_por, church_id) 
            VALUES (?, ?, ?, 'entrada', ?, ?, ?)
        `, [
            `DÍZIMO: ${nomeMembro}`, 
            valor, 
            data_pagamento, 
            url_arquivo || null, 
            recebido_por || null,
            finalChurchId
        ]);

        res.json({ success: true, id: result.insertId });
    } catch (err) {
        console.error('Error registering tithe:', err.message);
        res.status(500).json({ error: 'Failed to register tithe', details: err.message });
    }
});

// Specialized route for Project Arrecadação
app.post('/api/projetos_novos/:id/arrecadacao', authenticateToken, authorize('projetos', 'read'), async (req, res) => {
    const { id } = req.params;
    const { valor, recebido_por, url_arquivo, tituloProjeto } = req.body;
    
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const finalChurchId = req.user.role === 'super_admin' ? (req.body.church_id || 1) : req.user.church_id;

        // 1. Get current valor_arrecadado and check church isolation
        const [projects] = await connection.query('SELECT valor_arrecadado, church_id FROM projetos_novos WHERE id = ?', [id]);
        if (projects.length === 0) throw new Error('Projeto não encontrado');
        
        if (req.user.role !== 'super_admin' && projects[0].church_id !== req.user.church_id) {
            throw new Error('Permission denied - Project from another church');
        }

        const currentArrecadado = parseFloat(projects[0].valor_arrecadado || 0);
        const newArrecadado = currentArrecadado + parseFloat(valor);

        // 2. Update project
        await connection.query('UPDATE projetos_novos SET valor_arrecadado = ? WHERE id = ?', [newArrecadado, id]);

        // 3. Create financial receipt (requires financeiro:write but we allow it from this authorized project context)
        await connection.query(`
            INSERT INTO financeiro_recibos 
            (descricao, valor, data, tipo, url_arquivo, recebido_por, church_id) 
            VALUES (?, ?, ?, 'entrada', ?, ?, ?)
        `, [
            `ENTRADA PROJETO: ${tituloProjeto}`, 
            valor, 
            new Date().toISOString().split('T')[0], 
            url_arquivo || null, 
            recebido_por || null,
            finalChurchId
        ]);

        await connection.commit();
        res.json({ success: true, new_valor_arrecadado: newArrecadado });
    } catch (err) {
        await connection.rollback();
        console.error('Error in project funds registration:', err);
        res.status(500).json({ error: 'Failed to register funds', details: err.message });
    } finally {
        connection.release();
    }
});

// Specialized route for Fundraiser Item Sale
app.post('/api/arrecadacao_itens/:id/venda', authenticateToken, authorize('projetos', 'read'), async (req, res) => {
    const { id } = req.params;
    const { valor, forma_pagamento, recebeu, url_arquivo, descricao } = req.body;
    
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const finalChurchId = req.user.role === 'super_admin' ? (req.body.church_id || 1) : req.user.church_id;

        // 1. Update item status and check church isolation
        const [items] = await connection.query('SELECT church_id FROM arrecadacao_itens WHERE id = ?', [id]);
        if (items.length === 0) throw new Error('Item não encontrado');

        if (req.user.role !== 'super_admin' && items[0].church_id !== req.user.church_id) {
            throw new Error('Permission denied - Item from another church');
        }

        await connection.query('UPDATE arrecadacao_itens SET status = "vendido", forma_pagamento = ? WHERE id = ?', [forma_pagamento, id]);

        // 2. Create financial receipt
        await connection.query(`
            INSERT INTO financeiro_recibos 
            (descricao, valor, data, tipo, url_arquivo, recebido_por, church_id) 
            VALUES (?, ?, ?, 'entrada', ?, ?, ?)
        `, [
            `VENDA CAMPA.: ${descricao} (${forma_pagamento})`, 
            valor, 
            new Date().toISOString().split('T')[0], 
            url_arquivo || null, 
            recebeu || null,
            finalChurchId
        ]);

        await connection.commit();
        res.json({ success: true });
    } catch (err) {
        await connection.rollback();
        console.error('Error in fundraiser item sale:', err);
        res.status(500).json({ error: 'Failed to complete sale', details: err.message });
    } finally {
        connection.release();
    }
});

// Specialized Configurations Route (Read accessible to all authenticated users)
app.get('/api/configuracoes', authenticateToken, async (req, res) => {
    try {
        let query = 'SELECT * FROM configuracoes';
        let params = [];
        if (req.user.role !== 'super_admin') {
            query += ' WHERE church_id = ?';
            params.push(req.user.church_id);
        }
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch config' });
    }
});

// --- SPECIALIZED ROUTES (adapted for multi-tenant) ---
// Note: These should also be protected and isolated.
app.put('/api/configuracoes/chave/:chave', authenticateToken, async (req, res) => {
    try {
        const { chave } = req.params;
        const { valor } = req.body;
        
        // Custom authorization for settings
        const isSuper = req.user.role === 'super_admin';
        const isChurchAdmin = req.user.role === 'admin_igreja';
        
        // Use user's church_id or fallback to 1 (especially for super_admin who might have null)
        const churchId = req.user.church_id || 1;

        if (!isSuper && !isChurchAdmin) {
            const [perms] = await pool.query('SELECT module_name, permission_level FROM user_permissions WHERE user_id = ?', [req.user.id]);
            const permissions = (perms || []).reduce((acc, p) => ({ ...acc, [p.module_name]: p.permission_level }), {});
            
            const canEditAgenda = permissions['agenda'] === 'write';
            const canEditMidia = permissions['midia'] === 'write';
            
            // Allow midia to edit youtube_link, others require agenda:write
            if (chave === 'youtube_link') {
                if (!canEditAgenda && !canEditMidia) return res.status(403).json({ error: 'Permission denied' });
            } else {
                if (!canEditAgenda) return res.status(403).json({ error: 'Permission denied' });
            }
        }

        // On duplicate chave, update the value. For most churches, chave is unique.
        // Note: the current table has a unique key on 'chave' only, not (chave, church_id).
        await pool.query('INSERT INTO configuracoes (chave, valor, church_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE valor = ?', [chave, valor, churchId, valor]);
        res.json({ success: true, chave, valor });
    } catch (err) {
        console.error('ERROR SAVING CONFIG:', err.message);
        res.status(500).json({ error: 'Failed', details: err.message });
    }
});

app.post('/api/upload', authenticateToken, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    
    try {
        // Try uploading to Google Drive
        const googleFile = await uploadToDrive(req.file.path, req.file.filename, req.file.mimetype);
        
        if (googleFile) {
            console.log('Successfully uploaded to Google Drive:', googleFile.id);
            // Delete local file after successful cloud upload
            fs.unlinkSync(req.file.path);
            
            // Return direct download link if possible, or the view link
            const link = googleFile.webContentLink || googleFile.webViewLink;
            return res.json({ url: link, driveId: googleFile.id });
        }
    } catch (err) {
        console.warn('Google Drive upload failed, falling back to local storage:', err.message);
    }

    // Fallback: Use local URL if Drive is not configured or fails
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
});

// Test/Info Route
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

app.listen(port, () => {
    console.log(`Multi-tenant server running on port ${port}`);
});
