/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { db } from '../../lib/firebase';
import {
  collection,
  query,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import {
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  PlusCircle,
  FileSpreadsheet,
  Search,
  Filter,
  Edit2,
  Trash2,
  Download,
  Calendar,
  Tag,
  Loader2,
  PieChart as PieChartIcon,
  BarChart3,
  CheckCircle2,
  X,
  AlertCircle,
  DollarSign,
  Upload,
  Camera,
  FileText,
  Eye,
  Paperclip,
  ExternalLink,
  CheckSquare,
  Square,
  FileCheck2,
  Sparkles
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export interface Transaction {
  id?: string;
  date: string; // YYYY-MM-DD
  description: string;
  category: string;
  type: 'income' | 'expense';
  amount: number;
  proofUrl?: string;       // Base64 Data URL or Image/PDF link
  proofFileName?: string;  // Original file name
  proofFileType?: string;  // 'image/jpeg', 'application/pdf', etc.
  driveUrl?: string;       // Legacy compatibility
  notes?: string;
  createdAt?: number;
}

export interface ImportedTransactionPreview {
  idTemp: string;
  selected: boolean;
  date: string; // YYYY-MM-DD
  description: string;
  category: string;
  type: 'income' | 'expense';
  amount: number;
  isDuplicate?: boolean;
  rawOrigem?: string;
  rawDestino?: string;
  rawTipo?: string;
}

const EXPENSE_CATEGORIES = [
  'Operacionais (Luz, Água, Internet, Tel)',
  'Administrativas & Papelaria',
  'Manutenção & Reformas',
  'Projetos & Oficinas Sociais',
  'Contábil & Jurídico',
  'Alimentação & Cestas Básicas',
  'Eventos & Ações Sociais',
  'Impostos, Taxas & Tarifas',
  'Outras Despesas',
];

const INCOME_CATEGORIES = [
  'Doações Institucionais / Empresas',
  'Doações Pessoas Físicas / PIX',
  'Mensalidades & Contribuições',
  'Subvenções & Repasses Públicos',
  'Eventos & Bazares Beneficentes',
  'Venda de Produtos & Uniformes',
  'Rendimentos Financeiros',
  'Outras Receitas',
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  // Despesas (Expense)
  'Operacionais (Luz, Água, Internet, Tel)': { bg: 'bg-blue-50', text: 'text-blue-700', dot: '#2563eb' },
  'Administrativas & Papelaria': { bg: 'bg-purple-50', text: 'text-purple-700', dot: '#9333ea' },
  'Manutenção & Reformas': { bg: 'bg-amber-50', text: 'text-amber-700', dot: '#d97706' },
  'Projetos & Oficinas Sociais': { bg: 'bg-teal-50', text: 'text-teal-700', dot: '#0d9488' },
  'Contábil & Jurídico': { bg: 'bg-slate-100', text: 'text-slate-700', dot: '#475569' },
  'Alimentação & Cestas Básicas': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: '#059669' },
  'Eventos & Ações Sociais': { bg: 'bg-pink-50', text: 'text-pink-700', dot: '#db2777' },
  'Impostos, Taxas & Tarifas': { bg: 'bg-red-50', text: 'text-red-700', dot: '#dc2626' },
  'Outras Despesas': { bg: 'bg-gray-100', text: 'text-gray-700', dot: '#6b7280' },

  // Receitas (Income)
  'Doações Institucionais / Empresas': { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: '#4f46e5' },
  'Doações Pessoas Físicas / PIX': { bg: 'bg-sky-50', text: 'text-sky-700', dot: '#0284c7' },
  'Mensalidades & Contribuições': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: '#10b981' },
  'Subvenções & Repasses Públicos': { bg: 'bg-violet-50', text: 'text-violet-700', dot: '#7c3aed' },
  'Eventos & Bazares Beneficentes': { bg: 'bg-rose-50', text: 'text-rose-700', dot: '#e11d48' },
  'Venda de Produtos & Uniformes': { bg: 'bg-cyan-50', text: 'text-cyan-700', dot: '#0891b2' },
  'Rendimentos Financeiros': { bg: 'bg-green-50', text: 'text-green-700', dot: '#16a34a' },
  'Outras Receitas': { bg: 'bg-gray-100', text: 'text-gray-700', dot: '#4b5563' },
};

const SEED_DATA: Omit<Transaction, 'id'>[] = [
  {
    date: '2026-07-05',
    description: 'Doação Institucional Mensal - Empresa Parceira',
    category: 'Doações Institucionais / Empresas',
    type: 'income',
    amount: 3500.00,
    notes: 'Doação via PIX para manutenção dos projetos sociais',
    createdAt: Date.now() - 1000000,
  },
  {
    date: '2026-07-08',
    description: 'Pagamento Energia Elétrica (Enel) - Sede Guarda Mirim',
    category: 'Operacionais (Luz, Água, Internet, Tel)',
    type: 'expense',
    amount: 642.50,
    notes: 'Conta de luz referente a Junho/2026',
    createdAt: Date.now() - 900000,
  },
  {
    date: '2026-07-10',
    description: 'Mensalidades e Contribuições dos Alunos',
    category: 'Mensalidades & Contribuições',
    type: 'income',
    amount: 2150.00,
    notes: 'Recebimento de mensalidades balcão',
    createdAt: Date.now() - 800000,
  },
  {
    date: '2026-07-12',
    description: 'Honorários Contábeis - Escritório de Contabilidade',
    category: 'Contábil & Jurídico',
    type: 'expense',
    amount: 450.00,
    notes: 'Prestação de serviços contábeis mensais',
    createdAt: Date.now() - 700000,
  },
  {
    date: '2026-07-15',
    description: 'Aquisição de Cestas Básicas para Famílias de Atendidos',
    category: 'Alimentação & Cestas Básicas',
    type: 'expense',
    amount: 1120.00,
    notes: 'Nota fiscal Supermercado Mauá',
    createdAt: Date.now() - 600000,
  },
  {
    date: '2026-07-18',
    description: 'Reparo na Rede Elétrica e Lâmpadas LED do Auditório',
    category: 'Manutenção & Reformas',
    type: 'expense',
    amount: 380.00,
    notes: 'Material de elétrica + mão de obra',
    createdAt: Date.now() - 500000,
  },
  {
    date: '2026-07-20',
    description: 'Subvenção Municipal / Repasse de Projeto Social',
    category: 'Subvenções & Repasses Públicos',
    type: 'income',
    amount: 5000.00,
    notes: 'Convênio de capacitação de jovens',
    createdAt: Date.now() - 400000,
  },
  {
    date: '2026-07-22',
    description: 'Material de Escritório, Papelaria e Impressões',
    category: 'Administrativas & Papelaria',
    type: 'expense',
    amount: 295.80,
    notes: 'Impressão de recibos, folhetos e papéis A4',
    createdAt: Date.now() - 300000,
  },
];

// Helper to auto-suggest category based on text
function autoSuggestCategory(description: string, type: 'income' | 'expense'): string {
  const desc = description.toLowerCase();

  if (type === 'expense') {
    if (
      desc.includes('enel') ||
      desc.includes('luz') ||
      desc.includes('eletric') ||
      desc.includes('água') ||
      desc.includes('agua') ||
      desc.includes('sabesp') ||
      desc.includes('internet') ||
      desc.includes('vivo') ||
      desc.includes('claro') ||
      desc.includes('tim') ||
      desc.includes('telefone')
    ) {
      return 'Operacionais (Luz, Água, Internet, Tel)';
    }
    if (
      desc.includes('papel') ||
      desc.includes('impress') ||
      desc.includes('escritorio') ||
      desc.includes('escritório') ||
      desc.includes('papelaria') ||
      desc.includes('cartucho') ||
      desc.includes('xerox') ||
      desc.includes('folha')
    ) {
      return 'Administrativas & Papelaria';
    }
    if (
      desc.includes('manutencao') ||
      desc.includes('manutenção') ||
      desc.includes('reforma') ||
      desc.includes('eletrica') ||
      desc.includes('elétrica') ||
      desc.includes('pintura') ||
      desc.includes('mão de obra') ||
      desc.includes('mao de obra') ||
      desc.includes('deposito') ||
      desc.includes('depósito')
    ) {
      return 'Manutenção & Reformas';
    }
    if (
      desc.includes('contabil') ||
      desc.includes('contábil') ||
      desc.includes('honorario') ||
      desc.includes('honorários') ||
      desc.includes('juridico') ||
      desc.includes('jurídico') ||
      desc.includes('advogado') ||
      desc.includes('escritorio de contabilidade')
    ) {
      return 'Contábil & Jurídico';
    }
    if (
      desc.includes('mercado') ||
      desc.includes('supermercado') ||
      desc.includes('alimentacao') ||
      desc.includes('alimentação') ||
      desc.includes('cesta') ||
      desc.includes('padaria') ||
      desc.includes('açougue') ||
      desc.includes('acougue') ||
      desc.includes('lanche') ||
      desc.includes('refeicao') ||
      desc.includes('refeição')
    ) {
      return 'Alimentação & Cestas Básicas';
    }
    if (
      desc.includes('projeto') ||
      desc.includes('oficina') ||
      desc.includes('aula') ||
      desc.includes('didatico') ||
      desc.includes('didático') ||
      desc.includes('curso') ||
      desc.includes('aluno')
    ) {
      return 'Projetos & Oficinas Sociais';
    }
    if (
      desc.includes('evento') ||
      desc.includes('festa') ||
      desc.includes('bazar') ||
      desc.includes('acao social') ||
      desc.includes('ação social')
    ) {
      return 'Eventos & Ações Sociais';
    }
    if (
      desc.includes('imposto') ||
      desc.includes('tarifa') ||
      desc.includes('taxa') ||
      desc.includes('bancaria') ||
      desc.includes('bancária') ||
      desc.includes('darf') ||
      desc.includes('gps') ||
      desc.includes('fgts') ||
      desc.includes('inss')
    ) {
      return 'Impostos, Taxas & Tarifas';
    }
    return 'Outras Despesas';
  } else {
    if (
      desc.includes('empresa') ||
      desc.includes('institucional') ||
      desc.includes('cnpj') ||
      desc.includes('ltda') ||
      desc.includes('s.a') ||
      desc.includes('sa') ||
      desc.includes('doacao empresa') ||
      desc.includes('doação empresa')
    ) {
      return 'Doações Institucionais / Empresas';
    }
    if (
      desc.includes('mensalidade') ||
      desc.includes('contribuicao') ||
      desc.includes('contribuição') ||
      desc.includes('aluno') ||
      desc.includes('mensal')
    ) {
      return 'Mensalidades & Contribuições';
    }
    if (
      desc.includes('prefeitura') ||
      desc.includes('municip') ||
      desc.includes('subvencao') ||
      desc.includes('subvenção') ||
      desc.includes('repasse') ||
      desc.includes('governo') ||
      desc.includes('verba') ||
      desc.includes('convenio') ||
      desc.includes('convênio')
    ) {
      return 'Subvenções & Repasses Públicos';
    }
    if (
      desc.includes('bazar') ||
      desc.includes('evento') ||
      desc.includes('festa') ||
      desc.includes('rifa')
    ) {
      return 'Eventos & Bazares Beneficentes';
    }
    if (
      desc.includes('rendimento') ||
      desc.includes('juros') ||
      desc.includes('aplicacao') ||
      desc.includes('aplicação') ||
      desc.includes('investimento') ||
      desc.includes('poupanca') ||
      desc.includes('poupança')
    ) {
      return 'Rendimentos Financeiros';
    }
    if (
      desc.includes('venda') ||
      desc.includes('uniforme') ||
      desc.includes('produto') ||
      desc.includes('camiseta')
    ) {
      return 'Venda de Produtos & Uniformes';
    }
    if (
      desc.includes('pix') ||
      desc.includes('doacao') ||
      desc.includes('doação') ||
      desc.includes('cpf')
    ) {
      return 'Doações Pessoas Físicas / PIX';
    }
    return 'Outras Receitas';
  }
}

// Helper to parse dates from Excel rows
function parseExcelDate(rawVal: any): string {
  if (!rawVal) return format(new Date(), 'yyyy-MM-dd');

  if (rawVal instanceof Date) {
    if (!isNaN(rawVal.getTime())) {
      return format(rawVal, 'yyyy-MM-dd');
    }
  }

  const str = String(rawVal).trim();

  // Pattern DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const brMatch = str.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (brMatch) {
    const day = parseInt(brMatch[1], 10);
    const month = parseInt(brMatch[2], 10);
    let year = parseInt(brMatch[3], 10);
    if (year < 100) year += 2000;
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${year}-${pad(month)}-${pad(day)}`;
  }

  // Pattern YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${year}-${pad(month)}-${pad(day)}`;
  }

  // Numerical Excel serial date
  const num = Number(str);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const jsDate = new Date((num - (25567 + 2)) * 86400 * 1000);
    return format(jsDate, 'yyyy-MM-dd');
  }

  return format(new Date(), 'yyyy-MM-dd');
}

// Helper to parse currency amount from Excel cell
function parseExcelAmount(rawVal: any): { amount: number; isNegative: boolean } {
  if (typeof rawVal === 'number') {
    return { amount: Math.abs(rawVal), isNegative: rawVal < 0 };
  }

  if (!rawVal) return { amount: 0, isNegative: false };

  let str = String(rawVal).trim().toUpperCase();
  const isNegative = str.includes('-') || str.includes('DÉBITO') || str.includes('SAÍDA') || str.includes('(D)');

  // Clean currency symbols, spaces, parentheses
  str = str.replace(/[R$\s()]/g, '');

  if (str.includes(',') && str.includes('.')) {
    // E.g. 1.500,50 -> remove dot, replace comma with dot
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    // E.g. 1500,50 -> replace comma with dot
    str = str.replace(',', '.');
  }

  const cleanNum = parseFloat(str.replace(/[^0-9.-]/g, ''));
  const finalAmt = isNaN(cleanNum) ? 0 : Math.abs(cleanNum);

  return { amount: finalAmt, isNegative };
}

// Helper to convert Image/PDF file to base64 Data URL
async function processFileToDataUrl(file: File): Promise<{ url: string; name: string; type: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (file.type.startsWith('image/')) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1200;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          resolve({ url: compressedDataUrl, name: file.name, type: 'image/jpeg' });
        };
        img.onerror = () => resolve({ url: result, name: file.name, type: file.type });
        img.src = result;
      } else {
        resolve({ url: result, name: file.name, type: file.type });
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export default function Contas() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Filters State
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return format(new Date(), 'yyyy-MM');
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'income' | 'expense'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Transaction | null>(null);

  // Modal State for Viewing Attached Proof
  const [previewProof, setPreviewProof] = useState<Transaction | null>(null);

  // Form inputs for Manual Entry
  const [formDate, setFormDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [formDescription, setFormDescription] = useState<string>('');
  const [formType, setFormType] = useState<'income' | 'expense'>('expense');
  const [formCategory, setFormCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [formAmount, setFormAmount] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');

  // Proof File State
  const [formProofUrl, setFormProofUrl] = useState<string>('');
  const [formProofName, setFormProofName] = useState<string>('');
  const [formProofType, setFormProofType] = useState<string>('');
  const [uploadingFile, setUploadingFile] = useState(false);

  // Excel Import Module State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importedFileName, setImportedFileName] = useState<string>('');
  const [importedRows, setImportedRows] = useState<ImportedTransactionPreview[]>([]);
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [importSearchTerm, setImportSearchTerm] = useState('');
  const [isImportingProgress, setIsImportingProgress] = useState(false);
  const [isDraggingExcel, setIsDraggingExcel] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelFileInputRef = useRef<HTMLInputElement>(null);

  // Load transactions from Firestore
  async function loadData() {
    setLoading(true);
    try {
      const q = query(collection(db, 'contas_lancamentos'));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setTransactions([]);
      } else {
        const loaded: Transaction[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Transaction[];

        // Sort descending by date
        loaded.sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0));
        setTransactions(loaded);
      }
    } catch (err) {
      console.error('Error loading financial entries:', err);
    } finally {
      setLoading(false);
    }
  }

  // Optional manual seeding of sample data
  async function handleSeedSampleData() {
    if (!confirm('Deseja carregar os lançamentos de exemplo?')) return;
    setLoading(true);
    try {
      for (const seedItem of SEED_DATA) {
        await addDoc(collection(db, 'contas_lancamentos'), seedItem);
      }
      await loadData();
    } catch (err) {
      console.error('Erro ao carregar dados de exemplo:', err);
      alert('Erro ao carregar dados de exemplo.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Sync Category Options when Form Type changes (Despesa vs Receita)
  const availableFormCategories = useMemo(() => {
    return formType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  }, [formType]);

  const handleTypeChange = (newType: 'income' | 'expense') => {
    setFormType(newType);
    const targetCategories = newType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    if (!targetCategories.includes(formCategory)) {
      setFormCategory(targetCategories[0]);
    }
  };

  // Available Months for Selector
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    const currentMonthStr = format(new Date(), 'yyyy-MM');
    monthsSet.add(currentMonthStr);

    transactions.forEach((item) => {
      if (item.date && item.date.length >= 7) {
        monthsSet.add(item.date.substring(0, 7));
      }
    });

    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Month Filter
      if (selectedMonth !== 'all') {
        if (!t.date.startsWith(selectedMonth)) return false;
      }
      // Category Filter
      if (selectedCategory !== 'all') {
        if (t.category !== selectedCategory) return false;
      }
      // Type Filter
      if (selectedType !== 'all') {
        if (t.type !== selectedType) return false;
      }
      // Search Term
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const matchDesc = t.description.toLowerCase().includes(term);
        const matchCat = t.category.toLowerCase().includes(term);
        const matchNote = t.notes?.toLowerCase().includes(term);
        if (!matchDesc && !matchCat && !matchNote) return false;
      }
      return true;
    });
  }, [transactions, selectedMonth, selectedCategory, selectedType, searchTerm]);

  // Totals calculations
  const totals = useMemo(() => {
    const totalCashBalance = transactions.reduce((acc, curr) => {
      return curr.type === 'income' ? acc + curr.amount : acc - curr.amount;
    }, 0);

    const monthEntries = selectedMonth === 'all'
      ? transactions
      : transactions.filter((t) => t.date.startsWith(selectedMonth));

    const monthIncome = monthEntries
      .filter((t) => t.type === 'income')
      .reduce((acc, curr) => acc + curr.amount, 0);

    const monthExpense = monthEntries
      .filter((t) => t.type === 'expense')
      .reduce((acc, curr) => acc + curr.amount, 0);

    const monthBalance = monthIncome - monthExpense;

    return {
      totalCashBalance,
      monthIncome,
      monthExpense,
      monthBalance,
    };
  }, [transactions, selectedMonth]);

  // Expense Category Breakdown
  const categoryBreakdown = useMemo(() => {
    const monthExpenses = (selectedMonth === 'all'
      ? transactions
      : transactions.filter((t) => t.date.startsWith(selectedMonth))
    ).filter((t) => t.type === 'expense');

    const catMap: Record<string, number> = {};
    let totalExp = 0;

    monthExpenses.forEach((item) => {
      catMap[item.category] = (catMap[item.category] || 0) + item.amount;
      totalExp += item.amount;
    });

    return Object.entries(catMap)
      .map(([cat, amount]) => ({
        category: cat,
        amount,
        percentage: totalExp > 0 ? (amount / totalExp) * 100 : 0,
        color: CATEGORY_COLORS[cat]?.dot || '#6b7280',
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions, selectedMonth]);

  // Last 6 Months Comparative Data for Bar Chart
  const monthlyComparisonData = useMemo(() => {
    const list: { monthKey: string; label: string; income: number; expense: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mKey = format(d, 'yyyy-MM');
      const label = format(d, 'MMM/yy', { locale: ptBR });

      const mItems = transactions.filter((t) => t.date.startsWith(mKey));
      const inc = mItems.filter((t) => t.type === 'income').reduce((acc, c) => acc + c.amount, 0);
      const exp = mItems.filter((t) => t.type === 'expense').reduce((acc, c) => acc + c.amount, 0);

      list.push({ monthKey: mKey, label, income: inc, expense: exp });
    }

    return list;
  }, [transactions]);

  const maxChartValue = useMemo(() => {
    let max = 1000;
    monthlyComparisonData.forEach((d) => {
      if (d.income > max) max = d.income;
      if (d.expense > max) max = d.expense;
    });
    return max * 1.15;
  }, [monthlyComparisonData]);

  // EXCEL IMPORT PARSER CORE FUNCTION
  async function processExcelFile(file: File) {
    setIsParsingExcel(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true, raw: false });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        alert('O arquivo Excel enviado não possui planilhas válidas.');
        return;
      }

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawMatrix: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' });

      if (!rawMatrix || rawMatrix.length === 0) {
        alert('A planilha selecionada está vazia.');
        return;
      }

      // Step 1: Detect Header Row
      let headerRowIdx = -1;
      let dateCol = -1;
      let typeCol = -1;
      let valueCol = -1;
      let descCol = -1;
      let origemCol = -1;
      let destinoCol = -1;
      let debitCol = -1;
      let creditCol = -1;

      for (let r = 0; r < Math.min(25, rawMatrix.length); r++) {
        const row = rawMatrix[r].map((cell: any) => String(cell).toLowerCase().trim());

        const hasDate = row.some((c) => c.includes('data') || c.includes('date') || c.includes('movimentação'));
        const hasVal = row.some((c) => c.includes('valor') || c.includes('quantia') || c.includes('amount') || c.includes('débito') || c.includes('crédito'));

        if (hasDate || hasVal) {
          headerRowIdx = r;

          row.forEach((colName, idx) => {
            if (colName.includes('data') || colName.includes('date')) {
              if (dateCol === -1) dateCol = idx;
            } else if (
              colName.includes('movimentação') ||
              colName.includes('tipo') ||
              colName.includes('operacao') ||
              colName.includes('operações') ||
              colName.includes('transação') ||
              colName.includes('d/c')
            ) {
              if (typeCol === -1) typeCol = idx;
            } else if (colName.includes('valor') || colName.includes('quantia') || colName.includes('amount')) {
              if (valueCol === -1) valueCol = idx;
            } else if (colName.includes('descrição') || colName.includes('historico') || colName.includes('histórico') || colName.includes('detalhe') || colName.includes('nome') || colName.includes('memo')) {
              if (descCol === -1) descCol = idx;
            } else if (colName.includes('origem')) {
              origemCol = idx;
            } else if (colName.includes('destino')) {
              destinoCol = idx;
            } else if (colName.includes('débito') || colName.includes('debito') || colName.includes('saída')) {
              debitCol = idx;
            } else if (colName.includes('crédito') || colName.includes('credito') || colName.includes('entrada')) {
              creditCol = idx;
            }
          });
          break;
        }
      }

      // Fallback heuristics if no explicit header row was identified
      if (headerRowIdx === -1) {
        headerRowIdx = 0;
        dateCol = 0;
        valueCol = 1;
        descCol = 2;
      }

      // Step 2: Extract Data Rows
      const extractedList: ImportedTransactionPreview[] = [];

      for (let r = headerRowIdx + 1; r < rawMatrix.length; r++) {
        const row = rawMatrix[r];
        if (!row || row.length === 0) continue;

        // Skip rows that look like summary headers or empty
        const rowStr = row.join(' ').toLowerCase();
        if (rowStr.includes('saldo anterior') || rowStr.includes('total do período') || rowStr.includes('extrato emitido')) {
          continue;
        }

        const rawDateCell = dateCol !== -1 ? row[dateCol] : row[0];
        const rawValueCell = valueCol !== -1 ? row[valueCol] : row[1];
        const rawTypeCell = typeCol !== -1 ? row[typeCol] : '';
        const rawDescCell = descCol !== -1 ? row[descCol] : '';
        const rawOrigemCell = origemCol !== -1 ? row[origemCol] : '';
        const rawDestinoCell = destinoCol !== -1 ? row[destinoCol] : '';
        const rawDebitCell = debitCol !== -1 ? row[debitCol] : '';
        const rawCreditCell = creditCol !== -1 ? row[creditCol] : '';

        // If date cell and value cell are completely blank, skip row
        if (!rawDateCell && !rawValueCell) continue;

        const parsedDate = parseExcelDate(rawDateCell);
        const { amount, isNegative } = parseExcelAmount(rawValueCell);

        if (amount <= 0 && !rawDebitCell && !rawCreditCell) {
          continue; // skip zero balance rows
        }

        // Determine transaction Type (income vs expense)
        let parsedType: 'income' | 'expense' = 'expense';

        const typeString = (String(rawTypeCell) + ' ' + String(rawDescCell) + ' ' + String(rawDebitCell) + ' ' + String(rawCreditCell)).toLowerCase();

        if (
          typeString.includes('crédito') ||
          typeString.includes('credito') ||
          typeString.includes('entrada') ||
          typeString.includes('pix recebido') ||
          typeString.includes('recebido') ||
          typeString.includes('doacao') ||
          typeString.includes('doação') ||
          typeString.includes('repasse') ||
          typeString.includes('subvenção') ||
          typeString.includes('(c)') ||
          typeString.includes(' c ')
        ) {
          parsedType = 'income';
        } else if (
          typeString.includes('débito') ||
          typeString.includes('debito') ||
          typeString.includes('saída') ||
          typeString.includes('saida') ||
          typeString.includes('pix enviado') ||
          typeString.includes('pagamento') ||
          typeString.includes('tarifa') ||
          typeString.includes('imposto') ||
          typeString.includes('(d)') ||
          typeString.includes(' d ') ||
          isNegative
        ) {
          parsedType = 'expense';
        } else if (rawCreditCell && parseExcelAmount(rawCreditCell).amount > 0) {
          parsedType = 'income';
        } else if (rawDebitCell && parseExcelAmount(rawDebitCell).amount > 0) {
          parsedType = 'expense';
        }

        // Compose Description
        let fullDesc = String(rawDescCell || rawTypeCell || 'Lançamento de Extrato').trim();
        if (rawOrigemCell) fullDesc += ` (Origem: ${rawOrigemCell})`;
        if (rawDestinoCell) fullDesc += ` (Destino: ${rawDestinoCell})`;

        // Auto suggest Category
        const suggestedCat = autoSuggestCategory(fullDesc, parsedType);

        // Check potential duplicate against existing DB transactions
        const isDuplicate = transactions.some((t) => {
          return (
            t.date === parsedDate &&
            Math.abs(t.amount - amount) < 0.02 &&
            t.type === parsedType
          );
        });

        extractedList.push({
          idTemp: `import_${r}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          selected: !isDuplicate, // default select non-duplicates
          date: parsedDate,
          description: fullDesc,
          category: suggestedCat,
          type: parsedType,
          amount: amount,
          isDuplicate: isDuplicate,
          rawOrigem: String(rawOrigemCell),
          rawDestino: String(rawDestinoCell),
          rawTipo: String(rawTypeCell),
        });
      }

      if (extractedList.length === 0) {
        alert('Não foi possível extrair lançamentos financeiros desta planilha. Verifique se as colunas possuem Data, Valor e Descrição.');
        return;
      }

      setImportedFileName(file.name);
      setImportedRows(extractedList);
      setIsImportModalOpen(true);
    } catch (err) {
      console.error('Error parsing Excel file:', err);
      alert('Erro ao ler o arquivo Excel. Certifique-se de que é um arquivo .xlsx, .xls ou .csv válido.');
    } finally {
      setIsParsingExcel(false);
    }
  }

  function handleExcelFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      processExcelFile(files[0]);
    }
  }

  function handleExcelDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDraggingExcel(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.match(/\.(xlsx|xls|csv)$/i)) {
        processExcelFile(file);
      } else {
        alert('Por favor, selecione um arquivo em formato Excel (.xlsx, .xls) ou CSV.');
      }
    }
  }

  // Generate Sample Excel Template for user download
  function handleDownloadSampleExcel() {
    const sampleData = [
      {
        'Data Movimentação': '05/07/2026',
        'Movimentação': 'PIX Recebido - Doação Mensal Empresa',
        'Tipo': 'Crédito',
        'Valor (R$)': '3500.00',
        'Origem': 'Empresa Parceira S.A.',
        'Destino': 'CIIJM - Guarda Mirim de Mauá',
        'Saldo Antes': '15000.00',
        'Saldo Depois': '18500.00',
      },
      {
        'Data Movimentação': '08/07/2026',
        'Movimentação': 'Pagamento de Energia Elétrica Enel',
        'Tipo': 'Débito',
        'Valor (R$)': '-642.50',
        'Origem': 'CIIJM - Guarda Mirim de Mauá',
        'Destino': 'ENEL Distribuição SP',
        'Saldo Antes': '18500.00',
        'Saldo Depois': '17857.50',
      },
      {
        'Data Movimentação': '10/07/2026',
        'Movimentação': 'PIX Recebido Mensalidades e Contribuições',
        'Tipo': 'Crédito',
        'Valor (R$)': '2150.00',
        'Origem': 'Contribuição Alunos',
        'Destino': 'CIIJM - Guarda Mirim de Mauá',
        'Saldo Antes': '17857.50',
        'Saldo Depois': '20007.50',
      },
      {
        'Data Movimentação': '12/07/2026',
        'Movimentação': 'Honorários Contábeis Mensais',
        'Tipo': 'Débito',
        'Valor (R$)': '-450.00',
        'Origem': 'CIIJM - Guarda Mirim de Mauá',
        'Destino': 'Escritório de Contabilidade',
        'Saldo Antes': '20007.50',
        'Saldo Depois': '19557.50',
      },
      {
        'Data Movimentação': '15/07/2026',
        'Movimentação': 'Compra Cestas Básicas Atendidos',
        'Tipo': 'Débito',
        'Valor (R$)': '-1120.00',
        'Origem': 'CIIJM - Guarda Mirim de Mauá',
        'Destino': 'Supermercado Mauá',
        'Saldo Antes': '19557.50',
        'Saldo Depois': '18437.50',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Extrato_Bancario');
    XLSX.writeFile(wb, 'Modelo_Extrato_Bancario_Stone_CIIJM.xlsx');
  }

  // Toggle Selection in Preview Table
  function handleToggleSelectRow(idTemp: string) {
    setImportedRows((prev) =>
      prev.map((r) => (r.idTemp === idTemp ? { ...r, selected: !r.selected } : r))
    );
  }

  function handleSelectAllPreview(selectVal: boolean) {
    setImportedRows((prev) => prev.map((r) => ({ ...r, selected: selectVal })));
  }

  function handleSelectOnlyNonDuplicates() {
    setImportedRows((prev) =>
      prev.map((r) => ({ ...r, selected: !r.isDuplicate }))
    );
  }

  // Edit Preview Row fields inline
  function handleUpdatePreviewRow(idTemp: string, field: keyof ImportedTransactionPreview, val: any) {
    setImportedRows((prev) =>
      prev.map((r) => {
        if (r.idTemp === idTemp) {
          const updated = { ...r, [field]: val };
          if (field === 'type') {
            updated.category = autoSuggestCategory(updated.description, val);
          }
          return updated;
        }
        return r;
      })
    );
  }

  // Save selected imported rows to Firestore
  async function handleConfirmImport() {
    const selectedItems = importedRows.filter((r) => r.selected);
    if (selectedItems.length === 0) {
      alert('Selecione ao menos um lançamento para importar.');
      return;
    }

    setIsImportingProgress(true);
    try {
      let countSuccess = 0;

      for (const item of selectedItems) {
        const itemToSave: Omit<Transaction, 'id'> = {
          date: item.date,
          description: item.description.trim(),
          category: item.category,
          type: item.type,
          amount: item.amount,
          notes: `Importado de extrato bancário (${importedFileName})`,
          createdAt: Date.now(),
        };

        await addDoc(collection(db, 'contas_lancamentos'), itemToSave);
        countSuccess++;
      }

      await loadData();
      setIsImportModalOpen(false);
      setImportedRows([]);
      setImportedFileName('');
      alert(`Sucesso! ${countSuccess} lançamentos foram importados do extrato para o caixa com sucesso.`);
    } catch (err) {
      console.error('Error batch saving imported transactions:', err);
      alert('Erro ao salvar lançamentos no banco de dados.');
    } finally {
      setIsImportingProgress(false);
    }
  }

  // Open Modal for Manual Add/Edit
  function handleOpenModal(item?: Transaction) {
    if (item) {
      setEditingItem(item);
      setFormDate(item.date);
      setFormDescription(item.description);
      setFormType(item.type);
      const defaultCat = item.type === 'expense' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0];
      setFormCategory(item.category || defaultCat);
      setFormAmount(item.amount.toString());
      setFormNotes(item.notes || '');
      setFormProofUrl(item.proofUrl || item.driveUrl || '');
      setFormProofName(item.proofFileName || (item.driveUrl ? 'Comprovante Drive' : ''));
      setFormProofType(item.proofFileType || '');
    } else {
      setEditingItem(null);
      setFormDate(format(new Date(), 'yyyy-MM-dd'));
      setFormDescription('');
      setFormType('expense');
      setFormCategory(EXPENSE_CATEGORIES[0]);
      setFormAmount('');
      setFormNotes('');
      setFormProofUrl('');
      setFormProofName('');
      setFormProofType('');
    }
    setIsModalOpen(true);
  }

  // Handle Proof File Upload
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > 10 * 1024 * 1024) {
      alert('O arquivo selecionado é muito grande. Escolha um arquivo de até 10MB.');
      return;
    }

    setUploadingFile(true);
    try {
      const processed = await processFileToDataUrl(file);
      setFormProofUrl(processed.url);
      setFormProofName(processed.name);
      setFormProofType(processed.type);
    } catch (err) {
      console.error('Error processing proof file:', err);
      alert('Erro ao processar arquivo de comprovante.');
    } finally {
      setUploadingFile(false);
    }
  }

  function handleRemoveProof() {
    setFormProofUrl('');
    setFormProofName('');
    setFormProofType('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  // Submit Manual Form
  async function handleSubmitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!formDescription.trim()) {
      alert('Informe a descrição do lançamento.');
      return;
    }
    const parsedAmount = parseFloat(formAmount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Informe um valor válido e positivo.');
      return;
    }

    setSaving(true);
    try {
      const dataToSave: Omit<Transaction, 'id'> = {
        date: formDate,
        description: formDescription.trim(),
        category: formCategory,
        type: formType,
        amount: parsedAmount,
        proofUrl: formProofUrl || '',
        proofFileName: formProofName || '',
        proofFileType: formProofType || '',
        notes: formNotes.trim(),
        createdAt: editingItem?.createdAt || Date.now(),
      };

      if (editingItem && editingItem.id) {
        await updateDoc(doc(db, 'contas_lancamentos', editingItem.id), dataToSave);
      } else {
        await addDoc(collection(db, 'contas_lancamentos'), dataToSave);
      }

      await loadData();
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving transaction:', err);
      alert('Erro ao salvar lançamento no banco de dados.');
    } finally {
      setSaving(false);
    }
  }

  // Delete Transaction
  async function handleDelete(item: Transaction) {
    if (!item.id) return;
    if (confirm(`Tem certeza que deseja excluir o lançamento "${item.description}"?`)) {
      try {
        await deleteDoc(doc(db, 'contas_lancamentos', item.id));
        await loadData();
      } catch (err) {
        console.error('Error deleting transaction:', err);
        alert('Erro ao excluir lançamento.');
      }
    }
  }

  // Generate Accounting PDF Report
  async function handleGeneratePdf() {
    if (filteredTransactions.length === 0) {
      alert('Não há lançamentos para o filtro selecionado para gerar o relatório.');
      return;
    }

    setExportingPdf(true);
    try {
      const docPdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = docPdf.internal.pageSize.getWidth(); // 210mm

      // Header Title
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(12);
      docPdf.setTextColor(15, 23, 42); // slate-900
      docPdf.text(
        'CENTRO DE INTEGRAÇÃO INFANTO JUVENIL DE MAUÁ - CIIJM',
        pageWidth / 2,
        14,
        { align: 'center' }
      );

      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(9.5);
      docPdf.setTextColor(71, 85, 105); // slate-600
      docPdf.text('GUARDA MIRIM DE MAUÁ', pageWidth / 2, 19, { align: 'center' });

      docPdf.setFont('helvetica', 'normal');
      docPdf.setFontSize(7.5);
      docPdf.setTextColor(100, 116, 139);
      docPdf.text(
        'CNPJ: 50.136.704/0001-64 | Rua Indaiatuba, 294 - Jd. Haydeé - Centro, Mauá, SP',
        pageWidth / 2,
        23.5,
        { align: 'center' }
      );

      // Divider Line
      docPdf.setDrawColor(203, 213, 225);
      docPdf.setLineWidth(0.4);
      docPdf.line(14, 27, pageWidth - 14, 27);

      // Report Title Box
      const monthTitleStr = selectedMonth === 'all'
        ? 'TODOS OS PERÍODOS'
        : format(parseISO(`${selectedMonth}-01`), "MMMM 'DE' yyyy", { locale: ptBR }).toUpperCase();

      docPdf.setFillColor(241, 245, 249); // slate-100
      docPdf.roundedRect(14, 30, pageWidth - 28, 8, 1.5, 1.5, 'F');
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(8.5);
      docPdf.setTextColor(30, 41, 59);
      docPdf.text(
        `RELATÓRIO FINANCEIRO DE CONTAS — ${monthTitleStr}`,
        pageWidth / 2,
        35.5,
        { align: 'center' }
      );

      // Summary Cards (4 columns)
      const gap = 3;
      const margin = 14;
      const totalAvailableWidth = pageWidth - margin * 2;
      const cardWidth = (totalAvailableWidth - gap * 3) / 4;
      const startY = 41;
      const cardHeight = 13;

      const formatCurrency = (val: number) =>
        `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      // Card 1: Entradas
      docPdf.setFillColor(248, 250, 252);
      docPdf.setDrawColor(226, 232, 240);
      docPdf.roundedRect(margin, startY, cardWidth, cardHeight, 1, 1, 'FD');
      docPdf.setFontSize(6.5);
      docPdf.setFont('helvetica', 'bold');
      docPdf.setTextColor(100, 116, 139);
      docPdf.text('TOTAL ENTRADAS', margin + cardWidth / 2, startY + 4, { align: 'center' });
      docPdf.setFontSize(8.5);
      docPdf.setTextColor(4, 120, 87); // emerald-700
      docPdf.text(formatCurrency(totals.monthIncome), margin + cardWidth / 2, startY + 10, { align: 'center' });

      // Card 2: Saídas
      const x2 = margin + cardWidth + gap;
      docPdf.setFillColor(248, 250, 252);
      docPdf.setDrawColor(226, 232, 240);
      docPdf.roundedRect(x2, startY, cardWidth, cardHeight, 1, 1, 'FD');
      docPdf.setFontSize(6.5);
      docPdf.setFont('helvetica', 'bold');
      docPdf.setTextColor(100, 116, 139);
      docPdf.text('TOTAL SAÍDAS', x2 + cardWidth / 2, startY + 4, { align: 'center' });
      docPdf.setFontSize(8.5);
      docPdf.setTextColor(190, 18, 60); // rose-700
      docPdf.text(formatCurrency(totals.monthExpense), x2 + cardWidth / 2, startY + 10, { align: 'center' });

      // Card 3: Resultado Mês
      const x3 = x2 + cardWidth + gap;
      docPdf.setFillColor(248, 250, 252);
      docPdf.setDrawColor(226, 232, 240);
      docPdf.roundedRect(x3, startY, cardWidth, cardHeight, 1, 1, 'FD');
      docPdf.setFontSize(6.5);
      docPdf.setFont('helvetica', 'bold');
      docPdf.setTextColor(100, 116, 139);
      docPdf.text('RESULTADO MÊS', x3 + cardWidth / 2, startY + 4, { align: 'center' });
      docPdf.setFontSize(8.5);
      if (totals.monthBalance >= 0) {
        docPdf.setTextColor(4, 120, 87);
      } else {
        docPdf.setTextColor(190, 18, 60);
      }
      docPdf.text(formatCurrency(totals.monthBalance), x3 + cardWidth / 2, startY + 10, { align: 'center' });

      // Card 4: Saldo Caixa
      const x4 = x3 + cardWidth + gap;
      docPdf.setFillColor(248, 250, 252);
      docPdf.setDrawColor(226, 232, 240);
      docPdf.roundedRect(x4, startY, cardWidth, cardHeight, 1, 1, 'FD');
      docPdf.setFontSize(6.5);
      docPdf.setFont('helvetica', 'bold');
      docPdf.setTextColor(100, 116, 139);
      docPdf.text('SALDO GERAL CAIXA', x4 + cardWidth / 2, startY + 4, { align: 'center' });
      docPdf.setFontSize(8.5);
      docPdf.setTextColor(30, 58, 138); // blue-900
      docPdf.text(formatCurrency(totals.totalCashBalance), x4 + cardWidth / 2, startY + 10, { align: 'center' });

      // Transactions Table using jspdf-autotable
      const tableRows = filteredTransactions.map((t) => [
        format(parseISO(t.date), 'dd/MM/yyyy'),
        t.notes ? `${t.description}\n(${t.notes})` : t.description,
        t.category,
        t.type === 'income' ? 'ENTRADA' : 'SAÍDA',
        `${t.type === 'income' ? '+' : '-'} R$ ${t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      ]);

      autoTable(docPdf, {
        startY: 57,
        head: [['Data', 'Descrição / Histórico', 'Categoria', 'Tipo', 'Valor (R$)']],
        body: tableRows,
        margin: { left: 14, right: 14, bottom: 35 },
        styles: {
          font: 'helvetica',
          fontSize: 7.5,
          cellPadding: 2,
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: [30, 41, 59], // slate-800
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'left',
        },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 42 },
          3: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
          4: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 4) {
            const rowRaw = filteredTransactions[data.row.index];
            if (rowRaw?.type === 'income') {
              data.cell.styles.textColor = [4, 120, 87]; // green
            } else {
              data.cell.styles.textColor = [190, 18, 60]; // red
            }
          }
        },
        didDrawPage: (data) => {
          const pageCount = docPdf.getNumberOfPages();
          const currentPage = data.pageNumber;

          docPdf.setFontSize(7.5);
          docPdf.setFont('helvetica', 'normal');
          docPdf.setTextColor(148, 163, 184);
          docPdf.text(
            `Página ${currentPage} de ${pageCount}`,
            pageWidth - 14,
            288,
            { align: 'right' }
          );
          docPdf.text(
            'CIIJM - Guarda Mirim de Mauá • Emitido em ' + format(new Date(), 'dd/MM/yyyy HH:mm'),
            14,
            288
          );
        },
      });

      // Signatures block after table
      const finalY = (docPdf as any).lastAutoTable?.finalY || 200;
      let signatureY = finalY + 16;

      // If close to bottom of page, add new page for signatures
      if (signatureY > 255) {
        docPdf.addPage();
        signatureY = 40;
      }

      const sigWidth = 70;
      const sigX1 = 20;
      const sigX2 = pageWidth - 20 - sigWidth;

      docPdf.setDrawColor(30, 41, 59);
      docPdf.setLineWidth(0.4);

      // Line 1
      docPdf.line(sigX1, signatureY, sigX1 + sigWidth, signatureY);
      docPdf.setFontSize(8);
      docPdf.setFont('helvetica', 'bold');
      docPdf.setTextColor(30, 41, 59);
      docPdf.text('TESOURARIA / RESP. FINANCEIRO', sigX1 + sigWidth / 2, signatureY + 4, { align: 'center' });
      docPdf.setFontSize(7);
      docPdf.setFont('helvetica', 'normal');
      docPdf.setTextColor(100, 116, 139);
      docPdf.text('CIIJM - Guarda Mirim de Mauá', sigX1 + sigWidth / 2, signatureY + 8, { align: 'center' });

      // Line 2
      docPdf.line(sigX2, signatureY, sigX2 + sigWidth, signatureY);
      docPdf.setFontSize(8);
      docPdf.setFont('helvetica', 'bold');
      docPdf.setTextColor(30, 41, 59);
      docPdf.text('SÂNDERSON CAIO LEITE DA SILVA', sigX2 + sigWidth / 2, signatureY + 4, { align: 'center' });
      docPdf.setFontSize(7);
      docPdf.setFont('helvetica', 'normal');
      docPdf.setTextColor(100, 116, 139);
      docPdf.text('PRESIDENTE DA ENTIDADE', sigX2 + sigWidth / 2, signatureY + 8, { align: 'center' });

      const formattedMonthName = selectedMonth !== 'all'
        ? format(parseISO(`${selectedMonth}-01`), 'MMMM_yyyy', { locale: ptBR })
        : 'Geral';

      docPdf.save(`Relatorio_Financeiro_CIIJM_${formattedMonthName}.pdf`);
    } catch (err: any) {
      console.error('Error generating PDF report:', err);
      alert(`Ocorreu um erro ao gerar o arquivo PDF: ${err?.message || 'Erro desconhecido'}`);
    } finally {
      setExportingPdf(false);
    }
  }

  const monthDisplayTitle = selectedMonth === 'all'
    ? 'Todos os Períodos'
    : format(parseISO(`${selectedMonth}-01`), "MMMM 'de' yyyy", { locale: ptBR });

  // Preview Totals
  const previewTotals = useMemo(() => {
    const selectedList = importedRows.filter((r) => r.selected);
    const inc = selectedList.filter((r) => r.type === 'income').reduce((a, c) => a + c.amount, 0);
    const exp = selectedList.filter((r) => r.type === 'expense').reduce((a, c) => a + c.amount, 0);
    return {
      countSelected: selectedList.length,
      income: inc,
      expense: exp,
      balance: inc - exp,
    };
  }, [importedRows]);

  // Filtered Preview Rows inside modal
  const filteredPreviewRows = useMemo(() => {
    if (!importSearchTerm.trim()) return importedRows;
    const term = importSearchTerm.toLowerCase();
    return importedRows.filter(
      (r) =>
        r.description.toLowerCase().includes(term) ||
        r.category.toLowerCase().includes(term) ||
        r.date.includes(term)
    );
  }, [importedRows, importSearchTerm]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
            <LandmarkIcon className="w-4 h-4 text-primary shrink-0" />
            <span>Centro de Integração Infanto Juvenil de Mauá - CIIJM</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Gestão Financeira & Tesouraria
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Controle interno de caixa, importação de extratos bancários e relatórios contábeis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Export PDF Button */}
          <button
            onClick={handleGeneratePdf}
            disabled={exportingPdf}
            className="flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-50"
            title="Gerar Relatório em PDF para Contabilidade"
          >
            {exportingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4 text-emerald-400" />
            )}
            <span>Gerar Relatório PDF</span>
          </button>

          {/* Import Excel Button */}
          <button
            onClick={() => {
              if (excelFileInputRef.current) {
                excelFileInputRef.current.click();
              }
            }}
            disabled={isParsingExcel}
            className="flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all cursor-pointer shadow-md shadow-emerald-400/20"
            title="Importar planilha de extrato bancário (Stone, Inter, Itaú, etc.)"
          >
            {isParsingExcel ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-950" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 text-emerald-950" />
            )}
            <span>Importar Extrato (Excel)</span>
          </button>

          {/* Hidden Excel File Input for Top Button */}
          <input
            ref={excelFileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleExcelFileInputChange}
            className="hidden"
          />

          {/* Add New Transaction Button */}
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4.5 py-2.5 text-xs sm:text-sm font-bold text-white bg-primary hover:bg-primary-light rounded-xl transition-all cursor-pointer shadow-md shadow-primary/20"
          >
            <PlusCircle className="w-4 h-4 text-amber-400" />
            <span>Nova Movimentação</span>
          </button>
        </div>
      </div>

      {/* Summary Cards Top */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Saldo Acumulado em Caixa */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Saldo Atual em Caixa
            </span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-primary">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl sm:text-3xl font-black ${totals.totalCashBalance >= 0 ? 'text-blue-900' : 'text-red-600'}`}>
              R$ {totals.totalCashBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            Acumulado total de todas as movimentações
          </p>
        </div>

        {/* Card 2: Total Entradas do Mês */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Entradas do Mês
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <ArrowUpCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600">
              + R$ {totals.monthIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 mt-2 capitalize">
            {monthDisplayTitle}
          </p>
        </div>

        {/* Card 3: Total Saídas do Mês */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700">
              Saídas do Mês
            </span>
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
              <ArrowDownCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-rose-600">
              - R$ {totals.monthExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 mt-2 capitalize">
            {monthDisplayTitle}
          </p>
        </div>

        {/* Card 4: Saldo do Período */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Saldo do Período
            </span>
            <div className={`p-2.5 rounded-xl ${totals.monthBalance >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl sm:text-3xl font-black ${totals.monthBalance >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              R$ {totals.monthBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 mt-2 capitalize">
            Resultado de {monthDisplayTitle}
          </p>
        </div>
      </div>

      {/* Excel Drag & Drop Fast Import Banner */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingExcel(true);
        }}
        onDragLeave={() => setIsDraggingExcel(false)}
        onDrop={handleExcelDrop}
        className={`p-5 rounded-2xl border-2 border-dashed transition-all ${
          isDraggingExcel
            ? 'border-emerald-500 bg-emerald-50/80 scale-[1.01]'
            : 'border-emerald-200 bg-gradient-to-r from-emerald-50/40 via-white to-teal-50/40 hover:border-emerald-300'
        }`}
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-md shadow-emerald-500/20 shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                  Módulo de Importação de Extrato Bancário
                </h3>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                  Stone / Bancos
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Arraste seu arquivo Excel (.xlsx, .xls, .csv) de extrato bancário para conciliação automática no navegador.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleDownloadSampleExcel}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition cursor-pointer shadow-2xs"
              title="Baixar planilha modelo em Excel para testes"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Baixar Modelo Excel</span>
            </button>

            <label
              onClick={() => excelFileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition cursor-pointer shadow-sm"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-950" />
              <span>Selecionar Arquivo</span>
            </label>
          </div>
        </div>
      </div>

      {/* Dashboard Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Bar Chart: Entradas vs Saídas */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary shrink-0" />
                Comparativo Entradas vs. Saídas
              </h3>
              <p className="text-xs text-gray-500">Histórico dos últimos 6 meses</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-600">
                <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
                Entradas
              </span>
              <span className="flex items-center gap-1.5 text-rose-600">
                <span className="w-3 h-3 rounded-sm bg-rose-500 inline-block" />
                Saídas
              </span>
            </div>
          </div>

          <div className="h-64 flex items-end justify-between gap-2 sm:gap-4 pt-6 pb-2 border-b border-gray-100 px-2">
            {monthlyComparisonData.map((d) => {
              const incHeight = (d.income / maxChartValue) * 100;
              const expHeight = (d.expense / maxChartValue) * 100;

              return (
                <div key={d.monthKey} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                  <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center bg-slate-900 text-white text-[10px] py-1.5 px-2.5 rounded-lg shadow-lg pointer-events-none whitespace-nowrap">
                    <span className="font-bold text-emerald-400">+ R$ {d.income.toLocaleString('pt-BR')}</span>
                    <span className="font-bold text-rose-400">- R$ {d.expense.toLocaleString('pt-BR')}</span>
                  </div>

                  <div className="w-full flex items-end justify-center gap-1.5 h-full max-h-[190px]">
                    <div
                      style={{ height: `${Math.max(incHeight, 4)}%` }}
                      className="w-1/2 max-w-[20px] bg-emerald-500 group-hover:bg-emerald-600 rounded-t-md transition-all relative"
                    />
                    <div
                      style={{ height: `${Math.max(expHeight, 4)}%` }}
                      className="w-1/2 max-w-[20px] bg-rose-500 group-hover:bg-rose-600 rounded-t-md transition-all relative"
                    />
                  </div>

                  <span className="text-[11px] font-bold text-gray-500 mt-2 capitalize">
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rosca Chart: Despesas por Categoria */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-purple-600 shrink-0" />
                  Despesas por Categoria
                </h3>
                <p className="text-xs text-gray-500 capitalize">{monthDisplayTitle}</p>
              </div>
            </div>

            {categoryBreakdown.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs">
                Nenhuma despesa registrada no período selecionado.
              </div>
            ) : (
              <div className="space-y-3 mt-4">
                {categoryBreakdown.map((item) => (
                  <div key={item.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700 flex items-center gap-2 truncate">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="truncate">{item.category}</span>
                      </span>
                      <span className="font-bold text-gray-900 shrink-0 ml-2">
                        R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({item.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600 pr-2 border-r border-gray-200">
            <Filter className="w-4 h-4 text-primary" />
            <span>Filtros:</span>
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-1 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-700">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer font-bold capitalize text-gray-800"
            >
              <option value="all">Todos os Mêses</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {format(parseISO(`${m}-01`), "MMMM 'de' yyyy", { locale: ptBR })}
                </option>
              ))}
            </select>
          </div>

          {/* Type Selector */}
          <div className="flex items-center gap-1 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-700">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="bg-transparent focus:outline-none cursor-pointer font-bold text-gray-800"
            >
              <option value="all">Todos os Tipos</option>
              <option value="expense">Somente Saídas (Despesas)</option>
              <option value="income">Somente Entradas (Receitas)</option>
            </select>
          </div>

          {/* Category Selector with Groups */}
          <div className="flex items-center gap-1 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-700">
            <Tag className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer font-bold text-gray-800"
            >
              <option value="all">Todas as Categorias</option>
              <optgroup label="Despesas (Saídas)">
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Receitas (Entradas)">
                {INCOME_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar lançamentos..."
            className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Main Transactions Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            <h2 className="font-black text-gray-900 text-base sm:text-lg">
              Extrato Interno de Lançamentos
            </h2>
            <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {filteredTransactions.length} registros
            </span>
          </div>

          {(selectedMonth !== format(new Date(), 'yyyy-MM') || selectedCategory !== 'all' || selectedType !== 'all' || searchTerm) && (
            <button
              onClick={() => {
                setSelectedMonth(format(new Date(), 'yyyy-MM'));
                setSelectedCategory('all');
                setSelectedType('all');
                setSearchTerm('');
              }}
              className="text-xs font-bold text-primary hover:underline cursor-pointer"
            >
              Limpar Filtros
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mb-2 text-primary" />
            <p className="text-sm font-medium">Carregando movimentações...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-16 px-4">
            <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-600 font-bold text-sm">Nenhum lançamento encontrado</p>
            <p className="text-gray-400 text-xs mt-1">Tente ajustar os filtros, importar uma planilha ou incluir um novo lançamento.</p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
              <button
                onClick={() => excelFileInputRef.current?.click()}
                className="px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-xl hover:bg-emerald-600 transition cursor-pointer flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Importar Extrato Excel</span>
              </button>
              <button
                onClick={() => handleOpenModal()}
                className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-light transition cursor-pointer"
              >
                + Nova Movimentação
              </button>
              {transactions.length === 0 && (
                <button
                  onClick={handleSeedSampleData}
                  className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Carregar Lançamentos Exemplo</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-600 uppercase font-bold text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Data</th>
                  <th className="py-3.5 px-4">Descrição / Histórico</th>
                  <th className="py-3.5 px-4">Categoria</th>
                  <th className="py-3.5 px-4 text-center">Tipo</th>
                  <th className="py-3.5 px-4 text-right">Valor (R$)</th>
                  <th className="py-3.5 px-4 text-center">Comprovante</th>
                  <th className="py-3.5 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredTransactions.map((item) => {
                  const catStyle = CATEGORY_COLORS[item.category] || { bg: 'bg-gray-100', text: 'text-gray-700', dot: '#6b7280' };
                  const formattedDate = format(parseISO(item.date), 'dd/MM/yyyy');
                  const hasProof = Boolean(item.proofUrl || item.driveUrl);

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                      {/* Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-gray-600">
                        {formattedDate}
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900">{item.description}</div>
                        {item.notes && (
                          <div className="text-[11px] text-gray-500 italic mt-0.5">{item.notes}</div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${catStyle.bg} ${catStyle.text}`}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: catStyle.dot }} />
                          {item.category}
                        </span>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {item.type === 'income' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-extrabold text-xs">
                            <ArrowUpCircle className="w-3.5 h-3.5" />
                            Entrada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-extrabold text-xs">
                            <ArrowDownCircle className="w-3.5 h-3.5" />
                            Saída
                          </span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-bold">
                        <span className={item.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}>
                          {item.type === 'income' ? '+' : '-'} R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Attached Proof Button */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {hasProof ? (
                          <button
                            onClick={() => setPreviewProof(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 text-amber-900 hover:bg-amber-100 transition text-xs font-bold border border-amber-200/60 cursor-pointer shadow-2xs"
                            title="Ver arquivo de comprovante / foto da nota fiscal"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-600" />
                            <span>Ver Comprovante</span>
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs italic">Sem anexo</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenModal(item)}
                            className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-lg transition cursor-pointer"
                            title="Editar Lançamento"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            title="Excluir Lançamento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Excel Bank Statement Preview & Reconciliation */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-6xl w-full shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[92vh] animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-5 bg-emerald-950 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="p-2 bg-emerald-500 text-emerald-950 rounded-xl font-bold">
                  <FileCheck2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                    Pré-Visualização & Conciliação do Extrato Bancário
                  </h3>
                  <p className="text-xs text-emerald-300 truncate font-mono">
                    Arquivo: {importedFileName} — {importedRows.length} lançamentos identificados
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-emerald-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Reconciliation Toolbar & Controls */}
            <div className="p-4 bg-emerald-50/50 border-b border-emerald-100 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Select All Toggle */}
                <button
                  onClick={() => {
                    const allSelected = importedRows.every((r) => r.selected);
                    handleSelectAllPreview(!allSelected);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-200 rounded-xl font-bold text-emerald-900 hover:bg-emerald-100/50 cursor-pointer transition shadow-2xs"
                >
                  {importedRows.every((r) => r.selected) ? (
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-400" />
                  )}
                  <span>Selecionar Todos ({previewTotals.countSelected}/{importedRows.length})</span>
                </button>

                {/* Quick filter non-duplicates */}
                <button
                  onClick={handleSelectOnlyNonDuplicates}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-200 rounded-xl font-bold text-emerald-900 hover:bg-emerald-100/50 cursor-pointer transition shadow-2xs"
                  title="Desmarcar lançamentos que já parecem existir no caixa"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Apenas Não Duplicados</span>
                </button>
              </div>

              {/* Search Inside Import Preview */}
              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={importSearchTerm}
                  onChange={(e) => setImportSearchTerm(e.target.value)}
                  placeholder="Filtrar na prévia..."
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-emerald-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            {/* Main Interactive Preview Table */}
            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-gray-100 sticky top-0 z-10 text-gray-700 uppercase font-bold text-[11px] tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-10">Importar</th>
                    <th className="py-2.5 px-3 w-32">Data</th>
                    <th className="py-2.5 px-3">Descrição Extrato</th>
                    <th className="py-2.5 px-3 text-center w-28">Tipo</th>
                    <th className="py-2.5 px-3 w-56">Categoria Sugerida</th>
                    <th className="py-2.5 px-3 text-right w-36">Valor (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPreviewRows.map((row) => (
                    <tr
                      key={row.idTemp}
                      className={`transition-colors ${
                        !row.selected
                          ? 'opacity-40 bg-gray-50'
                          : row.isDuplicate
                          ? 'bg-amber-50/70 hover:bg-amber-50'
                          : 'hover:bg-emerald-50/30'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectRow(row.idTemp)}
                          className="cursor-pointer text-emerald-600 hover:scale-110 transition-transform"
                        >
                          {row.selected ? (
                            <CheckSquare className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      </td>

                      {/* Date Input */}
                      <td className="py-2.5 px-3">
                        <input
                          type="date"
                          value={row.date}
                          onChange={(e) => handleUpdatePreviewRow(row.idTemp, 'date', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-gray-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>

                      {/* Description Input */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={row.description}
                            onChange={(e) => handleUpdatePreviewRow(row.idTemp, 'description', e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-gray-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          {row.isDuplicate && (
                            <span
                              className="px-2 py-0.5 bg-amber-200 text-amber-900 font-black text-[10px] rounded shrink-0"
                              title="Já existe um lançamento no caixa com esta data e valor exatos."
                            >
                              Duplicidade
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Type Switcher */}
                      <td className="py-2.5 px-3 text-center">
                        <select
                          value={row.type}
                          onChange={(e) => handleUpdatePreviewRow(row.idTemp, 'type', e.target.value)}
                          className={`w-full px-2 py-1 rounded-lg text-xs font-extrabold border cursor-pointer ${
                            row.type === 'income'
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                              : 'bg-rose-50 border-rose-300 text-rose-800'
                          }`}
                        >
                          <option value="income">Entrada (+)</option>
                          <option value="expense">Saída (-)</option>
                        </select>
                      </td>

                      {/* Category Selector */}
                      <td className="py-2.5 px-3">
                        <select
                          value={row.category}
                          onChange={(e) => handleUpdatePreviewRow(row.idTemp, 'category', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-gray-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          {row.type === 'expense'
                            ? EXPENSE_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))
                            : INCOME_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                        </select>
                      </td>

                      {/* Amount Input */}
                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={row.amount}
                          onChange={(e) =>
                            handleUpdatePreviewRow(row.idTemp, 'amount', parseFloat(e.target.value) || 0)
                          }
                          className={`w-full px-2 py-1 bg-white border border-gray-300 rounded-lg text-xs font-mono font-black text-right focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                            row.type === 'income' ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer Summary & Import Action */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
              <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
                <div className="text-gray-600">
                  Selecionados: <span className="text-emerald-800 font-extrabold">{previewTotals.countSelected}</span> de {importedRows.length}
                </div>
                <div className="text-emerald-700">
                  Entradas: + R$ {previewTotals.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-rose-700">
                  Saídas: - R$ {previewTotals.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className={`px-2.5 py-1 rounded-lg border font-black ${
                  previewTotals.balance >= 0 ? 'bg-emerald-100 border-emerald-300 text-emerald-900' : 'bg-rose-100 border-rose-300 text-rose-900'
                }`}>
                  Saldo da Importação: R$ {previewTotals.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-200 hover:bg-gray-300 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  onClick={handleConfirmImport}
                  disabled={isImportingProgress || previewTotals.countSelected === 0}
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md cursor-pointer disabled:opacity-50 transition"
                >
                  {isImportingProgress ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>
                    Confirmar Importação ({previewTotals.countSelected} Lançamentos)
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Manual Add / Edit Transaction */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-5 bg-primary text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LandmarkIcon className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base sm:text-lg">
                  {editingItem ? 'Editar Movimentação' : 'Nova Movimentação de Caixa'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-4 text-xs sm:text-sm">
              {/* Type Switcher: Entrada vs Saída */}
              <div>
                <label className="block font-bold text-gray-700 mb-1.5">Tipo de Movimentação *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleTypeChange('expense')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold border transition cursor-pointer ${
                      formType === 'expense'
                        ? 'bg-rose-50 border-rose-300 text-rose-700 ring-2 ring-rose-500/20'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <ArrowDownCircle className="w-4 h-4 text-rose-600" />
                    Saída (Despesa)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('income')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold border transition cursor-pointer ${
                      formType === 'income'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700 ring-2 ring-emerald-500/20'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <ArrowUpCircle className="w-4 h-4 text-emerald-600" />
                    Entrada (Receita)
                  </button>
                </div>
              </div>

              {/* Row: Data & Valor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0,00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Descrição / Histórico *</label>
                <input
                  type="text"
                  required
                  placeholder={formType === 'expense' ? 'Ex: Pagamento de energia elétrica da sede' : 'Ex: Doação de empresa para projeto de informatica'}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Category Dropdown (differentiated by Saída vs Entrada) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-gray-700">Categoria *</label>
                  <span className={`text-[11px] font-bold ${formType === 'expense' ? 'text-rose-600' : 'text-emerald-600'}`}>
                    Categorias de {formType === 'expense' ? 'Despesa' : 'Receita'}
                  </span>
                </div>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {availableFormCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Proof File Attachment Section */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Anexo de Comprovante / Foto de Recibo
                </label>

                {formProofUrl ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      {formProofUrl.startsWith('data:image/') || formProofType?.startsWith('image/') ? (
                        <img
                          src={formProofUrl}
                          alt="Thumbnail do comprovante"
                          className="w-10 h-10 object-cover rounded-lg border border-amber-300 shrink-0"
                        />
                      ) : (
                        <div className="p-2 bg-amber-200 text-amber-800 rounded-lg shrink-0">
                          <FileText className="w-6 h-6" />
                        </div>
                      )}
                      <div className="overflow-hidden text-xs">
                        <p className="font-bold text-amber-950 truncate">
                          {formProofName || 'Comprovante Anexado'}
                        </p>
                        <p className="text-[10px] text-amber-700 font-medium">
                          Pronto para salvar no lançamento
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRemoveProof}
                      className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition cursor-pointer shrink-0"
                      title="Remover este comprovante"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  /* File Upload Drop Zone & Camera Buttons */
                  <div className="border-2 border-dashed border-gray-200 hover:border-primary/50 bg-gray-50/80 rounded-2xl p-4 text-center transition-all">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="proof-file-input"
                    />

                    {uploadingFile ? (
                      <div className="py-2 flex flex-col items-center justify-center text-primary">
                        <Loader2 className="w-6 h-6 animate-spin mb-1" />
                        <span className="text-xs font-bold">Processando imagem...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <div className="p-2.5 bg-white shadow-xs rounded-xl text-primary">
                            <Upload className="w-5 h-5" />
                          </div>
                          <div className="p-2.5 bg-white shadow-xs rounded-xl text-amber-600">
                            <Camera className="w-5 h-5" />
                          </div>
                        </div>

                        <label
                          htmlFor="proof-file-input"
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white font-bold text-xs rounded-xl cursor-pointer hover:bg-primary-light transition shadow-xs"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>Selecionar Arquivo ou Tirar Foto</span>
                        </label>

                        <p className="text-[11px] text-gray-400 mt-2">
                          Suporta imagens (PNG, JPG, WEBP) e arquivos PDF de até 10MB
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Internal Notes */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Observações Internas</label>
                <textarea
                  rows={2}
                  placeholder="Anotações complementares para tesouraria ou auditoria..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || uploadingFile}
                  className="flex items-center gap-2 px-5 py-2 font-bold text-white bg-primary hover:bg-primary-light rounded-xl cursor-pointer shadow-md disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{editingItem ? 'Salvar Alterações' : 'Cadastrar Lançamento'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: View Attached Proof Document / Photo */}
      {previewProof && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                <Paperclip className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base truncate">
                    Comprovante: {previewProof.description}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {format(parseISO(previewProof.date), 'dd/MM/yyyy')} — R$ {previewProof.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewProof(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document / Photo Content */}
            <div className="p-6 bg-slate-100 max-h-[70vh] overflow-y-auto flex items-center justify-center">
              {previewProof.proofUrl ? (
                previewProof.proofUrl.startsWith('data:image/') || previewProof.proofFileType?.startsWith('image/') || previewProof.proofUrl.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
                  <img
                    src={previewProof.proofUrl}
                    alt="Comprovante de pagamento / Nota Fiscal"
                    className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-lg border border-slate-200 bg-white"
                  />
                ) : previewProof.proofUrl.startsWith('data:application/pdf') ? (
                  <iframe
                    src={previewProof.proofUrl}
                    title="Documento PDF de Comprovante"
                    className="w-full h-[55vh] rounded-xl border border-slate-300"
                  />
                ) : (
                  <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 shadow-sm max-w-md">
                    <FileText className="w-12 h-12 text-amber-600 mx-auto mb-2" />
                    <p className="font-bold text-gray-900 text-sm">Arquivo Anexado</p>
                    <p className="text-xs text-gray-500 mt-1 mb-4">{previewProof.proofFileName || 'Comprovante_Financeiro'}</p>
                    <a
                      href={previewProof.proofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary-light transition"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Visualizar Documento</span>
                    </a>
                  </div>
                )
              ) : previewProof.driveUrl ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 shadow-sm max-w-md">
                  <ExternalLink className="w-12 h-12 text-amber-600 mx-auto mb-2" />
                  <p className="font-bold text-gray-900 text-sm">Comprovante armazenado no Google Drive</p>
                  <p className="text-xs text-gray-500 mt-1 mb-4">Clique abaixo para abrir o documento na pasta do Drive.</p>
                  <a
                    href={previewProof.driveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white font-bold text-xs rounded-xl hover:bg-amber-700 transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Abrir no Google Drive</span>
                  </a>
                </div>
              ) : null}
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-white border-t border-gray-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">
                Categoria: {previewProof.category}
              </span>

              <div className="flex items-center gap-2">
                {previewProof.proofUrl && (
                  <a
                    href={previewProof.proofUrl}
                    download={previewProof.proofFileName || `Comprovante_${previewProof.date}.jpg`}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 text-white font-bold text-xs rounded-xl hover:bg-slate-900 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Baixar Arquivo</span>
                  </a>
                )}
                <button
                  onClick={() => setPreviewProof(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200 cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function LandmarkIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="3" x2="21" y1="22" y2="22" />
      <line x1="6" x2="6" y1="18" y2="11" />
      <line x1="10" x2="10" y1="18" y2="11" />
      <line x1="14" x2="14" y1="18" y2="11" />
      <line x1="18" x2="18" y1="18" y2="11" />
      <polygon points="12 2 20 7 4 7 12 2" />
    </svg>
  );
}
