CREATE TABLE IF NOT EXISTS afazeres_midia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tarefa VARCHAR(255),
    responsavel VARCHAR(255),
    concluido BOOLEAN DEFAULT FALSE,
    data DATE,
    horario VARCHAR(20),
    church_id INT
);

-- Fix for existing table
ALTER TABLE afazeres_midia ADD COLUMN IF NOT EXISTS data DATE;
ALTER TABLE afazeres_midia ADD COLUMN IF NOT EXISTS horario VARCHAR(20);
ALTER TABLE afazeres_midia ADD COLUMN IF NOT EXISTS church_id INT;

-- Also fix escala_midia just in case
ALTER TABLE escala_midia ADD COLUMN IF NOT EXISTS church_id INT;
