import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Mail, Key, Eye, EyeOff, UserIcon, Church } from "lucide-react";
import { useConfig } from "@/contexts/ConfigContext";
import { authApi, churchesApi } from "@/services/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login, loginAsVisitor } = useAuth();
  const { config } = useConfig();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isVisitorMode, setIsVisitorMode] = useState(false);
  const [churches, setChurches] = useState<any[]>([]);
  const [isLoadingChurches, setIsLoadingChurches] = useState(false);

  useEffect(() => {
    if (isVisitorMode) {
      const fetchChurches = async () => {
        setIsLoadingChurches(true);
        try {
          const data = await churchesApi.getPublic();
          setChurches(data);
        } catch (err) {
          toast({ title: "Erro", description: "Falha ao carregar igrejas", variant: "destructive" });
        } finally {
          setIsLoadingChurches(false);
        }
      };
      fetchChurches();
    }
  }, [isVisitorMode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login({ email, password });
      toast({ title: "Bem-vindo!", description: "Login realizado com sucesso." });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Erro no login",
        description: error.message || "E-mail ou senha incorretos.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC] p-4 relative overflow-hidden">
      {/* Abstract Background Shapes */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-3xl animate-pulse delay-700" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-3xl shadow-2xl shadow-blue-500/10 border border-white p-8 md:p-10 backdrop-blur-sm relative z-10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-40 h-40 mb-6 flex items-center justify-center">
              <img src={config.igreja_logo} alt="Logo" className="w-full h-full object-contain drop-shadow-xl" />
            </div>
            <h1 className="text-3xl font-black text-[#212351] tracking-tight text-center">Acesso Restrito</h1>
            <p className="text-muted-foreground text-sm mt-2 font-medium text-center uppercase tracking-widest">KOI - CONECTADOS EM CRISTO</p>
          </div>

          <AnimatePresence mode="wait">
            {!isVisitorMode ? (
              <motion.form
                key="login-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleLogin}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-black text-[#212351] uppercase tracking-wider ml-1">E-mail</Label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-blue-600 transition-colors" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="nome@exemplo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-14 pl-12 bg-gray-50 border-gray-100 rounded-2xl focus:ring-blue-500 transition-all text-base"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center ml-1">
                      <Label htmlFor="password" className="text-xs font-black text-[#212351] uppercase tracking-wider">Senha</Label>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <button type="button" className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">
                            Esqueceu a senha?
                          </button>
                        </DialogTrigger>
                        <DialogContent className="rounded-3xl border-0 shadow-2xl">
                          <DialogHeader>
                            <DialogTitle className="text-xl font-black text-[#212351] flex items-center gap-2">
                              <Key className="w-6 h-6 text-blue-600" /> Recuperar Acesso
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              Por razões de segurança, a redefinição de senha deve ser solicitada diretamente ao administrador da sua igreja.
                            </p>
                            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                              <p className="text-xs font-black text-blue-800 uppercase tracking-widest mb-1">Dica:</p>
                              <p className="text-sm text-blue-700">Procure o responsável pelo sistema na secretaria para gerar uma nova senha temporária.</p>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="relative group">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-blue-600 transition-colors" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="h-14 pl-12 pr-12 bg-gray-50 border-gray-100 rounded-2xl focus:ring-blue-500 transition-all text-base"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-blue-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black text-base rounded-2xl shadow-xl shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    "Entrar no Sistema"
                  )}
                </Button>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-100" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-4 text-muted-foreground font-black tracking-widest">OU</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsVisitorMode(true)}
                  className="w-full h-14 border-2 border-gray-100 hover:border-blue-600 bg-white hover:bg-blue-50 text-[#212351] font-black text-base rounded-2xl transition-all flex items-center justify-center gap-3"
                >
                  <UserIcon className="w-5 h-5 text-blue-600" />
                  Acessar como Visitante
                </Button>
              </motion.form>
            ) : (
              <motion.div
                key="visitor-mode"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-[#212351] uppercase tracking-wider text-center flex items-center justify-center gap-2">
                    <Church className="w-5 h-5 text-blue-600" /> Escolha sua Igreja
                  </h3>

                  {isLoadingChurches ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-[#212351]" /></div>
                  ) : (
                    <div className="grid gap-2 max-h-60 overflow-y-auto px-1 custom-scrollbar">
                      {churches.map(c => (
                        <button
                          key={c.id}
                          onClick={async () => {
                            setIsLoading(true);
                            try {
                              await loginAsVisitor(c.id);
                              navigate('/');
                            } catch (err) {
                              toast({ title: "Erro", description: "Erro ao entrar como visitante", variant: "destructive" });
                            } finally {
                              setIsLoading(false);
                            }
                          }}
                          className="w-full p-4 flex items-center justify-between bg-white/50 border-2 border-transparent hover:border-blue-600/40 rounded-xl transition-all group"
                        >
                          <span className="font-bold text-[#212351] group-hover:text-blue-600 transition-colors">{c.name}</span>
                          <Church className="w-4 h-4 text-[#212351]/20 group-hover:text-blue-600/40" />
                        </button>
                      ))}
                      {churches.length === 0 && <p className="text-center text-xs text-muted-foreground py-4">Nenhuma igreja encontrada.</p>}
                    </div>
                  )}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsVisitorMode(false)}
                  className="w-full h-10 text-[#212351]/50 hover:text-[#212351] text-xs font-bold uppercase tracking-widest"
                >
                  Voltar para o Login
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="mt-8 text-center text-xs text-muted-foreground uppercase font-medium tracking-tight">
            Seja bem-vindo de volta
          </p>
        </div>

        <div className="mt-8 flex justify-center gap-4">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-blue-600" onClick={() => navigate("/")}>
             Voltar para Início
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
