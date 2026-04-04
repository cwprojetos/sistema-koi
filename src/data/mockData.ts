export const agendaSemanal = [
  { id: 1, titulo: "Culto de Oração", data: "2026-02-25", horario: "19:30", tipo: "culto" },
  { id: 2, titulo: "Culto de Ensino", data: "2026-02-26", horario: "19:30", tipo: "culto" },
  { id: 3, titulo: "Ensaio do Louvor", data: "2026-02-27", horario: "19:00", tipo: "evento" },
  { id: 4, titulo: "Culto da Família", data: "2026-02-28", horario: "18:00", tipo: "culto" },
  { id: 5, titulo: "Escola Bíblica Dominical", data: "2026-03-01", horario: "09:00", tipo: "evento" },
  { id: 6, titulo: "Culto de Celebração", data: "2026-03-01", horario: "18:00", tipo: "culto" },
];

export const avisos = [
  { id: 1, titulo: "Reunião de líderes", descricao: "Reunião com todos os líderes de departamento no sábado às 15h.", data: "2026-02-28" },
  { id: 2, titulo: "Campanha de arrecadação", descricao: "Estamos arrecadando alimentos não perecíveis para doação.", data: "2026-03-01" },
  { id: 3, titulo: "Batismo", descricao: "Inscrições abertas para o próximo batismo. Procure a secretaria.", data: "2026-03-08" },
];

export const escalaProximoCulto = {
  data: "2026-03-01",
  culto: "Culto de Celebração",
  recepcao: ["Maria Silva", "João Santos"],
  louvor: ["Ana Costa", "Pedro Lima", "Carla Souza", "Lucas Almeida"],
  diaconos: ["Roberto Oliveira", "Marcos Pereira"],
  oracao: "Pastor Carlos",
  pregador: "Pr. Eduardo Nascimento",
};

export const escalasCompletas = [
  {
    data: "2026-03-01",
    culto: "Culto de Celebração",
    recepcao: ["Maria Silva", "João Santos"],
    louvor: ["Ana Costa", "Pedro Lima", "Carla Souza", "Lucas Almeida"],
    diaconos: ["Roberto Oliveira", "Marcos Pereira"],
    oracao: "Pastor Carlos",
    pregador: "Pr. Eduardo Nascimento",
  },
  {
    data: "2026-03-04",
    culto: "Culto de Oração",
    recepcao: ["Fernanda Reis", "Paulo Costa"],
    louvor: ["Juliana Martins", "Thiago Araújo", "Bruna Ferreira"],
    diaconos: ["Carlos Mendes", "André Lima"],
    oracao: "Dc. Roberto Oliveira",
    pregador: "Pr. Carlos Mendes",
  },
  {
    data: "2026-03-08",
    culto: "Culto de Celebração",
    recepcao: ["Luciana Barros", "Felipe Nunes"],
    louvor: ["Ana Costa", "Lucas Almeida", "Mariana Dias", "Rafael Gomes"],
    diaconos: ["Marcos Pereira", "Sérgio Duarte"],
    oracao: "Ev. Patrícia Souza",
    pregador: "Pr. Eduardo Nascimento",
  },
];

export const pedidosOracao = [
  { id: 1, nome: "Irmã Dona Maria", pedido: "Saúde e recuperação de cirurgia", data: "2026-02-24", respondido: false },
  { id: 2, nome: "Família Santos", pedido: "Provisão financeira e emprego", data: "2026-02-23", respondido: false },
  { id: 3, nome: "Jovem Lucas", pedido: "Aprovação no vestibular", data: "2026-02-22", respondido: true },
  { id: 4, nome: "Irmão Roberto", pedido: "Restauração familiar", data: "2026-02-21", respondido: false },
];

export const versiculoDoDia = {
  texto: "Porque eu bem sei os pensamentos que penso de vós, diz o Senhor; pensamentos de paz, e não de mal, para vos dar o fim que esperais.",
  referencia: "Jeremias 29:11",
};

export const devocionalDiario = {
  titulo: "Confiança nos Planos de Deus",
  texto: "Em meio às incertezas da vida, Deus nos assegura que seus planos para nós são de paz e esperança. Quando enfrentamos dificuldades, podemos descansar sabendo que Ele tem um propósito maior. A fé nos convida a confiar mesmo quando não entendemos o caminho. Hoje, entregue suas preocupações ao Senhor e descanse em Sua soberania.",
  autor: "Pr. Eduardo Nascimento",
};

export const escalaMidia = [
  { id: 1, nome: "Carlos Tech", funcao: "Transmissão ao vivo", data: "2026-03-01" },
  { id: 2, nome: "Juliana Design", funcao: "Slides da pregação", data: "2026-03-01" },
  { id: 3, nome: "Felipe Câmera", funcao: "Filmagem", data: "2026-03-01" },
  { id: 4, nome: "Ana Social", funcao: "Redes sociais", data: "2026-03-01" },
];

export const afazeresMidia = [
  { id: 1, tarefa: "Editar vídeo do culto passado", responsavel: "Felipe Câmera", concluido: false },
  { id: 2, tarefa: "Criar arte para redes sociais", responsavel: "Juliana Design", concluido: true },
  { id: 3, tarefa: "Postar stories do ensaio", responsavel: "Ana Social", concluido: false },
  { id: 4, tarefa: "Configurar equipamento de som", responsavel: "Carlos Tech", concluido: false },
];

export const contasAbertas = [
  { id: 1, descricao: "Aluguel do templo", valor: 3500, vencimento: "2026-03-05", status: "pendente" },
  { id: 2, descricao: "Conta de energia", valor: 450, vencimento: "2026-03-10", status: "pendente" },
  { id: 3, descricao: "Manutenção do som", valor: 800, vencimento: "2026-02-28", status: "vencido" },
  { id: 4, descricao: "Material de limpeza", valor: 120, vencimento: "2026-03-15", status: "pendente" },
];

export const recibos = [
  { id: 1, descricao: "Dízimo - Fevereiro", valor: 12500, data: "2026-02-20", tipo: "entrada" },
  { id: 2, descricao: "Oferta especial", valor: 3200, data: "2026-02-22", tipo: "entrada" },
  { id: 3, descricao: "Pagamento aluguel", valor: 3500, data: "2026-02-15", tipo: "saida" },
];

export const conteudoPastor = [
  { id: 1, titulo: "Pregação: A Fé que Move Montanhas", tipo: "video", url_video: "https://www.youtube.com/watch?v=R9_uQbeBvOQ", data: "2026-02-23" },
  { id: 2, titulo: "Comunicado: Conferência de Jovens", tipo: "comunicado", descricao: "Nossa conferência de jovens será nos dias 15 e 16 de março. Inscrições abertas!", data: "2026-02-24" },
  { id: 3, titulo: "Estudo Bíblico: Romanos Cap. 8", tipo: "apresentacao", url_arquivo: "", data: "2026-02-20" },
  { id: 4, titulo: "Palavra de Encorajamento", tipo: "comunicado", descricao: "Queridos irmãos, que nesta semana possamos renovar nossas forças no Senhor. Ele é fiel!", data: "2026-02-25" },
];

export const escalaLouvor = [
  { id: 1, nome: "Ana Costa", funcao: "Vocal / Líder", data: "2026-03-01", tipo: "vocal" },
  { id: 2, nome: "Pedro Lima", funcao: "Teclado", data: "2026-03-01", tipo: "musico" },
  { id: 3, nome: "Carla Souza", funcao: "Violão", data: "2026-03-01", tipo: "musico" },
  { id: 4, nome: "Lucas Almeida", funcao: "Bateria", data: "2026-03-01", tipo: "musico" },
];

export const musicasLouvor = [
  { id: 1, titulo: "Lugar Secreto", artista: "Gabriela Rocha", tom: "G", concluido: true },
  { id: 2, titulo: "A Casa é Sua", artista: "Casa Worship", tom: "A", concluido: false },
  { id: 3, titulo: "Bondade de Deus", artista: "Isaías Saad", tom: "C", concluido: false },
];

