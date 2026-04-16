import { useState, useEffect } from "react";
import { extractYoutubeId } from "@/lib/youtube";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Play, FileText, Upload, ChevronLeft, ChevronRight, X, Maximize, Save, ListMusic, Trash2, Pencil, CalendarCheck, CheckCircle2, PlusCircle, ArrowUp, ArrowDown, Video, Youtube } from "lucide-react";

interface SavedProjection {
    id: string;
    nome: string;
    letra: string;
    data: string;
}

interface SlideProjectorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SlideProjectorModal({ isOpen, onClose }: SlideProjectorModalProps) {
    const [activeTab, setActiveTab] = useState<'arquivo' | 'letra' | 'salvos' | 'dia'>('letra');
    const [lyricsText, setLyricsText] = useState("");
    const [slides, setSlides] = useState<string[]>([]);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [isProjecting, setIsProjecting] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [projectionName, setProjectionName] = useState("");
    const [savedProjections, setSavedProjections] = useState<SavedProjection[]>([]);
    const [dailyProjectionIds, setDailyProjectionIds] = useState<string[]>([]);
    const [bgColor, setBgColor] = useState('#000000');
    const [textColor, setTextColor] = useState('#ffffff');
    const [bgVideo, setBgVideo] = useState<string | null>(null);
  const [youtubeLink, setYoutubeLink] = useState<string>('');
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem('midia_projecoes');
        if (saved) {
            try {
                setSavedProjections(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse saved projections");
            }
        }
        const daily = localStorage.getItem('midia_diaria');
        if (daily) {
            try {
                setDailyProjectionIds(JSON.parse(daily));
            } catch (e) {}
        }
        const savedColor = localStorage.getItem('midia_bgColor');
        if (savedColor) {
            setBgColor(savedColor);
        }
        const savedText = localStorage.getItem('midia_textColor');
        if (savedText) {
            setTextColor(savedText);
        }
    }, []);

    const saveCurrentProjection = () => {
        if (!lyricsText.trim()) return;
        const name = projectionName.trim() || `Projeção ${new Date().toLocaleDateString('pt-BR')}`;
        
        let updated: SavedProjection[];
        
        if (editingId) {
            updated = savedProjections.map(p => 
                p.id === editingId ? { ...p, nome: name, letra: lyricsText } : p
            );
        } else {
            const newProjection: SavedProjection = {
                id: Date.now().toString(),
                nome: name,
                letra: lyricsText,
                data: new Date().toISOString()
            };
            updated = [newProjection, ...savedProjections];
        }

        setSavedProjections(updated);
        localStorage.setItem('midia_projecoes', JSON.stringify(updated));
        setProjectionName("");
        setEditingId(null);
        setActiveTab('salvos');
    };

    const editProjection = (proj: SavedProjection) => {
        setProjectionName(proj.nome);
        setLyricsText(proj.letra);
        setEditingId(proj.id);
        setActiveTab('letra');
    };

    const deleteSavedProjection = (id: string) => {
        if(!confirm("Tem certeza que deseja apagar esta lista?")) return;
        const updated = savedProjections.filter(p => p.id !== id);
        setSavedProjections(updated);
        localStorage.setItem('midia_projecoes', JSON.stringify(updated));
        
        // Remove from daily if present
        const newDaily = dailyProjectionIds.filter(dId => dId !== id);
        setDailyProjectionIds(newDaily);
        localStorage.setItem('midia_diaria', JSON.stringify(newDaily));
    };

    const toggleDaily = (id: string) => {
        let newDaily;
        if (dailyProjectionIds.includes(id)) {
            newDaily = dailyProjectionIds.filter(x => x !== id);
        } else {
            newDaily = [...dailyProjectionIds, id];
        }
        setDailyProjectionIds(newDaily);
        localStorage.setItem('midia_diaria', JSON.stringify(newDaily));
    };

    const moveDailyItem = (index: number, direction: 'up' | 'down') => {
        const newIds = [...dailyProjectionIds];
        if (direction === 'up' && index > 0) {
            [newIds[index], newIds[index - 1]] = [newIds[index - 1], newIds[index]];
        } else if (direction === 'down' && index < newIds.length - 1) {
            [newIds[index], newIds[index + 1]] = [newIds[index + 1], newIds[index]];
        }
        setDailyProjectionIds(newIds);
        localStorage.setItem('midia_diaria', JSON.stringify(newIds));
    };

    const startDailyPresentation = () => {
        const selectedProjs = dailyProjectionIds
            .map(id => savedProjections.find(p => p.id === id))
            .filter(Boolean) as SavedProjection[];
            
        if(selectedProjs.length === 0) return;

        const parsedSlides: string[] = [];
        selectedProjs.forEach((p, index) => {
            const pSlides = p.letra
                .split(/\n\s*\n/)
                .map(s => s.trim())
                .filter(s => s.length > 0);
            
            parsedSlides.push(...pSlides);
            
            // Add transition slide between songs with the next song's sequence number
            if (index < selectedProjs.length - 1) {
                parsedSlides.push(`[[TRANSICAO_${index + 2}]]`);
            }
        });
            
        startProjection(parsedSlides);
    };

    const loadAndProject = (proj: SavedProjection) => {
        setLyricsText(proj.letra);
        const parsedSlides = proj.letra
            .split(/\n\s*\n/)
            .map(s => s.trim())
            .filter(s => s.length > 0);
            
        startProjection(parsedSlides);
    };

    const startTextPresentation = () => {
        if (!lyricsText.trim()) return;
        
        // Separar por linhas em branco (duas quebras de linha ou mais)
        const parsedSlides = lyricsText
            .split(/\n\s*\n/)
            .map(s => s.trim())
            .filter(s => s.length > 0);
            
        startProjection(parsedSlides);
    };

    const startProjection = async (parsedSlides: string[]) => {
        // Automatically inject an empty transition slide at the very beginning
        // so the presentation always starts with just the background.
        const slidesWithIntro = ['[[TRANSICAO_INICIAL]]', ...parsedSlides];
        
        setSlides(slidesWithIntro);
        setCurrentSlideIndex(0);
        setIsProjecting(true);
        try {
            if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
            }
        } catch (e) {
            console.error("Erro ao entrar em tela cheia:", e);
        }
    };

    const stopProjection = async () => {
        setIsProjecting(false);
        try {
            if (document.fullscreenElement && document.exitFullscreen) {
                await document.exitFullscreen();
            }
        } catch (e) {
            console.error("Erro ao sair da tela cheia:", e);
        }
    };

    const handleFileOpen = () => {
        if (selectedFile) {
            const fileUrl = URL.createObjectURL(selectedFile);
            window.open(fileUrl, '_blank');
        }
    };

    // Keyboard navigation for projection
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isProjecting) return;
            if (e.key === 'ArrowRight' || e.key === 'Space') {
                setCurrentSlideIndex(prev => Math.min(slides.length - 1, prev + 1));
            } else if (e.key === 'ArrowLeft') {
                setCurrentSlideIndex(prev => Math.max(0, prev - 1));
            } else if (e.key === 'Escape') {
                stopProjection();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isProjecting, slides.length]);

    return (
        <>
            {isProjecting && (
                <div className="fixed inset-0 z-[9999] text-white flex flex-col justify-center items-center overflow-hidden" style={{ backgroundColor: bgVideo ? 'black' : bgColor }}>
                {/* Render background: either a local video file or a YouTube embed */}
                {bgVideo && (
                    extractYoutubeId(bgVideo) ? (
                        // YouTube embed
                        <iframe
                            src={`https://www.youtube.com/embed/${extractYoutubeId(bgVideo)}?autoplay=1&mute=1&loop=1&playlist=${extractYoutubeId(bgVideo)}`}
                            className="absolute inset-0 w-full h-full object-cover z-0 opacity-90"
                            allow="autoplay; encrypted-media"
                            allowFullScreen
                            title="Background YouTube"
                        />
                    ) : (
                        // Local video file
                        <video autoPlay loop muted className="absolute inset-0 w-full h-full object-cover z-0 opacity-90">
                            <source src={bgVideo} type="video/mp4" />
                        </video>
                    )
                )}
                
                <Button 
                    variant="ghost" 
                    className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
                    onClick={stopProjection}
                >
                    <X className="w-8 h-8" />
                </Button>
                
                <div className="w-full flex-1 flex items-center justify-center p-8 md:p-16 pb-[30vh] text-center z-10">
                    <p className="text-3xl md:text-5xl lg:text-7xl font-bold leading-normal whitespace-pre-wrap max-w-[90vw] mx-auto drop-shadow-2xl" style={{ color: textColor }}>
                        {slides[currentSlideIndex]?.startsWith('[[TRANSICAO_') ? (
                            ''
                        ) : (
                            slides[currentSlideIndex]
                        )}
                    </p>
                </div>
                
                <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center gap-8 text-white/50 z-10">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setCurrentSlideIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentSlideIndex === 0}
                        className="hover:bg-white/20 hover:text-white"
                    >
                        <ChevronLeft className="w-12 h-12" />
                    </Button>
                    <span className={`text-xl font-bold font-mono ${slides[currentSlideIndex]?.startsWith('[[TRANSICAO_') ? 'text-yellow-400 drop-shadow-md' : ''}`}>
                        {currentSlideIndex + 1} / {slides.length}
                    </span>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setCurrentSlideIndex(prev => Math.min(slides.length - 1, prev + 1))}
                        disabled={currentSlideIndex === slides.length - 1}
                        className="hover:bg-white/20 hover:text-white"
                    >
                        <ChevronRight className="w-12 h-12" />
                    </Button>
                </div>
            </div>
            )}

            <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-white border-none shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                <DialogHeader className="border-b pb-4 mb-4 flex flex-row items-center justify-between">
                    <DialogTitle className="text-2xl font-black text-indigo-950 flex items-center gap-2">
                        <Maximize className="w-6 h-6 text-indigo-600" /> 
                        Projetor de Letras e Slides
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Gerenciamento de projeção de letras e slides para a igreja.
                    </DialogDescription>
                    <div className="flex flex-wrap items-center gap-4 mt-0">
                        {bgVideo ? (
                            <Button variant="ghost" size="sm" onClick={() => { setBgVideo(null); setYoutubeLink(''); }} className="h-8 px-2 text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50">
                                <X className="w-3 h-3 mr-1" /> Remover Fundo
                            </Button>
                        ) : (
                            <div className="flex items-center gap-2">
                                {/* File upload */}
                                <Label className="text-xs font-bold text-indigo-600 uppercase tracking-wider cursor-pointer hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2 py-1.5 rounded-lg border border-indigo-100 transition-colors">
                                    <Video className="w-3 h-3" /> Fundo Animado (arquivo)
                                    <input
                                        type="file"
                                        accept="video/mp4,video/webm"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) setBgVideo(URL.createObjectURL(file));
                                        }}
                                    />
                                </Label>
                                {/* YouTube link */}
                                <Label className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1 bg-indigo-50 px-2 py-1.5 rounded-lg border border-indigo-100 transition-colors">
                                    <Youtube className="w-3 h-3" /> Fundo YouTube
                                    <input
                                        type="text"
                                        placeholder="https://youtube.com/..."
                                        className="ml-2 p-1 border border-indigo-200 rounded text-sm w-48"
                                        value={youtubeLink}
                                        onChange={(e) => setYoutubeLink(e.target.value)}
                                        onBlur={() => {
                                            const id = extractYoutubeId(youtubeLink);
                                            if (id) setBgVideo(youtubeLink.trim());
                                        }}
                                    />
                                </Label>
                            </div>
                        )}
                        <div className="flex items-center gap-2 border-l pl-4 border-slate-200">
                            <Label htmlFor="textColor" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Texto:</Label>
                            <input 
                                id="textColor"
                                type="color" 
                                value={textColor} 
                                onChange={(e) => {
                                    setTextColor(e.target.value);
                                    localStorage.setItem('midia_textColor', e.target.value);
                                }}
                                className="w-8 h-8 rounded cursor-pointer border-0 p-0 shadow-sm"
                                title="Cor do Texto da Projeção"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Label htmlFor="bgColor" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fundo:</Label>
                            <input 
                                id="bgColor"
                                type="color" 
                                value={bgColor} 
                                onChange={(e) => {
                                    setBgColor(e.target.value);
                                    localStorage.setItem('midia_bgColor', e.target.value);
                                }}
                                className="w-8 h-8 rounded cursor-pointer border-0 p-0 shadow-sm"
                                title="Cor do Fundo da Projeção"
                            />
                        </div>
                    </div>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
                    <TabsList className="grid w-full grid-cols-4 mb-6 text-xs sm:text-sm">
                        <TabsTrigger value="letra" className="font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                            <FileText className="hidden sm:inline-block w-4 h-4 mr-2" /> Nova Lista
                        </TabsTrigger>
                        <TabsTrigger value="salvos" className="font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                            <ListMusic className="hidden sm:inline-block w-4 h-4 mr-2" /> Salvas
                        </TabsTrigger>
                        <TabsTrigger value="dia" className="font-bold data-[state=active]:bg-amber-500 data-[state=active]:text-white relative">
                            <CalendarCheck className="hidden sm:inline-block w-4 h-4 mr-2" /> Culto
                            {dailyProjectionIds.length > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold">
                                    {dailyProjectionIds.length}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="arquivo" className="font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                            <Upload className="hidden sm:inline-block w-4 h-4 mr-2" /> Arquivo
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="letra" className="space-y-4">
                        <div className="flex gap-4 items-end">
                            <div className="flex-1 space-y-2">
                                <Label className="font-bold text-indigo-900">Nome da Projeção (Para Salvar)</Label>
                                <Input 
                                    placeholder="Ex: Culto de Domingo (4 Músicas)..." 
                                    className="border-indigo-100"
                                    value={projectionName}
                                    onChange={(e) => setProjectionName(e.target.value)}
                                />
                            </div>
                            <Button variant="outline" className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 gap-2" onClick={saveCurrentProjection} disabled={!lyricsText.trim()}>
                                <Save className="w-4 h-4" /> Salvar Lista
                            </Button>
                        </div>
                        <div className="space-y-2">
                            <Label className="font-bold text-indigo-900">Letras (Sequência)</Label>
                            <p className="text-sm text-slate-500 mb-2">Cole a letra da música abaixo. Cada trecho separado por uma linha em branco será um slide diferente.</p>
                            <textarea
                                value={lyricsText}
                                onChange={(e) => setLyricsText(e.target.value)}
                                className="w-full min-h-[300px] p-4 rounded-xl border-2 border-indigo-100 bg-indigo-50/20 focus:bg-white focus:border-indigo-400 outline-none transition-all font-medium text-lg resize-none"
                                placeholder="Vitória no deserto...\n\nQuando a noite fria cair sobre mim\n\n(Novo slide...)"
                            />
                        </div>
                        <Button 
                            className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-lg font-bold shadow-lg shadow-indigo-600/20 mt-4"
                            onClick={startTextPresentation}
                            disabled={!lyricsText.trim()}
                        >
                            <Play className="w-6 h-6 mr-2" /> INICIAR PROJEÇÃO AGORA
                        </Button>
                    </TabsContent>

                    <TabsContent value="salvos" className="space-y-4">
                        {savedProjections.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                                Nenhuma lista de projeção salva ainda.
                            </div>
                        ) : (
                            <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {savedProjections.map(proj => (
                                    <div key={proj.id} className="flex items-center justify-between p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl hover:shadow-md transition-all group">
                                        <div>
                                            <h4 className="font-bold text-indigo-950 text-lg">{proj.nome}</h4>
                                            <p className="text-xs font-medium text-slate-500">
                                                Criado em {new Date(proj.data).toLocaleDateString()} • {proj.letra.split(/\n\s*\n/).length} slides
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                                <Button variant="outline" size="icon" className="text-blue-500 border-blue-100 hover:bg-blue-50" onClick={() => editProjection(proj)}>
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button variant="outline" size="icon" className="text-red-500 border-red-100 hover:bg-red-50" onClick={() => deleteSavedProjection(proj.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                                <Button className="bg-indigo-600 hover:bg-indigo-700 font-bold gap-2" onClick={() => loadAndProject(proj)}>
                                                    <Play className="w-4 h-4" /> USAR
                                                </Button>
                                            </div>
                                            <Button 
                                                variant="outline" 
                                                className={`font-bold transition-all ${dailyProjectionIds.includes(proj.id) ? 'bg-amber-100 text-amber-600 border-amber-300 hover:bg-amber-200' : 'text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                                                onClick={() => toggleDaily(proj.id)}
                                            >
                                                {dailyProjectionIds.includes(proj.id) ? <CheckCircle2 className="w-5 h-5 mr-1" /> : <PlusCircle className="w-5 h-5 mr-1" />}
                                                Culto
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="dia" className="space-y-4">
                        {dailyProjectionIds.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 border-2 border-dashed border-amber-200 bg-amber-50/30 rounded-xl">
                                Nenhuma música selecionada para o Culto.<br/>Vá na aba "Salvas" e adicione as músicas do dia!
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                                    <h3 className="font-black text-amber-700 mb-3 flex items-center gap-2">
                                        <CalendarCheck className="w-5 h-5" /> Sequência do Culto
                                    </h3>
                                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {dailyProjectionIds.map((id, index) => {
                                            const proj = savedProjections.find(p => p.id === id);
                                            if (!proj) return null;
                                            return (
                                                <div key={id + index} className="flex items-center justify-between p-3 bg-white border border-amber-100 rounded-lg shadow-sm">
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-black text-amber-600 w-6">{index + 1}.</span>
                                                        <h4 className="font-bold text-slate-800">{proj.nome}</h4>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-amber-600" onClick={() => moveDailyItem(index, 'up')} disabled={index === 0}>
                                                            <ArrowUp className="w-4 h-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-amber-600" onClick={() => moveDailyItem(index, 'down')} disabled={index === dailyProjectionIds.length - 1}>
                                                            <ArrowDown className="w-4 h-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 ml-2" onClick={() => toggleDaily(id)}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <Button 
                                    className="w-full h-14 bg-amber-500 hover:bg-amber-600 text-lg font-black shadow-lg shadow-amber-500/20 text-white"
                                    onClick={startDailyPresentation}
                                >
                                    <Play className="w-6 h-6 mr-2" /> INICIAR CULTO
                                </Button>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="arquivo" className="space-y-6">
                        <div className="bg-indigo-50/50 p-6 rounded-2xl border-2 border-dashed border-indigo-200 text-center space-y-4">
                            <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                                <Upload className="w-8 h-8 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-indigo-950 mb-1">Selecione um Arquivo</h3>
                                <p className="text-sm text-slate-500">PDF ou apresentações do PowerPoint</p>
                            </div>
                            <Input 
                                type="file" 
                                accept=".pdf,.ppt,.pptx" 
                                className="max-w-xs mx-auto text-indigo-900" 
                                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                            />
                        </div>
                        <Button 
                            className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-lg font-bold shadow-lg shadow-indigo-600/20"
                            onClick={handleFileOpen}
                            disabled={!selectedFile}
                        >
                            <Play className="w-6 h-6 mr-2" /> ABRIR PARA APRESENTAÇÃO
                        </Button>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
        </>
    );
}
