import { useState, useEffect, useMemo } from "react";
import { Music, CheckSquare, Square, User, Plus, Pencil, Trash2, ListMusic, Mic, Users, Search, Youtube, File, Upload, Loader2, ExternalLink, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { escalaLouvor as mockEscala, musicasLouvor as mockMusicas } from "@/data/mockData";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { louvorEscalaApi, louvorMusicasApi, uploadFile, membrosIgrejaApi } from "@/services/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { YoutubeSearch } from "@/components/YoutubeSearch";

import { PresenceReportModal } from "@/components/PresenceReportModal";

export default function Louvor() {
    const queryClient = useQueryClient();
    const [editingItem, setEditingItem] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'escala' | 'musicas' | 'assign_music'>('escala');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [tipoMembro, setTipoMembro] = useState<'vocal' | 'musico'>('vocal');
    const [isUploading, setIsUploading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentDateIndex, setCurrentDateIndex] = useState(0);
    const { canWrite } = useAuth();
    const canEdit = canWrite('louvor');

    const { data: escalaData, isError: isErrorEscala } = useQuery({
        queryKey: ['escala_louvor'],
        queryFn: () => louvorEscalaApi.getAll()
    });
    const { data: musicasData, isError: isErrorMusicas } = useQuery({
        queryKey: ['musicas_louvor'],
        queryFn: () => louvorMusicasApi.getAll()
    });
    const { data: membrosData } = useQuery({
        queryKey: ['membros_igreja'],
        queryFn: () => membrosIgrejaApi.getAll()
    });

    const deleteEscalaMutation = useMutation({
        mutationFn: (id: number) => louvorEscalaApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['escala_louvor'] });
            toast.success("Membro removido da escala!");
        },
        onError: (error) => {
            console.error("Erro ao deletar:", error);
            toast.error("Erro ao deletar membro. Verifique a conexão.");
        }
    });

    const deleteMusicaMutation = useMutation({
        mutationFn: (id: number) => louvorMusicasApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['musicas_louvor'] });
            toast.success("Música removida!");
        },
        onError: (error) => {
            console.error("Erro ao deletar:", error);
            toast.error("Erro ao deletar música. Verifique a conexão.");
        }
    });

    const escalaMutation = useMutation({
        mutationFn: (data: any) => data.id ? louvorEscalaApi.update(data.id, data) : louvorEscalaApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['escala_louvor'] });
            setIsModalOpen(false);
            setEditingItem(null);
            toast.success("Escala salva com sucesso!");
        },
        onError: (error) => {
            console.error("Erro na escala:", error);
            toast.error("Erro ao salvar escala. Verifique a conexão.");
        }
    });

    const musicasMutation = useMutation({
        mutationFn: (data: any) => data.id ? louvorMusicasApi.update(data.id, data) : louvorMusicasApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['musicas_louvor'] });
            setIsModalOpen(false);
            setEditingItem(null);
            toast.success("Música salva com sucesso!");
        },
        onError: (error) => {
            console.error("Erro na música:", error);
            toast.error("Erro ao salvar música. Verifique a conexão.");
        }
    });

    const escalas = (isErrorEscala || !escalaData) ? mockEscala : escalaData;
    const allMusicas = (isErrorMusicas || !musicasData) ? mockMusicas : musicasData;

    const musicas = allMusicas.filter((m: any) =>
        m.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.artista.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const groupedScales = useMemo(() => {
        const grouped: Record<string, any[]> = {};
        escalas.forEach((m: any) => {
            const dateKey = m.data ? m.data.split('T')[0] : 'sem-data';
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push(m);
        });
        const sortedDates = Object.keys(grouped).sort();
        return { grouped, sortedDates };
    }, [escalas]);

    // Ao carregar os dados, encontrar a data mais próxima de hoje ou a última data disponível
    useEffect(() => {
        if (groupedScales.sortedDates.length > 0) {
            const today = new Date().toISOString().split('T')[0];
            let closestIndex = 0;

            // Tentar achar hoje ou a primeira data futura
            const futureDateIndex = groupedScales.sortedDates.findIndex(date => date >= today);

            if (futureDateIndex !== -1) {
                closestIndex = futureDateIndex;
            } else {
                // Se tudo for passado, mostra a última
                closestIndex = groupedScales.sortedDates.length - 1;
            }

            setCurrentDateIndex(closestIndex);
        }
    }, [groupedScales.sortedDates.length]);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "Data não informada";
        try {
            const datePart = dateStr.split('T')[0];
            const d = new Date(datePart + "T12:00:00");
            if (isNaN(d.getTime())) return "Data Inválida";
            return d.toLocaleDateString("pt-BR");
        } catch (e) {
            return "Data Inválida";
        }
    };

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        if (activeTab === 'escala') {
            const dataToSave: any = {
                nome: formData.get("nome")?.toString().trim(),
                funcao: formData.get("funcao")?.toString().trim(),
                tipo: formData.get("tipo"),
                data: formData.get("data"),
                disponibilidade: formData.get("disponibilidade")
            };
            if (editingItem?.id) dataToSave.id = editingItem.id;
            escalaMutation.mutate(dataToSave);
        } else if (activeTab === 'assign_music') {
            const ministro = formData.get("ministro")?.toString().trim();
            const data = formData.get("data");

            const musicUpdate: any = {
                titulo: editingItem.titulo,
                artista: editingItem.artista,
                tom: editingItem.tom,
                url_video: editingItem.url_video,
                url_arquivo: editingItem.url_arquivo,
                url_arquivo_2: editingItem.url_arquivo_2,
                ministros: editingItem.ministros,
                concluido: true
            };
            if (editingItem.id) musicUpdate.id = editingItem.id;

            musicasMutation.mutate(musicUpdate);

            escalaMutation.mutate({
                nome: ministro,
                funcao: `Ministrar: ${editingItem.titulo}`,
                tipo: 'vocal',
                data: data,
                url_video: editingItem.url_video,
                // Optional: you could link the file to the escala as well if needed
            });
        } else {
            const url_arquivo = formData.get("arquivo")?.toString().trim() || null;
            const url_arquivo_2 = formData.get("arquivo_2")?.toString().trim() || null;

            const musicData: any = {
                titulo: formData.get("titulo")?.toString().trim(),
                artista: formData.get("artista")?.toString().trim(),
                tom: formData.get("tom")?.toString().trim(),
                url_video: formData.get("url_video")?.toString().trim() || editingItem?.url_video,
                url_arquivo: url_arquivo,
                url_arquivo_2: url_arquivo_2,
                ministros: formData.get("ministros")?.toString().trim(),
                concluido: editingItem?.concluido || false
            };
            if (editingItem?.id) musicData.id = editingItem.id;
            musicasMutation.mutate(musicData);
        }
    };

    const handleSelectYoutube = (song: { titulo: string; artista: string; url_video: string }) => {
        setEditingItem({
            ...editingItem,
            titulo: song.titulo,
            artista: song.artista,
            url_video: song.url_video,
            tom: editingItem?.tom || "",
            concluido: false
        });
    };

    return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-6">
                <PageHeader title="Louvor" subtitle="Escala e repertório" />
                <div className="flex gap-2 w-full sm:w-auto">
                    {canEdit && (
                        <Button size="sm" variant="outline" onClick={() => setIsReportModalOpen(true)} className="gap-2 border-accent text-accent hover:bg-accent/10 w-full sm:w-auto h-11">
                            <FileText className="w-4 h-4" /> Relatório
                        </Button>
                    )}
                </div>
            </div>

            <PresenceReportModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                data={escalas}
                title="Equipe de Louvor"
                type="Louvor"
            />


            <Dialog open={isModalOpen} onOpenChange={(open) => {
                setIsModalOpen(open);
                if (!open) {
                    setEditingItem(null);
                }
            }}>
                <DialogContent 
                    onInteractOutside={(e) => {
                        const target = e.target as HTMLElement;
                        if (target?.closest('[role="listbox"]') || target?.closest('[data-radix-select-viewport]')) {
                            e.preventDefault();
                        }
                    }}
                    className="max-h-[85vh] overflow-y-auto w-[95vw] sm:max-w-[450px] p-4 sm:p-6"
                >
                    <DialogHeader>
                        <DialogTitle>
                            {activeTab === 'assign_music' ? 'Escalar Música' : editingItem?.id ? 'Editar' : 'Novo'} {activeTab === 'escala' ? 'Membro na Escala' : activeTab === 'assign_music' ? '' : 'Repertório'}
                        </DialogTitle>
                    </DialogHeader>
                    <form key={activeTab + (editingItem?.id || editingItem?.titulo || 'new')} onSubmit={handleSave} className="space-y-4">
                        {activeTab === 'escala' ? (
                            <>
                                <Label>Nome</Label><Input name="nome" defaultValue={editingItem?.nome} required />
                                <Label>Função</Label><Input name="funcao" defaultValue={editingItem?.funcao} required />
                                <Label>Tipo</Label>
                                <input type="hidden" name="tipo" value={tipoMembro} />
                                <Select
                                    defaultValue={editingItem?.tipo || tipoMembro}
                                    onValueChange={(v: any) => setTipoMembro(v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="vocal">Vocal</SelectItem>
                                        <SelectItem value="musico">Músico</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Label>Data</Label><Input name="data" type="date" defaultValue={editingItem?.data ? editingItem.data.split('T')[0] : ''} required />
                                <Label>Disponibilidade</Label>
                                <Select name="disponibilidade" defaultValue={editingItem?.disponibilidade || 'Disponível'}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione a disponibilidade" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Disponível">Disponível</SelectItem>
                                        <SelectItem value="Indisponível">Indisponível</SelectItem>
                                    </SelectContent>
                                </Select>
                            </>
                        ) : activeTab === 'assign_music' ? (
                            <>
                                <div className="mb-4 p-3 bg-muted/50 border border-border rounded-lg shadow-sm">
                                    <p className="text-sm font-medium">Música: <span className="text-accent">{editingItem?.titulo}</span></p>
                                    <p className="text-xs text-muted-foreground">{editingItem?.artista}</p>
                                </div>
                                <Label>Ministro(a)</Label>
                                {editingItem?.ministros?.split(", ").filter(Boolean).length > 1 ? (
                                    <Select name="ministro" required>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o ministro" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {editingItem.ministros.split(", ").filter(Boolean).map((m: string) => (
                                                <SelectItem key={m} value={m.trim()}>{m.trim()}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <Input
                                        name="ministro"
                                        placeholder="Para quem vai escalar a música?"
                                        defaultValue={editingItem?.ministros || ""}
                                        required
                                    />
                                )}
                                <Label>Data da Escala</Label>
                                <Input name="data" type="date" required />
                            </>
                        ) : (
                            <>
                                <Label>Título da Música</Label><Input name="titulo" defaultValue={editingItem?.titulo} required />
                                <Label>Cantor / Banda</Label><Input name="artista" defaultValue={editingItem?.artista} required />
                                <Label>Tom</Label><Input name="tom" defaultValue={editingItem?.tom} placeholder="Ex: G, Am, C9..." />
                                
                                <Label>Ministros Responsáveis (Separe por vírgula se houver mais de um)</Label>
                                <Input 
                                    name="ministros" 
                                    defaultValue={editingItem?.ministros} 
                                    placeholder="Ex: João, Maria, Pedro..." 
                                />

                                <div className="space-y-1 mt-2">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Sugestões (Equipe):</p>
                                    <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto p-1">
                                        {(membrosData || []).map((membro: any) => (
                                            <Button
                                                key={membro.id}
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-6 text-[10px] px-2 py-0 border-dashed"
                                                onClick={() => {
                                                    const input = document.querySelector('input[name="ministros"]') as HTMLInputElement;
                                                    if (input) {
                                                        const current = input.value.trim();
                                                        if (current) {
                                                            if (!current.includes(membro.nome)) {
                                                                input.value = `${current}, ${membro.nome}`;
                                                            }
                                                        } else {
                                                            input.value = membro.nome;
                                                        }
                                                    }
                                                }}
                                            >
                                                + {membro.nome}
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                <Label>Link do Youtube (Opcional)</Label><Input name="url_video" defaultValue={editingItem?.url_video} placeholder="https://youtube.com/..." />
                                <Label>Arquivo 1 (Link do Google Drive / PDF)</Label>
                                <Input name="arquivo" type="url" defaultValue={editingItem?.url_arquivo} placeholder="https://drive.google.com/..." className="mb-2" />
                                
                                <Label>Arquivo 2 (Link do Google Drive / Extra)</Label>
                                <Input name="arquivo_2" type="url" defaultValue={editingItem?.url_arquivo_2} placeholder="https://drive.google.com/..." />
                            </>
                        )}
                        <DialogFooter>
                            <Button type="submit" disabled={isUploading}>
                                {isUploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Subindo...</> : 'Salvar'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Layout com Tabs: Equipe e Repertório */}
            <Tabs value={activeTab === 'assign_music' ? 'musicas' : activeTab} className="w-full" onValueChange={(v) => setActiveTab(v as any)}>
                <TabsList className="grid w-full grid-cols-2 mb-8 h-12">
                    <TabsTrigger value="escala" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                        <Users className="w-4 h-4" /> Equipe
                    </TabsTrigger>
                    <TabsTrigger value="musicas" className="gap-2 data-[state=active]:bg-orange-600 data-[state=active]:text-white">
                        <ListMusic className="w-4 h-4" /> Repertório
                    </TabsTrigger>
                </TabsList>

                <AnimatePresence mode="wait">
                    <TabsContent value="escala">
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                            <div className="card-church p-6">
                                {(() => {
                                    const { grouped, sortedDates } = groupedScales;
                                    const safeIndex = Math.min(Math.max(0, currentDateIndex), Math.max(0, sortedDates.length - 1));
                                    const dateKey = sortedDates[safeIndex];
                                    const members = grouped[dateKey] || [];
                                    const vocais = members.filter((m: any) => m.tipo === 'vocal' || !m.tipo);
                                    const musicos = members.filter((m: any) => m.tipo === 'musico');

                                    const goToPrev = () => setCurrentDateIndex(prev => Math.max(0, prev - 1));
                                    const goToNext = () => setCurrentDateIndex(prev => Math.min(sortedDates.length - 1, prev + 1));

                                    return (
                                        <>
                                            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                                                <div className="flex items-center gap-4">
                                                    <h2 className="text-xl font-bold flex items-center gap-2 text-blue-600 m-0 leading-none"><Users className="w-5 h-5" /> Equipe</h2>
                                                    {canEdit && (
                                                        <Button size="sm" onClick={() => { setEditingItem(null); setActiveTab('escala'); setTipoMembro('vocal'); setIsModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 h-8">
                                                            <Plus className="w-4 h-4 mr-1" /> Nova Escala
                                                        </Button>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-blue-200 text-blue-600 hover:bg-blue-50" onClick={goToPrev} disabled={safeIndex === 0}><ChevronLeft className="w-4 h-4" /></Button>
                                                    <div className="text-center min-w-[100px]">
                                                        <p className="text-sm font-black uppercase text-blue-600 leading-none">{dateKey ? formatDate(dateKey) : '---'}</p>
                                                    </div>
                                                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-blue-200 text-blue-600 hover:bg-blue-50" onClick={goToNext} disabled={safeIndex >= sortedDates.length - 1}><ChevronRight className="w-4 h-4" /></Button>
                                                </div>
                                            </div>

                                            {members.length === 0 ? (
                                                <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-muted rounded-xl">
                                                    <p className="text-xs font-bold uppercase tracking-widest">Nenhuma escala para este dia</p>
                                                </div>
                                            ) : (
                                                <div className="grid gap-6 md:grid-cols-2">
                                                    {vocais.length > 0 && (
                                                        <div>
                                                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-3">
                                                                <Mic className="w-3 h-3 text-blue-500" /> Vocal
                                                            </h4>
                                                            <div className="space-y-1.5">
                                                                {vocais.map((m: any) => (
                                                                    <div key={m.id} className="flex items-center gap-2 p-3 border-l-4 border-l-blue-500 rounded-lg bg-card shadow-sm group hover:shadow-md transition-all">
                                                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                                                            <User className="w-3.5 h-3.5 text-blue-600" />
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="font-bold text-sm truncate leading-tight">{m.nome}</p>
                                                                            <p className="text-[11px] text-muted-foreground truncate font-medium">
                                                                                {m.url_video ? (
                                                                                    <a href={m.url_video} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                                                                        <Youtube className="w-3 h-3" /> {m.funcao}
                                                                                    </a>
                                                                                ) : m.funcao}
                                                                            </p>
                                                                        </div>
                                                                        {m.disponibilidade === 'Indisponível' && (
                                                                            <span className="text-[10px] font-bold text-red-500 bg-red-100 px-2 py-0.5 rounded mr-2">Indisponível</span>
                                                                        )}
                                                                        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                                            {canEdit && (
                                                                                <>
                                                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:bg-blue-50" onClick={() => { setActiveTab('escala'); setEditingItem(m); setTipoMembro(m.tipo || 'vocal'); setIsModalOpen(true); }}><Pencil className="w-3 h-3" /></Button>
                                                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => { if (confirm("Excluir?")) deleteEscalaMutation.mutate(m.id); }}><Trash2 className="w-3 h-3" /></Button>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {musicos.length > 0 && (
                                                        <div>
                                                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-3">
                                                                <Music className="w-3 h-3 text-blue-500" /> Músicos
                                                            </h4>
                                                            <div className="space-y-1.5">
                                                                {musicos.map((m: any) => (
                                                                    <div key={m.id} className="flex items-center gap-2 p-3 border-l-4 border-l-blue-500 rounded-lg bg-card shadow-sm group hover:shadow-md transition-all">
                                                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                                                            <Music className="w-3.5 h-3.5 text-blue-600" />
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="font-bold text-sm truncate leading-tight">{m.nome}</p>
                                                                            <p className="text-[11px] text-muted-foreground truncate font-medium">
                                                                                {m.url_video ? (
                                                                                    <a href={m.url_video} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                                                                        <Youtube className="w-3 h-3" /> {m.funcao}
                                                                                    </a>
                                                                                ) : m.funcao}
                                                                            </p>
                                                                        </div>
                                                                        {m.disponibilidade === 'Indisponível' && (
                                                                            <span className="text-[10px] font-bold text-red-500 bg-red-100 px-2 py-0.5 rounded mr-2">Indisponível</span>
                                                                        )}
                                                                        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                                            {canEdit && (
                                                                                <>
                                                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:bg-blue-50" onClick={() => { setActiveTab('escala'); setEditingItem(m); setTipoMembro('musico'); setIsModalOpen(true); }}><Pencil className="w-3 h-3" /></Button>
                                                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => { if (confirm("Excluir?")) deleteEscalaMutation.mutate(m.id); }}><Trash2 className="w-3 h-3" /></Button>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        </motion.div>
                    </TabsContent>

                    <TabsContent value="musicas">
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                            <div className="card-church p-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                                    <div className="flex items-center gap-4">
                                        <h2 className="text-xl font-bold flex items-center gap-2 text-orange-600"><ListMusic className="w-6 h-6" /> Repertório</h2>
                                        {canEdit && (
                                            <Button size="sm" onClick={() => { setEditingItem({ titulo: '', artista: '', tom: '' }); setActiveTab('musicas'); setIsModalOpen(true); }} className="bg-orange-600 hover:bg-orange-700 h-8">
                                                <Plus className="w-4 h-4 mr-1" /> Nova Música
                                            </Button>
                                        )}
                                    </div>
                                    <div className="relative w-full sm:max-w-xs">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Buscar música ou artista..."
                                            className="pl-9 h-9 border-orange-200 focus-visible:ring-orange-500"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-3 md:grid-cols-2 overflow-y-auto max-h-[600px] pr-1" style={{ scrollbarWidth: 'thin' }}>
                                    {musicas.map((m: any) => (
                                        <div key={m.id} className="flex items-start gap-3 p-4 border-l-4 border-l-orange-500 rounded-lg bg-card shadow-sm group hover:shadow-md transition-all">
                                            <button
                                                disabled={!canEdit}
                                                className={`mt-1 flex-shrink-0 ${m.concluido ? 'text-orange-500' : 'text-muted-foreground hover:text-orange-500 transition-colors'}`}
                                                onClick={() => {
                                                    if (m.concluido) {
                                                        musicasMutation.mutate({ ...m, concluido: false });
                                                    } else {
                                                        setActiveTab('assign_music');
                                                        setEditingItem(m);
                                                        setIsModalOpen(true);
                                                    }
                                                }}
                                            >
                                                {m.concluido ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                <h3 className={`font-bold text-base truncate ${m.concluido ? "line-through text-muted-foreground italic font-medium" : ""}`}>{m.titulo}</h3>
                                                <div className="flex flex-col gap-1 mt-1 text-xs text-muted-foreground font-medium">
                                                    <span>{m.artista} • Tom: <span className="text-orange-600 font-bold">{m.tom || '-'}</span></span>
                                                    {m.ministros && (
                                                        <span className="flex items-center gap-1 text-[10px] text-blue-600 font-bold mt-0.5">
                                                            <Mic className="w-3 h-3" /> Ministros: {m.ministros}
                                                        </span>
                                                    )}
                                                    <div className="flex items-center gap-3 mt-1">
                                                        {m.url_video && (
                                                            <a href={m.url_video} target="_blank" rel="noopener noreferrer" className="text-red-500 hover:text-red-600 transition-colors flex items-center gap-1">
                                                                <Youtube className="w-3.5 h-3.5" /> Vídeo
                                                            </a>
                                                        )}
                                                        {m.url_arquivo && (
                                                            <a href={m.url_arquivo} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 transition-colors flex items-center gap-1">
                                                                <File className="w-3.5 h-3.5" /> Arq. 1
                                                            </a>
                                                        )}
                                                        {m.url_arquivo_2 && (
                                                            <a href={m.url_arquivo_2} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 transition-colors flex items-center gap-1">
                                                                <File className="w-3.5 h-3.5" /> Arq. 2
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                                                {canEdit && (
                                                    <>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-600 hover:bg-orange-50" onClick={() => {
                                                            setActiveTab('musicas');
                                                            setEditingItem(m);
                                                            setIsModalOpen(true);
                                                        }}><Pencil className="w-4 h-4" /></Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => { if (confirm("Excluir?")) deleteMusicaMutation.mutate(m.id); }}><Trash2 className="w-4 h-4" /></Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </TabsContent>
                </AnimatePresence>
            </Tabs>
        </div>
    );
}

