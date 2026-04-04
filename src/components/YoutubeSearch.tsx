import { useState } from "react";
import { Search, Youtube, Plus, Loader2, Music } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { motion, AnimatePresence } from "framer-motion";

interface YoutubeResult {
    id: string;
    title: string;
    channelTitle: string;
    thumbnail: string;
}

interface YoutubeSearchProps {
    onSelect: (song: { titulo: string; artista: string }) => void;
}

export function YoutubeSearch({ onSelect }: YoutubeSearchProps) {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<YoutubeResult[]>([]);
    const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;

    const handleSearch = async () => {
        if (!query) return;
        if (!apiKey) {
            // Mock results if no API key is present for demonstration
            setResults([
                { id: "1", title: `${query} - Cover Acústico`, channelTitle: "Música & Vida", thumbnail: "https://images.unsplash.com/photo-1507838596056-a376cf4984a9?w=100&h=100&fit=crop" },
                { id: "2", title: `${query} (Clipe Oficial)`, channelTitle: "Canal Adoração", thumbnail: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&h=100&fit=crop" },
                { id: "3", title: `${query} Letra / Lyrics`, channelTitle: "Praise & Worship", thumbnail: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&h=100&fit=crop" },
                { id: "4", title: `${query} - Ao Vivo`, channelTitle: "Ministério de Louvor", thumbnail: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=100&h=100&fit=crop" },
            ]);
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=${encodeURIComponent(query)}&type=video&key=${apiKey}`
            );
            const data = await response.json();
            if (data.items) {
                const formattedResults = data.items.map((item: any) => ({
                    id: item.id.videoId,
                    title: item.snippet.title,
                    channelTitle: item.snippet.channelTitle,
                    thumbnail: item.snippet.thumbnails.default.url,
                }));
                setResults(formattedResults);
            }
        } catch (error) {
            console.error("Youtube Search Error:", error);
            toast.error("Erro ao buscar no Youtube. Verifique sua chave de API.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Pesquisar música no Youtube..."
                        className="pl-9"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                </div>
                <Button onClick={handleSearch} disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buscar"}
                </Button>
            </div>

            {!apiKey && results.length === 0 && (
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs">
                    <strong>Dica:</strong> Para resultados reais, adicione <code>VITE_YOUTUBE_API_KEY</code> ao seu arquivo .env.
                </div>
            )}

            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                <AnimatePresence mode="popLayout">
                    {results.map((video) => (
                        <motion.div
                            key={video.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 border border-transparent hover:border-border transition-all group"
                        >
                            <img src={video.thumbnail} alt="" className="w-16 h-10 object-cover rounded bg-muted" />
                            <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-medium truncate" dangerouslySetInnerHTML={{ __html: video.title }}></h4>
                                <p className="text-[10px] text-muted-foreground truncate">{video.channelTitle}</p>
                            </div>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-accent hover:bg-accent/10"
                                onClick={() => {
                                    // Limpa entidades HTML comuns
                                    const cleanTitle = video.title
                                        .replace(/(&quot;|&#39;|&amp;|&#039;)/g, (match) => ({
                                            '&quot;': '"',
                                            '&#39;': "'",
                                            '&amp;': '&',
                                            '&#039;': "'"
                                        }[match] || match));
                                    onSelect({
                                        titulo: cleanTitle,
                                        artista: video.channelTitle,
                                        url_video: `https://www.youtube.com/watch?v=${video.id}`
                                    });
                                }}
                            >
                                <Plus className="w-4 h-4" />
                            </Button>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {results.length === 0 && !loading && query && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                        Nenhum resultado encontrado.
                    </div>
                )}
            </div>
        </div>
    );
}
