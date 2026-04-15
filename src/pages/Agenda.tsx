import React, { useState } from "react";
import { Plus, Pencil, Trash2, Calendar, Megaphone, User, Clock, BookOpen, Quote } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { agendaSemanal as mockAgenda, avisos as mockAvisos } from "@/data/mockData";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { agendaApi, avisosApi } from "@/services/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { BibleDialog } from "@/components/BibleDialog";
import { LiveCaptionsDialog } from "@/components/LiveCaptionsDialog";
import { LiveStreamButton } from "@/components/LiveStreamButton";

const diasSemana: Record<number, string> = {
  0: "Domingo", 1: "Segunda", 2: "Terça", 3: "Quarta",
  4: "Quinta", 5: "Sexta", 6: "Sábado",
};

export default function Agenda() {
  const queryClient = useQueryClient();
  const { role, isAdmin, isSuperAdmin } = useAuth();
  const isVisitor = role === 'visitante' || role === 'guest';
  const canEdit = isAdmin || isSuperAdmin;
  const [editingItem, setEditingItem] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'programacao' | 'avisos'>('programacao');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTipo, setSelectedTipo] = useState("evento");

  const { data: agendaData, isError: isErrorAgenda } = useQuery({ queryKey: ['agenda'], queryFn: agendaApi.getAll });
  const { data: avisosData, isError: isErrorAvisos } = useQuery({ queryKey: ['avisos'], queryFn: avisosApi.getAll });

  const agendaMutation = useMutation({
    mutationFn: (data: any) => editingItem?.id ? agendaApi.update(editingItem.id, data) : agendaApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda'] });
      toast.success("Agenda atualizada!");
      setIsModalOpen(false);
      setEditingItem(null);
    }
  });

  const deleteAgendaMutation = useMutation({
    mutationFn: (id: number) => agendaApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['agenda'] }); toast.success("Item removido!"); }
  });

  const avisosMutation = useMutation({
    mutationFn: (data: any) => editingItem?.id ? avisosApi.update(editingItem.id, data) : avisosApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avisos'] });
      toast.success("Aviso atualizado!");
      setIsModalOpen(false);
      setEditingItem(null);
    }
  });

  const deleteAvisosMutation = useMutation({
    mutationFn: (id: number) => avisosApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['avisos'] }); toast.success("Aviso removido!"); }
  });

  const agenda = (isErrorAgenda || !agendaData) ? mockAgenda : agendaData;
  const avisos = (isErrorAvisos || !avisosData) ? mockAvisos : avisosData;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const datePart = dateStr.split('T')[0];
      const d = new Date(datePart + "T12:00:00");
      if (isNaN(d.getTime())) return "";
      return `${diasSemana[d.getDay()]}, ${d.toLocaleDateString("pt-BR")}`;
    } catch (e) {
      return "";
    }
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (activeTab === 'programacao') {
      agendaMutation.mutate({
        titulo: formData.get("titulo"),
        data: formData.get("data"),
        horario: formData.get("horario"),
        tipo: selectedTipo,
        pregador: formData.get("pregador"),
        tema: formData.get("tema"),
      });
    } else {
      avisosMutation.mutate({
        titulo: formData.get("titulo"),
        descricao: formData.get("descricao"),
      });
    }
  };

  const filteredAgenda = (agenda || [])
    .filter((item: any) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        item.titulo?.toLowerCase().includes(searchLower) ||
        item.pregador?.toLowerCase().includes(searchLower) ||
        item.tema?.toLowerCase().includes(searchLower) ||
        formatDate(item.data).toLowerCase().includes(searchLower)
      );
    })
    .sort((a: any, b: any) => {
      const dateA = a.data ? new Date(a.data.split('T')[0]).getTime() : 0;
      const dateB = b.data ? new Date(b.data.split('T')[0]).getTime() : 0;
      
      if (dateA !== dateB) return dateA - dateB;
      
      const timeA = a.horario || "";
      const timeB = b.horario || "";
      return timeA.localeCompare(timeB);
    });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <PageHeader 
          title="Agenda da Igreja" 
          subtitle="Programação semanal, cultos e avisos importantes" 
        />
        <div className="relative w-full md:w-80">
          <Input 
            placeholder="Pesquisar..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11"
          />
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        </div>
      </div>

      {/* Ações Rápidas: Bíblia e Transmissão com Legendas */}
      <div className="flex flex-wrap items-center justify-center md:justify-start gap-10 py-8 border-y border-indigo-100 bg-white/50 backdrop-blur-md rounded-3xl px-10 shadow-sm border-t-2 border-t-indigo-500/10">
        <BibleDialog />
        <LiveCaptionsDialog />
        <LiveStreamButton />
      </div>

      <div className="space-y-12 pb-12">
        {/* SEÇÃO 1: PROGRAMAÇÃO DA SEMANA */}
        <section className="space-y-6">
          <div className="flex justify-between items-center border-b-2 border-indigo-600/10 pb-4">
            <h2 className="text-2xl font-black flex items-center gap-3 text-indigo-600 uppercase tracking-tight">
              <Calendar className="w-6 h-6" /> Programação da Semana
            </h2>
            {canEdit && (
              <Button onClick={() => { setEditingItem(null); setSelectedTipo("culto"); setIsModalOpen(true); setActiveTab('programacao'); }} className="bg-indigo-600 hover:bg-indigo-700 h-11 px-6 rounded-xl font-bold">
                <Plus className="w-5 h-5 mr-2" /> NOVO EVENTO
              </Button>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {filteredAgenda.map((item: any) => (
              <div key={item.id} className="card-church p-8 border-l-8 border-l-indigo-500 hover:shadow-xl transition-all group relative bg-white/50 backdrop-blur-sm">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0 shadow-inner">
                      <Clock className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="font-black text-3xl text-indigo-950 uppercase leading-none mb-2 tracking-tighter">
                        {item.titulo}
                      </h3>
                      <span className="text-xs font-black text-indigo-600/70 bg-indigo-100/50 px-3 py-1 rounded-full uppercase tracking-widest border border-indigo-200">
                        {item.tipo}
                      </span>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="outline" size="icon" className="h-10 w-10 text-indigo-600 border-indigo-100 hover:bg-indigo-50" onClick={() => { setEditingItem(item); setSelectedTipo(item.tipo || "culto"); setIsModalOpen(true); setActiveTab('programacao'); }}><Pencil className="w-5 h-5" /></Button>
                      <Button variant="outline" size="icon" className="h-10 w-10 text-destructive border-red-50/50 hover:bg-destructive/10" onClick={() => { if (confirm("Excluir?")) deleteAgendaMutation.mutate(item.id); }}><Trash2 className="w-5 h-5" /></Button>
                    </div>
                  )}
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3 text-lg text-slate-700 font-bold">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-slate-500" />
                    </div>
                    <span>{item.pregador || "A definir"}</span>
                  </div>
                  {item.tema && (
                    <div className="flex items-start gap-3 text-base italic text-slate-500/90 pl-11 relative">
                       <Quote className="w-4 h-4 text-indigo-200 absolute left-4 top-1 rotate-180" />
                       <span className="leading-relaxed font-medium">"{item.tema}"</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-indigo-100/50">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">{formatDate(item.data)}</span>
                    <span className="text-3xl font-black text-indigo-600 leading-none mt-1">{item.horario}</span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100/50">
                    <BookOpen className="w-6 h-6 text-indigo-300" />
                  </div>
                </div>
              </div>
            ))}
            {filteredAgenda.length === 0 && (
              <div className="col-span-full py-16 text-center text-slate-400 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-xl font-medium">Nenhuma programação encontrada.</p>
              </div>
            )}
          </div>
        </section>

        {/* SEÇÃO 2: AVISOS IMPORTANTES */}
        <section className="space-y-6">
          <div className="flex justify-between items-center border-b-2 border-amber-600/10 pb-4">
            <h2 className="text-2xl font-black flex items-center gap-3 text-amber-600 uppercase tracking-tight">
              <Megaphone className="w-6 h-6" /> Avisos Importantes
            </h2>
            {canEdit && (
              <Button onClick={() => { setEditingItem(null); setIsModalOpen(true); setActiveTab('avisos'); }} className="bg-amber-600 hover:bg-amber-700 h-11 px-6 rounded-xl font-bold">
                <Plus className="w-5 h-5 mr-2" /> NOVO AVISO
              </Button>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {avisos.map((aviso: any) => (
              <div key={aviso.id} className="card-church p-8 border-l-8 border-l-amber-500 relative group flex flex-col justify-between bg-white/50 backdrop-blur-sm shadow-md hover:shadow-xl transition-all">
                <div>
                  <h3 className="font-black text-2xl text-amber-950 uppercase mb-4 tracking-tight leading-tight">{aviso.titulo}</h3>
                  <p className="text-slate-600 leading-relaxed text-lg font-medium">{aviso.descricao}</p>
                </div>
                {canEdit && (
                  <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="outline" size="icon" className="h-10 w-10 text-amber-600 border-amber-100 hover:bg-amber-50" onClick={() => { setEditingItem(aviso); setIsModalOpen(true); setActiveTab('avisos'); }}><Pencil className="w-5 h-5" /></Button>
                    <Button variant="outline" size="icon" className="h-10 w-10 text-destructive border-red-50/50 hover:bg-destructive/10" onClick={() => { if (confirm("Excluir?")) deleteAvisosMutation.mutate(aviso.id); }}><Trash2 className="w-5 h-5" /></Button>
                  </div>
                )}
                <div className="flex justify-end pt-8 opacity-20">
                   <Megaphone className="w-10 h-10 text-amber-900" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>


      <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) setEditingItem(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar' : 'Novo'} {activeTab === 'programacao' ? 'Evento' : 'Aviso'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-4">
            {activeTab === 'programacao' ? (
              <>
                <div className="space-y-2">
                  <Label>Título do Evento</Label>
                  <Input name="titulo" defaultValue={editingItem?.titulo} required placeholder="Ex: Culto de Domingo" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data</Label>
                    <Input name="data" type="date" defaultValue={editingItem?.data ? editingItem.data.split('T')[0] : ''} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Horário</Label>
                    <Input name="horario" defaultValue={editingItem?.horario} placeholder="Ex: 19:00" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Pregador</Label>
                    <Input name="pregador" defaultValue={editingItem?.pregador} placeholder="Nome do preletor" />
                  </div>
                  <div className="space-y-2">
                    <Label>Tema</Label>
                    <Input name="tema" defaultValue={editingItem?.tema} placeholder="Tema da mensagem" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={selectedTipo} onValueChange={setSelectedTipo}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="culto">Culto</SelectItem>
                      <SelectItem value="evento">Evento</SelectItem>
                      <SelectItem value="reuniao">Reunião</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Título do Aviso</Label>
                  <Input name="titulo" defaultValue={editingItem?.titulo} required placeholder="Ex: Retiro de Jovens" />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input name="descricao" defaultValue={editingItem?.descricao} required placeholder="Detalhes do aviso..." />
                </div>
              </>
            )}
            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">Salvar Alterações</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}



