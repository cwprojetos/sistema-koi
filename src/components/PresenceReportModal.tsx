import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface PresenceData {
    nome: string;
    funcao: string;
    data: string;
    tipo?: string;
}

interface PresenceReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: PresenceData[];
    title: string;
    type: "Louvor" | "Mídia" | "Secretaria";
}

export function PresenceReportModal({ isOpen, onClose, data, title, type }: PresenceReportModalProps) {
    const [month, setMonth] = useState<string>(new Date().getMonth() + 1 + "");
    const [year, setYear] = useState<string>(new Date().getFullYear() + "");
    const [isGenerating, setIsGenerating] = useState(false);

    const monthNames = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    const generatePDF = () => {
        setIsGenerating(true);
        try {
            const doc = new jsPDF();
            const selectedMonthName = monthNames[parseInt(month) - 1];

            // Header
            doc.setFontSize(20);
            doc.setTextColor(33, 35, 81);
            doc.text(title, 14, 22);

            doc.setFontSize(12);
            doc.setTextColor(100, 100, 100);
            doc.text(`${selectedMonthName} de ${year}`, 14, 30);

            doc.setDrawColor(33, 35, 81);
            doc.line(14, 35, 196, 35);

            // Filter data
            const filteredData = data.filter(item => {
                if (!item.data) return false;
                const d = new Date(item.data);
                return d.getMonth() + 1 === parseInt(month) && d.getFullYear() === parseInt(year);
            });

            if (filteredData.length === 0) {
                toast.error("Nenhum dado encontrado para o período selecionado.");
                setIsGenerating(false);
                return;
            }

            // Summary by person
            const summary: Record<string, { 
                count: number; 
                functions: Set<string>; 
                dates: string[];
                countsByType: Record<string, number>;
            }> = {};

            filteredData.forEach(item => {
                if (!summary[item.nome]) {
                    summary[item.nome] = { 
                        count: 0, 
                        functions: new Set(), 
                        dates: [],
                        countsByType: { "Escola Biblíca": 0, "Culto": 0, "Eventos Diversos": 0 }
                    };
                }
                summary[item.nome].count++;
                summary[item.nome].functions.add(item.funcao);
                if (summary[item.nome].countsByType[item.funcao] !== undefined) {
                    summary[item.nome].countsByType[item.funcao]++;
                } else {
                    summary[item.nome].countsByType["Eventos Diversos"]++;
                }
                summary[item.nome].dates.push(new Date(item.data).toLocaleDateString("pt-BR"));
            });

            let head = [["Nome", "Frequencia", "Funcoes", "Datas"]];
            let tableRows = Object.entries(summary).map(([nome, info]) => [
                nome,
                info.count.toString(),
                Array.from(info.functions).join(", "),
                info.dates.sort().join(", ")
            ]);

            if (type === "Secretaria") {
                head = [["Nome", "Total", "Escola Bíblica", "Culto", "Outros", "Datas"]];
                tableRows = Object.entries(summary).map(([nome, info]) => [
                    nome,
                    info.count.toString(),
                    info.countsByType["Escola Biblíca"].toString(),
                    info.countsByType["Culto"].toString(),
                    info.countsByType["Eventos Diversos"].toString(),
                    info.dates.sort().join(", ")
                ]);
            }

            // Add Table
            autoTable(doc, {
                startY: 45,
                head: head,
                body: tableRows,
                headStyles: { fillColor: [33, 35, 81], textColor: [255, 255, 255] },
                alternateRowStyles: { fillColor: [245, 245, 245] },
                margin: { top: 45 },
            });

            // Footer
            const pageCount = (doc as any).internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(10);
                doc.setTextColor(150, 150, 150);
                doc.text(
                    `Gerado em ${new Date().toLocaleString("pt-BR")} - Pagina ${i} de ${pageCount}`,
                    14,
                    doc.internal.pageSize.getHeight() - 10
                );
            }

            const cleanType = type.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
            const cleanMonth = selectedMonthName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
            const fileName = `Relatorio_${cleanType}_${cleanMonth}_${year}.pdf`;

            doc.save(fileName);

            toast.success("Relatório gerado com sucesso!");
            onClose();
        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            toast.error("Erro ao gerar o relatório.");
        } finally {
            setIsGenerating(false);
        }
    };

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-accent" />
                        Gerar Relatório de Presença - {type}
                    </DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="month" className="text-right text-xs font-bold uppercase">Mês</Label>
                        <Select value={month} onValueChange={setMonth}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Selecione o mês" />
                            </SelectTrigger>
                            <SelectContent>
                                {monthNames.map((name, i) => (
                                    <SelectItem key={i} value={(i + 1).toString()}>{name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="year" className="text-right text-xs font-bold uppercase">Ano</Label>
                        <Select value={year} onValueChange={setYear}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Selecione o ano" />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map(y => (
                                    <SelectItem key={y} value={y}>{y}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isGenerating}>Cancelar</Button>
                    <Button onClick={generatePDF} disabled={isGenerating} className="gap-2">
                        {isGenerating ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
                        ) : (
                            <><Download className="w-4 h-4" /> Baixar PDF</>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
