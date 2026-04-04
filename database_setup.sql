-- SQL Setup for Sistema - Promessa

-- 1. Agenda Semanal
CREATE TABLE IF NOT EXISTS agenda (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    data DATE NOT NULL,
    horario VARCHAR(20) NOT NULL,
    tipo ENUM('culto', 'evento') DEFAULT 'evento',
    pregador VARCHAR(255),
    tema VARCHAR(255)
);

INSERT INTO agenda (titulo, data, horario, tipo, pregador, tema) VALUES 
('Culto de Oração', '2026-02-25', '19:30', 'culto', 'Pr. Eduardo', 'Fidelidade'),
('Culto de Ensino', '2026-02-26', '19:30', 'culto', 'Pr. Carlos', 'Santidade'),
('Ensaio do Louvor', '2026-02-27', '19:00', 'evento', '-', '-'),
('Culto da Família', '2026-02-28', '18:00', 'culto', 'Pr. Eduardo', 'Família no Altar'),
('Escola Bíblica Dominical', '2026-03-01', '09:00', 'evento', '-', '-'),
('Culto de Celebração', '2026-03-01', '18:00', 'culto', 'Pr. Eduardo', 'Gratidão');

-- 2. Avisos
CREATE TABLE IF NOT EXISTS avisos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    data DATE
);

INSERT INTO avisos (titulo, descricao, data) VALUES 
('Reunião de líderes', 'Reunião com todos os líderes de departamento no sábado às 15h.', '2026-02-28'),
('Campanha de arrecadação', 'Estamos arrecadando alimentos não perecíveis para doação.', '2026-03-01'),
('Batismo', 'Inscrições abertas para o próximo batismo. Procure a secretaria.', '2026-03-08');

-- 3. Escalas
CREATE TABLE IF NOT EXISTS escalas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    data DATE NOT NULL,
    culto VARCHAR(100) NOT NULL,
    recepcao TEXT, -- Armazenado como CSV ou JSON
    louvor TEXT,
    midia TEXT,
    diaconos TEXT,
    oracao VARCHAR(255),
    pregador VARCHAR(255),
    tema VARCHAR(255),
    church_id INT
);

INSERT INTO escalas (data, culto, recepcao, louvor, diaconos, oracao, pregador, tema) VALUES 
('2026-03-01', 'Culto de Celebração', 'Maria Silva, João Santos', 'Ana Costa, Pedro Lima, Carla Souza, Lucas Almeida', 'Roberto Oliveira, Marcos Pereira', 'Pastor Carlos', 'Pr. Eduardo Nascimento', 'Gratidão'),
('2026-03-04', 'Culto de Oração', 'Fernanda Reis, Paulo Costa', 'Juliana Martins, Thiago Araújo, Bruna Ferreira', 'Carlos Mendes, André Lima', 'Dc. Roberto Oliveira', 'Pr. Carlos Mendes', 'Intercessão');

-- 4. Pedidos de Oração
CREATE TABLE IF NOT EXISTS pedidos_oracao (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    pedido TEXT NOT NULL,
    data DATE,
    respondido BOOLEAN DEFAULT FALSE
);

INSERT INTO pedidos_oracao (nome, pedido, data, respondido) VALUES 
('Irmã Dona Maria', 'Saúde e recuperação de cirurgia', '2026-02-24', FALSE),
('Família Santos', 'Provisão financeira e emprego', '2026-02-23', FALSE),
('Jovem Lucas', 'Aprovação no vestibular', '2026-02-22', TRUE);

-- 5. Versículo e Devocional
CREATE TABLE IF NOT EXISTS devocionais (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255),
    texto TEXT,
    autor VARCHAR(255),
    data DATE DEFAULT (CURRENT_DATE)
);

INSERT INTO devocionais (titulo, texto, autor) VALUES 
('Confiança nos Planos de Deus', 'Em meio às incertezas da vida, Deus nos assegura que seus planos para nós são de paz e esperança...', 'Pr. Eduardo Nascimento');

-- 6. Mídia
CREATE TABLE IF NOT EXISTS escala_midia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255),
    funcao VARCHAR(100),
    data DATE
);

INSERT INTO escala_midia (nome, funcao, data) VALUES 
('Carlos Tech', 'Transmissão ao vivo', '2026-03-01'),
('Juliana Design', 'Slides da pregação', '2026-03-01');

CREATE TABLE IF NOT EXISTS afazeres_midia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tarefa VARCHAR(255),
    responsavel VARCHAR(255),
    concluido BOOLEAN DEFAULT FALSE
);

INSERT INTO afazeres_midia (tarefa, responsavel, concluido) VALUES 
('Editar vídeo do culto passado', 'Felipe Câmera', FALSE),
('Criar arte para redes sociais', 'Juliana Design', TRUE);

-- 7. Financeiro
CREATE TABLE IF NOT EXISTS financeiro_contas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    descricao VARCHAR(255),
    valor DECIMAL(10,2),
    vencimento DATE,
    status ENUM('pendente', 'pago', 'vencido') DEFAULT 'pendente'
);

INSERT INTO financeiro_contas (descricao, valor, vencimento, status) VALUES 
('Aluguel do templo', 3500.00, '2026-03-05', 'pendente'),
('Conta de energia', 450.00, '2026-03-10', 'pendente');

CREATE TABLE IF NOT EXISTS financeiro_recibos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    descricao VARCHAR(255),
    valor DECIMAL(10,2),
    data DATE,
    tipo ENUM('entrada', 'saida')
);

INSERT INTO financeiro_recibos (descricao, valor, data, tipo) VALUES 
('Dízimo - Fevereiro', 12500.00, '2026-02-20', 'entrada'),
('Pagamento aluguel', 3500.00, '2026-02-15', 'saida');

-- 8. Louvor
CREATE TABLE IF NOT EXISTS escala_louvor (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    funcao VARCHAR(255),
    tipo VARCHAR(50) DEFAULT 'vocal',
    data DATE
);

CREATE TABLE IF NOT EXISTS escala_louvor_info (
    id INT AUTO_INCREMENT PRIMARY KEY,
    data DATE NOT NULL,
    paleta_cores VARCHAR(255),
    observacao TEXT
);

CREATE TABLE IF NOT EXISTS louvor_musicas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255),
    artista VARCHAR(255),
    tom VARCHAR(20),
    url_video VARCHAR(512),
    url_arquivo VARCHAR(512),
    url_arquivo_2 VARCHAR(512),
    concluido BOOLEAN DEFAULT FALSE
);

-- 9. Projetos e Arrecadações
CREATE TABLE IF NOT EXISTS projetos_reunioes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    data DATE NOT NULL,
    horario TIME NOT NULL,
    link VARCHAR(512),
    participantes TEXT, -- Lista de nomes separada por vírgula ou JSON
    documentos TEXT    -- URLs de documentos
);

CREATE TABLE IF NOT EXISTS projetos_novos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    responsaveis VARCHAR(255),
    etapas TEXT, -- Etapas do projeto em formato JSON ou texto
    inicio DATE,
    fim DATE,
    status ENUM('planejamento', 'andamento', 'concluido') DEFAULT 'planejamento',
    valor_necessario DECIMAL(10,2) DEFAULT 0.00,
    valor_arrecadado DECIMAL(10,2) DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS projetos_arrecadacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    tipo ENUM('bazar', 'rifa', 'doacao') DEFAULT 'bazar',
    status ENUM('ativa', 'encerrada') DEFAULT 'ativa'
);

CREATE TABLE IF NOT EXISTS arrecadacao_itens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    arrecadacao_id INT,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    preco DECIMAL(10,2),
    fotos TEXT,
    forma_pagamento VARCHAR(100), -- Pix, cartão, dinheiro
    status ENUM('disponivel', 'vendido', 'reservado') DEFAULT 'disponivel',
    FOREIGN KEY (arrecadacao_id) REFERENCES projetos_arrecadacoes(id) ON DELETE CASCADE
);

-- 10. Membros da Igreja
CREATE TABLE IF NOT EXISTS membros_igreja (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    documentos VARCHAR(100),
    endereco TEXT,
    aniversario DATE,
    estado_civil VARCHAR(50),
    renda_familiar DECIMAL(10,2),
    valor_dizimo DECIMAL(10,2) DEFAULT 0.00
);
