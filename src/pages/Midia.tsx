import { useState } from "react";
import { Monitor, CheckSquare, Square, User, Plus, Pencil, Trash2, FileText } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { escalaMidia as mockEscala, afazeresMidia as mockAfazeres } from "@/data/mockData";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { midiaEscalaApi, midiaAfazeresApi } from "@/services/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { PresenceReportModal } from "@/components/PresenceReportModal";
import { SlideProjectorModal } from "@/components/SlideProjectorModal";
import { useAuth } from "@/contexts/AuthContext";

export default function Midia() {
  const { canWrite } = useAuth();
  const canEdit = canWrite('midia');
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'escala' | 'afazeres'>('escala');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isProjectorOpen, setIsProjectorOpen] = useState(false);

  const { data: escalaData, isError: isErrorEscala } = useQuery({ queryKey: ['escala_midia'], queryFn: () => midiaEscalaApi.getAll() });
  const { data: afazeresData, isError: isErrorAfazeres } = useQuery({ queryKey: ['afazeres_midia'], queryFn: () => midiaAfazeresApi.getAll() });

  const deleteEscalaMutation = useMutation({
    mutationFn: (id: number) => midiaEscalaApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['escala_midia'] }); toast.success("Removido!"); }
  });

  const deleteAfazerMutation = useMutation({
    mutationFn: (id: number) => midiaAfazeresApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['afazeres_midia'] }); toast.success("Removido!"); }
  });

  const escalaMutation = useMutation({
    mutationFn: (data: any) => editingItem?.id ? midiaEscalaApi.update(editingItem.id, data) : midiaEscalaApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['escala_midia'] }); setIsModalOpen(false); setEditingItem(null); toast.success("Salvo!"); }
  });

  const afazeresMutation = useMutation({
    mutationFn: (data: any) => data?.id ? midiaAfazeresApi.update(data.id, data) : midiaAfazeresApi.create(data),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['afazeres_midia'] }); 
      setIsModalOpen(false); 
      setEditingItem(null); 
      toast.success("Salvo!"); 
    },
    onError: (err: any) => {
      console.error("Erro ao salvar afazer:", err);
      toast.error(`Erro ao salvar: ${err.message}`);
    }
  });

  const escalas = (isErrorEscala || !escalaData) ? mockEscala : escalaData;
  const afazeres = (isErrorAfazeres || !afazeresData) ? mockAfazeres : afazeresData;

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
    if (activeTab === 'escala') {
      escalaMutation.mutate({ nome: formData.get("nome"), funcao: formData.get("funcao"), data: formData.get("data") });
    } else {
      afazeresMutation.mutate({ 
        tarefa: formData.get("tarefa"), 
        responsavel: formData.get("responsavel"), 
        concluido: editingItem?.concluido || false,
        data: formData.get("data"),
        horario: formData.get("horario")
      });
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <PageHeader title="Mídia / Marketing" subtitle="Escala e tarefas da equipe de mídia e marketing" />

        <div className="flex gap-2 w-full sm:w-auto">
          <Button size="sm" onClick={() => setIsProjectorOpen(true)} className="flex-1 sm:flex-none gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-md h-10">
            <Monitor className="w-4 h-4 text-white" /> <span className="xs:inline">Projetor</span>
          </Button>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setIsReportModalOpen(true)} className="flex-1 sm:flex-none gap-2 border-accent text-accent hover:bg-accent/10 h-10">
              <FileText className="w-4 h-4" /> <span className="xs:inline">Relatório</span>
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="escala" className="w-full" onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-2 mb-8 h-12">
          <TabsTrigger value="escala" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Monitor className="w-4 h-4 hidden xs:block" /> Escala
          </TabsTrigger>
          <TabsTrigger value="afazeres" className="gap-2 data-[state=active]:bg-orange-600 data-[state=active]:text-white">
            <CheckSquare className="w-4 h-4 hidden xs:block" /> Afazeres
          </TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          <TabsContent value="escala">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <div className="space-y-6">
                <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-3">
                  <h2 className="text-xl font-bold flex items-center gap-2 text-blue-600"><Monitor className="w-5 h-5" /> Escala</h2>
                  {canEdit && (
                    <Button onClick={() => { setEditingItem(null); setActiveTab('escala'); setIsModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 w-full xs:w-auto">
                      <Plus className="w-4 h-4 mr-2" /> Nova Escala
                    </Button>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {escalas.map((m: any) => (
                    <div key={m.id} className="card-church p-5 border-l-4 border-l-blue-500 flex flex-col justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600">
                          <User className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-base truncate">{m.nome}</h3>
                          <p className="text-sm text-muted-foreground truncate">{m.funcao}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-xs font-semibold text-muted-foreground bg-muted/50 px-2 py-1 rounded">{formatDate(m.data)}</span>
                        {canEdit && (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => { setActiveTab('escala'); setEditingItem(m); setIsModalOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => { if (confirm("Excluir?")) deleteEscalaMutation.mutate(m.id); }}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="afazeres">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <div className="space-y-6">
                <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-3">
                  <h2 className="text-xl font-bold flex items-center gap-2 text-orange-600"><CheckSquare className="w-5 h-5" /> Afazeres</h2>
                  {canEdit && (
                    <Button onClick={() => { setEditingItem(null); setActiveTab('afazeres'); setIsModalOpen(true); }} className="bg-orange-600 hover:bg-orange-700 w-full xs:w-auto">
                      <Plus className="w-4 h-4 mr-2" /> Nova Tarefa
                    </Button>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {afazeres.map((t: any) => (
                    <div key={t.id} className="card-church p-5 border-l-4 border-l-orange-500 flex flex-col justify-between group">
                      <div className="flex items-start gap-3">
                        <button 
                          disabled={!canEdit}
                          className={`mt-1 flex-shrink-0 ${t.concluido ? 'text-orange-500' : 'text-muted-foreground hover:text-orange-500'}`} onClick={() => afazeresMutation.mutate({ ...t, concluido: !t.concluido })}>
                          {t.concluido ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-bold text-base ${t.concluido ? 'line-through text-muted-foreground' : ''}`}>{t.tarefa}</h3>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                            <p className="text-sm text-muted-foreground flex items-center gap-1"><User className="w-3.5 h-3.5" /> {t.responsavel}</p>
                            {t.data && <p className="text-[10px] font-bold text-orange-600/70 bg-orange-100/50 px-2 py-0.5 rounded">{formatDate(t.data)}</p>}
                            {t.horario && <p className="text-[10px] font-bold text-slate-600/70 bg-slate-100/50 px-2 py-0.5 rounded">{t.horario}</p>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-end mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canEdit && (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-600 hover:bg-orange-50" onClick={() => { setActiveTab('afazeres'); setEditingItem(t); setIsModalOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => { if (confirm("Excluir?")) deleteAfazerMutation.mutate(t.id); }}><Trash2 className="w-4 h-4" /></Button>
                          </div>
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

      <PresenceReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        data={escalas}
        title="Equipe de Mídia / Marketing"
        type="Mídia"
      />

      <SlideProjectorModal
        isOpen={isProjectorOpen}
        onClose={() => setIsProjectorOpen(false)}
      />

      <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) setEditingItem(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingItem ? 'Editar' : 'Novo'} {activeTab === 'escala' ? 'Membro na Escala' : 'Afazer'}</DialogTitle></DialogHeader>
          <form key={editingItem?.id || 'new'} onSubmit={handleSave} className="space-y-4">
            {activeTab === 'escala' ? (
              <>
                <Label>Nome</Label><Input name="nome" defaultValue={editingItem?.nome} required />
                <Label>Função</Label><Input name="funcao" defaultValue={editingItem?.funcao} required />
                <Label>Data</Label><Input name="data" type="date" defaultValue={editingItem?.data ? editingItem.data.split('T')[0] : ''} required />
              </>
            ) : (
              <>
                <Label>Tarefa</Label><Input name="tarefa" defaultValue={editingItem?.tarefa} required />
                <Label>Responsável</Label><Input name="responsavel" defaultValue={editingItem?.responsavel} required />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data</Label><Input name="data" type="date" defaultValue={editingItem?.data ? editingItem.data.split('T')[0] : ''} />
                  </div>
                  <div className="space-y-2">
                    <Label>Horário</Label><Input name="horario" placeholder="Ex: 19:00" defaultValue={editingItem?.horario} />
                  </div>
                </div>
              </>
            )}
            <DialogFooter><Button type="submit">Salvar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
