
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi, authApi, churchesApi, uploadFile } from "@/services/api";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Pencil, ShieldAlert, Key, Loader2, Save, Trash2, ShieldCheck, Mail, User as UserIcon, Eye, EyeOff, Camera } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const modules = [
  { name: 'agenda', label: 'Agenda / Geral' },
  { name: 'conselho', label: 'Conselho' },
  { name: 'secretaria', label: 'Secretaria' },
  { name: 'escalas', label: 'Escalas' },
  { name: 'oracao', label: 'Oração' },
  { name: 'projetos', label: 'Projetos' },
  { name: 'midia', label: 'Mídia / Marketing' },
  { name: 'louvor', label: 'Louvor' },
  { name: 'financeiro', label: 'Financeiro' },
  { name: 'escola_biblica', label: 'Escola Bíblica' },
  { name: 'pastor', label: 'Estudos / Cultos' },
];

export default function Users() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isAdmin, isSuperAdmin, user: currentUser } = useAuth();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userPerms, setUserPerms] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState("user");
  const [selectedChurch, setSelectedChurch] = useState<string | undefined>(undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll(),
  });

  const { data: churches = [] } = useQuery({
    queryKey: ['churches'],
    queryFn: () => churchesApi.getAll(),
    enabled: isSuperAdmin
  });

  const userMutation = useMutation({
    mutationFn: (data: any) => editingUser ? usersApi.update(editingUser.id, data) : usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
      setEditingUser(null);
      toast({ title: editingUser ? "Usuário atualizado" : "Usuário criado com sucesso!" });
    },
    onError: (err: any) => toast({ title: "Erro ao salvar usuário", description: err.message, variant: "destructive" })
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: number) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: "Usuário removido" });
    },
    onError: (err: any) => {
      toast({ 
        title: "Erro ao excluir", 
        description: err.message, 
        variant: "destructive" 
      });
    }
  });

  const handlePermChange = (moduleName: string, level: string) => {
    setUserPerms(prev => {
      const existing = prev.find(p => p.module_name === moduleName);
      if (existing) {
        return prev.map(p => p.module_name === moduleName ? { ...p, permission_level: level } : p);
      }
      return [...prev, { module_name: moduleName, permission_level: level }];
    });
  };

  const currentChurchName = (churchId: number) => {
    return churches.find((c: any) => c.id === churchId)?.name || "Igreja Local";
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 min-h-[90vh]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader 
          title="Gestão de Usuários" 
          subtitle="Controle quem tem acesso ao sistema e quais módulos podem visualizar ou editar." 
        />
        <Dialog open={isModalOpen} onOpenChange={(open) => { 
          setIsModalOpen(open); 
          if (!open) { 
            setEditingUser(null); 
            setSelectedRole("user"); 
            setSelectedChurch(undefined); 
            setSelectedAvatar(null);
            setUserPerms([]);
          }
        }}>
          <DialogTrigger asChild>
            <Button className="h-12 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 rounded-xl px-6 gap-2 text-white transition-all hover:scale-105 active:scale-95"
              onClick={() => { setEditingUser(null); setSelectedRole("user"); setSelectedChurch(undefined); setSelectedAvatar(null); setUserPerms([]); }}
            >
              <UserPlus className="w-5 h-5" /> Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-3xl p-8 border-0 shadow-2xl backdrop-blur-md max-h-[92vh] overflow-y-auto custom-scrollbar">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-[#212351] flex items-center gap-3">
                {editingUser ? <><Pencil className="w-6 h-6 text-blue-500" /> Editar Usuário</> : <><UserPlus className="w-6 h-6 text-blue-500" /> Cadastrar Usuário</>}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Preencha as informações abaixo para {editingUser ? 'atualizar os dados do' : 'cadastrar um novo'} usuário.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const data: any = Object.fromEntries(fd.entries());
              if (selectedAvatar) data.avatar_url = selectedAvatar;
              if (selectedRole === 'user') data.permissions = userPerms;
              
              // Se estiver editando e a senha for deixada em branco, removemos do objeto
              // para evitar que o bcrypt gere um hash vazio.
              if (editingUser && !data.password) {
                delete data.password;
              }
              
              userMutation.mutate(data);
            }} className="space-y-6 pt-4 pb-2">
              <div className="flex flex-col items-center gap-4 mb-2">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-blue-400">
                    {selectedAvatar ? (
                      <img src={selectedAvatar} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-10 h-10 text-gray-300" />
                    )}
                  </div>
                  <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center cursor-pointer shadow-lg hover:bg-blue-700 transition-all active:scale-90">
                    <Camera className="w-5 h-5" />
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setIsUploading(true);
                          try {
                            const { url } = await uploadFile(file);
                            setSelectedAvatar(url);
                          } catch (err) {
                            toast({ title: "Erro no upload", variant: "destructive" });
                          } finally {
                            setIsUploading(false);
                          }
                        }
                      }} 
                    />
                  </label>
                </div>
                {isUploading && <p className="text-[10px] font-bold text-blue-600 animate-pulse uppercase">Enviando foto...</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Nome Completo</Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                  <Input name="name" defaultValue={editingUser?.name} placeholder="Nome do usuário" required className="pl-10 h-11 bg-gray-50 border-gray-100 rounded-xl focus:ring-blue-500" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">E-mail de Login</Label>
                <div className="relative">
                   <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                   <Input name="email" type="email" defaultValue={editingUser?.email} placeholder="email@igreja.com" required className="pl-10 h-11 bg-gray-50 border-gray-100 rounded-xl focus:ring-blue-500" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">
                  {editingUser ? "Nova Senha (deixe em branco para manter)" : "Senha Inicial"}
                </Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                  <Input 
                    name="password" 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    required={!editingUser} 
                    className="pl-10 pr-10 h-11 bg-gray-50 border-gray-100 rounded-xl focus:ring-blue-500" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-blue-500 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Perfil de Acesso</Label>
                <input type="hidden" name="role" value={selectedRole} />
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="h-11 bg-gray-50 border-gray-100 rounded-xl focus:ring-blue-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-0 shadow-xl">
                    <SelectItem value="user">Colaborador / Usuário</SelectItem>
                    <SelectItem value="admin_igreja">Administrador da Igreja</SelectItem>
                    {isSuperAdmin && <SelectItem value="super_admin">Super Admin (Dev/Sistema)</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              {isSuperAdmin && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Igreja Vinculada</Label>
                  <input type="hidden" name="church_id" value={selectedChurch || ""} />
                  <Select value={selectedChurch} onValueChange={setSelectedChurch}>
                    <SelectTrigger className="h-11 bg-gray-50 border-gray-100 rounded-xl focus:ring-blue-500">
                      <SelectValue placeholder="Selecione a Igreja" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-0 shadow-xl">
                      {churches.map((c: any) => (
                        <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedRole === 'user' && (
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <Label className="text-sm font-black text-blue-600 uppercase tracking-wider block mb-4">Acessos do Colaborador</Label>
                  <div className="space-y-3">
                    {modules.map((m) => {
                      const p = userPerms.find(up => up.module_name === m.name);
                      const level = p?.permission_level || 'none';
                      return (
                        <div key={m.name} className="flex flex-col gap-2 p-3 bg-gray-50/50 border border-gray-50 rounded-xl">
                          <span className="text-xs font-bold text-[#212351] truncate">{m.label}</span>
                          <div className="flex bg-white p-0.5 rounded-lg border border-gray-100 shadow-sm">
                            {['none', 'read', 'write'].map((lvl) => (
                              <button
                                key={lvl}
                                type="button"
                                onClick={() => handlePermChange(m.name, lvl)}
                                className={`flex-1 py-1.5 rounded-md text-[9px] font-black uppercase transition-all ${
                                  level === lvl 
                                  ? (lvl === 'write' ? 'bg-emerald-500 text-white shadow-sm' : lvl === 'read' ? 'bg-blue-500 text-white shadow-sm' : 'bg-gray-300 text-gray-700') 
                                  : 'text-gray-400 hover:text-gray-600'
                                }`}
                              >
                                {lvl === 'none' ? 'Bloqueado' : lvl === 'read' ? 'Ver' : 'Editar'}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <DialogFooter className="pt-4">
                <Button type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-700 font-bold rounded-xl shadow-lg shadow-blue-600/10 transition-all active:scale-95" disabled={userMutation.isPending}>
                  {userMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5 mr-2" /> Salvar Usuário</>}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence>
          {users.map((u: any, i: number) => (
            <motion.div 
              key={u.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 p-6 group hover:shadow-2xl hover:shadow-blue-500/5 transition-all relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-[100px] -z-0 pointer-events-none" />
              
              <div className="flex items-center gap-4 mb-6 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-inner overflow-hidden">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt={u.name} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-7 h-7" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-[#212351] truncate text-lg">{u.name}</h3>
                  <p className="text-xs text-muted-foreground font-medium truncate opacity-70">{u.email}</p>
                  {isSuperAdmin && (
                    <p className="text-[10px] font-bold text-blue-600/60 uppercase mt-0.5">{u.church_name || currentChurchName(u.church_id)}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 mb-6 relative z-10">
                <Badge variant="outline" className={`rounded-lg border-2 font-bold uppercase px-3 py-1 text-[10px] tracking-wider ${
                  u.role === 'super_admin' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                  u.role === 'admin_igreja' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 
                  'bg-emerald-50 text-emerald-600 border-emerald-200'
                }`}>
                  {u.role === 'super_admin' ? 'Super Admin' : u.role === 'admin_igreja' ? 'Admin / Pastor' : 'Usuário'}
                </Badge>
                {u.role === 'user' && (
                  <Button variant="ghost" size="sm" className="h-7 text-[10px] font-black uppercase text-blue-500 hover:text-blue-600 px-2 rounded-lg bg-blue-50" 
                    onClick={async () => {
                      setEditingUser(u); 
                      setSelectedRole(u.role);
                      setSelectedChurch(u.church_id?.toString());
                      setSelectedAvatar(u.avatar_url);
                      const perms = await usersApi.getPermissions(u.id);
                      setUserPerms(perms);
                      setIsModalOpen(true); 
                    }}>
                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Acessos
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100 relative z-10">
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100" onClick={async () => { 
                    setEditingUser(u); 
                    setSelectedRole(u.role);
                    setSelectedChurch(u.church_id?.toString());
                    setSelectedAvatar(u.avatar_url);
                    const perms = await usersApi.getPermissions(u.id);
                    setUserPerms(perms);
                    setIsModalOpen(true); 
                  }}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-amber-500 hover:bg-amber-50 border border-transparent hover:border-amber-100" title="Redefinir Senha" onClick={async () => {
                      setEditingUser(u); 
                      setSelectedRole(u.role);
                      setSelectedChurch(u.church_id?.toString());
                      setSelectedAvatar(u.avatar_url);
                      const perms = await usersApi.getPermissions(u.id);
                      setUserPerms(perms);
                      setIsModalOpen(true); 
                    }}>
                      <Key className="w-4 h-4" />
                    </Button>
                    {u.id !== currentUser?.id && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-3xl p-8 border-0 shadow-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl font-bold text-[#212351]">Excluir Usuário?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. O usuário <strong>{u.name}</strong> perderá acesso ao sistema permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="gap-2 pt-4">
                            <AlertDialogCancel className="rounded-xl border-gray-200">Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              className="bg-destructive hover:bg-destructive/90 rounded-xl px-6"
                              onClick={() => deleteUserMutation.mutate(u.id)}
                            >
                              Excluir Permanentemente
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
