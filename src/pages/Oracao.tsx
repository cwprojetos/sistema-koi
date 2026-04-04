import { useState, useRef } from "react";
import { Heart, BookOpen, CheckCircle2, Circle, Plus, Pencil, Trash2, HandHelping } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { pedidosOracao as mockPedidos, versiculoDoDia as mockVersiculo, devocionalDiario as mockDevocional } from "@/data/mockData";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { oracaoApi, devocionalApi } from "@/services/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { BibleVerseSelector } from "@/components/BibleVerseSelector";

export default function Oracao() {
  const { role, canWrite } = useAuth();
  const isAdmin = canWrite("oracao");
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDevocionalModalOpen, setIsDevocionalModalOpen] = useState(false);
  const [devocionalContent, setDevocionalContent] = useState<any>(null);
  const textoRef = useRef<HTMLTextAreaElement>(null);
  const referenciaRef = useRef<HTMLInputElement>(null);

  const { data: pedidosData, isError: isErrorPedidos } = useQuery({
    queryKey: ['pedidos_oracao'],
    queryFn: () => oracaoApi.getAll(),
  });

  const { data: devocionaisData, isError: isErrorDevocionais } = useQuery({
    queryKey: ['devocionais'],
    queryFn: () => devocionalApi.getAll(),
  });

  const mutation = useMutation({
    mutationFn: (data: any) => editingItem?.id ? oracaoApi.update(editingItem.id, data) : oracaoApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos_oracao'] });
      toast.success("Pedido salvo!");
      setIsModalOpen(false);
      setEditingItem(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => oracaoApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos_oracao'] });
      toast.success("Pedido removido!");
    }
  });

  const toggleMutation = useMutation({
    mutationFn: (item: any) => oracaoApi.update(item.id, { ...item, respondido: !item.respondido }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos_oracao'] });
    }
  });

  const devocionalMutation = useMutation({
    mutationFn: (data: any) => devocional.id ? devocionalApi.update(devocional.id, data) : devocionalApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devocionais'] });
      toast.success("Devocional atualizado!");
      setIsDevocionalModalOpen(false);
    }
  });

  const pedidos = (isErrorPedidos || !pedidosData) ? mockPedidos : pedidosData;
  const devocional = (isErrorDevocionais || !devocionaisData || devocionaisData.length === 0) ? { ...mockVersiculo, ...mockDevocional } : devocionaisData[0];

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

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      nome: formData.get("nome"),
      pedido: formData.get("pedido"),
      data: formData.get("data") || new Date().toISOString().split('T')[0],
      respondido: editingItem?.respondido || false
    };
    mutation.mutate(data);
  };

  const handleDevocionalSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      titulo: formData.get("titulo"),
      texto: formData.get("texto"),
      texto_longo: formData.get("texto_longo"),
      referencia: formData.get("referencia"),
      autor: formData.get("autor"),
    };
    devocionalMutation.mutate(data);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader title="Devocional / Pedido de Oração" subtitle="Palavra diária e pedidos de oração da igreja" />
        <div className="flex gap-2 w-full md:w-auto">
            {isAdmin && (
                <Button variant="outline" size="sm" onClick={() => setIsDevocionalModalOpen(true)} className="gap-2 border-[#212351]/20 text-[#212351] hover:bg-[#212351]/5 flex-1 md:flex-initial">
                    <Pencil className="w-4 h-4" /> Editar Devocional
                </Button>
            )}
            {role !== 'guest' && (
                <Button size="sm" onClick={() => setIsModalOpen(true)} className="gap-2 bg-[#212351] hover:bg-[#2b2e6b] flex-1 md:flex-initial">
                    <Plus className="w-4 h-4" /> Novo Pedido
                </Button>
            )}
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) setEditingItem(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar Pedido' : 'Novo Pedido'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome / Família</Label>
              <Input id="nome" name="nome" defaultValue={editingItem?.nome} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pedido">Pedido / Motivo</Label>
              <Input id="pedido" name="pedido" defaultValue={editingItem?.pedido} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data">Data</Label>
              <Input id="data" name="data" type="date" defaultValue={editingItem?.data ? (typeof editingItem.data === 'string' ? editingItem.data.split('T')[0] : '') : ''} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDevocionalModalOpen} onOpenChange={setIsDevocionalModalOpen}>
        <DialogContent className="sm:max-w-[500px] flex flex-col" style={{ maxHeight: "90vh", overflow: "hidden" }}>
          <DialogHeader className="shrink-0">
            <DialogTitle>Editar Conteúdo Pastoral</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto min-h-0 flex-1 pr-2">
            <form onSubmit={handleDevocionalSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título do Devocional</Label>
                <Input id="titulo" name="titulo" defaultValue={devocional.titulo || "Devocional do Dia"} />
              </div>

              {/* Bible Verse Selector — populates texto + referencia */}
              <BibleVerseSelector
                onSelect={(text, reference) => {
                  if (textoRef.current) textoRef.current.value = text;
                  if (referenciaRef.current) referenciaRef.current.value = reference;
                }}
              />

              <div className="space-y-2">
                <Label htmlFor="texto">Versículo do Dia (Resumo)</Label>
                <textarea
                  ref={textoRef}
                  id="texto"
                  name="texto"
                  defaultValue={devocional.texto}
                  className="w-full min-h-[80px] p-3 rounded-md border border-input bg-background"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="referencia">Referência Bíblica</Label>
                <Input ref={referenciaRef} id="referencia" name="referencia" defaultValue={devocional.referencia} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="texto_longo">Mensagem Devocional Completa</Label>
                <textarea
                  id="texto_longo"
                  name="texto_longo"
                  defaultValue={devocional.texto_longo}
                  className="w-full min-h-[150px] p-3 rounded-md border border-input bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="autor">Autor / Pastor</Label>
                <Input id="autor" name="autor" defaultValue={devocional.autor} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={devocionalMutation.isPending}>
                  {devocionalMutation.isPending ? "Salvando..." : "Salvar Conteúdo"}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* STACKED CONTENT: Versículo, then Devocional, then Requests */}
      <div className="space-y-12">
        {/* BLOCK 1: Palavra do Dia - Keeping the special request gradient but making it consistent with Scale cards */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card-church overflow-hidden p-0 border-0 bg-gradient-to-br from-[#212351] via-[#1a1c42] to-black group flex flex-col shadow-xl">
          <div className="bg-white/10 backdrop-blur-sm px-6 py-4 text-white flex justify-between items-center border-b border-white/5">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-accent" /> Palavra do Dia
            </h2>
            {isAdmin && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => setIsDevocionalModalOpen(true)}>
                    <Pencil className="w-4 h-4" />
                </Button>
            )}
          </div>
          <div className="p-10 flex-1 flex flex-col justify-center text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 to-transparent opacity-50 pointer-events-none"></div>
            <p className="text-sm md:text-base font-medium text-white italic leading-relaxed mb-6 relative z-10 drop-shadow-sm">"{devocional.texto || mockVersiculo.texto}"</p>
            <div className="flex items-center justify-center gap-4 relative z-10">
                <div className="h-[1px] w-8 bg-white/20"></div>
                <p className="text-sm font-black text-white/90 uppercase tracking-[0.1em]">{devocional.referencia || mockVersiculo.referencia}</p>
                <div className="h-[1px] w-8 bg-white/20"></div>
            </div>
          </div>
        </motion.div>

        {/* BLOCK 2: Devocional Diário - Now using Scale Card style */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-church overflow-hidden p-0 border-0 group flex flex-col shadow-xl">
          <div className="gradient-navy px-6 py-4 text-white flex justify-between items-center">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <Heart className="w-4 h-4 text-accent" /> Devocional Diário
            </h2>
            {isAdmin && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => setIsDevocionalModalOpen(true)}>
                    <Pencil className="w-4 h-4" />
                </Button>
            )}
          </div>
          <div className="p-10 bg-white">
            <h3 className="text-3xl font-black text-[#212351] mb-6 uppercase tracking-tighter leading-none border-l-8 border-accent pl-6">{devocional.titulo || "DEVOCIONAL DO DIA"}</h3>
            <p className="text-lg text-[#212351]/80 leading-relaxed mb-8 whitespace-pre-wrap font-medium">{devocional.texto_longo || mockDevocional.texto}</p>
            <div className="flex items-center justify-between pt-8 border-t border-[#212351]/10">
               <div className="flex flex-col">
                 <span className="text-[10px] font-black uppercase tracking-widest text-accent mb-1">Palavra Ministrada por</span>
                 <p className="text-base font-black text-[#212351] uppercase tracking-tight">— {devocional.autor || mockDevocional.autor}</p>
               </div>
                <div className="text-right">
                     <p className="text-[10px] font-black uppercase tracking-widest text-[#212351]/20">KOI - Conectados em Cristo</p>
                </div>
            </div>
          </div>
        </motion.div>

        {/* BLOCK 3: Pedidos de Oração - Styled like Scale cards */}
        <section className="space-y-6">
            <div className="flex items-center gap-4 mb-8">
                <div className="h-10 w-2 bg-accent rounded-full"></div>
                <h2 className="text-3xl font-black text-[#212351] uppercase tracking-tighter">Mural de Pedidos</h2>
            </div>
            
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {pedidos.map((pedido: any, index: number) => (
                <motion.div 
                    key={pedido.id} 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: index * 0.05 }}
                    className={`p-6 rounded-xl border border-muted/50 shadow-sm flex flex-col gap-4 relative group transition-all h-full ${pedido.respondido ? 'bg-accent/5 opacity-70' : 'bg-muted/60 hover:bg-muted/80 hover:shadow-md'}`}
                >
                    <div className="flex gap-4 items-start">
                        <button onClick={() => toggleMutation.mutate(pedido)} className="shrink-0" disabled={role === 'guest'}>
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all ${pedido.respondido ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'bg-white text-[#212351]/30 border-2 border-[#212351]/5 hover:bg-white'}`}>
                                {pedido.respondido ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                            </div>
                        </button>
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className={`font-black text-[#212351] uppercase tracking-tight text-lg leading-tight ${pedido.respondido ? 'line-through decoration-2 opacity-50' : ''}`}>{pedido.nome}</h3>
                                <span className="text-[10px] font-black text-[#212351]/40 bg-white/50 px-2 py-1 rounded-md border border-[#212351]/5">{formatDate(pedido.data)}</span>
                            </div>
                            <p className={`text-base leading-relaxed ${pedido.respondido ? 'text-muted-foreground italic' : 'text-[#212351]/80 font-medium'}`}>{pedido.pedido}</p>
                            <div className="mt-6 flex items-center gap-2">
                                <span className={`text-[9px] px-3 py-1 rounded-md font-black tracking-widest uppercase border ${pedido.respondido ? 'bg-accent/10 border-accent/20 text-accent' : 'bg-[#212351] border-[#212351] text-white shadow-sm'}`}>
                                    {pedido.respondido ? 'Graça Alcançada' : 'Em Intercessão'}
                                </span>
                            </div>
                        </div>
                        {isAdmin && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-[#212351] hover:bg-accent/10 rounded-lg" onClick={() => { setEditingItem(pedido); setIsModalOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg" onClick={() => { if (confirm("Excluir pedido?")) deleteMutation.mutate(pedido.id); }}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                        )}
                    </div>
                </motion.div>
                ))}
            </div>
            {pedidos.length === 0 && (
                <div className="p-20 text-center bg-muted/40 rounded-3xl border-2 border-dashed border-[#212351]/10">
                    <p className="text-[#212351]/30 font-black uppercase tracking-widest text-sm">Sem pedidos registrados no altar.</p>
                </div>
            )}
        </section>
      </div>
    </div>
  );
}
