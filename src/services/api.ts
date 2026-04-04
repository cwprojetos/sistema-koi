

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3034';

const getAuthHeaders = () => {
    const token = sessionStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

const handleResponse = async (response: Response) => {
    if (!response.ok) {
        let errorMessage = 'Erro na requisição';
        try {
            const error = await response.json();
            errorMessage = error.error || errorMessage;
            if (error.details) {
                errorMessage += ` (${error.details})`;
            }
        } catch (e) {
            // response not json
        }
        throw new Error(errorMessage);
    }
    return response.json();
};

const createApi = (endpoint: string) => ({
    getAll: async () => {
        const response = await fetch(`${API_BASE_URL}/api/${endpoint}`, { headers: getAuthHeaders() });
        return handleResponse(response);
    },
    getOne: async (id: number) => {
        const response = await fetch(`${API_BASE_URL}/api/${endpoint}/${id}`, { headers: getAuthHeaders() });
        return handleResponse(response);
    },
    create: async (data: any) => {
        const response = await fetch(`${API_BASE_URL}/api/${endpoint}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        return handleResponse(response);
    },
    update: async (id: number, data: any) => {
        const response = await fetch(`${API_BASE_URL}/api/${endpoint}/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        return handleResponse(response);
    },
    delete: async (id: number) => {
        const response = await fetch(`${API_BASE_URL}/api/${endpoint}/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        return handleResponse(response);
    }
});

export const authApi = {
    login: async (credentials: any) => {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });
        return handleResponse(response);
    },
    loginAsVisitor: async (churchId: number) => {
        const response = await fetch(`${API_BASE_URL}/api/auth/visitante`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ church_id: churchId })
        });
        return handleResponse(response);
    },
    getMe: async () => {
        const response = await fetch(`${API_BASE_URL}/api/me`, { headers: getAuthHeaders() });
        return handleResponse(response);
    },
    changePassword: async (data: any) => {
        const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        return handleResponse(response);
    }
};

export const usersApi = {
    ...createApi('users'),
    getPermissions: async (userId: number) => {
        const response = await fetch(`${API_BASE_URL}/api/permissions/${userId}`, { headers: getAuthHeaders() });
        return handleResponse(response);
    },
    updatePermissions: async (userId: number, permissions: any[]) => {
        const response = await fetch(`${API_BASE_URL}/api/permissions/${userId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ permissions })
        });
        return handleResponse(response);
    }
};

export const churchesApi = {
    ...createApi('churches'),
    getPublic: async () => {
        const response = await fetch(`${API_BASE_URL}/api/churches/public`);
        return handleResponse(response);
    }
};

export const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = sessionStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
    });
    return handleResponse(response);
};

// --- DOMAIN SERVICES ---
export const agendaApi = createApi('agenda');
export const avisosApi = createApi('avisos');
export const escalasApi = createApi('escalas');
export const oracaoApi = createApi('pedidos_oracao');
export const devocionalApi = createApi('devocionais');
export const midiaEscalaApi = createApi('escala_midia');
export const midiaAfazeresApi = createApi('afazeres_midia');
export const louvorEscalaApi = createApi('escala_louvor');
export const louvorMusicasApi = createApi('musicas_louvor');
export const financeiroContasApi = createApi('financeiro_contas');
export const financeiroRecibosApi = createApi('financeiro_recibos');
export const pastorApi = createApi('conteudo_pastor');
export const escolaBiblicaConteudoApi = createApi('escola_biblica_conteudo');
export const escolaBiblicaPerguntasApi = createApi('escola_biblica_perguntas');
export const projetosApi = createApi('projetos');
export const conselhoParticipantesApi = createApi('participantes_conselho');
export const conselhoPlanejamentosApi = createApi('planejamentos_conselho');
export const conselhoReunioesApi = createApi('reunioes_conselho');
export const projetosReunioesApi = createApi('projetos_reunioes');
export const projetosNovosApi = {
    ...createApi('projetos_novos'),
    registrarArrecadacaoProjeto: async (data: any) => {
        const response = await fetch(`${API_BASE_URL}/api/projetos_novos/${data.projetoId}/arrecadacao`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ 
                valor: data.valor, 
                recebido_por: data.recebido_por,
                url_arquivo: data.url_arquivo,
                tituloProjeto: data.tituloProjeto 
            })
        });
        return handleResponse(response);
    }
};
export const projetosArrecadacoesApi = createApi('projetos_arrecadacoes');
export const arrecadacaoItensApi = {
    ...createApi('arrecadacao_itens'),
    registrarVenda: async (data: any) => {
        const response = await fetch(`${API_BASE_URL}/api/arrecadacao_itens/${data.itemId}/venda`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ 
                valor: data.valor, 
                forma_pagamento: data.forma_pagamento,
                recebeu: data.recebido_por,
                url_arquivo: data.url_arquivo,
                descricao: data.descricao 
            })
        });
        return handleResponse(response);
    }
};
export const sugestoesApi = createApi('sugestoes');

// Membros da Igreja API
export const membrosIgrejaApi = {
    ...createApi('membros_igreja'),
    registrarDizimo: async (data: any) => {
        const response = await fetch(`${API_BASE_URL}/api/membros_igreja/dizimo`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        return handleResponse(response);
    }
};

// Frequência de Membros API
export const frequenciaMembrosApi = createApi('frequencia_membros');
