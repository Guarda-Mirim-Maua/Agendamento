/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useBranding } from '../hooks/useBranding';
import { 
  Printer, 
  Send, 
  FileText, 
  ChevronLeft, 
  Sparkles, 
  CheckCircle, 
  Trash2, 
  Download,
  Phone,
  PlusCircle,
  FileSpreadsheet
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Helper function to convert number to words in Portuguese
function numeroPorExtenso(num: number): string {
  const unidades = ["", "Um", "Dois", "Três", "Quatro", "Cinco", "Seis", "Sete", "Oito", "Nove"];
  const dezenas10 = ["Dez", "Onze", "Doze", "Treze", "Quatorze", "Quinze", "Dezesseis", "Dezessete", "Dezoito", "Dezenove"];
  const dezenas = ["", "Dez", "Vinte", "Trinta", "Quarenta", "Cinquenta", "Sessenta", "Setenta", "Oitenta", "Noventa"];
  const centenas = ["", "Cento", "Duzentos", "Trezentos", "Quatrocentos", "Quinhentos", "Seiscentos", "Setecentos", "Oitocentos", "Novecentos"];

  if (num === 0) return "Zero";
  if (num === 100) return "Cem";

  let words = "";

  if (num >= 1000) {
    const milhares = Math.floor(num / 1000);
    if (milhares === 1) {
      words += "Mil ";
    } else {
      words += numeroPorExtenso(milhares) + " Mil ";
    }
    num %= 1000;
    if (num > 0) {
      if (num < 100 || num % 100 === 0) {
        words += "e ";
      } else {
        words += ", ";
      }
    }
  }

  if (num >= 100) {
    const cent = Math.floor(num / 100);
    if (num === 100) {
      words += "Cem";
    } else {
      words += centenas[cent];
    }
    num %= 100;
    if (num > 0) words += " e ";
  }

  if (num >= 20) {
    const dez = Math.floor(num / 10);
    words += dezenas[dez];
    num %= 10;
    if (num > 0) words += " e " + unidades[num];
  } else if (num >= 10) {
    words += dezenas10[num - 10];
  } else if (num > 0) {
    words += unidades[num];
  }

  return words.trim();
}

function valorPorExtenso(valor: number): string {
  if (isNaN(valor) || valor <= 0) return "Zero Reais e Zero Centavos";
  
  const inteiro = Math.floor(valor);
  const centavos = Math.round((valor - inteiro) * 100);

  let extenso = "";

  if (inteiro > 0) {
    const extInteiro = numeroPorExtenso(inteiro);
    extenso += extInteiro + (inteiro === 1 ? " Real" : " Reais");
  } else {
    extenso += "Zero Reais";
  }

  if (centavos > 0) {
    extenso += " e " + numeroPorExtenso(centavos) + (centavos === 1 ? " Centavo" : " Centavos");
  } else {
    extenso += " e Zero Centavos";
  }

  return extenso.trim();
}

interface SavedReceipt {
  id: string;
  receiptNumber: string;
  date: string;
  pagador: string;
  document: string;
  aluno: string;
  valor: number;
  referencia: string;
  turma: string;
  ano: string;
  whatsapp: string;
  createdAt: number;
}

export default function ReciboGenerator() {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const { logo } = useBranding();

  // Form Fields
  const [receiptNumber, setReceiptNumber] = useState("");
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [pagador, setPagador] = useState("");
  const [documentVal, setDocumentVal] = useState("");
  const [aluno, setAluno] = useState("");
  const [valor, setValor] = useState<number>(0);
  const [referencia, setReferencia] = useState("");
  const [turma, setTurma] = useState("");
  const [ano, setAno] = useState("2026");
  const [whatsapp, setWhatsapp] = useState("");
  
  // Custom states
  const [showSignature, setShowSignature] = useState(true);
  const [savedReceipts, setSavedReceipts] = useState<SavedReceipt[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  useEffect(() => {
    if (!logo) {
      setLogoBase64(null);
      return;
    }

    const convertLogoToBase64 = async () => {
      try {
        const response = await fetch(logo, { mode: 'cors' });
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          setLogoBase64(reader.result as string);
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        console.warn("Failed to pre-fetch logo with CORS, falling back to original URL:", err);
        setLogoBase64(logo);
      }
    };

    convertLogoToBase64();
  }, [logo]);

  // Load history & set auto-incrementing receipt number on mount
  useEffect(() => {
    const history = localStorage.getItem('gmm_receipts_history');
    let currentSaved: SavedReceipt[] = [];
    if (history) {
      try {
        currentSaved = JSON.parse(history);
        setSavedReceipts(currentSaved);
      } catch (e) {
        console.error('Error parsing receipts history:', e);
      }
    }

    // Auto-generate receipt number based on count
    const nextNum = currentSaved.length + 1;
    const padded = String(nextNum).padStart(3, '0');
    setReceiptNumber(`GM-2026-${padded}`);
  }, []);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleLoadMock = () => {
    setPagador("Jéssica Barros da Silva");
    setDocumentVal("350860555");
    setAluno("Daniel Henrique Barros da Silva");
    setValor(50.00);
    setReferencia("Matrícula");
    setTurma("02");
    setAno("2026");
    setWhatsapp("11999999999");
    triggerToast("Dados de demonstração carregados!");
  };

  const handleResetForm = () => {
    const nextNum = savedReceipts.length + 1;
    const padded = String(nextNum).padStart(3, '0');
    setReceiptNumber(`GM-2026-${padded}`);
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setPagador("");
    setDocumentVal("");
    setAluno("");
    setValor(0);
    setReferencia("");
    setTurma("");
    setAno("2026");
    setWhatsapp("");
    triggerToast("Formulário limpo!");
  };

  const handleSaveToHistory = () => {
    if (!pagador || !aluno || valor <= 0) {
      triggerToast("Preencha Pagador, Aluno e Valor para salvar!");
      return null;
    }

    const newReceipt: SavedReceipt = {
      id: Math.random().toString(36).substring(2, 9),
      receiptNumber,
      date,
      pagador,
      document: documentVal,
      aluno,
      valor,
      referencia,
      turma,
      ano,
      whatsapp,
      createdAt: Date.now(),
    };

    const updated = [newReceipt, ...savedReceipts];
    setSavedReceipts(updated);
    localStorage.setItem('gmm_receipts_history', JSON.stringify(updated));
    return newReceipt;
  };

  const handleDeleteReceipt = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Tem certeza que deseja remover este recibo do histórico local?")) return;
    const updated = savedReceipts.filter(r => r.id !== id);
    setSavedReceipts(updated);
    localStorage.setItem('gmm_receipts_history', JSON.stringify(updated));
    triggerToast("Recibo excluído do histórico!");
  };

  const handleSelectReceipt = (receipt: SavedReceipt) => {
    setReceiptNumber(receipt.receiptNumber);
    setDate(receipt.date);
    setPagador(receipt.pagador);
    setDocumentVal(receipt.document);
    setAluno(receipt.aluno);
    setValor(receipt.valor);
    setReferencia(receipt.referencia);
    setTurma(receipt.turma);
    setAno(receipt.ano);
    setWhatsapp(receipt.whatsapp);
    triggerToast("Recibo carregado para edição!");
  };

  // 1. PRINT ACTION
  const handlePrint = () => {
    window.print();
  };

  // 2. EXPORT PDF Helper
  const generatePDFBlob = async (): Promise<{ blob: Blob; filename: string } | null> => {
    const element = receiptRef.current;
    if (!element) return null;

    setLoading(true);

    // Force a small delay to guarantee that React has finished updating the DOM, styles, and text fields
    await new Promise((resolve) => setTimeout(resolve, 450));
    
    // Attempt multiple canvas scales to handle potential canvas sizing limitations, especially on iOS/mobile browsers
    const scalesToTry = [2.0, 1.5, 1.0];
    let canvas: HTMLCanvasElement | null = null;
    let html2canvasError: any = null;

    for (const currentScale of scalesToTry) {
      try {
        canvas = await html2canvas(element, {
          scale: currentScale,
          useCORS: true,
          allowTaint: false, // Must be false to prevent SecurityError on toDataURL when using cross-origin images
          backgroundColor: '#ffffff',
          logging: true, // Enable logging to aid diagnostic tracing
        });
        if (canvas) {
          break; // Succeeded!
        }
      } catch (err) {
        console.warn(`[html2canvas] Failed to render with scale ${currentScale}:`, err);
        html2canvasError = err;
      }
    }

    if (!canvas) {
      console.error('[html2canvas] All canvas render attempts failed:', html2canvasError);
      alert(`Erro na captura da imagem do recibo (html2canvas): ${html2canvasError?.message || html2canvasError || 'Erro de renderização'}`);
      setLoading(false);
      return null;
    }

    // Convert Canvas to PNG image data & generate jsPDF Document
    try {
      let imgData = "";
      try {
        imgData = canvas.toDataURL('image/png');
      } catch (taintErr: any) {
        console.error('[canvas.toDataURL] Failed to extract image data (typically canvas taint due to CORS):', taintErr);
        alert(`Erro de segurança do Canvas (CORS/Taint): ${taintErr?.message || taintErr || 'Erro desconhecido'}. Por favor, certifique-se de que o logo está acessível e possui as permissões CORS corretas.`);
        return null;
      }

      // Receipt has landscape-like aspect ratio, so we configure landscape orientation
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 277; // A4 landscape width is 297mm (10mm margin left/right)
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Center vertically on the page
      const yOffset = (210 - imgHeight) / 2;

      pdf.addImage(imgData, 'PNG', 10, Math.max(10, yOffset), imgWidth, imgHeight);
      
      const filename = `recibo-${receiptNumber || 'GMM'}.pdf`;
      const blob = pdf.output('blob');
      
      return { blob, filename };
    } catch (error: any) {
      console.error('[jsPDF] Error creating PDF layout:', error);
      alert(`Erro ao criar o arquivo PDF (jsPDF): ${error?.message || error || 'Erro de montagem'}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    // Auto-save to history first
    handleSaveToHistory();
    const result = await generatePDFBlob();
    if (!result) return;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(result.blob);
    link.download = result.filename;
    link.click();
    triggerToast("PDF gerado e baixado com sucesso!");
  };

  // 3. WHATSAPP & PDF ACTION
  const handleWhatsAppAction = async () => {
    if (!whatsapp) {
      triggerToast("Informe o WhatsApp do destinatário!");
      return;
    }

    // Save to local history list
    handleSaveToHistory();

    // Generate the PDF - ensure this is successful before continuing
    const pdfResult = await generatePDFBlob();
    if (!pdfResult) {
      triggerToast("Não foi possível gerar o PDF. Operação cancelada.");
      return;
    }

    // 1. Force the automatic PDF download so it's saved locally and ready to be attached
    try {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(pdfResult.blob);
      link.download = pdfResult.filename;
      link.click();
    } catch (downloadErr) {
      console.error("Failed to automatically trigger PDF download:", downloadErr);
    }

    // Elegant text message with markdown
    const message = `Prezado(a) responsável, segue o recibo oficial digital da *Guarda Mirim de Mauá*.\n\n` +
      `• *Recibo:* ${receiptNumber}\n` +
      `• *Pagador:* ${pagador}\n` +
      `• *Aluno(a):* ${aluno}\n` +
      `• *Valor:* R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
      `• *Referente a:* ${referencia}`;

    // 2. Open WhatsApp Web / App with pre-filled message
    const cleanPhone = whatsapp.replace(/\D/g, '');
    const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const whatsappUrl = `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
    triggerToast("PDF baixado e WhatsApp aberto!");
  };

  // Date formatted beautifully for display
  const formattedDateString = (() => {
    if (!date) return '';
    try {
      const parts = date.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return date;
    }
  })();

  const extensoText = valorPorExtenso(valor);

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 sm:px-6 md:px-8">
      {/* Dynamic Global style injected for printing layout */}
      <style>{`
        @media print {
          /* Hide non-printable components */
          .no-print {
            display: none !important;
          }
          /* Centering and full-width rendering on paper */
          body {
            background-color: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-area {
            width: 100% !important;
            max-width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }
          @page {
            size: landscape;
            margin: 10mm;
          }
        }
      `}</style>

      {/* Header Panel */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 no-print">
        <div>
          <Link 
            to="/admin" 
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-900 mb-2 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar ao Painel Admin
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <FileText className="w-8 h-8 text-blue-700" />
            Emissor de Recibos Oficiais
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Gere, imprima ou compartilhe recibos digitais instantâneos com os responsáveis.
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          <button 
            onClick={handleLoadMock}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Recibo Exemplo
          </button>
          <button 
            onClick={handleResetForm}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Novo Recibo
          </button>
        </div>
      </div>

      {/* Main Dual-Pane Section */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT PANE: Form & Controls */}
        <div className="lg:col-span-5 space-y-6 no-print">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
            <h3 className="font-bold text-slate-800 text-base border-b border-slate-100 pb-2">
              Preenchimento do Recibo
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Número do Recibo
                </label>
                <input 
                  type="text" 
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="Ex: GM-2026-001"
                />
              </div>

              <div className="col-span-1">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Data de Emissão
                </label>
                <input 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nome do Pagador (Responsável)
                </label>
                <input 
                  type="text" 
                  value={pagador}
                  onChange={(e) => setPagador(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="Nome completo de quem está pagando"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    CPF ou RG
                  </label>
                  <input 
                    type="text" 
                    value={documentVal}
                    onChange={(e) => setDocumentVal(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Ex: 350.860.555-xx"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Valor Total (R$)
                  </label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    value={valor || ""}
                    onChange={(e) => setValor(parseFloat(e.target.value) || 0)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 font-semibold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Referência do Pagamento (Destino)
                </label>
                <input 
                  type="text" 
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="Ex: Matrícula, Mensalidade, Uniforme, etc."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nome do Aluno(a)
                </label>
                <input 
                  type="text" 
                  value={aluno}
                  onChange={(e) => setAluno(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="Nome completo do aluno"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Turma / Ano
                  </label>
                  <input 
                    type="text" 
                    value={turma}
                    onChange={(e) => setTurma(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Ex: 02"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Ano Letivo
                  </label>
                  <input 
                    type="text" 
                    value={ano}
                    onChange={(e) => setAno(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Ex: 2026"
                  />
                </div>
              </div>
            </div>

            {/* Customizations */}
            <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Assinatura do Presidente</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={showSignature}
                  onChange={(e) => setShowSignature(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:width-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                <span className="ml-2 text-xs text-slate-500">{showSignature ? 'Exibir' : 'Ocultar'}</span>
              </label>
            </div>
          </div>

          {/* Share Block */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-slate-800 text-base">
              Ações de Envio
            </h3>
            
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                WhatsApp do Destinatário
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-4 w-4 text-slate-400" />
                </div>
                <input 
                  type="tel" 
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="(DDD) 99999-9999"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg shadow-sm transition-colors cursor-pointer text-sm"
              >
                <Printer className="w-4 h-4" />
                Imprimir A4
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={handleWhatsAppAction}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50 text-sm"
              >
                <Send className="w-4 h-4" />
                {loading ? 'Processando...' : 'Enviar no Zap'}
              </button>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleDownloadPDF}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold border border-blue-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50 text-sm"
            >
              <Download className="w-4 h-4" />
              Baixar apenas PDF
            </button>
          </div>

          {/* Local History Section */}
          {savedReceipts.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-blue-700" />
                  Histórico Local ({savedReceipts.length})
                </h3>
                <span className="text-[10px] text-slate-400 font-medium">Salvo no navegador</span>
              </div>
              
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {savedReceipts.map((receipt) => (
                  <div 
                    key={receipt.id}
                    onClick={() => handleSelectReceipt(receipt)}
                    className="p-2.5 border border-slate-100 hover:border-blue-200 bg-slate-50 hover:bg-blue-50/30 rounded-lg transition-all flex items-center justify-between cursor-pointer group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-mono text-xs font-bold text-blue-700">{receipt.receiptNumber}</span>
                        <span className="text-[10px] text-slate-400">
                          {format(new Date(receipt.date + 'T12:00:00'), 'dd/MM')}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-700 truncate">{receipt.pagador}</p>
                      <p className="text-[10px] text-slate-500 truncate">Aluno: {receipt.aluno}</p>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-xs font-extrabold text-slate-800">
                        R$ {receipt.valor.toFixed(2)}
                      </span>
                      <button
                        onClick={(e) => handleDeleteReceipt(receipt.id, e)}
                        className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Excluir do histórico"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANE: Clean Paper Receipt Replica */}
        <div className="lg:col-span-7 flex flex-col items-center">
          
          {/* Label indicating this is a real-time responsive design canvas */}
          <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-800 text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 no-print">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            Visualização do Recibo Oficial (A4 Landscape)
          </div>

          {/* Printable visual frame */}
          <div 
            id="receipt-print-container"
            ref={receiptRef}
            className="print-area w-full max-w-[21cm] p-6 md:p-8 space-y-4 select-none relative overflow-hidden"
            style={{
              fontFamily: "'Inter', sans-serif",
              backgroundColor: '#ffffff',
              color: '#0f172a',
              borderColor: '#cbd5e1',
              borderWidth: '1px',
              borderStyle: 'solid',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)'
            }}
          >
            {/* Header: Circular Logo and Entity Name */}
            <div className="flex flex-col items-center text-center pb-2 relative z-10">
              {/* Outer Custom Curved SVG Crest Badge / Custom Uploaded Logo */}
              {logo ? (
                <div className="w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center overflow-hidden mb-1.5">
                  <img 
                    src={logoBase64 || logo} 
                    alt="Logo Guarda Mirim" 
                    className="w-full h-full object-contain" 
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center relative mb-1.5">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <defs>
                      <path id="textCurveTop" d="M 12,50 A 38,38 0 0,1 88,50" fill="none" />
                      <path id="textCurveBottom" d="M 88,50 A 38,38 0 0,1 12,50" fill="none" />
                    </defs>
                    
                    {/* Outer yellow border */}
                    <circle cx="50" cy="50" r="46" fill="#FFF" stroke="#FACD00" strokeWidth="4" />
                    {/* Inner thin blue contour */}
                    <circle cx="50" cy="50" r="41" fill="none" stroke="#003399" strokeWidth="1.5" />
                    
                    {/* Top curved text */}
                    <text className="text-[5px] font-black" fill="#1e3a8a" dy="1.5">
                      <textPath href="#textCurveTop" startOffset="50%" textAnchor="middle">
                        CENTRO DE INTEGRAÇÃO INFANTO JUVENIL DE MAUÁ
                      </textPath>
                    </text>
                    
                    {/* Bottom curved text */}
                    <text className="text-[5.5px] font-black" fill="#1e3a8a" dy="-1.5">
                      <textPath href="#textCurveBottom" startOffset="50%" textAnchor="middle">
                        DEUS • PÁTRIA • FAMÍLIA
                      </textPath>
                    </text>
                    
                    {/* Center saluting cadet figure */}
                    <g transform="translate(35, 29) scale(1.15)">
                      {/* Head & cap */}
                      <circle cx="12.5" cy="8.5" r="3.2" fill="#1E3A8A" />
                      <path d="M 9.5,6 L 15.5,6 L 14.5,2.5 L 10.5,2.5 Z" fill="#1D4ED8" />
                      <circle cx="12.5" cy="2" r="0.8" fill="#FBBF24" />
                      
                      {/* Saluting arms */}
                      <path d="M 17,9 L 21,7.5 L 19,5.5 Z" fill="#1D4ED8" />
                      <path d="M 8,9 L 4,11 L 8,13 Z" fill="#1D4ED8" />
                      
                      {/* Body/Uniform */}
                      <path d="M 8,11.5 L 17,11.5 L 16.2,21 L 8.8,21 Z" fill="#1E3A8A" />
                      {/* Yellow stripes */}
                      <rect x="9" y="17" width="7" height="1.2" fill="#FBBF24" />
                      <path d="M 12,11.5 L 13,11.5 L 12.5,15 Z" fill="#FBBF24" />
                    </g>
                  </svg>

                  {/* Date established label */}
                  <div 
                    className="absolute top-[8px] text-[5px] font-black px-1 py-0.5 rounded scale-90"
                    style={{
                      backgroundColor: '#facc15',
                      color: '#172554',
                      border: '1px solid #1e3a8a',
                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                    }}
                  >
                    FUNDADA EM 30-04-62
                  </div>
                </div>
              )}
            </div>

            {/* Gray Header Row: "RECIBO OFICIAL DE PAGAMENTO" */}
            <div 
              className="py-2 px-4 text-center"
              style={{
                border: '1px solid #0f172a',
                backgroundColor: 'rgba(245, 245, 245, 0.85)',
              }}
            >
              <h2 className="text-sm sm:text-base md:text-lg font-black tracking-wider uppercase" style={{ color: '#1e293b' }}>
                RECIBO OFICIAL DE PAGAMENTO
              </h2>
            </div>

            {/* Receipt Box */}
            <div 
              className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm relative z-10"
              style={{
                border: '1px solid #0f172a',
                backgroundColor: '#ffffff'
              }}
            >
              
              {/* Row 1: Receipt Number & Date */}
              <div 
                className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-2"
                style={{
                  borderBottom: '1px dashed #e2e8f0'
                }}
              >
                <div className="flex items-baseline gap-1 min-w-0">
                  <span className="font-extrabold shrink-0 uppercase tracking-tight" style={{ color: '#334155' }}>NÚMERO DO RECIBO:</span>
                  <span className="font-black font-mono text-base tracking-tight px-1 truncate" style={{ color: '#1e40af', borderBottom: '1px solid #0f172a' }}>
                    {receiptNumber || 'GM-2026-___'}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 shrink-0">
                  <span className="font-bold italic text-sm" style={{ color: '#1e293b' }}>
                    Mauá, {formattedDateString || '____ de _____________ de ______'}.
                  </span>
                </div>
              </div>

              {/* Row 2: RECEBI DE */}
              <div className="flex items-baseline gap-2">
                <span className="font-extrabold shrink-0 uppercase tracking-tight" style={{ color: '#334155' }}>RECEBI DE:</span>
                <span className="flex-1 font-bold px-2 italic text-sm truncate" style={{ color: '#0f172a', borderBottom: '1px solid rgba(148, 163, 184, 0.8)' }}>
                  {pagador || '__________________________________________________________________'}
                </span>
              </div>

              {/* Row 3: CPF / RG & VALOR */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-baseline">
                <div className="md:col-span-7 flex items-baseline gap-2">
                  <span className="font-extrabold shrink-0 uppercase tracking-tight" style={{ color: '#334155' }}>CPF / RG:</span>
                  <span className="flex-1 font-bold px-2 font-mono truncate" style={{ color: '#0f172a', borderBottom: '1px solid rgba(148, 163, 184, 0.8)' }}>
                    {documentVal || '__________________________'}
                  </span>
                </div>
                <div className="md:col-span-5 flex items-baseline gap-2 md:justify-end">
                  <span className="font-extrabold shrink-0 uppercase tracking-tight" style={{ color: '#334155' }}>VALOR TOTAL:</span>
                  <span className="font-black text-base px-3 rounded" style={{ color: '#0f172a', borderBottom: '1px solid #0f172a', backgroundColor: '#f8fafc' }}>
                    R$ {valor > 0 ? valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}
                  </span>
                </div>
              </div>

              {/* Row 4: EXTENSO TEXT ONLY */}
              <div className="flex items-baseline gap-2">
                <span className="flex-1 font-bold px-2 italic text-xs" style={{ color: '#334155', borderBottom: '1px solid rgba(148, 163, 184, 0.8)' }}>
                  {valor > 0 ? extensoText : '____________________________________________________________________'}
                </span>
              </div>

              {/* Row 5: REFERENTE À */}
              <div className="flex items-baseline gap-2">
                <span className="font-extrabold shrink-0 uppercase tracking-tight" style={{ color: '#334155' }}>REFERENTE À:</span>
                <span className="flex-1 font-bold px-2 italic text-sm truncate" style={{ color: '#0f172a', borderBottom: '1px solid rgba(148, 163, 184, 0.8)' }}>
                  {referencia || '__________________________________________________________________'}
                </span>
              </div>

              {/* Row 6: ALUNO */}
              <div className="flex items-baseline gap-2">
                <span className="font-extrabold shrink-0 uppercase tracking-tight" style={{ color: '#334155' }}>DO ALUNO (A):</span>
                <span className="flex-1 font-bold px-2 text-sm truncate" style={{ color: '#0f172a', borderBottom: '1px solid rgba(148, 163, 184, 0.8)' }}>
                  {aluno || '__________________________________________________________________'}
                </span>
              </div>

              {/* Row 8: FOOTER DETAILS & SIGNATURE */}
              <div className="pt-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                
                {/* Left side: Issuer Entity details */}
                <div className="md:col-span-7 space-y-1">
                  <p className="text-[9px] sm:text-[10px] font-black tracking-tight leading-tight uppercase" style={{ color: '#1e293b' }}>
                    ENTIDADE EMISSORA: CENTRO DE INTEGRAÇÃO INFANTO JUVENIL DE MAUÁ - GUARDA MIRIM
                  </p>
                  <p className="text-[8px] sm:text-[9px] font-medium leading-normal" style={{ color: '#64748b' }}>
                    CNPJ: 50.136.704/0001-64 | Rua Indaiatuba, 294 – Jd. Haydeé - Centro, Mauá, SP
                  </p>
                </div>

                {/* Right side: Signature Zone */}
                <div className="md:col-span-5 flex flex-col items-center text-center relative pt-4 md:pt-0">
                  {/* Cursive Handwriting Signature "Sânderson" */}
                  {showSignature && (
                    <div className="absolute top-[-36px] flex items-center justify-center select-none pointer-events-none transition-opacity">
                      <span 
                        style={{ fontFamily: "'Alex Brush', cursive", color: '#6b21a8' }}
                        className="text-[34px] font-medium tracking-wider -rotate-3"
                      >
                        Sânderson
                      </span>
                    </div>
                  )}
                  <div className="w-full mt-2 pt-1" style={{ borderTop: '1px solid #1e293b' }}>
                    <p className="text-[10px] font-black leading-tight" style={{ color: '#1e293b' }}>
                      SÂNDERSON CAIO LEITE DA SILVA
                    </p>
                    <p className="text-[8px] font-extrabold uppercase tracking-widest leading-none mt-0.5" style={{ color: '#64748b' }}>
                      PRESIDENTE DA ENTIDADE
                    </p>
                  </div>
                </div>

              </div>

            </div>
          </div>

        </div>

      </div>

      {/* Floating dynamic Toast notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white font-medium text-xs px-4 py-2.5 rounded-xl shadow-lg border border-slate-800 flex items-center gap-2 animate-bounce">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
