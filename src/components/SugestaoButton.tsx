import { useState } from "react";
import { Lightbulb, Send, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL } from "@/services/api";
import { toast } from "sonner";

export function SugestaoButton() {
  const { role } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [texto, setTexto] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);

  const roleLabel: Record<string, string> = {
    admin: "Administrador",
    pastor: "Pastor",
    professor: "Professor / EBD",
    midia: "Mídia / Marketing",
    louvor: "Louvor",
    financeiro: "Financeiro",
    conselho: "Conselho",
    secretaria: "Secretaria",
    guest: "Visitante",
  };

  const handleSubmit = async () => {
    if (!texto.trim()) {
      toast.error("Por favor, descreva sua sugestão.");
      return;
    }
    setLoading(true);
    try {
      await fetch(`${API_BASE_URL}/sugestoes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim() || roleLabel[role] || "Anônimo",
          texto: texto.trim(),
          perfil: role,
        }),
      });
      setEnviado(true);
      setTexto("");
      setNome("");
      setTimeout(() => {
        setEnviado(false);
        setIsOpen(false);
      }, 2500);
    } catch {
      toast.error("Erro ao enviar sugestão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      {/* Inline Button */}
      <motion.button
        id="sugestao-btn"
        onClick={() => setIsOpen((v) => !v)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2 bg-gradient-to-r from-[#212351] to-[#3a3ea8] text-white px-3 py-1.5 rounded-full shadow-md font-bold text-xs cursor-pointer border border-white/10 hover:shadow-lg transition-shadow"
        title="Enviar sugestão de melhoria"
      >
        <Lightbulb className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
        <span>Sugestão</span>
      </motion.button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            {/* Panel */}
            <motion.div
              className="absolute right-0 top-10 z-50 w-80 bg-white rounded-2xl shadow-2xl border-2 border-[#212351]/10 overflow-hidden"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-[#212351] to-[#3a3ea8] p-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Lightbulb className="w-4 h-4 text-yellow-300" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-tight">Sugestão de Melhoria</h2>
                    <p className="text-[10px] text-white/70">Sua ideia é bem-vinda!</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 space-y-3">
                {enviado ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-6 flex flex-col items-center gap-3 text-center"
                  >
                    <CheckCircle2 className="w-14 h-14 text-green-500" />
                    <h3 className="text-base font-black text-[#212351] uppercase">Obrigado!</h3>
                    <p className="text-sm text-muted-foreground">Sugestão enviada com sucesso.</p>
                  </motion.div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-[#212351]/60 tracking-widest">
                        Seu nome (opcional)
                      </label>
                      <Input
                        placeholder={roleLabel[role] || "Visitante"}
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="border-2 border-[#212351]/10 h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-[#212351]/60 tracking-widest">
                        Descreva sua sugestão ✍️
                      </label>
                      <textarea
                        value={texto}
                        onChange={(e) => setTexto(e.target.value)}
                        placeholder="O que poderia melhorar? Uma funcionalidade nova? Um erro?"
                        rows={3}
                        className="w-full rounded-md border-2 border-[#212351]/10 focus:border-[#212351]/40 outline-none p-2.5 text-sm resize-none transition-colors bg-[#f8fafc]"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && e.ctrlKey) handleSubmit();
                        }}
                      />
                      <p className="text-[9px] text-muted-foreground">Ctrl+Enter para enviar</p>
                    </div>

                    <Button
                      onClick={handleSubmit}
                      disabled={loading || !texto.trim()}
                      className="w-full bg-gradient-to-r from-[#212351] to-[#3a3ea8] hover:opacity-90 text-white font-black py-4 gap-2 rounded-xl text-sm"
                    >
                      {loading ? (
                        <span className="animate-pulse">Enviando...</span>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" /> ENVIAR SUGESTÃO
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
