
-- Multi-Tenant Database Schema for Church Management System

-- Master Churches Table
CREATE TABLE IF NOT EXISTS churches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL, -- URL-friendly name (e.g., 'promessa-bom-retiro')
    logo_url TEXT,
    theme_config JSON, -- Optional: store colors, fonts, etc. per church
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Users Table (Proper Authentication)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    church_id INT, -- NULL for super_admin
    role ENUM('super_admin', 'admin_igreja', 'user') DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE SET NULL
);

-- Granular Module Permissions
CREATE TABLE IF NOT EXISTS user_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    module_name VARCHAR(50) NOT NULL, -- e.g., 'conselho', 'secretaria', 'financeiro'
    permission_level ENUM('none', 'read', 'write') DEFAULT 'none',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY user_module (user_id, module_name)
);

-- Function to add church_id to existing tables (Example for one)
-- ALTER TABLE agenda ADD COLUMN church_id INT NOT NULL;
-- ALTER TABLE agenda ADD FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE;

-- Insert first church and super-admin for testing (Optional - script will handle this)
-- INSERT INTO churches (name, slug) VALUES ('Sede', 'sede');
-- INSERT INTO users (name, email, password_hash, role) VALUES ('Super Admin', 'admin@sistema.com', 'HASH_HERE', 'super_admin');
