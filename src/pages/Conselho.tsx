import { useState, useEffect } from "react";
import { Users, BookOpen, Calendar, Plus, Pencil, Trash2, Printer, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import jsPDF from 'jspdf';
import { useAuth } from "@/contexts/AuthContext";
import {
    conselhoParticipantesApi,
    conselhoPlanejamentosApi,
    conselhoReunioesApi
} from "@/services/api";

interface Reuniao {
    id: number;
    data: string;
    topicos: string;
    notas: string;
}

interface TopicItem {
    id: number;
    titulo: string;
    resolucao: string;
}

interface Planejamento {
    id: number;
    titulo: string;
    descricao: string;
}

interface Participante {
    id: number;
    nome: string;
    ministerio: string;
}

export default function Conselho() {
    const [participantes, setParticipantes] = useState<Participante[]>([]);
    const [planejamentos, setPlanejamentos] = useState<Planejamento[]>([]);
    const [reunioes, setReunioes] = useState<Reuniao[]>([]);
    const [loading, setLoading] = useState(true);

    const [isParticipanteModalOpen, setIsParticipanteModalOpen] = useState(false);
    const [isPlanejamentoModalOpen, setIsPlanejamentoModalOpen] = useState(false);
    const [isReuniaoModalOpen, setIsReuniaoModalOpen] = useState(false);

    const [editingParticipante, setEditingParticipante] = useState<Participante | null>(null);
    const [editingPlanejamento, setEditingPlanejamento] = useState<Planejamento | null>(null);
    const [editingReuniao, setEditingReuniao] = useState<Reuniao | null>(null);
    const [dynamicTopics, setDynamicTopics] = useState<TopicItem[]>([{ id: 1, titulo: '', resolucao: '' }]);

    const { canWrite } = useAuth();
    const isAdmin = canWrite('conselho');

    // Load data from database on mount
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [p, pl, r] = await Promise.all([
                    conselhoParticipantesApi.getAll(),
                    conselhoPlanejamentosApi.getAll(),
                    conselhoReunioesApi.getAll()
                ]);
                setParticipantes(p);
                setPlanejamentos(pl);
                setReunioes(r);
            } catch (err) {
                toast.error("Erro ao carregar dados do conselho. Verifique a conexão com o servidor.");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Participantes Handlers
    const handleSaveParticipante = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const nome = formData.get("nome") as string;
        const ministerio = formData.get("ministerio") as string;
        try {
            if (editingParticipante) {
                const updated = await conselhoParticipantesApi.update(editingParticipante.id, { nome, ministerio });
                setParticipantes(prev => prev.map(p => p.id === editingParticipante.id ? { ...p, ...updated } : p));
                toast.success("Participante atualizado!");
            } else {
                const created = await conselhoParticipantesApi.create({ nome, ministerio });
                setParticipantes(prev => [...prev, created]);
                toast.success("Participante cadastrado!");
            }
            setIsParticipanteModalOpen(false);
            setEditingParticipante(null);
        } catch (err) {
            toast.error("Erro ao salvar participante.");
        }
    };

    const deleteParticipante = async (id: number) => {
        try {
            await conselhoParticipantesApi.delete(id);
            setParticipantes(prev => prev.filter(p => p.id !== id));
            toast.success("Participante removido!");
        } catch (err) {
            console.error("Erro ao excluir participante:", err);
            toast.error("Erro ao excluir participante. Verifique se há reuniões vinculadas.");
        }
    };

    // Planejamentos Handlers
    const handleSavePlanejamento = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const titulo = formData.get("titulo") as string;
        const descricao = formData.get("descricao") as string;
        try {
            if (editingPlanejamento) {
                const updated = await conselhoPlanejamentosApi.update(editingPlanejamento.id, { titulo, descricao });
                setPlanejamentos(prev => prev.map(p => p.id === editingPlanejamento.id ? { ...p, ...updated } : p));
                toast.success("Planejamento atualizado!");
            } else {
                const created = await conselhoPlanejamentosApi.create({ titulo, descricao });
                setPlanejamentos(prev => [...prev, created]);
                toast.success("Planejamento adicionado!");
            }
            setIsPlanejamentoModalOpen(false);
            setEditingPlanejamento(null);
        } catch (err) {
            toast.error("Erro ao salvar planejamento.");
        }
    };

    const deletePlanejamento = async (id: number) => {
        try {
            await conselhoPlanejamentosApi.delete(id);
            setPlanejamentos(prev => prev.filter(p => p.id !== id));
            toast.success("Planejamento removido!");
        } catch (err) {
            console.error("Erro ao excluir planejamento:", err);
            toast.error("Erro ao excluir planejamento.");
        }
    };

    // Reunioes Handlers
    const addTopic = () => {
        setDynamicTopics(prev => [
            ...prev,
            { id: prev.length + 1, titulo: '', resolucao: '' }
        ]);
    };

    const removeTopic = (id: number) => {
        if (dynamicTopics.length === 1) return;
        const newTopics = dynamicTopics.filter(t => t.id !== id).map((t, idx) => ({ ...t, id: idx + 1 }));
        setDynamicTopics(newTopics);
    };

    const updateTopic = (id: number, field: 'titulo' | 'resolucao', value: string) => {
        setDynamicTopics(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
    };

    const handleSaveReuniao = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = formData.get("data") as string;
        const topicos = formData.get("topicos") as string;
        const notas = JSON.stringify(dynamicTopics);
        try {
            if (editingReuniao) {
                const updated = await conselhoReunioesApi.update(editingReuniao.id, { data, topicos, notas });
                setReunioes(prev => prev.map(r => r.id === editingReuniao.id ? { ...r, ...updated } : r));
                toast.success("Reunião atualizada!");
            } else {
                const created = await conselhoReunioesApi.create({ data, topicos, notas });
                setReunioes(prev => [...prev, created]);
                toast.success("Reunião registrada!");
            }
            setIsReuniaoModalOpen(false);
            setEditingReuniao(null);
        } catch (err) {
            toast.error("Erro ao salvar reunião.");
        }
    };

    const deleteReuniao = async (id: number) => {
        try {
            await conselhoReunioesApi.delete(id);
            setReunioes(prev => prev.filter(r => r.id !== id));
            toast.success("Reunião removida!");
        } catch (err) {
            console.error("Erro ao excluir reunião:", err);
            toast.error("Erro ao excluir reunião.");
        }
    };

    // Generate PDF
    const generatePDF = (reuniao: Reuniao) => {
        const doc = new jsPDF();
        const primaryColor = '#212351';

        doc.setFont("helvetica", "bold");
        doc.setTextColor(primaryColor);
        doc.setFontSize(22);
        doc.text("KN - CONECTADOS EM CRISTO", 105, 20, { align: "center" });

        doc.setFontSize(14);
        doc.setTextColor("#666666");
        doc.text("Ata de Reunião do Conselho", 105, 30, { align: "center" });

        doc.setDrawColor(33, 35, 81);
        doc.line(20, 35, 190, 35);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        doc.setTextColor("#000000");

        const formattedDate = new Date(reuniao.data + 'T12:00:00').toLocaleDateString('pt-BR');
        
        // Title and Date side-by-side
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(primaryColor);
        doc.text(reuniao.topicos.toUpperCase(), 20, 50);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        doc.setTextColor("#666666");
        doc.text(`Data: ${formattedDate}`, 190, 50, { align: "right" });

        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(20, 55, 190, 55);

        let currentY = 70;

        doc.setFont("helvetica", "bold");
        doc.setTextColor(primaryColor);
        doc.setFontSize(14);
        doc.text("DELIBERAÇÕES E RESOLUÇÕES DA ATA:", 20, currentY);
        doc.setFont("helvetica", "normal");

        currentY += 10;

        try {
            const parsedTopics = JSON.parse(reuniao.notas);
            if (Array.isArray(parsedTopics)) {
                parsedTopics.forEach((topic: TopicItem, idx: number) => {
                    // Check for page break
                    if (currentY > 250) {
                        doc.addPage();
                        currentY = 20;
                    }

                    // Separation Line (Blue 3mm ish)
                    doc.setDrawColor(33, 35, 81); // Blue from system
                    doc.setLineWidth(1.5); // Thickness
                    doc.line(20, currentY, 190, currentY); // Full width line
                    currentY += 5;

                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(12);
                    doc.setTextColor("#000000");
                    doc.text(`Tópico ${topic.id}: ${topic.titulo || "Sem assunto"}`, 20, currentY);
                    
                    currentY += 7;
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(11);
                    doc.setTextColor("#333333");
                    
                    const splitNotes = doc.splitTextToSize(topic.resolucao || "Nenhuma resolução registrada.", 170);
                    doc.text(splitNotes, 20, currentY);
                    
                    currentY += (splitNotes.length * 7) + 15;
                });
            } else {
                const splitNotas = doc.splitTextToSize(reuniao.notas || "Nenhuma anotação registrada.", 170);
                doc.text(splitNotas, 20, currentY + 10);
            }
        } catch (e) {
            const splitNotas = doc.splitTextToSize(reuniao.notas || "Nenhuma anotação registrada.", 170);
            doc.text(splitNotas, 20, currentY + 10);
        }

        const footerY = 250;
        doc.setDrawColor(200, 200, 200);
        doc.line(20, footerY - 10, 190, footerY - 10);

        doc.setFontSize(10);
        doc.setTextColor("#888888");
        doc.text(`Documento gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 105, footerY, { align: "center" });
        doc.text("Responsável pela Ata: Conselho", 105, footerY + 10, { align: "center" });

        doc.save(`Reuniao_Conselho_${formattedDate.replace(/\//g, '-')}.pdf`);
        toast.success("PDF Gerado com Sucesso!");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-3 text-[#212351]">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <p className="text-sm font-medium">Carregando dados do conselho...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-12 pb-12 overflow-hidden">
            <PageHeader title="Conselho Administrivo" subtitle="Gestão estratégica de participantes e registros de reuniões" />

            {/* Participantes Section */}
            <section className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-indigo-600/10 pb-4 gap-4">
                    <h2 className="text-2xl font-black flex items-center gap-3 text-indigo-600 uppercase tracking-tight">
                        <Users className="w-6 h-6" /> Membros
                    </h2>
                    {isAdmin && (
                        <Dialog open={isParticipanteModalOpen} onOpenChange={(open) => { setIsParticipanteModalOpen(open); if (!open) setEditingParticipante(null); }}>
                            <DialogTrigger asChild>
                                <Button className="bg-indigo-600 hover:bg-indigo-700 h-11 px-6 rounded-xl font-bold shadow-lg shadow-indigo-600/20 w-full sm:w-auto">
                                    <Plus className="w-5 h-5 mr-2" /> NOVO MEMBRO
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-bold text-indigo-950">Gerenciar Membro</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleSaveParticipante} className="space-y-4 pt-4">
                                    <div className="space-y-2">
                                        <Label className="font-bold">Nome Completo</Label>
                                        <Input name="nome" defaultValue={editingParticipante?.nome} required className="h-11 border-indigo-100" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="font-bold">Ministério / Função</Label>
                                        <Input 
                                            name="ministerio" 
                                            defaultValue={editingParticipante?.ministerio} 
                                            placeholder="Ex: Pastor, Tesoureiro, Mídia..." 
                                            required 
                                            className="h-11 border-indigo-100" 
                                        />
                                    </div>
                                    <DialogFooter className="pt-4">
                                        <Button type="submit" className="w-full bg-indigo-600 h-12 text-lg font-bold">SALVAR MEMBRO</Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
                
                <div className="grid gap-4 grid-cols-1 xs:grid-cols-2 lg:grid-cols-3">
                    {participantes.length === 0 ? (
                        <div className="col-span-full text-center text-muted-foreground py-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                            Nenhum participante cadastrado.
                        </div>
                    ) : (
                        participantes.map(p => (
                            <div key={p.id} className="flex justify-between items-center p-4 bg-white/60 backdrop-blur-md border-l-8 border-l-indigo-500 rounded-2xl shadow-lg group hover:shadow-xl transition-all">
                                <div className="flex flex-col truncate pr-2">
                                    <span className="text-lg font-black text-indigo-950 uppercase tracking-tighter truncate">{p.nome}</span>
                                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{p.ministerio || "Membro"}</span>
                                </div>
                                {isAdmin && (
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                        <Button variant="outline" size="icon" className="h-8 w-8 text-indigo-600 border-indigo-100 hover:bg-indigo-50" onClick={() => { setEditingParticipante(p); setIsParticipanteModalOpen(true); }}>
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="outline" size="icon" className="h-8 w-8 text-destructive border-red-50 hover:bg-destructive/10">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Excluir Participante?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Deseja realmente remover {p.nome} do conselho?
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => deleteParticipante(p.id)} className="bg-destructive hover:bg-destructive/90">
                                                        Confirmar Exclusão
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* Planejamento Section */}
            <section className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-emerald-600/10 pb-4 gap-4">
                    <h2 className="text-2xl font-black flex items-center gap-3 text-emerald-600 uppercase tracking-tight">
                        <BookOpen className="w-6 h-6" /> Planejamento
                    </h2>
                    {isAdmin && (
                        <Dialog open={isPlanejamentoModalOpen} onOpenChange={(open) => { setIsPlanejamentoModalOpen(open); if (!open) setEditingPlanejamento(null); }}>
                            <DialogTrigger asChild>
                                <Button className="bg-emerald-600 hover:bg-emerald-700 h-11 px-6 rounded-xl font-bold shadow-lg shadow-emerald-600/20 w-full sm:w-auto">
                                    <Plus className="w-5 h-5 mr-2" /> NOVO ITEM
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-bold text-emerald-950">Planejamento Estratégico</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleSavePlanejamento} className="space-y-4 pt-4">
                                    <div className="space-y-2">
                                        <Label className="font-bold">Título do Assunto</Label>
                                        <Input
                                            name="titulo"
                                            defaultValue={editingPlanejamento?.titulo}
                                            placeholder="Ex: Reforma do Palco"
                                            required
                                            className="h-11 border-emerald-100 bg-emerald-50/10"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="font-bold">Ações e Descrição</Label>
                                        <textarea
                                            name="descricao"
                                            defaultValue={editingPlanejamento?.descricao}
                                            placeholder="Descreva as ações planejadas..."
                                            className="w-full min-h-[150px] p-4 rounded-xl border-emerald-100 bg-emerald-50/30 focus:bg-white transition-all outline-none border-2 focus:border-emerald-500"
                                            required
                                        />
                                    </div>
                                    <DialogFooter className="pt-4">
                                        <Button type="submit" className="w-full bg-emerald-600 h-12 text-lg font-bold">SALVAR DIRETRIZ</Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
                
                <div className="space-y-6">
                    {planejamentos.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                            Nenhum planejamento traçado.
                        </div>
                    ) : (
                        planejamentos.map(p => (
                            <div key={p.id} className="p-8 bg-white/60 backdrop-blur-md border-l-[12px] border-l-emerald-500 rounded-3xl shadow-lg group relative hover:shadow-xl transition-all">
                                <h3 className="text-2xl font-black text-emerald-900 uppercase tracking-tighter mb-4">{p.titulo || "Sem Título"}</h3>
                                <div className="p-6 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
                                    <p className="text-lg font-medium text-emerald-950 whitespace-pre-wrap leading-relaxed">{p.descricao}</p>
                                </div>
                                {isAdmin && (
                                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="outline" size="icon" className="h-10 w-10 text-emerald-600 border-emerald-100 hover:bg-emerald-50" onClick={() => { setEditingPlanejamento(p); setIsPlanejamentoModalOpen(true); }}>
                                            <Pencil className="w-5 h-5" />
                                        </Button>

                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="outline" size="icon" className="h-10 w-10 text-destructive border-red-50 hover:bg-destructive/10">
                                                    <Trash2 className="w-5 h-5" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Excluir Planejamento?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Deseja remover a diretriz: {p.titulo}?
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => deletePlanejamento(p.id)} className="bg-destructive hover:bg-destructive/90">
                                                        Confirmar Exclusão
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* Reunioes Section */}
            <section className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-amber-600/10 pb-4 gap-4">
                    <h2 className="text-2xl font-black flex items-center gap-3 text-amber-600 uppercase tracking-tight">
                        <Calendar className="w-6 h-6" /> Atas
                    </h2>
                    {isAdmin && (
                        <Dialog open={isReuniaoModalOpen} onOpenChange={(open) => { 
                            setIsReuniaoModalOpen(open); 
                            if (!open) {
                                setEditingReuniao(null);
                                setDynamicTopics([{ id: 1, titulo: '', resolucao: '' }]);
                            }
                        }}>
                            <DialogTrigger asChild>
                                <Button className="bg-amber-600 hover:bg-amber-700 h-11 px-6 rounded-xl font-bold shadow-lg shadow-amber-600/20 w-full sm:w-auto">
                                    <Plus className="w-5 h-5 mr-2" /> REGISTRAR ATA
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-bold text-amber-950">Nova Ata de Reunião</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleSaveReuniao} className="space-y-4 pt-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="font-bold">Data da Reunião</Label>
                                            <Input name="data" type="date" defaultValue={editingReuniao?.data ? editingReuniao.data.split('T')[0] : ''} required className="h-11" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="font-bold">Título/Temas Centrais</Label>
                                            <Input name="topicos" defaultValue={editingReuniao?.topicos} required placeholder="Ex: Reforma, Finanças..." className="h-11" />
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-2">
                                        <div className="flex justify-between items-center">
                                            <Label className="font-bold text-lg text-amber-900">Tópicos e Deliberações</Label>
                                            <Button type="button" size="sm" onClick={addTopic} className="bg-amber-100 text-amber-900 border-amber-200 border hover:bg-amber-200 gap-2 font-bold px-4 rounded-xl">
                                                <Plus className="w-4 h-4" /> ADICIONAR NOVO TÓPICO
                                            </Button>
                                        </div>
                                        
                                        <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                            {dynamicTopics.map((topic, index) => (
                                                <motion.div 
                                                    key={topic.id}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className="p-6 bg-amber-50/50 rounded-2xl border-2 border-amber-100 relative group"
                                                >
                                                    <div className="absolute -left-3 -top-3 w-10 h-10 bg-amber-600 text-white rounded-full flex items-center justify-center font-black shadow-lg">
                                                        {topic.id}
                                                    </div>
                                                    
                                                    {dynamicTopics.length > 1 && (
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            type="button"
                                                            onClick={() => removeTopic(topic.id)}
                                                            className="absolute top-2 right-2 text-amber-400 hover:text-red-500 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    )}

                                                    <div className="space-y-4">
                                                        <div className="space-y-1">
                                                            <Label className="text-sm font-bold text-amber-700">Assunto do Tópico {topic.id}</Label>
                                                            <Input 
                                                                value={topic.titulo}
                                                                onChange={(e) => updateTopic(topic.id, 'titulo', e.target.value)}
                                                                placeholder="Do que se trata este tópico?"
                                                                className="h-10 border-amber-100 focus:border-amber-500"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-sm font-bold text-amber-700">Resolução / O que foi decidido</Label>
                                                            <textarea
                                                                value={topic.resolucao}
                                                                onChange={(e) => updateTopic(topic.id, 'resolucao', e.target.value)}
                                                                placeholder="Neste tópico foi decidido que..."
                                                                className="w-full min-h-[100px] p-4 rounded-xl border-amber-50 border-2 focus:border-amber-400 focus:bg-white outline-none transition-all"
                                                            />
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>

                                    <DialogFooter className="pt-4">
                                        <Button type="submit" className="w-full bg-amber-600 h-12 text-lg font-bold uppercase tracking-widest">SALVAR ATA OFICIAL</Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
                
                <div className="grid gap-8 grid-cols-1">
                    {reunioes.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                            Nenhuma reunião registrada.
                        </div>
                    ) : (
                        reunioes.sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime()).map((r, i) => (
                            <motion.div
                                key={r.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="bg-white/60 backdrop-blur-md border-l-[12px] border-l-amber-500 rounded-3xl p-6 sm:p-8 relative group hover:shadow-2xl transition-all border border-amber-100/50"
                            >
                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                                    <div>
                                        <h3 className="font-black text-amber-600 text-sm uppercase tracking-[0.2em] mb-1">
                                            {new Date(r.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                        </h3>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[#212351]/20">KOI - Conectados em Cristo</p>
                                        <p className="text-2xl sm:text-3xl font-black text-amber-950 uppercase tracking-tighter leading-none break-words">
                                            {r.topicos}
                                        </p>
                                    </div>
                                    <Button variant="outline" size="sm" className="h-10 px-4 gap-2 text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100 rounded-xl font-bold w-full sm:w-auto" onClick={() => generatePDF(r)}>
                                        <Printer className="w-5 h-5" /> GERAR PDF
                                    </Button>
                                </div>

                                <div className="space-y-4">
                                    {(() => {
                                        try {
                                            const parsed = JSON.parse(r.notas);
                                            if (Array.isArray(parsed)) {
                                                return parsed.map((topic: TopicItem) => (
                                                    <div key={topic.id} className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100/50">
                                                        <h4 className="font-bold text-amber-800 mb-2 uppercase text-sm tracking-wide">
                                                            Tópico {topic.id}: {topic.titulo || "Sem Assunto"}
                                                        </h4>
                                                        <p className="text-lg font-medium text-slate-700 whitespace-pre-wrap leading-relaxed italic">
                                                            {topic.resolucao || topic.resolvido || "Nenhuma anotação."}
                                                        </p>
                                                    </div>
                                                ));
                                            }
                                            throw new Error();
                                        } catch (e) {
                                            return (
                                                <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100/50">
                                                    <p className="text-lg font-medium text-slate-700 whitespace-pre-wrap leading-relaxed italic">
                                                        {r.notas || "Nenhuma anotação registrada."}
                                                    </p>
                                                </div>
                                            );
                                        }
                                    })()}
                                </div>

                                {isAdmin && (
                                    <div className="absolute top-8 right-8 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="outline" size="icon" className="h-10 w-10 text-amber-600 border-amber-100 hover:bg-amber-50" onClick={() => { 
                                            setEditingReuniao(r); 
                                            try {
                                                const parsed = JSON.parse(r.notas);
                                                if (Array.isArray(parsed)) {
                                                    setDynamicTopics(parsed);
                                                } else {
                                                    setDynamicTopics([{ id: 1, titulo: 'Nota', resolucao: r.notas }]);
                                                }
                                            } catch (e) {
                                                setDynamicTopics([{ id: 1, titulo: 'Ata', resolucao: r.notas }]);
                                            }
                                            setIsReuniaoModalOpen(true); 
                                        }}>
                                            <Pencil className="w-5 h-5" />
                                        </Button>

                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="outline" size="icon" className="h-10 w-10 text-destructive border-red-50 hover:bg-destructive/10">
                                                    <Trash2 className="w-5 h-5" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Excluir Ata de Reunião?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Deseja remover esta ata do dia {new Date(r.data + 'T12:00:00').toLocaleDateString('pt-BR')}?
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => deleteReuniao(r.id)} className="bg-destructive hover:bg-destructive/90">
                                                        Confirmar Exclusão
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                )}
                            </motion.div>
                        ))
                    )}
                </div>
            </section>

        </div>
    );
}
