import { useState, useEffect, useRef } from "react";
import { BookOpen, Video, MessageSquare, FileText, Plus, Pencil, Trash2, Youtube, Upload, PlayCircle, Maximize2, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { conteudoPastor as mockConteudo } from "@/data/mockData";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pastorApi, uploadFile } from "@/services/api";
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
  video_drive: "Vídeo (Google Drive)",
  apresentacao: "Vídeo Gravado",
  comunicado: "Comunicado (PDF/Office)",
  documento: "Documento"
};

function getYoutubeID(url: any) {
  if (!url || typeof url !== 'string') return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2] && match[2].length === 11) ? match[2] : null;
}

function getGoogleDriveEmbedUrl(url: any) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/file/d/${match[1]}/preview`;
  }
  return null;
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return "Data não informada";
  try {
    const datePart = dateStr.split('T')[0];
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
      <span className="text-[10px] font-black uppercase tracking-widest">Documento Anexado</span>
    </div>
  );
};

export default function PastorCorner() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { canWrite } = useAuth();
  const canEdit = canWrite('pastor');

  const [editingItem, setEditingItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTipo, setSelectedTipo] = useState("comunicado");
  const [videoUrl, setVideoUrl] = useState("");
  const [localVideoFile, setLocalVideoFile] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fullscreenDoc, setFullscreenDoc] = useState<any>(null);

  const { data: contentData, isError: isErrorPastor } = useQuery({ queryKey: ['pastor_corner'], queryFn: () => pastorApi.getAll() });

  const mutation = useMutation({
    mutationFn: (data: any) => editingItem?.id ? pastorApi.update(editingItem.id, data) : pastorApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pastor_corner'] });
      setIsModalOpen(false);
      setEditingItem(null);
      setVideoUrl("");
      setLocalVideoFile(null);
      setSelectedFile(null);
      toast.success("Conteúdo salvo com sucesso!");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => pastorApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pastor_corner'] })
  });

  const contents = (isErrorPastor || !contentData) ? mockConteudo : contentData;

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setSelectedTipo(item.tipo);
    setVideoUrl(item.url_video || item.url || "");
    setLocalVideoFile(item.url_arquivo || null);
    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setEditingItem(null);
    setSelectedTipo("comunicado");
    setVideoUrl("");
    setLocalVideoFile(null);
    setSelectedFile(null);
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
      // For local preview
      const url = URL.createObjectURL(file);
      setLocalVideoFile(url);
      setSelectedFile(file);
      setVideoUrl(""); // Clear youtube link if uploading file

      // Auto-set type based on file
      if (isVideo) {
        setSelectedTipo("apresentacao");
      } else {
        setSelectedTipo("comunicado");
      }
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    let finalFileUrl = localVideoFile;

    // If there is a new file selected, upload it first
    if (selectedFile) {
      try {
        toast.info("Fazendo upload do arquivo...");
        const uploadResult = await uploadFile(selectedFile);
        finalFileUrl = uploadResult.url;
      } catch (error) {
        toast.error("Erro ao fazer upload do arquivo.");
        return;
      }
    }

    mutation.mutate({
      titulo: formData.get("titulo"),
      tipo: selectedTipo,
      descricao: formData.get("descricao"),
      url_video: videoUrl,
      url_arquivo: finalFileUrl, // Use the uploaded URL or existing one
      data: formData.get("data")
    });
  };

  useEffect(() => {
    if (getYoutubeID(videoUrl)) {
      setSelectedTipo("video");
      setLocalVideoFile(null); // Clear file if youtube link is entered
    } else if (getGoogleDriveEmbedUrl(videoUrl)) {
      setSelectedTipo("video_drive");
      setLocalVideoFile(null);
    }
  }, [videoUrl]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <PageHeader title="Alimento da Igreja" subtitle="Mensagens, pregações e estudos bíblicos" />
        {canEdit && (
          <Dialog open={isModalOpen} onOpenChange={(open) => {
            setIsModalOpen(open);
            if (!open) {
              setEditingItem(null);
              setLocalVideoFile(null);
              setSelectedFile(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-[#212351] hover:bg-[#2b2e6b]" onClick={openNewModal}>
                <Plus className="w-4 h-4" /> Novo Conteúdo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] border-2 border-[#212351] p-0 overflow-hidden flex flex-col max-h-[90vh]">
              <DialogHeader className="p-6 pb-2">
                <DialogTitle className="text-xl font-bold text-[#212351] uppercase tracking-tighter">
                  {editingItem ? 'Editar' : 'Novo'} Conteúdo Pastoral
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-2">
                <form id="pastor-form" onSubmit={handleSave} className="space-y-4">
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
                          <SelectItem value="video">Vídeo / Pregação (YouTube)</SelectItem>
                          <SelectItem value="video_drive">Vídeo (Google Drive)</SelectItem>
                          <SelectItem value="apresentacao">Vídeo Gravado (Estudo)</SelectItem>
                          <SelectItem value="comunicado">Comunicado (PDF, Word, etc.)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4 border-2 border-dashed border-[#212351]/10 rounded-xl p-4 bg-[#212351]/5">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Youtube className="w-4 h-4 text-[#FF0000]" />
                        Link do Vídeo (YouTube ou Google Drive)
                      </Label>
                      <Input
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="https://www.youtube.com/... ou https://drive.google.com/..."
                        className="border-[#212351]/20"
                        disabled={selectedTipo === 'comunicado'}
                      />
                    </div>

                    <div className="relative flex items-center gap-4">
                      <div className="flex-1 h-px bg-[#212351]/10" />
                      <span className="text-[10px] font-black text-[#212351]/30 uppercase tracking-widest">OU</span>
                      <div className="flex-1 h-px bg-[#212351]/10" />
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Upload className="w-4 h-4 text-[#212351]" />
                        {selectedTipo === 'comunicado' ? "Subir Documento (PDF/Word/PowerPoint)" : "Subir Vídeo Gravado"}
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          type="file"
                          accept={selectedTipo === 'comunicado' ? ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" : "video/*"}
                          onChange={handleFileChange}
                          className="hidden"
                          ref={fileInputRef}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full border-2 border-[#212351]/20 border-dashed hover:bg-[#212351]/5 h-20 flex flex-col gap-1"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="w-6 h-6 text-[#212351]/40" />
                          <span className="text-xs text-[#212351]/60 font-bold">
                            {localVideoFile ? "Trocar Arquivo Selecionado" : "Clique para selecionar o arquivo"}
                          </span>
                        </Button>
                      </div>
                    </div>
                  </div>

                  {(getYoutubeID(videoUrl) || getGoogleDriveEmbedUrl(videoUrl) || localVideoFile) && (
                    <div className="rounded-lg overflow-hidden border-2 border-[#212351] bg-black aspect-video shadow-lg relative group">
                      {localVideoFile && !getYoutubeID(videoUrl) && !getGoogleDriveEmbedUrl(videoUrl) ? (
                        selectedTipo === 'comunicado' ? (
                          <DocumentViewer url={localVideoFile} title="Preview" />
                        ) : (
                          <video src={localVideoFile} controls className="w-full h-full bg-black" />
                        )
                      ) : getYoutubeID(videoUrl) ? (
                        <iframe
                          width="100%"
                          height="100%"
                          src={`https://www.youtube.com/embed/${getYoutubeID(videoUrl)}?rel=0`}
                          frameBorder="0"
                          allowFullScreen
                          className="w-full h-full"
                        ></iframe>
                      ) : (
                        <iframe
                          width="100%"
                          height="100%"
                          src={getGoogleDriveEmbedUrl(videoUrl) || ""}
                          frameBorder="0"
                          allowFullScreen
                          className="w-full h-full"
                        ></iframe>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Descrição / Mensagem</Label>
                    <textarea
                      name="descricao"
                      defaultValue={editingItem?.descricao}
                      className="w-full min-h-[100px] p-3 rounded-md border border-[#212351]/20 bg-background text-sm"
                      placeholder="Escreva uma breve descrição sobre o conteúdo..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Data de Publicação</Label>
                    <Input name="data" type="date" defaultValue={editingItem?.data ? editingItem.data.split('T')[0] : new Date().toISOString().split('T')[0]} required className="border-[#212351]/20" />
                  </div>
                </form>
              </div>
              <div className="p-6 border-t bg-muted/20">
                <Button form="pastor-form" type="submit" disabled={mutation.isPending} className="w-full bg-[#212351] hover:bg-[#2b2e6b] font-bold uppercase tracking-widest py-6">
                  {mutation.isPending ? "Salvando..." : "PUBLICAR EM ALIMENTO DA IGREJA"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-8 sm:grid-cols-2">
        {contents.map((c: any, i: number) => {
          const Icon = tipoIcons[c.tipo] || BookOpen;
          const videoId = getYoutubeID(c.url_video || c.url);
          const hasLocalVideo = c.url_arquivo;

          return (
            <motion.div
              key={c.id || i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="card-church group border-2 border-[#212351]/10 bg-white hover:border-[#212351]/30 transition-all shadow-sm overflow-hidden flex flex-col"
            >
              <div className="aspect-video bg-black relative overflow-hidden">
                {videoId ? (
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${videoId}?rel=0`}
                    title={c.titulo}
                    className="absolute inset-0 w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                ) : getGoogleDriveEmbedUrl(c.url_video || c.url) ? (
                  <iframe
                    width="100%"
                    height="100%"
                    src={getGoogleDriveEmbedUrl(c.url_video || c.url) || ""}
                    title={c.titulo}
                    className="absolute inset-0 w-full h-full"
                    frameBorder="0"
                    allowFullScreen
                  ></iframe>
                ) : c.tipo === 'apresentacao' && hasLocalVideo ? (
                  <video src={c.url_arquivo} controls className="w-full h-full bg-black" />
                ) : c.tipo === 'comunicado' && hasLocalVideo ? (
                  <DocumentViewer url={c.url_arquivo} title={c.titulo} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#212351]/5">
                    <Icon className="w-12 h-12 text-[#212351]/20" />
                  </div>
                )}
              </div>
                {c.url_arquivo && c.tipo === 'comunicado' && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 bg-black/50 text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity rounded-full h-8 w-8"
                    onClick={() => setFullscreenDoc(c)}
                  >
                    <Maximize2 className="w-4 h-4" />
                  </Button>
                )}
              
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-[#212351] text-white text-[10px] font-black uppercase px-2 py-1 rounded tracking-widest">
                    {tipoLabels[c.tipo] || "Conteúdo"}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canEdit && (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-[#212351]" onClick={() => openEditModal(c)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { if (confirm("Deseja excluir este conteúdo?")) deleteMutation.mutate(c.id); }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <h3 className="text-xl font-bold text-[#212351] mb-2 uppercase tracking-tighter line-clamp-2">{c.titulo}</h3>
                {c.descricao && (
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-4">
                    {c.descricao}
                  </p>
                )}

                {c.tipo === 'comunicado' && c.url_arquivo && (
                  <Button
                    asChild
                    className="mt-2 w-full bg-[#212351] hover:bg-[#2b2e6b]"
                  >
                    <a href={c.url_arquivo} target="_blank" rel="noopener noreferrer">
                      <Upload className="w-4 h-4 mr-2" /> VER DOCUMENTO (PDF/OFFICE)
                    </a>
                  </Button>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-[#212351]/10 mt-auto">
                  <div className="flex items-center gap-2 text-[#212351]/60">
                    <PlayCircle className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Equipe Pastoral</span>
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">
                    {formatDate(c.data)}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <Dialog open={!!fullscreenDoc} onOpenChange={(open) => !open && setFullscreenDoc(null)}>
        <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0 border-none bg-black/90 overflow-hidden flex flex-col">
          <div className="flex justify-between items-center p-4 bg-[#212351] text-white">
            <h3 className="font-bold truncate pr-4">{fullscreenDoc?.titulo}</h3>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-8 w-8" onClick={() => setFullscreenDoc(null)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex-1 w-full relative">
            {fullscreenDoc?.url_arquivo && (
              <DocumentViewer url={fullscreenDoc.url_arquivo} title={fullscreenDoc.titulo} isFullscreen={true} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
