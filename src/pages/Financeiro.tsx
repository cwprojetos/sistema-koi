import { useState } from "react";
import { DollarSign, AlertTriangle, Receipt, Plus, Upload, Pencil, Trash2, CheckCircle, TrendingUp, TrendingDown, BarChart3, ChevronLeft, ChevronRight, Wallet, Users, Banknote, PieChart as PieChartIcon } from "lucide-react";
import { PieChart, Pie, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { PageHeader } from "@/components/PageHeader";
import { contasAbertas as mockContas, recibos as mockRecibos } from "@/data/mockData";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financeiroContasApi, financeiroRecibosApi, membrosIgrejaApi } from "@/services/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { uploadFile } from "@/services/api";
import { useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function Financeiro() {
  const { canWrite } = useAuth();
  const canEdit = canWrite('financeiro');
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState<any>(null);
  const [activeModalTab, setActiveModalTab] = useState<'conta' | 'recibo' | 'membro' | 'dizimo'>('conta');
  const [activeViewTab, setActiveViewTab] = useState("caixa");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tithePreview, setTithePreview] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Month/Year filter
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const { data: contasData, isError: isErrorContas } = useQuery({ queryKey: ['financeiro_contas'], queryFn: () => financeiroContasApi.getAll() });
  const { data: recibosData, isError: isErrorRecibos } = useQuery({ queryKey: ['financeiro_recibos'], queryFn: () => financeiroRecibosApi.getAll() });
  const { data: membros = [] } = useQuery({ queryKey: ['membros_igreja'], queryFn: () => membrosIgrejaApi.getAll() });

  const contaMutation = useMutation({
    mutationFn: (data: any) => editingItem?.id ? financeiroContasApi.update(editingItem.id, data) : financeiroContasApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiro_contas'] });
      queryClient.invalidateQueries({ queryKey: ['financeiro_recibos'] });
      setIsModalOpen(false);
      setEditingItem(null);
      toast.success("Conta salva!");
    },
    onError: (error) => { toast.error("Erro ao salvar a conta."); console.error(error); }
  });

  const reciboMutation = useMutation({
    mutationFn: (data: any) => editingItem?.id ? financeiroRecibosApi.update(editingItem.id, data) : financeiroRecibosApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['financeiro_recibos'] }); setIsModalOpen(false); setEditingItem(null); setSelectedFile(null); toast.success("Recibo salvo!"); },
    onError: (error) => { toast.error("Erro ao salvar o recibo."); console.error(error); }
  });

  const deleteConta = useMutation({
    mutationFn: (id: number) => financeiroContasApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiro_contas'] });
      toast.success("Conta excluída!");
    },
    onError: (err: any) => {
      toast.error("Erro ao excluir. " + err.message);
    }
  });

  const deleteRecibo = useMutation({
    mutationFn: (id: number) => financeiroRecibosApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiro_recibos'] });
      toast.success("Recibo excluído!");
    },
    onError: (err: any) => {
      toast.error("Erro ao excluir. " + err.message);
    }
  });

  const membroMutation = useMutation({
    mutationFn: (data: any) => editingItem?.id ? membrosIgrejaApi.update(editingItem.id, data) : membrosIgrejaApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['membros_igreja'] }); setIsModalOpen(false); setEditingItem(null); toast.success("Membro salvo!"); }
  });

  const deleteMembro = useMutation({
    mutationFn: (id: number) => membrosIgrejaApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['membros_igreja'] }); toast.success("Membro excluído!"); }
  });

  const dizimoMutation = useMutation({
    mutationFn: (data: any) => membrosIgrejaApi.registrarDizimo(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiro_recibos'] });
      setIsModalOpen(false);
      setEditingItem(null);
      toast.success("Dízimo registrado e entrada lançada no caixa!");
    }
  });

  const contas = (isErrorContas || contasData === undefined) ? mockContas : contasData;
  const recibos = (isErrorRecibos || recibosData === undefined) ? mockRecibos : recibosData;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "Data não informada";
    try {
      const datePart = dateStr.split('T')[0];
      const d = new Date(datePart + "T12:00:00");
      if (isNaN(d.getTime())) return "Data Inválida";
      return d.toLocaleDateString("pt-BR");
    } catch (e) {
      return "Data Inválida";
    }
  };

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const goToPrevMonth = () => {
    if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear(selectedYear - 1); }
    else setSelectedMonth(selectedMonth - 1);
  };
  const goToNextMonth = () => {
    if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear(selectedYear + 1); }
    else setSelectedMonth(selectedMonth + 1);
  };

  const getYearMonth = (dateString: string): { year: number; month: number } | null => {
    if (!dateString) return null;
    try {
      const [y, m] = dateString.split('T')[0].split('-');
      return { year: parseInt(y), month: parseInt(m) };
    } catch { return null; }
  };

  const isSelectedMonth = (dateString: string) => {
    const ym = getYearMonth(dateString);
    if (!ym) return false;
    return ym.year === selectedYear && ym.month === selectedMonth;
  };

  const isBeforeSelectedMonth = (dateString: string) => {
    const ym = getYearMonth(dateString);
    if (!ym) return false;
    return (ym.year < selectedYear) || (ym.year === selectedYear && ym.month < selectedMonth);
  };

  const totalAberto = contas.filter((c: any) => c.status !== 'pago').reduce((sum: number, c: any) => sum + parseFloat(c.valor || 0), 0);

  // Recibos do mês selecionado
  const recibosMes = recibos.filter((r: any) => isSelectedMonth(r.data));
  const totalEntradas = recibosMes.filter((r: any) => r.tipo === 'entrada').reduce((sum: number, r: any) => sum + parseFloat(r.valor || 0), 0);
  const totalSaidas = recibosMes.filter((r: any) => r.tipo === 'saida').reduce((sum: number, r: any) => sum + parseFloat(r.valor || 0), 0);

  // Saldo residual dos meses anteriores
  const recibosAnteriores = recibos.filter((r: any) => isBeforeSelectedMonth(r.data));
  const entradasAnteriores = recibosAnteriores.filter((r: any) => r.tipo === 'entrada').reduce((sum: number, r: any) => sum + parseFloat(r.valor || 0), 0);
  const saidasAnteriores = recibosAnteriores.filter((r: any) => r.tipo === 'saida').reduce((sum: number, r: any) => sum + parseFloat(r.valor || 0), 0);
  const saldoAnterior = entradasAnteriores - saidasAnteriores;

  const saldoGeral = saldoAnterior + totalEntradas - totalSaidas;

  const handleMarkAsPaid = async (conta: any) => {
    const loadingToast = toast.loading("Processando pagamento...");
    try {
      // 1. Update the bill status to 'pago'
      await financeiroContasApi.update(conta.id, { ...conta, status: 'pago' });

      // 2. Create a corresponding exit receipt
      await financeiroRecibosApi.create({
        descricao: `PAGTO: ${conta.descricao}`,
        valor: conta.valor,
        data: conta.vencimento ? conta.vencimento.split('T')[0] : new Date().toISOString().split('T')[0],
        tipo: 'saida',
        url_arquivo: null
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['financeiro_contas'] }),
        queryClient.invalidateQueries({ queryKey: ['financeiro_recibos'] })
      ]);
      toast.dismiss(loadingToast);
      toast.success("Conta paga e registrada nas saídas!");
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Erro ao processar pagamento.");
      console.error(error);
    }
  };

  // Helper to categorize descriptions for pie charts
  const getCategoriaEntrada = (desc: string) => {
    if (!desc) return 'Outras Entradas';
    const upper = desc.toUpperCase();
    if (upper.includes('DÍZIMO') || upper.includes('DIZIMO')) return 'Dízimos';
    if (upper.includes('OFERTA')) return 'Ofertas';
    if (upper.includes('DOAÇÃO') || upper.includes('DOACAO')) return 'Doações';
    if (upper.includes('BAZAR') || upper.includes('VENDA') || upper.includes('ARRECADA') || upper.includes('PROJETO')) return 'Projetos';
    return 'Outras Entradas';
  };

  const getCategoriaSaida = (desc: string) => {
    if (!desc) return 'Outras Saídas';
    const upper = desc.toUpperCase();
    if (upper.includes('PROJETO')) return 'Projetos';
    if (upper.includes('PAGTO') || upper.includes('CONTA')) return 'Contas';
    return 'Contas'; // Default for saida since it's most likely contas
  };

  const processPieData = (items: any[], colors: string[], tipo: 'entrada' | 'saida') => {
    const grouped = items.reduce((acc: any, item: any) => {
      const cat = tipo === 'entrada' ? getCategoriaEntrada(item.descricao) : getCategoriaSaida(item.descricao);
      acc[cat] = (acc[cat] || 0) + parseFloat(item.valor || 0);
      return acc;
    }, {});
    return Object.entries(grouped)
      .filter(([_, val]) => (val as number) > 0)
      .map(([name, valor], index) => ({
        name,
        valor,
        color: colors[index % colors.length]
      }));
  };

  const COLORS_ENTRADAS = ['#10b981', '#34d399', '#059669', '#6ee7b7', '#047857', '#a7f3d0'];
  const COLORS_SAIDAS = ['#ef4444', '#f87171', '#dc2626', '#fca5a5', '#b91c1c', '#fecaca'];

  const entradasPieData = processPieData(recibosMes.filter((r: any) => r.tipo === 'entrada'), COLORS_ENTRADAS, 'entrada');
  const saidasPieData = processPieData(recibosMes.filter((r: any) => r.tipo === 'saida'), COLORS_SAIDAS, 'saida');

  const chartData = [
    { name: 'Entradas', valor: totalEntradas, color: '#10b981' },
    { name: 'Saídas', valor: totalSaidas, color: '#ef4444' },
    { name: 'Saldo Ant.', valor: saldoAnterior > 0 ? saldoAnterior : 0, color: '#6366f1' },
  ].filter(d => d.valor > 0);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    let finalFileUrl = editingItem?.url_arquivo || null;

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

    const data: any = { ...Object.fromEntries(formData.entries()) };

    if (activeModalTab === 'conta') {
      data.valor = parseFloat(data.valor);
      data.url_arquivo = finalFileUrl;
      data.vencimento = formData.get("vencimento");
      data.status = formData.get("status") || 'pendente';

      if (data.status === 'pago' && (!editingItem || editingItem.status !== 'pago')) {
        await financeiroRecibosApi.create({
          descricao: `PAGTO: ${data.descricao}`,
          valor: data.valor,
          data: data.vencimento ? data.vencimento.split('T')[0] : new Date().toISOString().split('T')[0],
          tipo: 'saida',
          url_arquivo: data.url_arquivo
        }).catch(err => console.error('Falha ao gerar recibo de saída automático:', err));
      }

      contaMutation.mutate(data);
    } else if (activeModalTab === 'recibo') {
      data.valor = parseFloat(data.valor);
      data.url_arquivo = finalFileUrl;
      data.tipo = formData.get("tipo") || 'entrada';
      reciboMutation.mutate(data);
    } else if (activeModalTab === 'membro') {
      data.renda_familiar = parseFloat(data.renda_familiar || 0);
      data.valor_dizimo = parseFloat(data.valor_dizimo || 0);
      membroMutation.mutate(data);
    } else if (activeModalTab === 'dizimo') {
      const valor = parseFloat(data.valor_pagamento);
      const data_pagamento = data.data_pagamento;
      
      dizimoMutation.mutate({ 
        membroId: editingItem.id, 
        nomeMembro: editingItem.nome, 
        valor: valor * 0.06, 
        data_pagamento: data_pagamento,
        recebido_por: data.recebido_por,
        url_arquivo: finalFileUrl
      });
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <PageHeader title="Financeiro" subtitle="Contas, recibos e controle financeiro" />
        <Dialog open={isModalOpen} onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            setEditingItem(null);
            setSelectedFile(null);
            setTithePreview(0);
          } else if (activeModalTab === 'dizimo' && editingItem) {
            setTithePreview(editingItem.valor_dizimo * 0.06);
          }
        }}>
          <DialogTrigger asChild>
            <div className={`flex gap-2 ${!canEdit ? 'hidden' : ''}`}>
              <Button size="sm" onClick={() => { setActiveModalTab('conta'); setEditingItem(null); }} className="gap-2 bg-indigo-600 hover:bg-indigo-700"> <Plus className="w-4 h-4" /> Conta </Button>
              <Button size="sm" variant="outline" onClick={() => { setActiveModalTab('recibo'); setEditingItem(null); }} className="gap-2"> <Plus className="w-4 h-4" /> Recibo </Button>
            </div>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {activeModalTab === 'dizimo' ? 'Receber Dízimo' : `${editingItem ? 'Editar' : 'Novo'} ${activeModalTab.charAt(0).toUpperCase() + activeModalTab.slice(1)}`}
              </DialogTitle>
            </DialogHeader>
            <form key={activeModalTab + (editingItem?.id || 'new')} onSubmit={handleSave} className="space-y-4">
              {(activeModalTab === 'conta' || activeModalTab === 'recibo' || activeModalTab === 'dizimo') && (
                <>
                  {activeModalTab !== 'dizimo' && (
                    <>
                      <Label>Descrição</Label><Input name="descricao" defaultValue={editingItem?.descricao} required />
                    </>
                  )}
                  <Label>{activeModalTab === 'dizimo' ? 'Valor do Dízimo (R$)' : 'Valor (R$)'}</Label>
                  <Input 
                    name={activeModalTab === 'dizimo' ? "valor_pagamento" : "valor"} 
                    type="number" 
                    step="0.01" 
                    defaultValue={activeModalTab === 'dizimo' ? editingItem?.valor_dizimo : editingItem?.valor} 
                    onChange={(e) => {
                      if (activeModalTab === 'dizimo') {
                        setTithePreview(parseFloat(e.target.value || "0") * 0.06);
                      }
                    }}
                    required 
                  />
                  {activeModalTab === 'dizimo' && (
                    <div className="mt-1 p-2 bg-amber-50 border border-amber-100 rounded text-[11px] text-amber-700 font-bold flex justify-between">
                      <span>Fórmula: 6% para o Caixa Local</span>
                      <span>Caixa: R$ {tithePreview.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </>
              )}
              {activeModalTab === 'conta' && (
                <>
                  <Label>Vencimento</Label><Input name="vencimento" type="date" defaultValue={editingItem?.vencimento ? editingItem.vencimento.split('T')[0] : ''} required />
                  <Label>Status</Label>
                  <Select name="status" defaultValue={editingItem?.status || "pendente"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="pago">Pago</SelectItem><SelectItem value="vencido">Vencido</SelectItem></SelectContent>
                  </Select>
                </>
              )}
              {activeModalTab === 'recibo' && (
                <>
                  <Label>Data</Label><Input name="data" type="date" defaultValue={editingItem?.data ? editingItem.data.split('T')[0] : ''} required />
                  <Label>Tipo</Label>
                  <Select name="tipo" defaultValue={editingItem?.tipo || "entrada"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="entrada">Entrada</SelectItem><SelectItem value="saida">Saída</SelectItem></SelectContent>
                  </Select>
                </>
              )}
              {(activeModalTab === 'recibo' || activeModalTab === 'dizimo') && (
                <div className="space-y-2">
                  <Label>Recebido por (Nome):</Label>
                  <Input name="recebido_por" defaultValue={editingItem?.recebido_por || ""} placeholder="Nome de quem recebeu o valor" />
                </div>
              )}

              {(activeModalTab === 'conta' || activeModalTab === 'recibo' || activeModalTab === 'dizimo') && (
                <div className="space-y-2">
                  <Label>{activeModalTab === 'dizimo' ? 'Anexar Recibo do Dízimo' : 'Anexar Arquivo (Opcional - PDF/Img)'}</Label>
                  <div className="flex gap-2">
                    <Input type="file" accept=".pdf,image/*" className="hidden" ref={fileInputRef} onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                    <Button type="button" variant="outline" className="w-full border-dashed" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="w-4 h-4 mr-2" /> {selectedFile ? selectedFile.name : (editingItem?.url_arquivo ? "Trocar Anexo" : "Selecionar Arquivo")}
                    </Button>
                  </div>
                </div>
              )}

              {activeModalTab === 'membro' && (
                <>
                  <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-900 mb-4">
                    <p className="font-bold mb-1">Atualizar Informações Financeiras</p>
                    <p className="text-sm">Membro: <span className="font-semibold">{editingItem?.nome}</span></p>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div><Label>Renda Familiar (R$)</Label><Input name="renda_familiar" type="number" step="0.01" defaultValue={editingItem?.renda_familiar || ""} /></div>
                    <div><Label>Valor de Dízimo Base (R$)</Label><Input name="valor_dizimo" type="number" step="0.01" defaultValue={editingItem?.valor_dizimo || ""} /></div>
                  </div>
                  <input type="hidden" name="nome" value={editingItem?.nome} />
                </>
              )}

              {activeModalTab === 'dizimo' && (
                <>
                  <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-900 mb-4">
                    <p className="font-bold mb-1">Pagamento de Dízimo</p>
                    <p className="text-sm">Membro: <span className="font-semibold">{editingItem?.nome}</span></p>
                  </div>
                  <Label>Data do Pagamento</Label>
                  <Input name="data_pagamento" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
                  <p className="text-xs text-muted-foreground">O valor será registrado automaticamente como uma Entrada no caixa.</p>
                </>
              )}

              <DialogFooter><Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">Salvar</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeViewTab} onValueChange={setActiveViewTab}>
        <div className="mb-6 flex justify-between items-center sm:hidden">
          <TabsList className="w-full h-12">
            <TabsTrigger value="caixa" className="flex-1 text-xs gap-1"><Wallet className="w-4 h-4" /> Caixa</TabsTrigger>
            <TabsTrigger value="membros" className="flex-1 text-xs gap-1"><Users className="w-4 h-4" /> Membros</TabsTrigger>
          </TabsList>
        </div>
        <div className="hidden sm:block mb-8">
          <TabsList className="h-12 w-[400px]">
            <TabsTrigger value="caixa" className="flex-1 gap-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white"><Wallet className="w-4 h-4" /> Fechamento/Caixa</TabsTrigger>
            <TabsTrigger value="membros" className="flex-1 gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"><Users className="w-4 h-4" /> Membros / Dízimos</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="caixa">

          {/* Month Selector */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <Button variant="outline" size="icon" onClick={goToPrevMonth} className="rounded-full h-9 w-9">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="text-center min-w-[200px]">
              <p className="text-xl font-black uppercase tracking-wide">{monthNames[selectedMonth - 1]}</p>
              <p className="text-sm text-muted-foreground font-semibold">{selectedYear}</p>
            </div>
            <Button variant="outline" size="icon" onClick={goToNextMonth} className="rounded-full h-9 w-9">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-4 mb-6">
            <div className="card-church p-6">
              <p className="text-sm text-muted-foreground uppercase font-bold tracking-wider">Total em Aberto</p>
              <p className="text-3xl font-black text-destructive mt-1">R$ {totalAberto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="card-church p-6">
              <p className="text-sm text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1"><Wallet className="w-3.5 h-3.5" /> Saldo Anterior</p>
              <p className={`text-3xl font-black mt-1 ${saldoAnterior >= 0 ? 'text-indigo-500' : 'text-destructive'}`}>R$ {saldoAnterior.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="card-church p-6">
              <p className="text-sm text-muted-foreground uppercase font-bold tracking-wider">Entradas (mês)</p>
              <p className="text-3xl font-black text-accent mt-1">R$ {totalEntradas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="card-church p-6">
              <p className="text-sm text-muted-foreground uppercase font-bold tracking-wider">Saídas (mês)</p>
              <p className="text-3xl font-black text-foreground mt-1">R$ {totalSaidas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card-church p-6">
              <h2 className="text-xl font-black flex items-center gap-2 mb-6 uppercase tracking-tight"><AlertTriangle className="w-6 h-6 text-destructive" /> Contas</h2>
              <div className="space-y-4">
                {contas.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-5 rounded-lg bg-muted/50 group border border-transparent hover:border-muted-foreground/10 transition-colors">
                    <div><h3 className="font-bold text-base text-foreground">{c.descricao}</h3><p className="text-sm text-muted-foreground font-medium">Venc: {formatDate(c.vencimento)}</p></div>
                    <div className="text-right flex items-center gap-4">
                      <div>
                        <p className="font-black text-lg text-foreground">R$ {parseFloat(c.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                        <span className={`badge-church text-[11px] font-bold uppercase ${c.status === "pago" ? "bg-accent/10 text-accent" :
                          c.status === "vencido" ? "bg-destructive/10 text-destructive" :
                            "bg-yellow-500/10 text-yellow-600"
                          }`}>
                          {c.status}
                        </span>
                      </div>
                      {canEdit && (
                        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                          {c.status !== 'pago' && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-accent hover:bg-accent/10" title="Marcar como Pago" onClick={() => handleMarkAsPaid(c)}>
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setActiveModalTab('conta'); setEditingItem(c); setIsModalOpen(true); }}><Pencil className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { toast("Confirmar exclusão?", { action: { label: "Excluir", onClick: () => deleteConta.mutate(c.id) } }); }}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card-church p-6">
              <h2 className="text-xl font-black flex items-center gap-2 mb-6 uppercase tracking-tight"><Receipt className="w-6 h-6 text-accent" /> Recibos — {monthNames[selectedMonth - 1]}</h2>
              {recibosMes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum recibo registrado neste mês.</p>
              ) : (
                <div className="space-y-4">
                  {recibosMes.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between p-5 rounded-lg bg-muted/50 group border border-transparent hover:border-muted-foreground/10 transition-colors">
                      <div>
                        <h3 className="font-bold text-base text-foreground">{r.descricao}</h3>
                        <p className="text-sm text-muted-foreground font-medium">{formatDate(r.data)}</p>
                        {r.recebido_por && (
                          <p className="text-[10px] text-indigo-600 font-black uppercase mt-1">Recebido por: {r.recebido_por}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className={`font-black text-lg ${r.tipo === "entrada" ? "text-accent" : "text-destructive"}`}>
                            {r.tipo === "entrada" ? "+" : "-"} R$ {parseFloat(r.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                          {r.url_arquivo && (
                            <button 
                              onClick={() => setPreviewUrl(r.url_arquivo)} 
                              className="block text-[10px] font-bold text-accent hover:underline uppercase"
                            >
                              Ver Anexo
                            </button>
                          )}
                        </div>
                        {canEdit && (
                          <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setActiveModalTab('recibo'); setEditingItem(r); setIsModalOpen(true); }}>
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { toast("Confirmar exclusão?", { action: { label: "Excluir", onClick: () => deleteRecibo.mutate(r.id) } }); }}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3 mt-8">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card-church p-6 lg:col-span-2">
              <h2 className="text-xl font-black flex items-center gap-2 mb-6 uppercase tracking-tight">
                <BarChart3 className="w-6 h-6 text-[#212351]" /> Fluxo de Caixa (Mensal)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-4">
                <div className="flex flex-col items-center">
                  <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-0">Tipos de Entrada</h3>
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={entradasPieData} dataKey="valor" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={65} stroke="none" labelLine={false}>
                          {entradasPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(value: any) => [`R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 'Valor']} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <h3 className="text-xs font-bold text-destructive uppercase tracking-widest mb-0">Tipos de Saída</h3>
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={saidasPieData} dataKey="valor" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={65} stroke="none" labelLine={false}>
                          {saidasPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(value: any) => [`R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 'Valor']} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <h3 className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-0">Balanço Geral</h3>
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={chartData} dataKey="valor" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={65} stroke="none" labelLine={false}>
                          {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(value: any) => [`R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 'Valor']} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card-church p-6 flex flex-col justify-center">
              <h2 className="text-xl font-black uppercase tracking-tight mb-8 text-[#212351]">Balanço — {monthNames[selectedMonth - 1]}</h2>

              <div className="space-y-4">
                {saldoAnterior !== 0 && (
                  <div className="flex justify-between items-center p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-muted-foreground uppercase text-xs tracking-widest">Saldo Anterior</span>
                    </div>
                    <span className={`font-black ${saldoAnterior >= 0 ? 'text-indigo-500' : 'text-destructive'}`}>R$ {saldoAnterior.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                <div className="flex justify-between items-center p-4 rounded-xl bg-accent/5 border border-accent/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-muted-foreground uppercase text-xs tracking-widest">Entradas</span>
                  </div>
                  <span className="font-black text-accent">R$ {totalEntradas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between items-center p-4 rounded-xl bg-destructive/5 border border-destructive/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                      <TrendingDown className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-muted-foreground uppercase text-xs tracking-widest">Saídas</span>
                  </div>
                  <span className="font-black text-destructive">R$ {totalSaidas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>

                <div className={`mt-4 p-6 rounded-2xl flex flex-col items-center transition-colors ${saldoGeral >= 0 ? "bg-[#212351] text-white" : "bg-destructive text-white"}`}>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Resultado Final (com saldo anterior)</span>
                  <span className="text-3xl font-black">R$ {saldoGeral.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  <span className="text-[10px] mt-2 font-bold opacity-80">{saldoGeral >= 0 ? "SUPERÁVIT" : "DÉFICIT"}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </TabsContent>

        <TabsContent value="membros">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card-church p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-black flex items-center gap-2 tracking-tight text-emerald-600"><Users className="w-6 h-6" /> Gestão de Dízimos</h2>
                <p className="text-sm text-muted-foreground mt-1">Os dados dos membros são sincronizados automaticamente com a Secretaria.</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {membros.map((m: any) => (
                <div key={m.id} className="border rounded-xl p-5 hover:border-emerald-200 transition-colors bg-card shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg">{m.nome}</h3>
                      <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">{m.documentos ? `Doc: ${m.documentos}` : "Sem Doc."}</p>
                    </div>
                    <div className="flex">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" title="Editar Informações Financeiras" onClick={() => { setEditingItem(m); setActiveModalTab('membro'); setIsModalOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">Aniv.:</span> {m.aniversario ? m.aniversario.split('T')[0].split('-').reverse().join('/') : "-"}</p>
                    {m.endereco && <p className="text-sm text-muted-foreground line-clamp-1"><span className="font-semibold text-foreground">Endereço:</span> {m.endereco}</p>}
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">Estado Civil:</span> <span className="capitalize">{m.estado_civil}</span></p>
                      <Badge variant="secondary" className="font-bold">Renda: R$ {parseFloat(m.renda_familiar || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Badge>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-muted/50 mt-auto flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Dízimo Base</p>
                      <p className="font-black text-emerald-600">R$ {parseFloat(m.valor_dizimo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <Button size="sm" variant="outline" className="border-emerald-200 text-emerald-600 hover:bg-emerald-50 h-8 text-xs" onClick={() => {
                      setEditingItem(m);
                      setActiveModalTab('dizimo');
                      setTithePreview(m.valor_dizimo * 0.06);
                      setIsModalOpen(true);
                    }}>
                      <Banknote className="w-3 h-3 mr-1" /> Receber Dízimo
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!previewUrl} onOpenChange={(open) => !open && setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl w-[95vw] h-[90vh] p-0 overflow-hidden rounded-3xl border-0 shadow-2xl bg-[#0a0a0b]/95 backdrop-blur-xl">
          <DialogHeader className="absolute top-4 right-4 z-50 p-0 m-0">
             <Button variant="ghost" size="icon" className="h-10 w-10 text-white hover:bg-white/10 rounded-full" onClick={() => setPreviewUrl(null)}>
               <CheckCircle className="w-5 h-5 hidden" /> {/* Hidden but keeps the Lucide import alive if needed */}
             </Button>
          </DialogHeader>
          <div className="w-full h-full flex items-center justify-center p-4">
            {previewUrl && (
              <img 
                src={previewUrl} 
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" 
                alt="Comprovante" 
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
