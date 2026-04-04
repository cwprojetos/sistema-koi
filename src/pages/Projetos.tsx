import { useState } from "react";
import {
    Calendar, Video, FileText, Users, Rocket, Clock, CheckCircle2,
    Circle, DollarSign, Package, CreditCard, Plus, ExternalLink,
    Trash2, Pencil, CheckCircle, Store, Tag, ListTodo, Upload, Loader2, Banknote
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    projetosReunioesApi, projetosNovosApi, projetosArrecadacoesApi,
    arrecadacaoItensApi, uploadFile
} from "@/services/api";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function Projetos() {
    const { role, canWrite } = useAuth();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState("reunioes");
    const [editingItem, setEditingItem] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedArrecadacaoId, setSelectedArrecadacaoId] = useState<number | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Queries
    const { data: reunioes = [] } = useQuery({ queryKey: ["projetos_reunioes"], queryFn: () => projetosReunioesApi.getAll() });
    const { data: projetos = [] } = useQuery({ queryKey: ["projetos_novos"], queryFn: () => projetosNovosApi.getAll() });
    const { data: arrecadacoes = [] } = useQuery({ queryKey: ["projetos_arrecadacoes"], queryFn: () => projetosArrecadacoesApi.getAll() });
    const { data: itens = [] } = useQuery({ queryKey: ["arrecadacao_itens"], queryFn: () => arrecadacaoItensApi.getAll() });

    // Mutations
    const mutationReuniao = useMutation({
        mutationFn: (data: any) => editingItem?.id ? projetosReunioesApi.update(editingItem.id, data) : projetosReunioesApi.create(data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projetos_reunioes"] }); setIsModalOpen(false); setEditingItem(null); toast.success("Sucesso!"); }
    });

    const mutationProjeto = useMutation({
        mutationFn: (data: any) => editingItem?.id ? projetosNovosApi.update(editingItem.id, data) : projetosNovosApi.create(data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projetos_novos"] }); setIsModalOpen(false); setEditingItem(null); toast.success("Sucesso!"); }
    });

    const mutationArrecadacao = useMutation({
        mutationFn: (data: any) => editingItem?.id ? projetosArrecadacoesApi.update(editingItem.id, data) : projetosArrecadacoesApi.create(data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projetos_arrecadacoes"] }); setIsModalOpen(false); setEditingItem(null); toast.success("Sucesso!"); }
    });

    const mutationItem = useMutation({
        mutationFn: (data: any) => editingItem?.id ? arrecadacaoItensApi.update(editingItem.id, data) : arrecadacaoItensApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["arrecadacao_itens"] });
            setIsModalOpen(false);
            setEditingItem(null);
            toast.success("Item salvo com sucesso!");
        }
    });

    const mutationVenda = useMutation({
        mutationFn: (data: any) => arrecadacaoItensApi.registrarVenda(data),
        onSuccess: () => { 
            queryClient.invalidateQueries({ queryKey: ["arrecadacao_itens"] }); 
            queryClient.invalidateQueries({ queryKey: ["financeiro_recibos"] }); 
            toast.success("Venda concluída e lançada no financeiro!"); 
            setEditingItem(null); 
        }
    });

    const mutationAddFunds = useMutation({
        mutationFn: (data: any) => projetosNovosApi.registrarArrecadacaoProjeto(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["projetos_novos"] });
            queryClient.invalidateQueries({ queryKey: ["financeiro_recibos"] });
            setIsModalOpen(false);
            setEditingItem(null);
            toast.success("Valor arrecadado adicionado e registrado no financeiro!");
        },
        onError: (err: any) => {
            console.error(err);
            toast.error("Erro ao registrar arrecadação: " + (err.message || "Tente novamente"));
        }
    });

    const dr = useMutation({
        mutationFn: (id: number) => projetosReunioesApi.delete(id),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projetos_reunioes"] }); toast.success("Excluído!"); }
    });
    const dp = useMutation({
        mutationFn: (id: number) => projetosNovosApi.delete(id),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projetos_novos"] }); toast.success("Excluído!"); }
    });
    const da = useMutation({
        mutationFn: (id: number) => projetosArrecadacoesApi.delete(id),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projetos_arrecadacoes"] }); toast.success("Excluído!"); }
    });
    const di = useMutation({
        mutationFn: (id: number) => arrecadacaoItensApi.delete(id),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["arrecadacao_itens"] }); toast.success("Excluído!"); }
    });

    const isAdmin = canWrite("projetos");

    const renderReunioes = () => (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2 text-blue-600"><Video className="w-5 h-5" /> Agenda de Reunioes</h2>
                {isAdmin && (
                    <Button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" /> Nova Reunião
                    </Button>
                )}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                {reunioes.map((r: any) => (
                    <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-church p-5 border-l-4 border-l-blue-500">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-lg">{r.titulo}</h3>
                                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {new Date(r.data).toLocaleDateString()}</span>
                                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {r.horario}</span>
                                </div>
                            </div>
                            {isAdmin && (
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => { setEditingItem(r); setIsModalOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { if (confirm("Excluir?")) dr.mutate(r.id); }}><Trash2 className="w-4 h-4" /></Button>
                                </div>
                            )}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <Button 
                                onClick={() => {
                                    if (r.link && r.link !== "Interno") {
                                        window.open(r.link.startsWith('http') ? r.link : `https://${r.link}`, '_blank');
                                    } else {
                                        window.open("https://meet.google.com/new", '_blank');
                                    }
                                }} 
                                size="sm" 
                                className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 group rounded-xl px-4 py-2 font-black uppercase tracking-tight"
                            >
                                <Video className="w-4 h-4 mr-2 group-hover:animate-pulse" /> Entrar na Reunião
                            </Button>

                            {r.documentos && (
                                <Button asChild size="sm" variant="ghost" className="text-muted-foreground ml-auto bg-muted/20 border border-muted-foreground/10 rounded-xl px-3">
                                    <a href={r.documentos} target="_blank" rel="noopener noreferrer"><FileText className="w-4 h-4 mr-2" /> Atas/Pautas</a>
                                </Button>
                            )}
                        </div>
                        <div className="mt-3 p-3 bg-muted/30 rounded text-xs">
                            <span className="font-bold flex items-center gap-1 mb-1"><Users className="w-3 h-3" /> Participantes:</span>
                            {r.participantes || "Não informado"}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );

    const renderProjetos = () => (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-600"><Rocket className="w-5 h-5" /> Novos Projetos</h2>
                {isAdmin && (
                    <Button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700">
                        <Plus className="w-4 h-4 mr-2" /> Novo Projeto
                    </Button>
                )}
            </div>
            <div className="space-y-4">
                {projetos.map((p: any) => (
                    <motion.div key={p.id} className="card-church p-6 overflow-hidden">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h3 className="text-xl font-bold">{p.titulo}</h3>
                                    <Badge className={
                                        p.status === 'planejamento' ? 'bg-yellow-500' :
                                            p.status === 'andamento' ? 'bg-blue-500' : 'bg-green-500'
                                    }>
                                        {p.status}
                                    </Badge>
                                </div>
                                <p className="text-muted-foreground text-sm mt-1">{p.descricao}</p>
                            </div>
                            {isAdmin && (
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => { setEditingItem(p); setIsModalOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { if (confirm("Excluir?")) dp.mutate(p.id); }}><Trash2 className="w-4 h-4" /></Button>
                                </div>
                            )}
                        </div>

                        <div className="grid md:grid-cols-3 gap-4 mb-4">
                            <div className="bg-muted/30 p-3 rounded">
                                <span className="text-xs font-bold uppercase text-muted-foreground block mb-1">Responsáveis</span>
                                <span className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-emerald-500" /> {p.responsaveis}</span>
                            </div>
                            <div className="bg-muted/30 p-3 rounded">
                                <span className="text-xs font-bold uppercase text-muted-foreground block mb-1">Início</span>
                                <span className="text-sm flex items-center gap-2"><Calendar className="w-4 h-4 text-emerald-500" /> {new Date(p.inicio).toLocaleDateString()}</span>
                            </div>
                            <div className="bg-muted/30 p-3 rounded">
                                <span className="text-xs font-bold uppercase text-muted-foreground block mb-1">Previsão Fim</span>
                                <span className="text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-emerald-500" /> {new Date(p.fim).toLocaleDateString()}</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <span className="text-xs font-bold uppercase text-muted-foreground">Etapas/Linha do Tempo</span>
                            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                                {p.etapas?.split(',').map((step: string, i: number) => (
                                    <div key={i} className="flex items-center flex-shrink-0">
                                        <div className="flex flex-col items-center">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${p.status === 'concluido' ? 'bg-emerald-500' : 'bg-muted'}`}>
                                                {p.status === 'concluido' ? <CheckCircle2 className="w-5 h-5 text-white" /> : <Circle className="w-5 h-5 text-muted-foreground" />}
                                            </div>
                                            <span className="text-[10px] mt-1 font-medium">{step.trim()}</span>
                                        </div>
                                        {i < p.etapas.split(',').length - 1 && <div className="w-12 h-0.5 bg-muted mx-1" />}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-muted">
                            <div className="flex justify-between text-sm mb-1">
                                <span className="font-bold text-muted-foreground">Progresso de Arrecadação</span>
                                <span className="font-bold text-emerald-600">R$ {parseFloat(p.valor_arrecadado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R$ {parseFloat(p.valor_necessario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2.5 mb-4 overflow-hidden">
                                <div className="bg-emerald-600 h-2.5 rounded-full transition-all" style={{ width: `${Math.min(100, ((p.valor_arrecadado || 0) / (p.valor_necessario || 1)) * 100)}%` }}></div>
                            </div>
                            <Button size="sm" variant="outline" className="w-full border-emerald-200 text-emerald-600 hover:bg-emerald-50 disabled:bg-muted disabled:text-muted-foreground disabled:border-muted" disabled={p.status !== 'andamento'} onClick={() => {
                                setEditingItem(p);
                                setActiveTab('add_funds');
                                setIsModalOpen(true);
                            }}>
                                <DollarSign className="w-4 h-4 mr-2" /> Adicionar Arrecadação (Lança Entrada no Caixa)
                            </Button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );

    const renderArrecadacoes = () => (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2 text-orange-600"><DollarSign className="w-5 h-5" /> Arrecadacoes</h2>
                {isAdmin && (
                    <Button onClick={() => { setEditingItem(null); setActiveTab("new_arrecadacao"); setIsModalOpen(true); }} className="bg-orange-600 hover:bg-orange-700">
                        <Plus className="w-4 h-4 mr-2" /> Nova Campanha
                    </Button>
                )}
            </div>

            <div className="grid gap-6">
                {arrecadacoes.map((a: any) => (
                    <div key={a.id} className="card-church p-6">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-2xl font-bold flex items-center gap-2">
                                    <Store className="w-6 h-6 text-orange-500" /> {a.titulo}
                                    <Badge variant={a.status === 'ativa' ? 'default' : 'secondary'} className={a.status === 'ativa' ? 'bg-orange-500' : ''}>
                                        {a.status}
                                    </Badge>
                                </h3>
                                <p className="text-muted-foreground">{a.descricao}</p>
                            </div>
                            {isAdmin && (
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => { setEditingItem(null); setSelectedArrecadacaoId(a.id); setActiveTab("new_item"); setIsModalOpen(true); }}>
                                        <Plus className="w-4 h-4 mr-1" /> Item
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => { setEditingItem(a); setActiveTab("arrecadacao"); setIsModalOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { if (confirm("Excluir?")) da.mutate(a.id); }}><Trash2 className="w-4 h-4" /></Button>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {itens.filter((i: any) => i.arrecadacao_id === a.id).map((i: any) => (
                                <div key={i.id} className={`p-4 rounded-xl border-2 transition-all ${i.status === 'vendido' ? 'bg-muted/50 border-transparent opacity-60' 
                                    : i.status === 'reservado' ? 'bg-orange-50/80 border-orange-300 opacity-80' 
                                    : 'bg-card border-orange-100 hover:border-orange-500 shadow-sm' 
                                }`}>
                                    {i.fotos && (
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <img 
                                                    src={i.fotos} 
                                                    alt={i.nome} 
                                                    className="w-full h-32 object-cover rounded-lg mb-3 cursor-pointer hover:opacity-80 transition-opacity" 
                                                    title="Clique para ampliar"
                                                />
                                            </DialogTrigger>
                                            <DialogContent className="max-w-3xl bg-transparent border-none shadow-none p-0 flex justify-center items-center overflow-hidden">
                                                <DialogHeader className="sr-only">
                                                    <DialogTitle>Foto: {i.nome}</DialogTitle>
                                                </DialogHeader>
                                                <img 
                                                    src={i.fotos} 
                                                    alt={i.nome} 
                                                    className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" 
                                                />
                                            </DialogContent>
                                        </Dialog>
                                    )}
                                    <h4 className="font-bold flex justify-between items-center">
                                        {i.nome}
                                        {i.status === 'vendido' && <Badge variant="secondary" className="text-[10px]">Vendido</Badge>}
                                        {i.status === 'reservado' && <Badge variant="destructive" className="bg-orange-500 text-[10px]">Reservado</Badge>}
                                    </h4>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{i.descricao}</p>

                                    <div className="mt-4 flex justify-between items-center">
                                        <span className="font-black text-orange-600">R$ {parseFloat(i.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        {i.status === 'disponivel' ? (
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button size="sm" className="bg-orange-500 hover:bg-orange-600 h-8 px-2" onClick={() => setEditingItem(i)}>
                                                        <CheckCircle className="w-3 h-3 mr-1" /> Concluir
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader><DialogTitle>Concluir Venda: {i.nome}</DialogTitle></DialogHeader>
                                                        <div className="space-y-4 py-4">
                                                            <div className="space-y-2">
                                                                <Label>Forma de Pagamento</Label>
                                                                <Select 
                                                                    value={editingItem?.forma_pagamento || "Pix"}
                                                                    onValueChange={(val) => setEditingItem({ ...editingItem, id: i.id, preco: i.preco, nome: i.nome, forma_pagamento: val })}
                                                                >
                                                                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="Pix">Pix</SelectItem>
                                                                        <SelectItem value="Cartão">Cartão</SelectItem>
                                                                        <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>Recebido por:</Label>
                                                                <Input 
                                                                    placeholder="Nome de quem recebeu" 
                                                                    value={editingItem?.recebido_por || ""}
                                                                    onChange={(e) => setEditingItem({ ...editingItem, id: i.id, preco: i.preco, nome: i.nome, recebido_por: e.target.value })}
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>Comprovante (Opcional)</Label>
                                                                <div className="flex items-center gap-2">
                                                                    <Input 
                                                                        type="file" 
                                                                        className="hidden" 
                                                                        id={`sale-upload-${i.id}`}
                                                                        onChange={async (e) => {
                                                                            const file = e.target.files?.[0];
                                                                            if (file) {
                                                                                try {
                                                                                    setIsUploading(true);
                                                                                    const res = await uploadFile(file);
                                                                                    setEditingItem({ ...editingItem, id: i.id, preco: i.preco, nome: i.nome, url_arquivo: res.url });
                                                                                    toast.success("Comprovante anexado!");
                                                                                } catch (err) {
                                                                                    toast.error("Erro no upload");
                                                                                } finally {
                                                                                    setIsUploading(false);
                                                                                }
                                                                            }
                                                                        }}
                                                                    />
                                                                    <Button 
                                                                        variant="outline" 
                                                                        className="w-full border-dashed"
                                                                        onClick={() => document.getElementById(`sale-upload-${i.id}`)?.click()}
                                                                        disabled={isUploading}
                                                                    >
                                                                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                                                                        {editingItem?.url_arquivo ? "Alterar Comprovante" : "Anexar Comprovante"}
                                                                    </Button>
                                                                </div>
                                                                {editingItem?.url_arquivo && <p className="text-[10px] text-emerald-600 font-bold">Arquivo pronto!</p>}
                                                            </div>
                                                            <p className="text-xs text-muted-foreground">Isso lançará uma entrada de R$ {parseFloat(i.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} automaticamente no Financeiro.</p>
                                                        </div>
                                                        <DialogFooter>
                                                            <Button 
                                                                disabled={isUploading}
                                                                onClick={() => mutationVenda.mutate({ 
                                                                    itemId: i.id, 
                                                                    valor: i.preco, 
                                                                    forma_pagamento: editingItem?.forma_pagamento || 'Pix', 
                                                                    recebido_por: editingItem?.recebido_por,
                                                                    url_arquivo: editingItem?.url_arquivo,
                                                                    descricao: i.nome 
                                                                })}
                                                            >
                                                                {isUploading ? "Carregando..." : "Confirmar e Lançar"}
                                                            </Button>
                                                        </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        ) : i.status === 'vendido' ? (
                                            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                                <CreditCard className="w-3 h-3" /> {i.forma_pagamento}
                                            </span>
                                        ) : (
                                            <span className="text-xs font-medium text-orange-600 flex items-center gap-1">
                                                Reservado
                                            </span>
                                        )}
                                    </div>
                                    {isAdmin && (
                                        <div className="mt-2 flex justify-end gap-1 flex-wrap">
                                            {i.status === 'disponivel' && (
                                                <Button variant="outline" size="sm" className="h-7 text-[10px] text-orange-600 border-orange-200" onClick={() => mutationItem.mutate({ ...i, status: 'reservado' })}>Reservar</Button>
                                            )}
                                            {(i.status === 'reservado' || i.status === 'vendido') && (
                                                <Button variant="outline" size="sm" className="h-7 text-[10px] text-green-600 border-green-200" onClick={() => mutationItem.mutate({ ...i, status: 'disponivel' })}>Tornar Disponível</Button>
                                            )}
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingItem(i); setActiveTab("new_item"); setSelectedArrecadacaoId(a.id); setIsModalOpen(true); }}><Pencil className="w-3 h-3" /></Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Deseja realmente excluir este item?")) di.mutate(i.id); }}><Trash2 className="w-3 h-3" /></Button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

        const openState = (open: boolean) => {
            setIsModalOpen(open);
            if (!open) {
                // If closing modal, reset tab to the last valid main tab if it was a temporary state
                if (['add_funds', 'new_arrecadacao', 'new_item'].includes(activeTab)) {
                    setActiveTab('projetos');
                }
                setEditingItem(null);
            }
        };

        return (
            <div className="p-6 max-w-6xl mx-auto">
                <PageHeader title="Projetos e Arrecadações" subtitle="Reunioes, projetos da igreja e campanhas de arrecadação." />
    
                <Tabs defaultValue="reunioes" value={activeTab} className="w-full" onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3 mb-8 h-12">
                    <TabsTrigger value="reunioes" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                        <Video className="w-4 h-4" /> Reuniões
                    </TabsTrigger>
                    <TabsTrigger value="projetos" className="gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                        <Rocket className="w-4 h-4" /> Projetos
                    </TabsTrigger>
                    <TabsTrigger value="arrecadacoes" className="gap-2 data-[state=active]:bg-orange-600 data-[state=active]:text-white">
                        <DollarSign className="w-4 h-4" /> Arrecadações
                    </TabsTrigger>
                </TabsList>

                <AnimatePresence mode="wait">
                    <TabsContent value="reunioes">
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                            {renderReunioes()}
                        </motion.div>
                    </TabsContent>
                    <TabsContent value="projetos">
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                            {renderProjetos()}
                        </motion.div>
                    </TabsContent>
                    <TabsContent value="arrecadacoes">
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                            {renderArrecadacoes()}
                        </motion.div>
                    </TabsContent>
                </AnimatePresence>
            </Tabs>

            {/* General Modal for CRUD */}
            <Dialog open={isModalOpen} onOpenChange={openState}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {activeTab === 'add_funds' ? 'Adicionar Arrecadação' : 
                             activeTab === 'new_arrecadacao' ? 'Nova Campanha' : 
                             activeTab === 'new_item' ? (editingItem?.id ? 'Editar Item' : 'Novo Item') :
                             `${editingItem ? 'Editar' : 'Novo'} ${activeTab.replace('_', ' ')}`
                            }
                        </DialogTitle>
                    </DialogHeader>
                    <form key={activeTab + (editingItem?.id || 'new')} onSubmit={(e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        const val = Object.fromEntries(fd.entries());

                        const parseBRL = (v: any) => {
                            if (!v) return 0;
                            return parseFloat(String(v).replace(',', '.'));
                        };

                        if (activeTab === 'reunioes') mutationReuniao.mutate(val);
                        else if (activeTab === 'projetos') mutationProjeto.mutate(val);
                        else if (activeTab === 'add_funds') mutationAddFunds.mutate({ 
                            projetoId: editingItem.id, 
                            valor: parseBRL(val.valor_atual), 
                            tituloProjeto: editingItem.titulo,
                            valor_arrecadado_atual: parseFloat(editingItem.valor_arrecadado || 0),
                            url_arquivo: val.url_arquivo || editingItem.url_arquivo,
                            recebido_por: val.recebido_por
                        });
                        else if (activeTab === 'new_arrecadacao' || activeTab === 'arrecadacao') mutationArrecadacao.mutate(val);
                        else if (activeTab === 'new_item') mutationItem.mutate({ ...val, arrecadacao_id: selectedArrecadacaoId });
                    }} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
                        {activeTab === 'reunioes' && (
                            <>
                                <Label>Título</Label><Input name="titulo" defaultValue={editingItem?.titulo} required />
                                <Label>Data</Label><Input name="data" type="date" defaultValue={editingItem?.data?.split('T')[0]} required />
                                <Label>Horário</Label><Input name="horario" type="time" defaultValue={editingItem?.horario} required />
                                <Label className="text-blue-600 font-bold">Link da Reunião (Google Meet)</Label>
                                <Input name="link" defaultValue={editingItem?.link} placeholder="https://meet.google.com/xxx-xxxx-xxx" className="border-blue-100" />
                                <Label>Documentos (URL)</Label><Input name="documentos" defaultValue={editingItem?.documentos} />
                                <Label>Participantes</Label><Input name="participantes" defaultValue={editingItem?.participantes} placeholder="Nomes separados por vírgula" />
                            </>
                        )}
                        {activeTab === 'projetos' && (
                            <>
                                <Label>Título</Label><Input name="titulo" defaultValue={editingItem?.titulo} required />
                                <Label>Descrição</Label><Textarea name="descricao" defaultValue={editingItem?.descricao} required />
                                <Label>Responsáveis</Label><Input name="responsaveis" defaultValue={editingItem?.responsaveis} required />
                                <Label>Etapas (separadas por vírgula)</Label><Input name="etapas" defaultValue={editingItem?.etapas} placeholder="Ideia, Planejamento, Execução..." required />
                                <Label>Valor Necessário (R$)</Label>
                                <Input name="valor_necessario" type="number" step="0.01" defaultValue={editingItem?.valor_necessario || 0.00} required />
                                <div className="grid grid-cols-2 gap-2">
                                    <div><Label>Início</Label><Input name="inicio" type="date" defaultValue={editingItem?.inicio?.split('T')[0]} required /></div>
                                    <div><Label>Fim</Label><Input name="fim" type="date" defaultValue={editingItem?.fim?.split('T')[0]} required /></div>
                                </div>
                                <Label>Status</Label>
                                <Select name="status" defaultValue={editingItem?.status || 'planejamento'}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="planejamento">Planejamento</SelectItem>
                                        <SelectItem value="andamento">Em Andamento</SelectItem>
                                        <SelectItem value="concluido">Concluído</SelectItem>
                                    </SelectContent>
                                </Select>
                            </>
                        )}
                        {activeTab === 'add_funds' && (
                            <>
                                <div className="mb-4 p-3 bg-muted/50 border border-border rounded-lg shadow-sm">
                                    <p className="text-sm font-medium">Projeto: <span className="text-emerald-600">{editingItem?.titulo}</span></p>
                                    <p className="text-xs text-muted-foreground">Progresso Atual: R$ {parseFloat(editingItem?.valor_arrecadado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R$ {parseFloat(editingItem?.valor_necessario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                </div>
                                <Label>Valor a Arrecadar (R$)</Label>
                                <Input name="valor_atual" type="number" step="0.01" placeholder="Ex: 150,00" required />
                                <div className="mt-4">
                                    <Label>Recebido por:</Label>
                                    <Input name="recebido_por" placeholder="Nome da pessoa que recebeu" />
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">Adicionar este valor enviará um registro imediato de Entrada para a aba Financeiro.</p>
                                <div className="space-y-2 mt-4">
                                    <Label>Comprovante (Opcional)</Label>
                                    <div className="flex items-center gap-4">
                                        {editingItem?.url_arquivo && (
                                            <img src={editingItem.url_arquivo} alt="Preview" className="w-20 h-20 object-cover rounded-md border" />
                                        )}
                                        <div className="relative flex-1">
                                            <Input
                                                type="file"
                                                accept="image/*,application/pdf"
                                                className="hidden"
                                                id="receipt-upload"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        try {
                                                            setIsUploading(true);
                                                            const res = await uploadFile(file);
                                                            setEditingItem({ ...editingItem, url_arquivo: res.url });
                                                            toast.success("Comprovante carregado!");
                                                        } catch (err) {
                                                            toast.error("Erro ao carregar comprovante");
                                                        } finally {
                                                            setIsUploading(false);
                                                        }
                                                    }
                                                }}
                                            />
                                            <Label
                                                htmlFor="receipt-upload"
                                                className="flex items-center justify-center w-full h-10 border-2 border-dashed border-muted-foreground/25 rounded-md cursor-pointer hover:bg-muted/50 transition-colors gap-2 text-sm text-muted-foreground"
                                            >
                                                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                                {editingItem?.url_arquivo ? "Alterar Comprovante" : "Anexar Comprovante"}
                                            </Label>
                                        </div>
                                    </div>
                                    <input type="hidden" name="url_arquivo" value={editingItem?.url_arquivo || ''} />
                                </div>
                            </>
                        )}
                        {(activeTab === 'new_arrecadacao' || activeTab === 'arrecadacao') && (
                            <>
                                <Label>Título da Campanha</Label><Input name="titulo" defaultValue={editingItem?.titulo} required />
                                <Label>Descrição</Label><Textarea name="descricao" defaultValue={editingItem?.descricao} required />
                                <Label>Tipo</Label>
                                <Select name="tipo" defaultValue={editingItem?.tipo || 'bazar'}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="bazar">Bazar</SelectItem>
                                        <SelectItem value="rifa">Rifa</SelectItem>
                                        <SelectItem value="doacao">Doação</SelectItem>
                                    </SelectContent>
                                </Select>
                            </>
                        )}
                        {activeTab === 'new_item' && (
                            <>
                                <Label>Nome do Item</Label><Input name="nome" defaultValue={editingItem?.nome} required />
                                <Label>Descrição</Label><Textarea name="descricao" defaultValue={editingItem?.descricao} />
                                <Label>Preço</Label><Input name="preco" type="number" step="0.01" defaultValue={editingItem?.preco} required />
                                {editingItem?.id && (
                                    <>
                                        <Label>Status</Label>
                                        <Select name="status" defaultValue={editingItem?.status || 'disponivel'}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="disponivel">Disponível</SelectItem>
                                                <SelectItem value="reservado">Reservado</SelectItem>
                                                <SelectItem value="vendido">Vendido</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </>
                                )}

                                <div className="space-y-2">
                                    <Label>Foto do Item</Label>
                                    <div className="flex items-center gap-4">
                                        {editingItem?.fotos && (
                                            <img src={editingItem.fotos} alt="Preview" className="w-20 h-20 object-cover rounded-md border" />
                                        )}
                                        <div className="relative flex-1">
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                id="photo-upload"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        try {
                                                            setIsUploading(true);
                                                            const res = await uploadFile(file);
                                                            setEditingItem({ ...editingItem, fotos: res.url });
                                                            toast.success("Foto carregada!");
                                                        } catch (err) {
                                                            toast.error("Erro ao carregar foto");
                                                        } finally {
                                                            setIsUploading(false);
                                                        }
                                                    }
                                                }}
                                            />
                                            <Label
                                                htmlFor="photo-upload"
                                                className="flex items-center justify-center w-full h-10 border-2 border-dashed border-muted-foreground/25 rounded-md cursor-pointer hover:bg-muted/50 transition-colors gap-2 text-sm text-muted-foreground"
                                            >
                                                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                                {editingItem?.fotos ? "Alterar Foto" : "Carregar Foto"}
                                            </Label>
                                        </div>
                                    </div>
                                    <input type="hidden" name="fotos" value={editingItem?.fotos || ''} />
                                </div>
                            </>
                        )}
                        <DialogFooter>
                            <Button type="submit" disabled={isUploading}>
                                {isUploading ? "Carregando..." : "Salvar"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

        </div>
    );
}

