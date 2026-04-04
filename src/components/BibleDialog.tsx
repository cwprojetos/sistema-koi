import { useState } from "react";
import { BookOpen, Search, Send, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { devocionalApi } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

const bibleBooks = [
    "Gênesis", "Êxodo", "Levítico", "Números", "Deuteronômio", "Josué", "Juízes", "Rute",
    "1 Samuel", "2 Samuel", "1 Reis", "2 Reis", "1 Crônicas", "2 Crônicas", "Esdras", "Neemias",
    "Ester", "Jó", "Salmos", "Provérbios", "Eclesiastes", "Cânticos", "Isaías", "Jeremias",
    "Lamentações", "Ezequiel", "Daniel", "Oseias", "Joel", "Amós", "Obadias", "Jonas",
    "Miqueias", "Naum", "Habacuque", "Sofonias", "Ageu", "Zacarias", "Malaquias",
    "Mateus", "Marcos", "Lucas", "João", "Atos", "Romanos", "1 Coríntios", "2 Coríntios",
    "Gálatas", "Efésios", "Filipenses", "Colossenses", "1 Tessalonicenses", "2 Tessalonicenses",
    "1 Timóteo", "2 Timóteo", "Tito", "Filemom", "Hebreus", "Tiago", "1 Pedro", "2 Pedro",
    "1 João", "2 João", "3 João", "Judas", "Apocalipse"
];

const ptToEnBooks: Record<string, string> = {
    "Gênesis": "Genesis",
    "Exodo": "Exodus", "Êxodo": "Exodus", "Levitico": "Leviticus", "Levítico": "Leviticus",
    "Numeros": "Numbers", "Números": "Numbers", "Deuteronomio": "Deuteronomy", "Deuteronômio": "Deuteronomy",
    "Josue": "Joshua", "Josué": "Joshua", "Juizes": "Judges", "Juízes": "Judges", "Rute": "Ruth",
    "1 Samuel": "1 Samuel", "2 Samuel": "2 Samuel", "1 Reis": "1 Kings", "2 Reis": "2 Kings",
    "1 Cronicas": "1 Chronicles", "1 Crônicas": "1 Chronicles", "2 Cronicas": "2 Chronicles", "2 Crônicas": "2 Chronicles",
    "Esdras": "Ezra", "Neemias": "Neemiah", "Ester": "Esther", "Jo": "Job", "Jó": "Job",
    "Salmos": "Psalms", "Proverbios": "Proverbs", "Provérbios": "Proverbs", "Eclesiastes": "Ecclesiastes",
    "Canticos": "Song of Solomon", "Cânticos": "Song of Solomon", "Isaias": "Isaiah", "Isaías": "Isaiah",
    "Jeremias": "Jeremiah", "Lamentacoes": "Lamentations", "Lamentações": "Lamentations",
    "Ezequiel": "Ezekiel", "Daniel": "Daniel", "Oseias": "Hosea", "Joel": "Joel", "Amos": "Amos",
    "Obadias": "Obadiah", "Jonas": "Jonah", "Miqueias": "Micah", "Naum": "Nahum",
    "Habacuque": "Habakkuk", "Sofonias": "Zephaniah", "Ageu": "Haggai", "Zacarias": "Zechariah", "Malaquias": "Malachi",
    "Mateus": "Matthew", "Marcos": "Mark", "Lucas": "Luke", "Joao": "John", "João": "John",
    "Atos": "Acts", "Romanos": "Romans", "1 Corintios": "1 Corinthians", "1 Coríntios": "1 Corinthians",
    "2 Corintios": "2 Corinthians", "2 Coríntios": "2 Corinthians", "Galatas": "Galatians", "Gálatas": "Galatians",
    "Efesios": "Ephesians", "Efésios": "Ephesians", "Filipenses": "Philippians", "Colossenses": "Colossians",
    "1 Tessalonicenses": "1 Thessalonians", "2 Tessalonicenses": "2 Thessalonians",
    "1 Timoteo": "1 Timothy", "1 Timóteo": "1 Timothy", "2 Timoteo": "2 Timothy", "2 Timóteo": "2 Timothy",
    "Tito": "Titus", "Filemom": "Philemon", "Hebreus": "Hebrews", "Tiago": "James",
    "1 Pedro": "1 Peter", "2 Pedro": "2 Peter", "1 Joao": "1 John", "1 João": "1 John",
    "2 Joao": "2 John", "2 João": "2 John", "3 Joao": "3 John", "3 João": "3 John",
    "Judas": "Jude", "Apocalipse": "Revelation"
};

export function BibleDialog() {
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [verse, setVerse] = useState<any>(null);
    const [translation, setTranslation] = useState("almeida");
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const { role } = useAuth();
    const queryClient = useQueryClient();

    const updateVerseMutation = useMutation({
        mutationFn: async (newVerse: any) => {
            // Fetch latest devocional to get its ID, or create a new one
            const devocionais = await devocionalApi.getAll();
            const data = {
                titulo: "Devocional do Dia",
                texto: newVerse.text,
                referencia: newVerse.reference,
                autor: "Bíblia Sagrada",
                data: newVerse.data || new Date().toISOString().split('T')[0]
            };

            if (devocionais.length > 0) {
                return devocionalApi.update(devocionais[0].id, data);
            } else {
                return devocionalApi.create(data);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['devocionais'] });
            toast.success("Devocional do Dia atualizado!");
        },
        onError: () => {
            toast.error("Erro ao atualizar o versículo.");
        }
    });

    const handleInputChange = (val: string) => {
        setSearch(val);
        if (val.length > 1) {
            const filtered = bibleBooks.filter(book =>
                book.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(
                    val.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                )
            ).slice(0, 5);
            setSuggestions(filtered);
        } else {
            setSuggestions([]);
        }
    };

    const selectSuggestion = (book: string) => {
        setSearch(book + " ");
        setSuggestions([]);
    };

    const handleSearch = async () => {
        if (!search) return;

        // Check if user provided at least a number for chapter
        if (!/\d/.test(search)) {
            toast.error("Por favor, adicione o capítulo. Ex: 'João 3'");
            return;
        }

        setSuggestions([]);
        setVerse(null); // Clear previous
        setLoading(true);
        try {
            let finalSearch = search;
            const bollsSlugs: Record<string, string> = {
                'nvt': 'NVT',
                'naa': 'NAA',
                'kjv': 'KJV',
                'rv1960': 'RV1960'
            };

            if (bollsSlugs[translation]) {
                // bolls.life logic - uses numerical IDs
                const searchParts = search.trim().split(/\s+/);
                const chapterPart = searchParts.pop(); // typically '3' or '3:16'
                let bookNameTyped = searchParts.join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                
                let chapter = parseInt(chapterPart?.split(':')[0] || "1");
                let targetVerse = chapterPart?.includes(':') ? parseInt(chapterPart.split(':')[1]) : null;

                // Find book ID (1-indexed)
                const bookIndex = bibleBooks.findIndex(b => 
                    b.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(bookNameTyped)
                );
                
                if (bookIndex === -1) throw new Error("Livro não encontrado");
                const bookId = bookIndex + 1;

                const response = await fetch(`https://bolls.life/get-text/${bollsSlugs[translation]}/${bookId}/${chapter}/`);
                if (!response.ok) throw new Error("Referência não encontrada");
                const versesData = await response.json();
                
                // If specific verse requested, filter it. Else keep all in chapter.
                const filteredVerses = targetVerse 
                    ? versesData.filter((v: any) => v.verse === targetVerse)
                    : versesData;

                if (filteredVerses.length === 0) throw new Error("Versículo não encontrado");

                const transformedData = {
                    reference: `${bibleBooks[bookIndex]} ${chapter}${targetVerse ? ':' + targetVerse : ''}`,
                    text: filteredVerses.map((v: any) => v.text.replace(/<S>[^<]*<\/S>/g, '').replace(/<[^>]*>?/gm, '')).join(" "), // Original raw text for saving devocional
                    verses: filteredVerses.map((v: any) => ({
                        verse: v.verse,
                        text: v.text.replace(/<S>[^<]*<\/S>/g, '').replace(/<[^>]*>?/gm, '') // Remove HTML tags and Strong's numbers
                    }))
                };
                setVerse(transformedData);
            } else {
                // bible-api.com logic (for Almeida or fallback)
                const response = await fetch(`https://bible-api.com/${encodeURIComponent(search)}?translation=almeida`);
                if (!response.ok) throw new Error("Referência não encontrada");
                const data = await response.json();
                setVerse(data);
            }
        } catch (err) {
            toast.error("Não encontrado. Tente 'Livro Capítulo:Versículo'");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <button className="flex flex-col items-center gap-2 group transition-all hover:scale-105 active:scale-95">
                    <div className="bg-[#212351] p-4 rounded-xl shadow-[6px_6px_0px_rgba(33,35,81,0.2)] border-2 border-[#212351] text-white">
                        <BookOpen className="w-10 h-10" />
                    </div>
                    <span className="text-[12px] font-black text-[#212351] tracking-tighter uppercase leading-none">BÍBLIA SAGRADA</span>
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-[#FDFDF7] border-2 border-[#212351]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-[#212351] flex items-center gap-2 uppercase tracking-tighter">
                        <BookOpen className="w-6 h-6" /> Bíblia Digital
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="relative">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Qual livro você quer ler?"
                                value={search}
                                onChange={(e) => handleInputChange(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="border-[#212351] bg-white focus:ring-[#212351] font-bold"
                            />
                            <Select value={translation} onValueChange={setTranslation}>
                                <SelectTrigger className="w-[140px] border-[#212351] bg-white font-bold text-[10px] uppercase">
                                    <SelectValue placeholder="Versão" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-2 border-[#212351]">
                                    <SelectItem value="almeida" className="font-bold text-[10px] uppercase">Almeida (PT)</SelectItem>
                                    <SelectItem value="nvt" className="font-bold text-[10px] uppercase">NVT (PT)</SelectItem>
                                    <SelectItem value="naa" className="font-bold text-[10px] uppercase">NAA (PT)</SelectItem>
                                    <SelectItem value="kjv" className="font-bold text-[10px] uppercase">King James (EN)</SelectItem>
                                    <SelectItem value="rv1960" className="font-bold text-[10px] uppercase">Reina Valera (ES)</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button onClick={handleSearch} disabled={loading} className="bg-[#212351] hover:bg-[#2b2e6b]">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                                BUSCAR
                            </Button>
                        </div>
                        <p className="text-[10px] text-[#212351]/60 mt-2 font-bold uppercase tracking-tight">
                            DICA: Digite o livro e o capítulo (ex: João 3 ou Salmos 23:1-5)
                        </p>

                        {suggestions.length > 0 && (
                            <div className="absolute top-[45px] left-0 right-32 z-50 bg-white border-2 border-[#212351] rounded-lg shadow-xl overflow-hidden">
                                {suggestions.map((book) => (
                                    <button
                                        key={book}
                                        onClick={() => selectSuggestion(book)}
                                        className="w-full text-left px-4 py-2 hover:bg-[#212351] hover:text-white transition-colors text-sm font-bold uppercase tracking-tight border-b border-[#212351]/10 last:border-0"
                                    >
                                        {book}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {verse ? (
                        <div className="bg-white border-2 border-[#212351] rounded-lg shadow-[4px_4px_0px_rgba(33,35,81,0.1)] overflow-hidden flex flex-col">
                            <div className="bg-[#212351] px-4 py-2 flex justify-between items-center text-white">
                                <span className="font-black uppercase tracking-tighter text-sm">{verse.reference}</span>
                                <span className="text-[10px] opacity-70 font-bold uppercase">{translation}</span>
                            </div>

                            <div className="p-6 max-h-[400px] overflow-y-auto custom-scrollbar space-y-4">
                                {verse.verses && verse.verses.map((v: any, i: number) => (
                                    <div key={i} className="flex gap-3 leading-relaxed">
                                        <span className="text-xs font-black text-accent mt-1 min-w-[18px]">{v.verse}</span>
                                        <p className="text-[#212351] font-medium text-lg">
                                            {v.text.trim()}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {(role === 'pastor' || role === 'professor') && (
                                <div className="p-4 border-t-2 border-[#212351]/10 bg-[#FDFDF7]">
                                    <Button
                                        onClick={() => updateVerseMutation.mutate(verse)}
                                        disabled={updateVerseMutation.isPending}
                                        className="w-full bg-accent hover:bg-accent/90 text-white font-black gap-2 rounded-none uppercase tracking-widest text-xs py-6"
                                    >
                                        <Send className="w-4 h-4" /> DEFINIR COMO DEVOCIONAL DO DIA
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-[#212351]/40 border-2 border-dashed border-[#212351]/20 rounded-lg bg-white/50">
                            <p className="font-bold underline uppercase tracking-tighter">A palavra de Deus ao seu alcance</p>
                            <p className="text-[10px] mt-2 italic px-8">Digite o livro e o capítulo para começar a leitura.</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
