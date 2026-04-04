
import { useState, useEffect } from "react";
import { Youtube, Settings, ExternalLink, Save, Loader2 } from "lucide-react";
import { useConfig } from "@/contexts/ConfigContext";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function LiveStreamButton() {
    const { config, updateConfig } = useConfig();
    const { isAdmin, canWrite } = useAuth();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newLink, setNewLink] = useState(config.youtube_link || "");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isDialogOpen) {
            setNewLink(config.youtube_link || "");
        }
    }, [isDialogOpen, config.youtube_link]);

    const hasPermission = isAdmin || canWrite('midia');

    const handleOpenLive = () => {
        const link = config.youtube_link || 'https://youtube.com';
        window.open(link, '_blank');
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateConfig('youtube_link', newLink);
            toast.success("Link da transmissão atualizado!");
            setIsDialogOpen(false);
        } catch (error) {
            toast.error("Erro ao salvar o link.");
        } finally {
            setIsSaving(false);
        }
    };

    // Para usuários sem permissão, é apenas um link direto
    if (!hasPermission) {
        return (
            <button 
                onClick={handleOpenLive}
                className="flex flex-col items-center gap-2 group transition-all hover:scale-105 active:scale-95"
            >
                <div className="bg-[#FF0000] p-4 rounded-xl shadow-[6px_6px_0px_rgba(255,0,0,0.2)] border-2 border-[#8B0000] text-white">
                    <Youtube className="w-10 h-10" />
                </div>
                <span className="text-[12px] font-black text-[#FF0000] tracking-tighter uppercase leading-none text-center">
                    TRANSMISSÃO <br/> AO VIVO
                </span>
            </button>
        );
    }

    // Para Administradores e Mídia, abre um diálogo de configuração
    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <button className="flex flex-col items-center gap-2 group transition-all hover:scale-105 active:scale-95">
                    <div className="bg-[#FF0000] p-4 rounded-xl shadow-[6px_6px_0px_rgba(255,0,0,0.2)] border-2 border-[#8B0000] text-white relative">
                        <Youtube className="w-10 h-10" />
                        <div className="absolute -top-2 -right-2 bg-white rounded-full p-1 border-2 border-[#FF0000] text-[#FF0000]">
                            <Settings className="w-3 h-3" />
                        </div>
                    </div>
                    <span className="text-[12px] font-black text-[#FF0000] tracking-tighter uppercase leading-none text-center">
                        TRANSMISSÃO <br/> (CONFIGURAR)
                    </span>
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-white border-4 border-[#FF0000] rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="text-[#FF0000] font-black uppercase tracking-tighter text-2xl flex items-center gap-2">
                        <Youtube className="w-8 h-8" /> Configurar Live
                    </DialogTitle>
                </DialogHeader>
                <div className="py-6 space-y-4">
                    <p className="text-sm font-bold text-[#212351] uppercase tracking-tight">
                        Cole abaixo o link da transmissão do Youtube para que todos os membros possam acessar.
                    </p>
                    <div className="space-y-2">
                        <Input 
                            value={newLink}
                            onChange={(e) => setNewLink(e.target.value)}
                            placeholder="https://www.youtube.com/live/..."
                            className="border-2 border-[#FF0000]/20 focus:border-[#FF0000] h-12 font-bold"
                        />
                    </div>
                </div>
                <DialogFooter className="flex gap-2 sm:justify-between">
                    <Button 
                        variant="outline" 
                        onClick={handleOpenLive}
                        className="border-2 border-gray-200 font-bold uppercase tracking-tight"
                    >
                        <ExternalLink className="w-4 h-4 mr-2" /> Testar Link
                    </Button>
                    <Button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-[#FF0000] hover:bg-[#8B0000] text-white font-black uppercase tracking-tighter px-8"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        SALVAR LINK
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
