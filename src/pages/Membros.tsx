import { useState, useMemo } from "react";
import { Users, UserPlus, Calendar, Search, Pencil, Trash2, CheckCircle, Instagram, BookOpen, Heart, PartyPopper, Plus, Loader2, MessageCircle, Copy, Camera, User as UserIcon, UserCog } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { membrosIgrejaApi, frequenciaMembrosApi, uploadFile } from "@/services/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PresenceReportModal } from "@/components/PresenceReportModal";
import { FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

function getGoogleDriveDirectLink(url: any) {
    if (!url || typeof url !== 'string') return url;
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
        return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
    }
    return url;
}

export default function Membros() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [editingItem, setEditingItem] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'membros' | 'frequencia'>('membros');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendanceType, setAttendanceType] = useState<string>("Culto");
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [selectedFoto, setSelectedFoto] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [addressData, setAddressData] = useState({
        cep: "",
        rua: "",
        numero: "",
        bairro: "",
        cidade: "",
        estado: "",
        complemento: ""
    });

    const handleCepChange = async (cep: string) => {
        const cleanCep = cep.replace(/\D/g, "");
        setAddressData(prev => ({ ...prev, cep: cleanCep }));
        
        if (cleanCep.length === 8) {
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
                const data = await response.json();
                if (!data.erro) {
                    setAddressData(prev => ({
                        ...prev,
                        rua: data.logradouro,
                        bairro: data.bairro,
                        cidade: data.localidade,
                        estado: data.uf
                    }));
                    toast.success("Endereço localizado!");
                }
            } catch (err) {
                console.error("Erro ao buscar CEP");
            }
        }
    };
    const [estadoCivil, setEstadoCivil] = useState("Casado(a)");
    const { canWrite } = useAuth();
    const canEdit = canWrite('secretaria');

    const { data: membros = [] } = useQuery({
        queryKey: ['membros_igreja'],
        queryFn: () => membrosIgrejaApi.getAll()
    });

    const { data: frequencias = [] } = useQuery({
        queryKey: ['frequencia_membros'],
        queryFn: () => frequenciaMembrosApi.getAll()
    });

    const membroMutation = useMutation({
        mutationFn: (data: any) => data.id ? membrosIgrejaApi.update(data.id, data) : membrosIgrejaApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['membros_igreja'] });
            setIsModalOpen(false);
            setEditingItem(null);
            toast.success("Membro salvo com sucesso!");
        },
        onError: (error: any) => {
            console.error("Erro ao salvar membro:", error);
            toast.error(`Erro ao salvar: ${error.message || "Tente novamente mais tarde."}`);
        }
    });

    const deleteMembroMutation = useMutation({
        mutationFn: (id: number) => membrosIgrejaApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['membros_igreja'] });
            toast.success("Membro removido!");
        },
        onError: (err: any) => {
            console.error("Erro ao excluir membro:", err);
            toast.error(`Erro ao excluir: ${err.message || "Tente novamente"}`);
        }
    });

    const frequenciaMutation = useMutation({
        mutationFn: (data: any) => frequenciaMembrosApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['frequencia_membros'] });
            toast.success("Frequência registrada!");
        }
    });

    const deleteFrequenciaMutation = useMutation({
        mutationFn: (id: number) => frequenciaMembrosApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['frequencia_membros'] });
            toast.success("Registro de frequência removido!");
        }
    });

    const filteredMembros = membros.filter((m: any) =>
        (m.nome?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (m.documentos?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    );

    const handleSaveMembro = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const data = Object.fromEntries(fd.entries());
        if (editingItem?.id) (data as any).id = editingItem.id;
        membroMutation.mutate(data);
    };

    const toggleAttendance = (membroId: number) => {
        const existing = frequencias.find((f: any) => 
            f.membro_id === membroId && 
            f.data.split('T')[0] === attendanceDate && 
            f.tipo === attendanceType
        );

        if (existing) {
            deleteFrequenciaMutation.mutate(existing.id);
        } else {
            frequenciaMutation.mutate({
                membro_id: membroId,
                data: attendanceDate,
                tipo: attendanceType
            });
        }
    };

    const isPresent = (membroId: number) => {
        return frequencias.some((f: any) => 
            f.membro_id === membroId && 
            f.data.split('T')[0] === attendanceDate && 
            f.tipo === attendanceType
        );
    };

    const reportData = useMemo(() => {
        return frequencias.map((f: any) => {
            const membro = membros.find((m: any) => m.id === f.membro_id);
            return {
                nome: membro?.nome || "Membro Removido",
                funcao: f.tipo,
                data: f.data
            };
        });
    }, [frequencias, membros]);

    return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <PageHeader title="Secretaria" subtitle="Gestão de membros da igreja e registros de comparecimento." />
                
                {canEdit && (
                    <Button onClick={() => navigate('/admin/users')} className="w-full md:w-auto bg-[#212351] hover:bg-[#1a1b41] text-white shadow-lg gap-2 h-11 px-6 rounded-xl transition-all hover:scale-105">
                        <UserCog className="w-5 h-5" />
                        <span className="font-bold tracking-wider uppercase text-xs">Controle de Usuários</span>
                    </Button>
                )}
            </div>

            <Tabs value={activeTab} className="w-full" onValueChange={(v: any) => setActiveTab(v)}>
                <TabsList className="grid w-full grid-cols-2 mb-8 h-12">
                    <TabsTrigger value="membros" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs sm:text-sm">
                        <Users className="w-4 h-4 hidden xs:block" /> 
                        <span className="xs:hidden">Membros</span>
                        <span className="hidden xs:inline">Cadastro de Membros</span>
                    </TabsTrigger>
                    <TabsTrigger value="frequencia" className="gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs sm:text-sm">
                        <Calendar className="w-4 h-4 hidden xs:block" /> 
                        <span className="xs:hidden">Chamada</span>
                        <span className="hidden xs:inline">Registro de Frequência</span>
                    </TabsTrigger>
                </TabsList>
                            <AnimatePresence mode="wait">
                                <motion.div 
                                    key={activeTab}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <TabsContent value="membros" className="mt-0 border-0 p-0">
                                        <div className="card-church p-6">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                                <div className="flex flex-col xs:flex-row items-start xs:items-center gap-2 xs:gap-4">
                                                    <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-blue-600"><Users className="w-5 h-5" /> Lista de Membros</h2>
                                                    {canEdit && (
                                                        <Button size="sm" onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 w-full xs:w-auto whitespace-nowrap">
                                                            <UserPlus className="w-4 h-4 mr-2" /> Novo Membro
                                                        </Button>
                                                    )}
                                                </div>
                                                <div className="relative w-full sm:max-w-xs">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                    <Input
                                                        placeholder="Buscar membro..."
                                                        className="pl-9 h-9 border-blue-200 focus-visible:ring-blue-500"
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                                {filteredMembros.map((m: any, idx: number) => (
                                                    <div key={`${m.id}-${idx}`} className="p-4 border border-blue-100 rounded-xl bg-card shadow-sm group hover:shadow-md transition-all border-l-4 border-l-blue-500">
                                                        <div className="flex gap-4 mb-3">
                                                            <div className="w-16 h-16 rounded-xl bg-gray-50 border border-blue-50 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                                                {m.foto_url ? (
                                                                    <img src={getGoogleDriveDirectLink(m.foto_url)} alt={m.nome} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <UserIcon className="w-8 h-8 text-blue-200" />
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex justify-between items-start">
                                                                    <h3 className="font-bold text-lg truncate">{m.nome}</h3>
                                                        {canEdit && (
                                                            <div className="flex gap-1">
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 bg-blue-50/50" onClick={() => { setEditingItem(m); setSelectedFoto(m.foto_url); setIsModalOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                                                                
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive bg-destructive/5">
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </Button>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent className="rounded-2xl border-0 shadow-2xl">
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle className="text-xl font-bold text-[#212351]">Excluir Membro?</AlertDialogTitle>
                                                                            <AlertDialogDescription>
                                                                                Deseja realmente remover <strong>{m.nome}</strong> desta igreja? Esta ação não poderá ser desfeita.
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel className="rounded-xl border-gray-200">Cancelar</AlertDialogCancel>
                                                                            <AlertDialogAction 
                                                                                onClick={() => deleteMembroMutation.mutate(m.id)}
                                                                                className="bg-destructive hover:bg-destructive/90 rounded-xl px-6"
                                                                            >
                                                                                Sim, Excluir Membro
                                                                            </AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground truncate">{m.documentos || 'Sem doc'}</p>
                                                </div>
                                            </div>
                                                    <div className="space-y-1 text-sm text-muted-foreground">
                                                        <p className="flex items-center gap-2"><strong>Doc:</strong> {m.documentos || '---'}</p>
                                                        <p className="flex items-center gap-2"><strong>Tel:</strong> {m.telefone || '---'}</p>
                                                        <p className="flex items-center gap-2"><strong>E-mail:</strong> <span className="lowercase">{m.email_contato || '---'}</span></p>
                                                        <p className="flex items-center gap-2"><strong>Prof:</strong> {m.profissao || '---'}</p>
                                                        <p className="flex items-center gap-2"><strong>Civil:</strong> {m.estado_civil || '---'}</p>
                                                        <p className="flex items-center gap-2"><strong>Aniv:</strong> {m.aniversario ? new Date(m.aniversario).toLocaleDateString() : '---'}</p>
                                                        <p className="text-xs mt-2 italic line-clamp-2 text-[#212351]/70">
                                                    {m.rua ? `${m.rua}, ${m.numero}${m.bairro ? ` - ${m.bairro}` : ''} | ${m.cidade}-${m.estado}` : (m.endereco || 'Sem endereço cadastrado')}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-12 pt-6 border-t flex flex-col items-center">
                                    <p className="text-sm text-muted-foreground mb-4 font-medium italic">Quer convidar novos contatos?</p>
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <Button onClick={() => {
                                            const link = "https://bomretirosaibamais.base44.app/?utm_source=ig&utm_medium=social&utm_content=link_in_bio&fbclid=PAb21jcAQeqxxleHRuA2FlbQIxMQBzcnRjBmFwcF9pZA81NjcwNjczNDMzNTI0MjcAAacBwavLC_3pEZAaGBB_A44Y-q4EItQthh_-pQAFWq_pX1WnGCeveS27bI1B4g_aem_heuyBgv4MCyK4WiI9oPVdw";
                                            const text = encodeURIComponent(`Olá! Gostaria de te convidar para conhecer mais: ${link}`);
                                            window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
                                        }} className="bg-[#25D366] hover:bg-[#128C7E] text-white gap-2 shadow-lg hover:scale-105 transition-transform">
                                            <MessageCircle className="w-5 h-5" /> Compartilhar no WhatsApp
                                        </Button>
                                        <Button onClick={() => {
                                            const link = "https://bomretirosaibamais.base44.app/?utm_source=ig&utm_medium=social&utm_content=link_in_bio&fbclid=PAb21jcAQeqxxleHRuA2FlbQIxMQBzcnRjBmFwcF9pZA81NjcwNjczNDMzNTI0MjcAAacBwavLC_3pEZAaGBB_A44Y-q4EItQthh_-pQAFWq_pX1WnGCeveS27bI1B4g_aem_heuyBgv4MCyK4WiI9oPVdw";
                                            navigator.clipboard.writeText(link);
                                            toast.success("Link copiado para a área de transferência!");
                                        }} variant="outline" className="gap-2 shadow-sm border-blue-200 text-blue-700 hover:bg-blue-50 hover:scale-105 transition-transform">
                                            <Copy className="w-5 h-5" /> Copiar Link
                                        </Button>
                                    </div>
                                </div>
                            </div>
                                    </TabsContent>

                                    <TabsContent value="frequencia" className="mt-0 border-0 p-0">
                                        <div className="card-church p-6">
                                            <div className="flex justify-between items-center mb-6">
                                                <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-600"><Calendar className="w-5 h-5" /> Chamada</h2>
                                                {canEdit && (
                                                    <Button size="sm" variant="outline" onClick={() => setIsReportModalOpen(true)} className="gap-2 border-emerald-200 text-emerald-600 hover:bg-emerald-50">
                                                        <FileText className="w-4 h-4" /> Gerar Relatório Mensal
                                                    </Button>
                                                )}
                                            </div>
                                            <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
                                                <div className="flex-1">
                                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Tipo de Evento</Label>
                                                    <div className="flex gap-2 mt-2">
                                                        {["Escola Biblíca", "Culto", "Eventos Diversos"].map((t) => (
                                                            <Button 
                                                                key={t}
                                                                size="sm"
                                                                variant={attendanceType === t ? "default" : "outline"}
                                                                className={attendanceType === t ? "bg-emerald-600 hover:bg-emerald-700" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"}
                                                                onClick={() => setAttendanceType(t)}
                                                            >
                                                                {t === "Escola Biblíca" && <BookOpen className="w-3.5 h-3.5 mr-2" />}
                                                                {t === "Culto" && <Heart className="w-3.5 h-3.5 mr-2" />}
                                                                {t === "Eventos Diversos" && <PartyPopper className="w-3.5 h-3.5 mr-2" />}
                                                                {t}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="w-full md:w-48">
                                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Data</Label>
                                                    <Input 
                                                        type="date" 
                                                        className="mt-2 border-emerald-200" 
                                                        value={attendanceDate}
                                                        onChange={(e) => setAttendanceDate(e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                                                {membros.map((m: any, idx: number) => {
                                                    const present = isPresent(m.id);
                                                    return (
                                                        <button
                                                            key={`${m.id}-attendance-${idx}`}
                                                            onClick={() => toggleAttendance(m.id)}
                                                            className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                                                                present 
                                                                ? 'bg-emerald-50 border-emerald-500 shadow-sm' 
                                                                : 'bg-card border-muted hover:border-emerald-200'
                                                            }`}
                                                        >
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                                present ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
                                                            }`}>
                                                                {present ? <CheckCircle className="w-6 h-6" /> : <Plus className="w-5 h-5" />}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`font-bold text-sm truncate ${present ? 'text-emerald-700' : ''}`}>{m.nome}</p>
                                                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{present ? 'Presente' : 'Ausente'}</p>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {membros.length === 0 && (
                                                <div className="text-center py-12 border-2 border-dashed border-muted rounded-2xl">
                                                    <p className="text-muted-foreground">Nenhum membro cadastrado para registrar frequência.</p>
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>
                                </motion.div>
                            </AnimatePresence>
            </Tabs>

            <Dialog open={isModalOpen} onOpenChange={(open) => {
                setIsModalOpen(open);
                if (!open) { 
                    setEditingItem(null); 
                    setSelectedFoto(null); 
                    setAddressData({ cep: "", rua: "", numero: "", bairro: "", cidade: "", estado: "", complemento: "" });
                } else if (editingItem) {
                    setAddressData({
                        cep: editingItem.cep || "",
                        rua: editingItem.rua || "",
                        numero: editingItem.numero || "",
                        bairro: editingItem.bairro || "",
                        cidade: editingItem.cidade || "",
                        estado: editingItem.estado || "",
                        complemento: editingItem.complemento || ""
                    });
                    setEstadoCivil(editingItem.estado_civil || "Casado(a)");
                }
            }}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-[#212351]">{editingItem ? 'Editar' : 'Cadastrar'} Membro</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        const formData = Object.fromEntries(fd.entries());
                        const data = { ...formData, ...addressData, estado_civil: estadoCivil };
                        
                        if (selectedFoto) (data as any).foto_url = selectedFoto;
                        if (editingItem?.id) (data as any).id = editingItem.id;
                        
                        // Fallback: Gerar o campo 'endereco' concatenado
                        (data as any).endereco = `${addressData.rua}, ${addressData.numero}${addressData.complemento ? ` (${addressData.complemento})` : ''} - ${addressData.bairro}, ${addressData.cidade}-${addressData.estado}`;
                        
                        // Sanatize dates and empty values
                        if ((data as any).aniversario === "") delete (data as any).aniversario;
                        
                        // Garante que campos decimais não enviem string vazia
                        const numericFields = ['renda_familiar', 'valor_dizimo'];
                        numericFields.forEach(f => {
                            if (data[f] === "" || data[f] === undefined) delete data[f];
                        });

                        console.log("Enviando dados do membro:", data);
                        membroMutation.mutate(data);
                    }} className="space-y-4 py-4">
                        <div className="flex flex-col items-center gap-4 mb-4">
                            <div className="relative group">
                                <div className="w-24 h-24 rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-blue-400">
                                    {selectedFoto ? (
                                        <img src={getGoogleDriveDirectLink(selectedFoto)} alt="Preview" className="w-full h-full object-cover" />
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
                                                    setSelectedFoto(url);
                                                } catch (err) {
                                                    toast.error("Erro no upload da foto");
                                                } finally {
                                                    setIsUploading(false);
                                                }
                                            }
                                        }} 
                                    />
                                </label>
                            </div>
                            {isUploading && <p className="text-[10px] font-bold text-blue-600 animate-pulse uppercase">Enviando foto...</p>}
                            <div className="w-full max-w-[200px] mt-1 space-y-1 text-center">
                                <Label className="text-[10px] text-muted-foreground uppercase font-bold">Ou URL (Ex: Google Drive)</Label>
                                <Input 
                                    placeholder="Cole um link..." 
                                    value={selectedFoto || ''}
                                    onChange={(e) => setSelectedFoto(e.target.value)}
                                    className="h-8 text-xs text-center border-dashed border-gray-300"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Nome Completo</Label>
                            <Input name="nome" defaultValue={editingItem?.nome} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Telefone (WhatsApp)</Label>
                                <Input name="telefone" defaultValue={editingItem?.telefone} placeholder="(00) 00000-0000" />
                            </div>
                            <div className="space-y-2">
                                <Label>E-mail de Contato</Label>
                                <Input name="email_contato" type="email" defaultValue={editingItem?.email_contato} placeholder="email@exemplo.com" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Documentos (RG/CPF)</Label>
                                <Input name="documentos" defaultValue={editingItem?.documentos} />
                            </div>
                            <div className="space-y-2">
                                <Label>Data de Nascimento</Label>
                                <Input name="aniversario" type="date" defaultValue={editingItem?.aniversario ? editingItem.aniversario.split('T')[0] : ''} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Profissão</Label>
                                <Input name="profissao" defaultValue={editingItem?.profissao} />
                            </div>
                            <div className="space-y-2">
                                <Label>Estado Civil</Label>
                                <Select value={estadoCivil} onValueChange={setEstadoCivil}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem>
                                        <SelectItem value="Casado(a)">Casado(a)</SelectItem>
                                        <SelectItem value="Divorciado(a)">Divorciado(a)</SelectItem>
                                        <SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Filhos (Nomes/Idades)</Label>
                            <Input name="filhos" defaultValue={editingItem?.filhos} placeholder="Ex: Maria (5), João (8)" />
                        </div>
                        <div className="space-y-2 border-t pt-4">
                            <Label className="text-xs font-black uppercase text-blue-600 tracking-widest">Endereço Residencial</Label>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="col-span-1 space-y-1">
                                    <Label className="text-[10px] uppercase">CEP</Label>
                                    <Input 
                                        name="cep" 
                                        placeholder="00000-000" 
                                        value={addressData.cep} 
                                        onChange={(e) => handleCepChange(e.target.value)}
                                        className="h-9"
                                    />
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <Label className="text-[10px] uppercase">Rua / Logradouro</Label>
                                    <Input 
                                        name="rua" 
                                        value={addressData.rua} 
                                        onChange={(e) => setAddressData(prev => ({ ...prev, rua: e.target.value }))}
                                        className="h-9"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                <div className="col-span-1 space-y-1">
                                    <Label className="text-[10px] uppercase">Número</Label>
                                    <Input 
                                        name="numero" 
                                        value={addressData.numero} 
                                        onChange={(e) => setAddressData(prev => ({ ...prev, numero: e.target.value }))}
                                        className="h-9"
                                    />
                                </div>
                                <div className="col-span-3 space-y-1">
                                    <Label className="text-[10px] uppercase">Complemento</Label>
                                    <Input 
                                        name="complemento" 
                                        value={addressData.complemento} 
                                        onChange={(e) => setAddressData(prev => ({ ...prev, complemento: e.target.value }))}
                                        className="h-9"
                                        placeholder="Ap, Bloco, etc"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase">Bairro</Label>
                                    <Input 
                                        name="bairro" 
                                        value={addressData.bairro} 
                                        onChange={(e) => setAddressData(prev => ({ ...prev, bairro: e.target.value }))}
                                        className="h-9"
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="col-span-2 space-y-1">
                                        <Label className="text-[10px] uppercase">Cidade</Label>
                                        <Input 
                                            name="cidade" 
                                            value={addressData.cidade} 
                                            onChange={(e) => setAddressData(prev => ({ ...prev, cidade: e.target.value }))}
                                            className="h-9"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase">UF</Label>
                                        <Input 
                                            name="estado" 
                                            maxLength={2} 
                                            value={addressData.estado} 
                                            onChange={(e) => setAddressData(prev => ({ ...prev, estado: e.target.value.toUpperCase() }))}
                                            className="h-9 uppercase"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <DialogFooter className="pt-4">
                            <Button type="submit" className="w-full">
                                {membroMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Membro'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <PresenceReportModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                data={reportData}
                title="Secretaria - Registro de Frequência"
                type="Secretaria"
            />
        </div>
    );
}
