import { useState } from "react";
import { Users, Mic, Music, HandHelping, BookOpen, Plus, Pencil, Trash2, Handshake, Search, Calendar } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { escalasCompletas as mockEscalas } from "@/data/mockData";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { escalasApi } from "@/services/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { louvorEscalaApi, midiaEscalaApi, agendaApi } from "@/services/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const diasSemana: Record<number, string> = {
  0: "Domingo", 1: "Segunda", 2: "Terça", 3: "Quarta",
  4: "Quinta", 5: "Sexta", 6: "Sábado",
};

export default function Escalas() {
  const queryClient = useQueryClient();
  const { role, canWrite } = useAuth();
  const isAdmin = canWrite("escalas") || canWrite("secretaria") || canWrite("midia");
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [formCulto, setFormCulto] = useState("");
  const [formDataDate, setFormDataDate] = useState("");

  const { data: agendaData = [] } = useQuery({
    queryKey: ['agenda'],
    queryFn: () => agendaApi.getAll()
  });

  const { data: escalasData, isError: isErrorEscalas } = useQuery({
    queryKey: ['escalas'],
    queryFn: () => escalasApi.getAll(),
  });

  const { data: louvorData = [] } = useQuery({
    queryKey: ['escala_louvor'],
    queryFn: () => louvorEscalaApi.getAll()
  });

  const { data: midiaData = [] } = useQuery({
    queryKey: ['escala_midia'],
    queryFn: () => midiaEscalaApi.getAll()
  });

  const mutation = useMutation({
    mutationFn: (data: any) => editingItem?.id ? escalasApi.update(editingItem.id, data) : escalasApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalas'] });
      toast.success("Escala salva!");
      setIsModalOpen(false);
      setEditingItem(null);
    },
    onError: (error: any) => {
      toast.error("Erro ao salvar: " + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => escalasApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalas'] });
      toast.success("Escala removida!");
    }
  });

  const isVisitor = role === 'visitante' || role === 'guest';

  const allDates = Array.from(new Set([
    ...(escalasData || []).map((e: any) => (e.data || '').split('T')[0]),
    ...(louvorData || []).map((l: any) => (l.data || '').split('T')[0]),
    ...(midiaData || []).map((m: any) => (m.data || '').split('T')[0])
  ].filter(Boolean))).filter(dateStr => {
    const d = new Date(dateStr + "T12:00:00");
    
    if (searchTerm.trim() !== "") {
      const searchLower = searchTerm.toLowerCase();
      const dia = d.getDate().toString();
      const mes = (d.getMonth() + 1).toString();
      const mesNome = diasSemana[d.getDay()].toLowerCase();
      const dataFormatada = d.toLocaleDateString("pt-BR").toLowerCase();
      return dia.includes(searchLower) || mes.includes(searchLower) || dataFormatada.includes(searchLower) || mesNome.includes(searchLower);
    }

    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    monday.setHours(0,0,0,0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23,59,59,999);
    return d >= monday && d <= sunday;
  }).sort();

  const escalas = allDates.map(dateStr => {
    const existing = (escalasData || []).find((e: any) => (e.data || '').split('T')[0] === dateStr);
    if (existing) return existing;
    return {
      id: `draft-${dateStr}`,
      culto: "Novo Culto (Rascunho)",
      data: dateStr,
      isDraft: true
    };
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return { label: "Data não informada", dateObj: new Date() };
    try {
      const datePart = typeof dateStr === 'string' && dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
      const d = new Date(datePart + "T12:00:00");
      if (isNaN(d.getTime())) return { label: "Data Inválida", dateObj: new Date() };
      return {
        label: `${diasSemana[d.getDay()]}, ${d.toLocaleDateString("pt-BR")}`,
        dateObj: d
      };
    } catch (e) {
      return { label: "Data Inválida", dateObj: new Date() };
    }
  };

  const getAutomatedLouvor = (date: string) => {
    if (!date) return "";
    const datePart = date.split('T')[0];
    const filtered = louvorData.filter((m: any) => m.data && m.data.split('T')[0] === datePart);
    return filtered.map((m: any) => m.nome).join(', ');
  };

  const getAutomatedMidia = (date: string) => {
    if (!date) return "";
    const datePart = date.split('T')[0];
    const filtered = midiaData.filter((m: any) => m.data && m.data.split('T')[0] === datePart);
    return filtered.map((m: any) => m.nome).join(', ');
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.currentTarget);
      const date = formData.get("data") as string;
      
      if (!date) {
        toast.error("Data é obrigatória");
        return;
      }

      // Check if user want to overwrite or keep automated
      const louvorRaw = formData.get("louvor") as string;
      const midiaRaw = formData.get("midia") as string;
      
      const louvor = (louvorRaw && louvorRaw.trim() !== "") ? louvorRaw : getAutomatedLouvor(date);
      const midia = (midiaRaw && midiaRaw.trim() !== "") ? midiaRaw : getAutomatedMidia(date);

      const data = {
        culto: formData.get("culto"),
        data: date,
        recepcao: formData.get("recepcao"),
        louvor: louvor,
        midia: midia,
        diaconos: formData.get("diaconos"),
        oracao: formData.get("oracao"),
        pregador: formData.get("pregador"),
        tema: formData.get("tema"),
      };

      console.log("Saving escala:", data);
      mutation.mutate(data);
    } catch (err: any) {
      console.error("Error in handleSave:", err);
      toast.error("Erro interno ao preparar dados: " + err.message);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-12 pb-12 overflow-hidden">
      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <PageHeader title="Escalas dos Cultos" subtitle="Programação completa dos participantes" />
        <div className="relative w-full lg:w-80">
          <Input 
            placeholder="Pesquisar dia..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 bg-white/50 backdrop-blur-sm"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        </div>
      </div>

      {/* SEÇÃO PRINCIPAL DE ESCALAS */}
      <section className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-indigo-600/10 pb-4 gap-4">
          <h2 className="text-2xl font-black flex items-center gap-3 text-indigo-600 uppercase tracking-tight">
            <Users className="w-6 h-6" /> Escalas
          </h2>
          {isAdmin && (
            <Dialog open={isModalOpen} onOpenChange={(open) => { 
                setIsModalOpen(open); 
                if (!open) { setEditingItem(null); setFormCulto(""); setFormDataDate(""); } 
            }}>
              <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700 h-11 px-6 rounded-xl font-bold shadow-lg shadow-indigo-600/20 w-full sm:w-auto">
                  <Plus className="w-5 h-5 mr-2" /> NOVA ESCALA
                </Button>
              </DialogTrigger>
              <DialogContent 
                onInteractOutside={(e) => {
                  const target = e.target as HTMLElement;
                  if (target?.closest('[role="listbox"]') || target?.closest('[data-radix-select-viewport]')) {
                    e.preventDefault();
                  }
                }}
                className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6"
              >
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-indigo-950">Gerenciar Escala</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
                    <div className="md:col-span-2 space-y-2 mb-2 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                      <Label className="font-bold flex items-center gap-2 text-indigo-700">
                        <Calendar className="w-4 h-4" /> 
                        Preencher com Evento da Agenda
                      </Label>
                      <Select onValueChange={(val) => {
                        const item = agendaData.find((a: any) => a.id.toString() === val);
                        if (item) {
                          setFormCulto(item.titulo);
                          setFormDataDate(item.data ? item.data.split('T')[0] : '');
                        }
                      }}>
                        <SelectTrigger className="bg-white border-indigo-200"><SelectValue placeholder="Selecione um evento da agenda (opcional)..." /></SelectTrigger>
                        <SelectContent className="max-h-60">
                          {agendaData.map((item: any) => (
                            <SelectItem key={item.id} value={item.id.toString()}>
                              {formatDate(item.data).label} - {item.titulo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                       <Label className="font-bold">Nome do Culto</Label>
                       <Input name="culto" value={formCulto} onChange={e => setFormCulto(e.target.value)} required className="h-11 border-indigo-100" />
                    </div>
                    <div className="space-y-2">
                       <Label className="font-bold">Data</Label>
                       <Input name="data" type="date" value={formDataDate} onChange={e => setFormDataDate(e.target.value)} required className="h-11 border-indigo-100" />
                    </div>
                    <div className="space-y-2"><Label className="font-bold">Recepção</Label><Input name="recepcao" defaultValue={editingItem?.recepcao} className="h-11" /></div>
                    <div className="space-y-2"><Label className="font-bold">Louvor</Label><Input name="louvor" defaultValue={editingItem?.louvor} placeholder="Auto" className="h-11" /></div>
                    <div className="space-y-2"><Label className="font-bold">Mídia</Label><Input name="midia" defaultValue={editingItem?.midia} placeholder="Auto" className="h-11" /></div>
                    <div className="space-y-2"><Label className="font-bold">Diáconos</Label><Input name="diaconos" defaultValue={editingItem?.diaconos} className="h-11" /></div>
                    <div className="space-y-2"><Label className="font-bold">Oração</Label><Input name="oracao" defaultValue={editingItem?.oracao} className="h-11" /></div>
                    <div className="space-y-2"><Label className="font-bold">Pregador</Label><Input name="pregador" defaultValue={editingItem?.pregador} className="h-11" /></div>
                    <div className="space-y-2 md:col-span-2"><Label className="font-bold">Tema</Label><Input name="tema" defaultValue={editingItem?.tema} className="h-11" /></div>
                    <DialogFooter className="md:col-span-2 pt-4">
                      <Button type="submit" disabled={mutation.isPending} className="w-full bg-indigo-600 h-12 text-lg font-bold">
                        {mutation.isPending ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}
                      </Button>
                    </DialogFooter>
                  </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {escalas.map((escala: any, index: number) => (
            <motion.div
              key={escala.id || index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="card-church overflow-hidden group rounded-3xl border-l-[12px] border-l-indigo-600 bg-white/60 backdrop-blur-md shadow-xl hover:shadow-2xl transition-all"
            >
              {/* CARD HEADER */}
              <div className="p-8 border-b border-indigo-100/50 bg-gradient-to-r from-indigo-50/30 to-transparent">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-2xl sm:text-3xl font-black text-indigo-950 uppercase tracking-tighter leading-tight break-words">
                        {escala.culto}
                      </h3>
                      {escala.isDraft && (
                        <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-200">
                          Rascunho
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-indigo-600/60 font-bold uppercase tracking-widest text-sm">
                      <Calendar className="w-4 h-4" />
                      {formatDate(escala.data).label}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="outline" size="icon" className="h-10 w-10 text-indigo-600 border-indigo-100 hover:bg-indigo-50" onClick={() => { 
                        const cleanItem = { ...escala };
                        if (escala.isDraft) delete cleanItem.id;
                        setEditingItem(cleanItem); 
                        setFormCulto(cleanItem.culto || "");
                        setFormDataDate(cleanItem.data ? (typeof cleanItem.data === 'string' ? cleanItem.data.split('T')[0] : '') : '');
                        setIsModalOpen(true); 
                      }}>
                        <Pencil className="w-5 h-5" />
                      </Button>
                      {!escala.isDraft && (
                        <Button variant="outline" size="icon" className="h-10 w-10 text-destructive border-red-50 hover:bg-destructive/10" onClick={() => { if (confirm("Excluir?")) deleteMutation.mutate(escala.id); }}>
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                {escala.tema && (
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-xs font-black text-white bg-indigo-600 px-3 py-1 rounded-lg uppercase tracking-widest shadow-lg shadow-indigo-600/30">
                      Tema: {escala.tema}
                    </span>
                  </div>
                )}
              </div>

              {/* CARD CONTENT (ROLES) */}
              <div className="p-8 grid gap-4 sm:grid-cols-2">
                <RoleCard icon={Handshake} label="Recepção" color="border-blue-500" nomes={typeof escala.recepcao === 'string' ? escala.recepcao.split(',').map((s: string) => s.trim()) : (Array.isArray(escala.recepcao) ? escala.recepcao : [])} />
                <RoleCard icon={Music} label="Louvor" color="border-purple-500" nomes={typeof (escala.louvor || getAutomatedLouvor(escala.data)) === 'string' ? (escala.louvor || getAutomatedLouvor(escala.data)).split(',').map((s: string) => s.trim()) : []} />
                <RoleCard icon={Mic} label="Mídia" color="border-cyan-500" nomes={typeof (escala.midia || getAutomatedMidia(escala.data)) === 'string' ? (escala.midia || getAutomatedMidia(escala.data)).split(',').map((s: string) => s.trim()) : []} />
                <RoleCard icon={Users} label="Diáconos" color="border-slate-500" nomes={typeof escala.diaconos === 'string' ? escala.diaconos.split(',').map((s: string) => s.trim()) : (Array.isArray(escala.diaconos) ? escala.diaconos : [])} />
                <RoleCard icon={HandHelping} label="Oração" color="border-emerald-500" nomes={[escala.oracao]} />
                <RoleCard icon={BookOpen} label="Pregador" color="border-rose-500" nomes={[escala.pregador]} />
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}

function RoleCard({ icon: Icon, label, nomes, color }: { icon: React.ElementType; label: string; nomes: string[]; color: string }) {
  const filteredNomes = nomes.filter(n => n && n !== 'undefined' && n !== 'null' && n.trim() !== '');
  return (
    <div className={`p-4 rounded-2xl bg-white/40 border-l-4 ${color} shadow-sm group/role hover:bg-white transition-all`}>
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-slate-100 text-slate-500 group-hover/role:bg-indigo-600 group-hover/role:text-white transition-all">
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      </div>
      <div className="space-y-1">
        {filteredNomes.length > 0 ? filteredNomes.map((nome, i) => (
          <p key={i} className="text-sm font-bold text-indigo-950 uppercase leading-none">{nome}</p>
        )) : <p className="text-xs text-slate-300 italic">Não definido</p>}
      </div>
    </div>
  );
}

