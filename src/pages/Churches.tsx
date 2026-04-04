
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { churchesApi } from "@/services/api";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Loader2, Save, Trash2, Church, Globe, Image as ImageIcon } from "lucide-react";

export default function Churches() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChurch, setEditingChurch] = useState<any>(null);

  const { data: churches = [], isLoading } = useQuery({
    queryKey: ['churches'],
    queryFn: () => churchesApi.getAll(),
  });

  const churchMutation = useMutation({
    mutationFn: (data: any) => editingChurch ? churchesApi.update(editingChurch.id, data) : churchesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['churches'] });
      setIsModalOpen(false);
      setEditingChurch(null);
      toast({ title: editingChurch ? "Igreja atualizada" : "Nova igreja cadastrada com sucesso!" });
    },
    onError: (err: any) => toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" })
  });

  const deleteChurchMutation = useMutation({
    mutationFn: (id: number) => churchesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['churches'] });
      toast({ title: "Igreja removida" });
    }
  });

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-amber-600" /></div>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 min-h-[90vh]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader 
          title="Gestão de Igrejas" 
          subtitle="Cadastre e gerencie todas as igrejas instaladas no sistema multinível." 
        />
        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) setEditingChurch(null); }}>
          <DialogTrigger asChild>
            <Button className="h-12 bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-500/20 rounded-xl px-6 gap-2 text-white transition-all hover:scale-105 active:scale-95">
              <Plus className="w-5 h-5" /> Nova Igreja
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-3xl p-8 border-0 shadow-2xl backdrop-blur-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-[#212351] flex items-center gap-3">
                {editingChurch ? <><Church className="w-6 h-6 text-amber-500" /> Editar Igreja</> : <><Church className="w-6 h-6 text-amber-500" /> Cadastrar Igreja</>}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const data = Object.fromEntries(fd.entries());
              churchMutation.mutate(data);
            }} className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Nome da Igreja / Sede</Label>
                <div className="relative">
                  <Church className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                  <Input name="name" defaultValue={editingChurch?.name} placeholder="Nome completo da unidade" required className="pl-10 h-11 bg-gray-50 border-gray-100 rounded-xl focus:ring-amber-500" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Identificador (Slug / URL)</Label>
                <div className="relative">
                   <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                   <Input name="slug" defaultValue={editingChurch?.slug} placeholder="promessa-unidade-xyz" required className="pl-10 h-11 bg-gray-50 border-gray-100 rounded-xl focus:ring-amber-500" />
                </div>
                <p className="text-[10px] text-muted-foreground italic px-1">Apenas letras, números e hífens. Ex: sede-principal</p>
              </div>
              <div className="space-y-2">
                 <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Logotipo (URL)</Label>
                 <div className="relative">
                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <Input name="logo_url" defaultValue={editingChurch?.logo_url} placeholder="https://link-da-imagem.png" className="pl-10 h-11 bg-gray-50 border-gray-100 rounded-xl focus:ring-amber-500" />
                 </div>
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" className="w-full h-12 bg-amber-600 hover:bg-amber-700 font-bold rounded-xl shadow-lg shadow-amber-600/10 transition-all active:scale-95" disabled={churchMutation.isPending}>
                  {churchMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5 mr-2" /> Salvar Igreja</>}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence>
          {churches.map((c: any, i: number) => (
            <motion.div 
              key={c.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 p-6 group hover:shadow-2xl hover:shadow-amber-500/5 transition-all relative overflow-hidden flex flex-col items-center text-center"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-[100px] -z-0 pointer-events-none" />
              
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 flex items-center justify-center p-4 shadow-inner mb-6 relative z-10 transition-transform group-hover:scale-110">
                {c.logo_url ? <img src={c.logo_url} alt="Logo" className="w-full h-full object-contain" /> : <Church className="w-12 h-12 text-amber-600" />}
              </div>

              <div className="relative z-10 mb-6">
                <h3 className="font-bold text-[#212351] text-xl mb-1">{c.name}</h3>
                <p className="text-xs text-muted-foreground font-black uppercase tracking-widest">{c.slug}</p>
                <p className="text-[10px] text-muted-foreground mt-2 opacity-60">ID do Tenant: #{c.id}</p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-4 border-t border-gray-100 w-full relative z-10 mt-auto">
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-amber-600 hover:bg-amber-50" onClick={() => { setEditingChurch(c); setIsModalOpen(true); }}>
                  <Pencil className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-destructive hover:bg-destructive/10" onClick={() => { if(confirm("Excluir igreja? Isso removerá todos os dados dela!")) deleteChurchMutation.mutate(c.id); }}>
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
