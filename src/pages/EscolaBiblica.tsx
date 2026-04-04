import { useState, useEffect, useRef } from "react";
import { BookOpen, Video, MessageSquare, FileText, Plus, Pencil, Trash2, Youtube, Upload, PlayCircle, Maximize2, X, Send } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { escolaBiblicaConteudoApi, escolaBiblicaPerguntasApi, uploadFile } from "@/services/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const tipoIcons: Record<string, React.ElementType> = {
  video: Video,
  comunicado: MessageSquare,
  apresentacao: Video,
  documento: FileText
};
const tipoLabels: Record<string, string> = {
  video: "Vídeo (YouTube)",
  apresentacao: "Vídeo Gravado",
  comunicado: "Estudo (PDF/Office)",
  documento: "Documento"
};

function getYoutubeID(url: any) {
  if (!url || typeof url !== 'string') return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2] && match[2].length === 11) ? match[2] : null;
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return "Data não informada";
  try {
    const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const d = new Date(datePart + "T12:00:00");
    if (isNaN(d.getTime())) return "Data Inválida";
    return d.toLocaleDateString("pt-BR", { day: '2-digit', month: 'long', year: 'numeric' });
  } catch (e) {
    return "Data Inválida";
  }
};

const DocumentViewer = ({ url, title, isFullscreen = false }: { url: string; title: string, isFullscreen?: boolean }) => {
  const lowerUrl = url.toLowerCase();
  const isPDF = lowerUrl.endsWith('.pdf');
  const officeExtensions = ['.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx'];
  const isOffice = officeExtensions.some(ext => lowerUrl.endsWith(ext));

  if (isPDF) {
    return (
      <iframe
        src={isFullscreen ? url : `${url}#toolbar=0&navpanes=0&scrollbar=0`}
        className="w-full h-full border-0"
        title={title}
      />
    );
  }

  if (isOffice) {
    const isLocal = url.includes('localhost') || url.includes('127.0.0.1');
    if (isLocal) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-white p-4 text-center">
          <FileText className="w-12 h-12 mb-2 text-[#212351]" />
          <p className="text-sm font-bold">Visualização de Office indisponível localmente</p>
          <p className="text-[10px] text-zinc-400">Serviços como Word/PowerPoint exigem URL pública. Clique abaixo para abrir.</p>
        </div>
      );
    }
    return (
      <iframe
        src={`https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`}
        className="w-full h-full border-0"
        title={title}
      />
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#212351]/5 text-[#212351]/20 gap-3">
      <FileText className="w-16 h-16" />
      <span className="text-[10px] font-black uppercase tracking-widest">Estudo Anexado</span>
    </div>
  );
};

export default function EscolaBiblica() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const perguntasFileInputRef = useRef<HTMLInputElement>(null);
  const { canWrite } = useAuth();
  const canEdit = canWrite('professor');

  const [editingItem, setEditingItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTipo, setSelectedTipo] = useState("comunicado");
  const [videoUrl, setVideoUrl] = useState("");
  const [localVideoFile, setLocalVideoFile] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localPerguntasFile, setLocalPerguntasFile] = useState<string | null>(null);
  const [selectedPerguntasFile, setSelectedPerguntasFile] = useState<File | null>(null);
  const [fullscreenDoc, setFullscreenDoc] = useState<any>(null);
  const [novaPergunta, setNovaPergunta] = useState("");
  const [nomeAutor, setNomeAutor] = useState("");

  const { data: contents = [] } = useQuery({ queryKey: ['escola_biblica_conteudo'], queryFn: () => escolaBiblicaConteudoApi.getAll() });
  const { data: perguntas = [] } = useQuery({ queryKey: ['escola_biblica_perguntas'], queryFn: () => escolaBiblicaPerguntasApi.getAll() });

  const mutation = useMutation({
    mutationFn: (data: any) => editingItem?.id ? escolaBiblicaConteudoApi.update(editingItem.id, data) : escolaBiblicaConteudoApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escola_biblica_conteudo'] });
      setIsModalOpen(false);
      setEditingItem(null);
      setVideoUrl("");
      setLocalVideoFile(null);
      setSelectedFile(null);
      toast.success("Conteúdo salvo com sucesso!");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => escolaBiblicaConteudoApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['escola_biblica_conteudo'] })
  });

  const perguntaMutation = useMutation({
    mutationFn: (data: { pergunta: string; autor: string }) => escolaBiblicaPerguntasApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escola_biblica_perguntas'] });
      setNovaPergunta("");
      setNomeAutor("");
      toast.success("Sua pergunta foi enviada ao professor!");
    }
  });

  const handlePerguntaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaPergunta.trim()) return;
    perguntaMutation.mutate({ pergunta: novaPergunta, autor: nomeAutor.trim() || 'Anônimo' });
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setSelectedTipo(item.tipo);
    setVideoUrl(item.url_video || item.url || "");
    setLocalVideoFile(item.url_arquivo || null);
    setLocalPerguntasFile(item.url_arquivo_perguntas || null);
    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setEditingItem(null);
    setSelectedTipo("comunicado");
    setVideoUrl("");
    setLocalVideoFile(null);
    setSelectedFile(null);
    setLocalPerguntasFile(null);
    setSelectedPerguntasFile(null);
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isVideo = file.type.startsWith('video/');
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        toast.error(`${isVideo ? "Vídeo" : "Arquivo"} muito grande. Limite de 50MB.`);
        return;
      }
      const url = URL.createObjectURL(file);
      setLocalVideoFile(url);
      setSelectedFile(file);
      setVideoUrl(""); 
      if (isVideo) setSelectedTipo("apresentacao");
      else setSelectedTipo("comunicado");
    }
  };

  const handlePerguntasFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error("O PDF é muito grande. Limite de 10MB.");
        return;
      }
      setLocalPerguntasFile(URL.createObjectURL(file));
      setSelectedPerguntasFile(file);
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    let finalFileUrl = localVideoFile;
    if (selectedFile) {
      try {
        toast.info("Fazendo upload do arquivo do estudo...");
        const uploadResult = await uploadFile(selectedFile);
        finalFileUrl = uploadResult.url;
      } catch (error) {
        toast.error("Erro ao fazer upload do arquivo do estudo.");
        return;
      }
    }

    let finalPerguntasFileUrl = localPerguntasFile;
    if (selectedPerguntasFile) {
      try {
        toast.info("Fazendo upload do PDF de perguntas...");
        const uploadResult = await uploadFile(selectedPerguntasFile);
        finalPerguntasFileUrl = uploadResult.url;
      } catch (error) {
        toast.error("Erro ao fazer upload do PDF de perguntas.");
        return;
      }
    }

    mutation.mutate({
      titulo: formData.get("titulo"),
      tipo: selectedTipo,
      descricao: formData.get("descricao"),
      url_video: videoUrl,
      url_arquivo: finalFileUrl,
      pergunta1: formData.get("pergunta1"),
      pergunta2: formData.get("pergunta2"),
      pergunta3: formData.get("pergunta3"),
      pergunta4: formData.get("pergunta4"),
      resposta1: formData.get("resposta1"),
      resposta2: formData.get("resposta2"),
      resposta3: formData.get("resposta3"),
      resposta4: formData.get("resposta4"),
      url_arquivo_perguntas: finalPerguntasFileUrl,
      data: formData.get("data")
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-12">
      {/* Pergunta Section */}
      <section className="bg-white rounded-2xl border-2 border-[#212351]/10 overflow-hidden shadow-sm">
        <div className="bg-[#212351] p-4 text-white">
          <h2 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2">
             <MessageSquare className="w-5 h-5" /> Faça uma pergunta para o Professor
          </h2>
        </div>
        <form onSubmit={handlePerguntaSubmit} className="p-6 flex flex-col md:flex-row gap-4">
          <Input 
            value={nomeAutor}
            onChange={(e) => setNomeAutor(e.target.value)}
            placeholder="Seu nome (deixe em branco para Anônimo)"
            className="md:w-1/4 border-[#212351]/20 h-12"
          />
          <Input 
            value={novaPergunta}
            onChange={(e) => setNovaPergunta(e.target.value)}
            placeholder="Qual sua dúvida sobre a lição de hoje?"
            className="flex-1 border-[#212351]/20 h-12"
          />
          <Button type="submit" className="bg-[#212351] hover:bg-[#2b2e6b] px-8 h-12 font-bold gap-2 whitespace-nowrap" disabled={perguntaMutation.isPending}>
            <Send className="w-4 h-4" /> ENVIAR
          </Button>
        </form>
      </section>

      <div className="flex justify-between items-center mb-6">
        <PageHeader title="Escola Bíblica" subtitle="Estudos semanais para o crescimento espiritual" />
        {canEdit && (
          <Dialog open={isModalOpen} onOpenChange={(open) => {
            setIsModalOpen(open);
            if (!open) { setEditingItem(null); setLocalVideoFile(null); setSelectedFile(null); setLocalPerguntasFile(null); setSelectedPerguntasFile(null); }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-[#212351] hover:bg-[#2b2e6b]" onClick={openNewModal}>
                <Plus className="w-4 h-4" /> Novo Estudo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] border-2 border-[#212351] p-0 overflow-hidden flex flex-col max-h-[90vh]">
              <DialogHeader className="p-6 pb-2">
                <DialogTitle className="text-xl font-bold text-[#212351] uppercase tracking-tighter">
                  {editingItem ? 'Editar' : 'Novo'} Estudo Bíblico
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-2">
                <form id="eb-form" onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Título</Label>
                      <Input name="titulo" defaultValue={editingItem?.titulo} required className="border-[#212351]/20" />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo de Conteúdo</Label>
                      <Select value={selectedTipo} onValueChange={setSelectedTipo}>
                        <SelectTrigger className="border-[#212351]/20"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="video">Vídeo (YouTube)</SelectItem>
                          <SelectItem value="apresentacao">Vídeo Gravado</SelectItem>
                          <SelectItem value="comunicado">Estudo (PDF, Word, etc.)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-4 border-2 border-dashed border-[#212351]/10 rounded-xl p-4 bg-[#212351]/5">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Youtube className="w-4 h-4 text-[#FF0000]" /> Link do YouTube</Label>
                      <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." className="border-[#212351]/20" disabled={selectedTipo === 'comunicado'} />
                    </div>
                    <div className="relative flex items-center gap-4">
                      <div className="flex-1 h-px bg-[#212351]/10" /><span className="text-[10px] font-black text-[#212351]/30 uppercase tracking-widest">OU</span><div className="flex-1 h-px bg-[#212351]/10" />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Upload className="w-4 h-4 text-[#212351]" /> {selectedTipo === 'comunicado' ? "Subir Estudo (PDF/Office)" : "Subir Vídeo"}</Label>
                      <Input type="file" accept={selectedTipo === 'comunicado' ? ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" : "video/*"} onChange={handleFileChange} className="hidden" ref={fileInputRef} />
                      <Button type="button" variant="outline" className="w-full border-2 border-[#212351]/20 border-dashed hover:bg-[#212351]/5 h-20 flex flex-col gap-1" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="w-6 h-6 text-[#212351]/40" />
                        <span className="text-xs text-[#212351]/60 font-bold">{localVideoFile ? "Trocar Arquivo" : "Selecionar Arquivo"}</span>
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Resumo / Descrição</Label>
                    <textarea name="descricao" defaultValue={editingItem?.descricao} className="w-full min-h-[100px] p-3 rounded-md border border-[#212351]/20 bg-background text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label>Data</Label>
                    <Input name="data" type="date" defaultValue={editingItem?.data ? editingItem.data.split('T')[0] : new Date().toISOString().split('T')[0]} required className="border-[#212351]/20" />
                  </div>

                  <div className="pt-4 border-t border-[#212351]/10 space-y-3">
                    <Label className="text-[#212351] font-black uppercase tracking-widest text-[10px]">Perguntas de Estudo (Fixas no Mural)</Label>
                    <div className="grid grid-cols-1 gap-3">
                      {[1, 2, 3, 4].map(num => (
                        <div key={num} className="space-y-2 p-2 border rounded-md bg-white">
                          <Input name={`pergunta${num}`} placeholder={`Pergunta ${num}`} defaultValue={editingItem?.[`pergunta${num}`]} className="border-[#212351]/20" />
                          <Input name={`resposta${num}`} placeholder={`Resposta ${num} (Opcional)`} defaultValue={editingItem?.[`resposta${num}`]} className="border-[#212351]/10 text-xs italic" />
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-[#212351]/10 border-dashed space-y-2">
                       <Label className="flex items-center gap-2"><Upload className="w-4 h-4 text-[#212351]" /> Anexar PDF com as Perguntas e Respostas</Label>
                       <Input type="file" accept=".pdf" onChange={handlePerguntasFileChange} className="hidden" ref={perguntasFileInputRef} />
                       <Button type="button" variant="outline" className="w-full border-2 border-[#212351]/20 border-dashed hover:bg-[#212351]/5 h-16 flex flex-col gap-1" onClick={() => perguntasFileInputRef.current?.click()}>
                         <Upload className="w-5 h-5 text-[#212351]/40" />
                         <span className="text-xs text-[#212351]/60 font-bold">{localPerguntasFile ? "Substituir PDF Anexado" : "Anexar Arquivo PDF"}</span>
                       </Button>
                    </div>
                  </div>
                </form>
              </div>
              <div className="p-6 border-t bg-muted/20">
                <Button form="eb-form" type="submit" disabled={mutation.isPending} className="w-full bg-[#212351] hover:bg-[#2b2e6b] font-bold py-6">
                  {mutation.isPending ? "Salvando..." : "PUBLICAR ESTUDO"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Contents Grid - Visível para todos */}
      <div className="grid gap-8 sm:grid-cols-2">
        {contents.map((c: any, i: number) => {
          const Icon = tipoIcons[c.tipo] || BookOpen;
          const videoId = getYoutubeID(c.url_video || c.url);
          const hasLocalVideo = c.url_arquivo;
          return (
            <motion.div key={c.id || i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }} className="card-church group border-2 border-[#212351]/10 bg-white hover:border-[#212351]/30 transition-all shadow-sm overflow-hidden flex flex-col">
              <div className="aspect-video bg-black relative overflow-hidden">
                {videoId ? (
                  <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${videoId}?rel=0`} title={c.titulo} className="absolute inset-0 w-full h-full" frameBorder="0" allowFullScreen></iframe>
                ) : c.tipo === 'apresentacao' && hasLocalVideo ? (
                  <video src={c.url_arquivo} controls className="w-full h-full bg-black" />
                ) : c.tipo === 'comunicado' && hasLocalVideo ? (
                  <DocumentViewer url={c.url_arquivo} title={c.titulo} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#212351]/5"><Icon className="w-12 h-12 text-[#212351]/20" /></div>
                )}
                {c.url_arquivo && c.tipo === 'comunicado' && (
                  <Button variant="ghost" size="icon" className="absolute top-2 right-2 bg-black/50 text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity rounded-full h-8 w-8" onClick={() => setFullscreenDoc(c)}>
                    <Maximize2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-[#212351] text-white text-[10px] font-black uppercase px-2 py-1 rounded tracking-widest">{tipoLabels[c.tipo] || "Estudo"}</span>
                  {canEdit && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-[#212351]" onClick={() => openEditModal(c)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { if (confirm("Excluir este estudo?")) deleteMutation.mutate(c.id); }}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-bold text-[#212351] mb-2 uppercase tracking-tighter line-clamp-2">{c.titulo}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-4">{c.descricao}</p>
                {c.tipo === 'comunicado' && c.url_arquivo && (
                  <Button asChild className="mt-2 w-full bg-[#212351] hover:bg-[#2b2e6b]">
                    <a href={c.url_arquivo} target="_blank" rel="noopener noreferrer"><Upload className="w-4 h-4 mr-2" /> ABRIR ESTUDO</a>
                  </Button>
                )}
                <div className="flex items-center justify-between pt-4 border-t border-[#212351]/10 mt-auto">
                   <span className="text-[10px] font-black uppercase tracking-widest text-[#212351]/60">Escola Bíblica</span>
                   <p className="text-[10px] font-bold text-muted-foreground uppercase">{formatDate(c.data)}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Pergunta Display Section */}
      <section className="mt-12 space-y-4">
        <h2 className="text-2xl font-black text-[#212351] uppercase tracking-tighter border-b-4 border-[#212351] inline-block">Mural de Perguntas</h2>
        <div className="grid gap-4">
          {/* User submitted questions (Dynamic) - Mural de Dúvidas (Apenas para Professores/Admin) */}
          {canEdit && perguntas.map((p: any) => (
            <motion.div key={p.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="p-4 bg-white rounded-xl border-2 border-[#212351]/10 shadow-sm flex flex-col gap-3 relative group">
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-full bg-[#212351]/10 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5 text-[#212351]" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-[#212351] mb-1">{p.pergunta}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[9px] bg-[#212351]/10 px-1.5 py-0.5 rounded text-[#212351] font-bold">PERGUNTA AO PROFESSOR</span>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">{p.autor || 'Anônimo'} • {new Date(p.data).toLocaleString('pt-BR')}</span>
                  </div>
                </div>
                {canEdit && (
                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 text-destructive h-8 w-8" onClick={() => escolaBiblicaPerguntasApi.delete(p.id).then(() => queryClient.invalidateQueries({queryKey: ['escola_biblica_perguntas']}))}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              
              {/* Resposta do Professor */}
              {p.resposta ? (
                <div className="ml-14 p-3 bg-[#e8f5e9] border border-[#a5d6a7] rounded-lg">
                  <p className="text-xs font-black text-[#2e7d32] uppercase mb-1 flex items-center gap-1"><BookOpen className="w-3 h-3" /> Resposta do Professor:</p>
                  <p className="text-sm text-[#1b5e20]">{p.resposta}</p>
                </div>
              ) : canEdit && (
                <div className="ml-14 flex gap-2">
                   <Input 
                     placeholder="Escreva uma resposta..." 
                     className="h-8 text-sm" 
                     onKeyDown={(e) => {
                       if (e.key === 'Enter') {
                         const val = (e.target as HTMLInputElement).value;
                         if (val) {
                           escolaBiblicaPerguntasApi.update(p.id, { ...p, resposta: val })
                             .then(() => {
                               queryClient.invalidateQueries({queryKey: ['escola_biblica_perguntas']});
                               toast.success("Resposta enviada!");
                             });
                         }
                       }
                     }}
                   />
                </div>
              )}
            </motion.div>
          ))}

          {/* 04 Perguntas da Lição Atual (Enfatizadas) - Visível para Todos, Editável por Professores */}
          <div className="pt-8 space-y-4">
            <h3 className="text-xl font-black text-[#212351] uppercase tracking-tighter flex items-center gap-2">
              <BookOpen className="w-6 h-6" /> Perguntas da Lição
              {canEdit && contents[0] && (
                <Button variant="outline" size="sm" className="ml-auto text-[10px] font-black border-2 border-[#212351]/10 h-7" onClick={() => openEditModal(contents[0])}>
                  <Pencil className="w-3 h-3 mr-1" /> EDITAR PERGUNTAS
                </Button>
              )}
            </h3>

            <div className="grid gap-4">
              {contents.length > 0 && [1, 2, 3, 4].map(num => {
                const qKey = `pergunta${num}`;
                const rKey = `resposta${num}`;
                const questionText = contents[0][qKey];
                const answerText = contents[0][rKey];
                if (!questionText) return null;

                return (
                  <motion.div 
                    key={`study-q-emphasized-${num}`} 
                    initial={{ opacity: 0, x: -20 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    className="p-5 bg-white rounded-xl border-2 border-[#212351]/10 shadow-sm flex flex-col gap-3 relative border-l-8 border-l-[#212351] group"
                  >
                    <div className="flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-full bg-[#212351] flex items-center justify-center shrink-0 shadow-lg">
                        <BookOpen className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-lg font-bold text-[#212351] leading-tight mb-2">{questionText}</p>
                        <span className="text-[10px] bg-[#212351] px-2 py-0.5 rounded text-white font-black tracking-widest uppercase">PERGUNTA DE ESTUDO</span>
                      </div>
                      {canEdit && (
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-8 w-8 text-[#212351]/40" onClick={() => openEditModal(contents[0])}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    {answerText && (
                      <div className="ml-14 p-3 bg-[#f8fafc] border border-[#212351]/10 rounded-lg italic text-[#212351]/70 shadow-inner">
                        <p className="text-[9px] font-black text-[#212351] uppercase mb-1 non-italic">Sugestão de Resposta:</p>
                        <p className="text-sm font-medium">{answerText}</p>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Oculto: Removido os blocos duplicados de perguntas de estudo abaixo */}

          {contents.length > 0 && contents[0].url_arquivo_perguntas && (
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-4 p-4 rounded-xl bg-[#212351] text-white shadow-sm flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <FileText className="w-8 h-8 opacity-80" />
                 <div>
                   <h4 className="font-bold text-lg uppercase tracking-tight">Material de Apoio do Estudo</h4>
                   <p className="text-white/60 text-xs">Baixe o PDF com as perguntas e conteúdo complementar</p>
                 </div>
               </div>
               <Button asChild className="bg-white text-[#212351] hover:bg-white/90 font-bold gap-2">
                  <a href={contents[0].url_arquivo_perguntas} target="_blank" rel="noopener noreferrer">
                    <Upload className="w-4 h-4" /> ABRIR PDF
                  </a>
               </Button>
             </motion.div>
          )}

          {perguntas.length === 0 && (!contents[0]?.pergunta1 && !contents[0]?.pergunta2 && !contents[0]?.pergunta3 && !contents[0]?.pergunta4 && !contents[0]?.url_arquivo_perguntas) && (
            <div className="p-12 text-center bg-[#212351]/5 rounded-xl border-2 border-dashed border-[#212351]/10">
              <p className="text-muted-foreground font-medium italic">Nenhuma pergunta para mostrar ainda.</p>
            </div>
          )}
        </div>
      </section>

      {/* Fullscreen Dialog */}
      <Dialog open={!!fullscreenDoc} onOpenChange={(open) => !open && setFullscreenDoc(null)}>
        <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0 border-none bg-black/90 overflow-hidden flex flex-col">
          <div className="flex justify-between items-center p-4 bg-[#212351] text-white">
            <h3 className="font-bold truncate pr-4">{fullscreenDoc?.titulo}</h3>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-8 w-8" onClick={() => setFullscreenDoc(null)}><X className="w-5 h-5" /></Button>
          </div>
          <div className="flex-1 w-full relative">
            {fullscreenDoc?.url_arquivo && <DocumentViewer url={fullscreenDoc.url_arquivo} title={fullscreenDoc.titulo} isFullscreen={true} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
