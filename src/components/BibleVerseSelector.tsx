import { useState } from "react";
import { BookOpen, Search, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

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

const bollsSlugs: Record<string, string> = {
    nvt: "NVT",
    naa: "NAA",
    kjv: "KJV",
    rv1960: "RV1960",
};

interface BibleVerseSelectorProps {
    /** Called when user clicks "Usar este versículo". Provides text and reference strings. */
    onSelect: (text: string, reference: string) => void;
}

export function BibleVerseSelector({ onSelect }: BibleVerseSelectorProps) {
    const [search, setSearch] = useState("");
    const [translation, setTranslation] = useState("almeida");
    const [loading, setLoading] = useState(false);
    const [verse, setVerse] = useState<any>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [selectedVerseIdx, setSelectedVerseIdx] = useState<number | null>(null);

    const handleInputChange = (val: string) => {
        setSearch(val);
        if (val.length > 1) {
            const filtered = bibleBooks
                .filter((book) =>
                    book
                        .toLowerCase()
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .includes(val.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
                )
                .slice(0, 5);
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
        if (!/\d/.test(search)) {
            toast.error("Adicione o capítulo. Ex: 'João 3' ou 'Salmos 23:1'");
            return;
        }
        setSuggestions([]);
        setVerse(null);
        setSelectedVerseIdx(null);
        setLoading(true);
        try {
            const slug = bollsSlugs[translation];
            if (slug) {
                const parts = search.trim().split(/\s+/);
                const chapterPart = parts.pop();
                const bookNameTyped = parts.join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                const chapter = parseInt(chapterPart?.split(":")[0] || "1");
                const targetVerse = chapterPart?.includes(":") ? parseInt(chapterPart.split(":")[1]) : null;

                const bookIndex = bibleBooks.findIndex((b) =>
                    b.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(bookNameTyped)
                );
                if (bookIndex === -1) throw new Error("Livro não encontrado");

                const res = await fetch(`https://bolls.life/get-text/${slug}/${bookIndex + 1}/${chapter}/`);
                if (!res.ok) throw new Error("Não encontrado");
                const versesData = await res.json();

                const filtered = targetVerse ? versesData.filter((v: any) => v.verse === targetVerse) : versesData;
                if (filtered.length === 0) throw new Error("Versículo não encontrado");

                setVerse({
                    reference: `${bibleBooks[bookIndex]} ${chapter}${targetVerse ? ":" + targetVerse : ""}`,
                    text: filtered.map((v: any) => v.text.replace(/<S>[^<]*<\/S>/g, "").replace(/<[^>]*>?/gm, "")).join(" "),
                    verses: filtered.map((v: any) => ({
                        verse: v.verse,
                        text: v.text.replace(/<S>[^<]*<\/S>/g, "").replace(/<[^>]*>?/gm, ""),
                    })),
                });
            } else {
                // Almeida via bible-api.com
                const res = await fetch(`https://bible-api.com/${encodeURIComponent(search)}?translation=almeida`);
                if (!res.ok) throw new Error("Não encontrado");
                const data = await res.json();
                setVerse({
                    reference: data.reference,
                    text: data.text?.trim(),
                    verses: data.verses?.map((v: any) => ({ verse: v.verse, text: v.text?.trim() })) ?? [{ verse: 1, text: data.text?.trim() }],
                });
            }
        } catch {
            toast.error("Não encontrado. Tente 'Livro Capítulo' ou 'Livro Capítulo:Versículo'");
        } finally {
            setLoading(false);
        }
    };

    const handleUse = () => {
        if (!verse) return;
        let text = "";
        let reference = verse.reference;

        if (selectedVerseIdx !== null && verse.verses) {
            const v = verse.verses[selectedVerseIdx];
            text = v.text.trim();
            // append verse number if not already in reference
            const refHasVerse = reference.includes(":");
            if (!refHasVerse && verse.verses.length > 1) reference = `${reference}:${v.verse}`;
        } else {
            text = verse.text;
        }

        onSelect(text, reference);
        toast.success("Versículo inserido!");
    };

    return (
        <div className="rounded-lg border border-[#212351]/20 bg-[#f8f8fc] p-4 space-y-3">
            {/* Header */}
            <p className="text-[10px] font-black uppercase tracking-widest text-[#212351]/60 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Buscar versículo diretamente da Bíblia
            </p>

            {/* Search bar */}
            <div className="relative">
                <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                    <div className="relative flex-1">
                        <Input
                            placeholder="Ex: João 3:16 ou Salmos 23"
                            value={search}
                            onChange={(e) => handleInputChange(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            className="border-[#212351]/30 bg-white font-medium text-sm"
                        />
                        {suggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 z-50 bg-white border border-[#212351]/20 rounded-lg shadow-lg overflow-hidden mt-1">
                                {suggestions.map((book) => (
                                    <button
                                        key={book}
                                        type="button"
                                        onClick={() => selectSuggestion(book)}
                                        className="w-full text-left px-3 py-2 hover:bg-[#212351] hover:text-white transition-colors text-sm font-semibold border-b border-[#212351]/5 last:border-0"
                                    >
                                        {book}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <Select value={translation} onValueChange={(v) => { setTranslation(v); setVerse(null); }}>
                        <SelectTrigger className="w-[130px] border-[#212351]/30 bg-white font-bold text-[10px] uppercase shrink-0">
                            <SelectValue placeholder="Versão" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-[#212351]/20">
                            <SelectItem value="almeida" className="font-semibold text-xs uppercase">Almeida (PT)</SelectItem>
                            <SelectItem value="nvt" className="font-semibold text-xs uppercase">NVT (PT)</SelectItem>
                            <SelectItem value="naa" className="font-semibold text-xs uppercase">NAA (PT)</SelectItem>
                            <SelectItem value="kjv" className="font-semibold text-xs uppercase">King James (EN)</SelectItem>
                            <SelectItem value="rv1960" className="font-semibold text-xs uppercase">Reina Valera (ES)</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button
                        type="button"
                        onClick={handleSearch}
                        disabled={loading}
                        className="bg-[#212351] hover:bg-[#2b2e6b] text-white shrink-0 gap-1.5 text-xs px-3"
                    >
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                        Buscar
                    </Button>
                </div>
            </div>

            {/* Results */}
            {verse && (
                <div className="bg-white border border-[#212351]/20 rounded-lg overflow-hidden">
                    <div className="bg-[#212351] px-3 py-2 flex items-center justify-between">
                        <span className="text-white text-xs font-black uppercase tracking-tight">{verse.reference}</span>
                        <span className="text-white/60 text-[10px] font-bold uppercase">{translation}</span>
                    </div>

                    <div className="max-h-48 overflow-y-auto divide-y divide-[#212351]/5">
                        {verse.verses?.map((v: any, i: number) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => setSelectedVerseIdx(selectedVerseIdx === i ? null : i)}
                                className={`w-full text-left px-3 py-2 flex gap-2.5 items-start transition-colors text-sm group ${
                                    selectedVerseIdx === i ? "bg-[#212351]/10" : "hover:bg-[#212351]/5"
                                }`}
                            >
                                <span className="text-[10px] font-black text-accent mt-0.5 min-w-[18px]">{v.verse}</span>
                                <span className="text-[#212351]/80 font-medium leading-relaxed flex-1">{v.text.trim()}</span>
                                {selectedVerseIdx === i && (
                                    <CheckCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="p-2 border-t border-[#212351]/10 bg-[#f8f8fc]">
                        <p className="text-[10px] text-[#212351]/50 mb-2 px-1">
                            {selectedVerseIdx !== null
                                ? "Versículo selecionado — clique em usar para inserir."
                                : verse.verses?.length > 1
                                ? "Clique em um versículo para selecionar apenas ele, ou use o capítulo inteiro."
                                : ""}
                        </p>
                        <Button
                            type="button"
                            onClick={handleUse}
                            className="w-full bg-accent hover:bg-accent/90 text-white text-xs font-black uppercase tracking-widest gap-1.5 py-2"
                        >
                            <CheckCircle className="w-3.5 h-3.5" />
                            {selectedVerseIdx !== null ? "Usar versículo selecionado" : "Usar capítulo completo"}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
