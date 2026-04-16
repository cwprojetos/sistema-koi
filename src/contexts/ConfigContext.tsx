import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '@/services/api';
import { useAuth } from './AuthContext';

export type ConfigType = {
    igreja_nome: string;
    igreja_logo: string;
    tema_cor: string;
    sidebar_cor: string;
    sidebar_active_cor: string;
    // Passwords
    pass_admin: string;
    pass_midia: string;
    pass_louvor: string;
    pass_financeiro: string;
    pass_conselho: string;
    pass_secretaria: string;
    pass_pastor: string;
    pass_professor: string;
    // Tab Toggles
    aba_agenda: string;
    aba_conselho: string;
    aba_secretaria: string;
    aba_escalas: string;
    aba_oracao: string;
    aba_projetos: string;
    aba_midia: string;
    aba_louvor: string;
    aba_financeiro: string;
    aba_escola_biblica: string;
    aba_estudos: string;
    youtube_link: string;
};

type ConfigContextType = {
    config: ConfigType;
    updateConfig: (chave: keyof ConfigType, valor: string) => Promise<void>;
    loading: boolean;
};

const defaultConfig: ConfigType = {
    igreja_nome: 'KOI - Conectados em Cristo',
    igreja_logo: '/logo.png',
    tema_cor: 'default',
    sidebar_cor: '215 55% 12%', // church navy default
    sidebar_active_cor: '215 85% 50%', // accent default
    pass_admin: 'M@rcel2025',
    pass_midia: 'midia123',
    pass_louvor: 'louvor123',
    pass_financeiro: 'financeiro123',
    pass_conselho: 'conselho123',
    pass_secretaria: 'secretaria123',
    pass_pastor: 'pastor123',
    pass_professor: 'professor123',
    aba_agenda: 'true',
    aba_conselho: 'true',
    aba_secretaria: 'true',
    aba_escalas: 'true',
    aba_oracao: 'true',
    aba_projetos: 'true',
    aba_midia: 'true',
    aba_louvor: 'true',
    aba_financeiro: 'true',
    aba_escola_biblica: 'true',
    aba_estudos: 'true',
    youtube_link: 'https://youtube.com',
};

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [config, setConfig] = useState<ConfigType>(defaultConfig);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchConfig();
    }, [user]);

    const fetchConfig = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/configuracoes`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            
            if (!response.ok) {
                console.warn('Could not load server config (running with defaults)');
                applyTheme(defaultConfig);
                return;
            }

            const data = await response.json();
            const newConfig = { ...defaultConfig };

            if (Array.isArray(data)) {
                data.forEach((item: any) => {
                    if (item.chave in newConfig) {
                        newConfig[item.chave as keyof ConfigType] = item.valor;
                    }
                });
            }
            setConfig(newConfig);
            applyTheme(newConfig);
        } catch (error) {
            console.error('Failed to load configuracoes:', error);
        } finally {
            setLoading(false);
        }
    };

    const applyTheme = (currentConfig: ConfigType) => {
        const root = document.documentElement;
        if (currentConfig.sidebar_cor) {
            root.style.setProperty('--sidebar-background', currentConfig.sidebar_cor);
        } else {
            root.style.removeProperty('--sidebar-background');
        }

        if (currentConfig.sidebar_active_cor) {
            root.style.setProperty('--sidebar-primary', currentConfig.sidebar_active_cor);
            root.style.setProperty('--sidebar-accent', currentConfig.sidebar_active_cor);
        } else {
            root.style.removeProperty('--sidebar-primary');
            root.style.removeProperty('--sidebar-accent');
        }
    };

    const updateConfig = async (chave: keyof ConfigType, valor: string) => {
        try {
            const token = sessionStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/configuracoes/chave/${chave}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ valor })
            });

            if (!response.ok) throw new Error('Failed to update config');
            
            const newConfig = { ...config, [chave]: valor };
            setConfig(newConfig);
            applyTheme(newConfig);
        } catch (error) {
            console.error('Failed to update config:', error);
            throw error;
        }
    };

    return (
        <ConfigContext.Provider value={{ config, updateConfig, loading }}>
            {children}
        </ConfigContext.Provider>
    );
}

export function useConfig() {
    const context = useContext(ConfigContext);
    if (context === undefined) {
        throw new Error('useConfig must be used within a ConfigProvider');
    }
    return context;
}
