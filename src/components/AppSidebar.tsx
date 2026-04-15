import { Calendar, Users, Heart, Monitor, DollarSign, BookOpen, Music, LogIn, LogOut, Rocket, Settings, Upload, Lightbulb, ShieldCheck, UserCog, Key, Loader2 } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useConfig, ConfigType } from "@/contexts/ConfigContext";
import { uploadFile, authApi } from "@/services/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "@/services/api";

const menuItems = [
  { title: "Agenda", url: "/", icon: Calendar, module: "agenda" },
  { title: "Conselho", url: "/conselho", icon: Users, module: "conselho" },
  { title: "Secretaria", url: "/membros", icon: Users, module: "secretaria" },
  { title: "Escalas", url: "/escalas", icon: Users, module: "escalas" },
  { title: "Devocional / Pedido", url: "/oracao", icon: Heart, module: "oracao" },
  { title: "Projetos e Arrecadações", url: "/projetos", icon: Rocket, module: "projetos" },
  { title: "Mídia / Marketing", url: "/midia", icon: Monitor, module: "midia" },
  { title: "Louvor", url: "/louvor", icon: Music, module: "louvor" },
  { title: "Financeiro", url: "/financeiro", icon: DollarSign, module: "financeiro" },
  { title: "Escola Bíblica", url: "/escola-biblica", icon: BookOpen, module: "escola_biblica" },
  { title: "Estudos / Cultos", url: "/pastor", icon: BookOpen, module: "pastor" },
];

export function AppSidebar() {
  const sidebar = useSidebar();
  const collapsed = sidebar?.state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { role, logout, canRead, canWrite, isAdmin, isSuperAdmin, user } = useAuth();
  const { config, updateConfig } = useConfig();
  const { toast } = useToast();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'config' | 'sugestoes'>('config');
  const [editingConfig, setEditingConfig] = useState(config);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const { data: sugestoes = [] } = useQuery({
    queryKey: ['sugestoes'],
    queryFn: async () => {
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/sugestoes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    },
    enabled: isSettingsOpen && isAdmin,
  });

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const file = e.target.files[0];
        const res = await uploadFile(file);
        setEditingConfig({ ...editingConfig, igreja_logo: res.url });
        toast({ title: "Logo carregada! Salve para aplicar." });
      } catch (error) {
        toast({ title: "Erro ao carregar logo", variant: "destructive" });
      }
    }
  };

  const handleSaveConfig = async () => {
    try {
      const keys = Object.keys(editingConfig) as Array<keyof ConfigType>;
      for (const key of keys) {
        if (editingConfig[key] !== config[key]) {
          await updateConfig(key, editingConfig[key] as string);
        }
      }
      toast({ title: "Configurações salvas!" });
      setIsSettingsOpen(false);
    } catch (e) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const visibleMenuItems = (menuItems || []).filter(item => {
    if (!item || !item.module) return false;
    
    const currentRole = role || 'guest';
    if (currentRole === 'guest') {
      const publicModules = ["agenda", "escalas", "oracao", "projetos", "escola_biblica", "pastor"];
      return publicModules.includes(item.module);
    }
    if (currentRole === 'visitante') {
      const visitorModules = ["agenda", "oracao", "projetos", "escola_biblica", "pastor"];
      return visitorModules.includes(item.module);
    }
    return typeof canRead === 'function' ? canRead(item.module) : false;
  });

  const roleLabelMap: Record<string, string> = {
    super_admin: "Super Admin",
    admin_igreja: "Admin da Igreja",
    user: "Usuário/Colaborador",
    visitante: "Visitante",
    guest: "Visitante Público"
  };
  const roleLabel = roleLabelMap[role as string] || "Acessando";

  return (
    <Sidebar className="border-r-0 flex flex-col h-full" collapsible="icon">
      <div className="flex items-center gap-3 px-4 py-6 border-b border-sidebar-border">
        <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 bg-white/10">
          <img src={config.igreja_logo} alt="Logo" className="w-full h-full object-cover" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden flex flex-col justify-center">
            <p className="text-[10px] font-bold text-sidebar-foreground/40 uppercase tracking-widest leading-none mb-1">Paineis de Controle</p>
            <h1 className="text-sm font-black text-sidebar-primary-foreground tracking-tight uppercase truncate leading-none mb-0.5">
              {user?.name || "Bem-vindo"}
            </h1>
            <p className="text-[10px] font-medium text-sidebar-foreground/60 truncate italic opacity-80">{config.igreja_nome}</p>
          </div>
        )}
      </div>

      <SidebarContent className="px-2 py-4 flex-1">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title} isActive={isActive}>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        onClick={() => {
                          if (sidebar?.isMobile) {
                            sidebar?.setOpenMobile?.(false);
                          }
                        }}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sidebar-foreground/70 transition-all hover:text-sidebar-primary-foreground hover:bg-sidebar-accent"
                        activeClassName="bg-sidebar-accent text-sidebar-primary-foreground font-medium"
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border flex flex-col gap-2">
        {role !== 'guest' && role !== 'visitante' && (
          <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-3">
                <Key className="w-5 h-5" />
                {!collapsed && <span>Alterar Minha Senha</span>}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Alterar Senha</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Senha Atual</label>
                  <Input 
                    type="password" 
                    value={passwordData.currentPassword} 
                    onChange={e => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nova Senha</label>
                  <Input 
                    type="password" 
                    value={passwordData.newPassword} 
                    onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirmar Nova Senha</label>
                  <Input 
                    type="password" 
                    value={passwordData.confirmPassword} 
                    onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={async () => {
                    if (passwordData.newPassword !== passwordData.confirmPassword) {
                      return toast({ title: "Senhas não conferem", variant: "destructive" });
                    }
                    setIsChangingPassword(true);
                    try {
                      await authApi.changePassword({
                        currentPassword: passwordData.currentPassword,
                        newPassword: passwordData.newPassword
                      });
                      toast({ title: "Senha alterada com sucesso!" });
                      setIsPasswordModalOpen(false);
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    } catch (err: any) {
                      toast({ title: "Erro ao alterar senha", description: err.message, variant: "destructive" });
                    } finally {
                      setIsChangingPassword(false);
                    }
                  }}
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Salvar Nova Senha
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {isSuperAdmin && (
          <Button variant="ghost" className="w-full justify-start gap-3 text-amber-400 hover:text-amber-300" onClick={() => {
              navigate('/admin/churches');
              if (sidebar?.isMobile) sidebar?.setOpenMobile?.(false);
          }}>
            <ShieldCheck className="w-5 h-5" />
            {!collapsed && <span>Gestão de Igrejas</span>}
          </Button>
        )}

        {(isAdmin || canWrite('secretaria') || canWrite('midia')) && (
          <>
            <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => {
                navigate('/admin/users');
                if (sidebar?.isMobile) sidebar?.setOpenMobile?.(false);
            }}>
              <UserCog className="w-5 h-5" />
              {!collapsed && <span>Gestão de Usuários</span>}
            </Button>

            <Dialog open={isSettingsOpen} onOpenChange={(open) => {
              setIsSettingsOpen(open);
              if (open) { setEditingConfig(config); setSettingsTab('config'); }
            }}>
              <DialogTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-3">
                  <Settings className="w-5 h-5" />
                  {!collapsed && <span>Configurações</span>}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    Configurações da Igreja
                    <span className="ml-auto flex gap-1">
                      <Button size="sm" variant={settingsTab === 'config' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => setSettingsTab('config')}>
                        <Settings className="w-3 h-3 mr-1" /> Config
                      </Button>
                      <Button size="sm" variant={settingsTab === 'sugestoes' ? 'default' : 'outline'} className="h-7 text-xs gap-1" onClick={() => setSettingsTab('sugestoes')}>
                        <Lightbulb className="w-3 h-3" /> Sugestões
                        {sugestoes.length > 0 && (
                          <span className="bg-yellow-400 text-black text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">{sugestoes.length}</span>
                        )}
                      </Button>
                    </span>
                  </DialogTitle>
                </DialogHeader>

                <div className="py-4 space-y-4 overflow-y-auto px-1 flex-1">
                  {settingsTab === 'sugestoes' ? (
                    <div className="space-y-3">
                      {sugestoes.length === 0 ? <p className="text-center italic text-muted-foreground py-8">Nenhuma sugestão.</p> : 
                        sugestoes.map((s: any) => (
                        <div key={s.id} className="p-4 rounded-xl border-2 border-[#212351]/10 bg-white space-y-2">
                          <p className="text-sm font-bold">{s.nome} <span className="text-xs font-normal opacity-60">({new Date(s.data).toLocaleDateString()})</span></p>
                          <p className="text-sm opacity-80">{s.texto}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Nome da Igreja</label>
                        <Input value={editingConfig.igreja_nome} onChange={(e) => setEditingConfig({ ...editingConfig, igreja_nome: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Logo da Igreja</label>
                        <div className="flex gap-2">
                          <Input value={editingConfig.igreja_logo} onChange={(e) => setEditingConfig({ ...editingConfig, igreja_logo: e.target.value })} />
                          <Button type="button" variant="outline" size="icon" className="relative shrink-0">
                            <Upload className="w-4 h-4" />
                            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleUploadLogo} />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Cor de Fundo da Barra (HSL)</label>
                        <Input value={editingConfig.sidebar_cor} onChange={(e) => setEditingConfig({ ...editingConfig, sidebar_cor: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Cor de Destaque (HSL)</label>
                        <Input value={editingConfig.sidebar_active_cor} onChange={(e) => setEditingConfig({ ...editingConfig, sidebar_active_cor: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Link da Transmissão (Youtube)</label>
                        <Input 
                            value={editingConfig.youtube_link} 
                            placeholder="Ex: https://youtube.com/live/..."
                            onChange={(e) => setEditingConfig({ ...editingConfig, youtube_link: e.target.value })} 
                        />
                      </div>
                    </div>
                  )}
                </div>

                {settingsTab === 'config' && (
                  <DialogFooter><Button onClick={handleSaveConfig}>Salvar</Button></DialogFooter>
                )}
              </DialogContent>
            </Dialog>
          </>
        )}

        {role !== "guest" ? (
          <Button variant="secondary" className="w-full justify-start gap-3 bg-red-500/10 text-red-500 hover:bg-red-500/20" onClick={logout}>
            <LogOut className="w-5 h-5" />
            {!collapsed && <span>Sair</span>}
          </Button>
        ) : (
          <Button variant="default" className="w-full justify-start gap-3" onClick={() => navigate('/login')}>
            <LogIn className="w-5 h-5" />
            {!collapsed && <span>Fazer Login</span>}
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
