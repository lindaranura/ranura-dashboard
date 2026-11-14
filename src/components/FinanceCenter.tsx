import React, { useState, useMemo } from 'react';
import {
  Wallet, TrendingUp, TrendingDown, FileText, PieChart as PieChartIcon,
  BarChart3, Plus, Search, Filter, Download, Edit, Trash2,
  ArrowUpRight, ArrowDownRight, Calendar, Receipt, Target,
  X, Check, Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

import {
  FinanceTransaction, Invoice, InvoiceItem, BudgetCategory, TransactionCategory, InvoiceStatus, Order
} from '../types';

interface FinanceCenterProps {
  orders: Order[];
  transactions: FinanceTransaction[];
  setTransactions: React.Dispatch<React.SetStateAction<FinanceTransaction[]>>;
  invoices: Invoice[];
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  budgets: BudgetCategory[];
  setBudgets: React.Dispatch<React.SetStateAction<BudgetCategory[]>>;
  onAddLog: (platform: string, type: 'info' | 'success' | 'warning' | 'error', message: string) => void;
}

const formatIDR = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const COLORS = ['#0ea5e9', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#64748b'];

export default function FinanceCenter({
  orders,
  transactions,
  setTransactions,
  invoices,
  setInvoices,
  budgets,
  setBudgets,
  onAddLog
}: FinanceCenterProps) {
  const [activeTab, setActiveTab] = useState<'ringkasan' | 'transaksi' | 'faktur' | 'anggaran' | 'laporan'>('ringkasan');
  
  // Modals state
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // New Transaction State
  const [newTx, setNewTx] = useState<Partial<FinanceTransaction>>({
    type: 'expense',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    description: '',
    category: 'Operational',
    reference: ''
  });

  // Calculate Data
  const currentMonthTransactions = useMemo(() => {
    const now = new Date();
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [transactions]);

  const currentMonthIncome = currentMonthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const currentMonthExpense = currentMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netIncome = currentMonthIncome - currentMonthExpense;

  const expenseByCategory = useMemo(() => {
    const expenses = currentMonthTransactions.filter(t => t.type === 'expense');
    const grouped = expenses.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value: Number(value) }))
      .sort((a, b) => b.value - a.value);
  }, [currentMonthTransactions]);

  const tabs = [
    { id: 'ringkasan', label: 'Ringkasan', icon: PieChartIcon },
    { id: 'transaksi', label: 'Transaksi', icon: Wallet },
    { id: 'faktur', label: 'Faktur', icon: Receipt },
    { id: 'anggaran', label: 'Anggaran', icon: Target },
    { id: 'laporan', label: 'Laporan', icon: FileText }
  ] as const;

  const handleAddTransaction = () => {
    if (!newTx.description || !newTx.amount || !newTx.category) {
      onAddLog('Finance', 'warning', 'Silakan isi semua kolom yang diperlukan untuk transaksi.');
      return;
    }
    const transaction: FinanceTransaction = {
      id: `tx-${Date.now()}`,
      type: newTx.type as 'income' | 'expense',
      amount: Number(newTx.amount),
      date: newTx.date || new Date().toISOString().split('T')[0],
      description: newTx.description,
      category: newTx.category as TransactionCategory,
      reference: newTx.reference
    };
    setTransactions([transaction, ...transactions]);
    setShowTransactionModal(false);
    onAddLog('Finance', 'success', `Berhasil menambahkan transaksi ${newTx.type === 'income' ? 'pemasukan' : 'pengeluaran'}: ${formatIDR(Number(newTx.amount))}`);
    setNewTx({ type: 'expense', date: new Date().toISOString().split('T')[0], amount: 0, description: '', category: 'Operational', reference: '' });
  };

  const handleExportLaporanCSV = () => {
    const headers = ['Kategori', 'Deskripsi Pos', 'Nominal (IDR)'];
    const rows = [
      ['Pendapatan', 'Penjualan E-commerce', String(Math.round(currentMonthIncome * 0.6))],
      ['Pendapatan', 'Penjualan B2B', String(Math.round(currentMonthIncome * 0.4))],
      ['Pendapatan', 'Total Pendapatan', String(currentMonthIncome)],
      ['Beban Pokok Penjualan', 'Biaya Bahan Baku (Kain & Busa)', String(Math.round(currentMonthExpense * 0.45))],
      ['Beban Pokok Penjualan', 'Biaya Tenaga Kerja Langsung', String(Math.round(currentMonthExpense * 0.35))],
      ['Beban Pokok Penjualan', 'Total Beban Pokok Penjualan', String(Math.round(currentMonthExpense * 0.8))],
      ['Laba Kotor', 'Laba Kotor Operasional', String(currentMonthIncome - Math.round(currentMonthExpense * 0.8))],
      ['Beban Operasional', 'Pemasaran & Iklan Ads', String(Math.round(currentMonthExpense * 0.12))],
      ['Beban Operasional', 'Operasional & Gudang', String(Math.round(currentMonthExpense * 0.08))],
      ['Laba Bersih', 'Laba Bersih Sebelum Pajak', String(netIncome)]
    ];

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Laporan_Laba_Rugi_Ranura_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onAddLog('Finance', 'success', 'Laporan Laba Rugi berhasil diekspor ke format CSV.');
  };

  const renderRingkasan = () => {
    const trendData = [
      { name: 'Jan', Pendapatan: 40000000, Pengeluaran: 24000000 },
      { name: 'Feb', Pendapatan: 30000000, Pengeluaran: 13980000 },
      { name: 'Mar', Pendapatan: 20000000, Pengeluaran: 9800000 },
      { name: 'Apr', Pendapatan: 27800000, Pengeluaran: 39080000 },
      { name: 'Mei', Pendapatan: 18900000, Pengeluaran: 4800000 },
      { name: 'Jun', Pendapatan: 23900000, Pengeluaran: 3800000 },
      { name: 'Jul', Pendapatan: currentMonthIncome, Pengeluaran: currentMonthExpense },
    ];

    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex justify-end gap-3 mb-4">
           <button onClick={() => setShowTransactionModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium shadow-sm hover:bg-blue-700 transition-colors flex items-center">
             <Plus className="w-4 h-4 mr-2" /> Tambah Transaksi
           </button>
           <button onClick={() => setShowInvoiceModal(true)} className="px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl font-medium shadow-sm hover:bg-slate-50 transition-colors flex items-center">
             <FileText className="w-4 h-4 mr-2" /> Buat Faktur
           </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-500 font-medium">Laba Bersih Bulan Ini</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-2">{formatIDR(netIncome)}</h3>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Wallet className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className={`flex items-center font-medium px-2 py-1 rounded-full ${netIncome >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                {netIncome >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                +12.5%
              </span>
              <span className="text-slate-500 ml-2">vs bulan lalu</span>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-500 font-medium">Total Pendapatan</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-2">{formatIDR(currentMonthIncome)}</h3>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <ArrowUpRight className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-slate-500">Margin Kotor: <span className="font-medium text-slate-700">68%</span></p>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-500 font-medium">Total Pengeluaran</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-2">{formatIDR(currentMonthExpense)}</h3>
              </div>
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                <ArrowDownRight className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4">
               <p className="text-sm text-slate-500">Rasio Beban: <span className="font-medium text-slate-700">32%</span></p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm">
            <h4 className="text-lg font-semibold text-slate-800 mb-6">Tren Arus Kas (6 Bulan)</h4>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorPendapatan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPengeluaran" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} tickFormatter={(value) => `Rp${value/1000000}M`} />
                  <RechartsTooltip formatter={(value: number) => formatIDR(value)} />
                  <Area type="monotone" dataKey="Pendapatan" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorPendapatan)" />
                  <Area type="monotone" dataKey="Pengeluaran" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorPengeluaran)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm">
            <h4 className="text-lg font-semibold text-slate-800 mb-6">Pengeluaran Terbesar</h4>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expenseByCategory.slice(0, 5)} layout="vertical" margin={{ top: 0, right: 0, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 12}} />
                  <RechartsTooltip formatter={(value: number) => formatIDR(value)} />
                  <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]}>
                    {expenseByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderTransaksi = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
       <div className="flex justify-between items-center bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 shadow-sm">
          <div className="flex gap-4">
             <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Cari transaksi..." className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl w-64 focus:outline-none focus:ring-2 focus:ring-blue-500" />
             </div>
             <div className="relative">
                <Filter className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                   <option value="all">Semua Tipe</option>
                   <option value="income">Pemasukan</option>
                   <option value="expense">Pengeluaran</option>
                </select>
             </div>
          </div>
          <button onClick={() => setShowTransactionModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium shadow-sm hover:bg-blue-700 transition-colors flex items-center">
             <Plus className="w-4 h-4 mr-2" /> Transaksi Baru
          </button>
       </div>

       <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
         <div className="overflow-x-auto">
           <table className="w-full text-left border-collapse">
             <thead>
               <tr className="bg-slate-50 border-b border-slate-200">
                 <th className="px-6 py-4 text-sm font-medium text-slate-500">Tanggal</th>
                 <th className="px-6 py-4 text-sm font-medium text-slate-500">Deskripsi</th>
                 <th className="px-6 py-4 text-sm font-medium text-slate-500">Kategori</th>
                 <th className="px-6 py-4 text-sm font-medium text-slate-500">Referensi</th>
                 <th className="px-6 py-4 text-sm font-medium text-slate-500 text-right">Jumlah</th>
                 <th className="px-6 py-4 text-sm font-medium text-slate-500">Aksi</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {transactions.map((tx) => (
                 <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                   <td className="px-6 py-4 text-sm text-slate-600">{new Date(tx.date).toLocaleDateString('id-ID')}</td>
                   <td className="px-6 py-4 text-sm font-medium text-slate-900">{tx.description}</td>
                   <td className="px-6 py-4 text-sm text-slate-600">
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                        {tx.category}
                      </span>
                   </td>
                   <td className="px-6 py-4 text-sm text-slate-500">{tx.reference || '-'}</td>
                   <td className={`px-6 py-4 text-sm font-semibold text-right ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                     <div className="flex items-center justify-end">
                       {tx.type === 'income' ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                       {formatIDR(tx.amount)}
                     </div>
                   </td>
                   <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <button className="p-1 text-slate-400 hover:text-blue-600 transition-colors"><Edit className="w-4 h-4" /></button>
                        <button className="p-1 text-slate-400 hover:text-rose-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
       </div>
    </motion.div>
  );

  const renderFaktur = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl p-4 shadow-sm flex flex-col justify-center">
             <p className="text-xs text-slate-500 font-medium">0-30 Hari</p>
             <h4 className="text-xl font-bold text-slate-800 mt-1">{formatIDR(45000000)}</h4>
          </div>
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl p-4 shadow-sm flex flex-col justify-center">
             <p className="text-xs text-slate-500 font-medium">31-60 Hari</p>
             <h4 className="text-xl font-bold text-slate-800 mt-1">{formatIDR(12500000)}</h4>
          </div>
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl p-4 shadow-sm flex flex-col justify-center">
             <p className="text-xs text-slate-500 font-medium">61-90 Hari</p>
             <h4 className="text-xl font-bold text-amber-600 mt-1">{formatIDR(5000000)}</h4>
          </div>
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl p-4 shadow-sm flex flex-col justify-center">
             <p className="text-xs text-slate-500 font-medium">&gt; 90 Hari</p>
             <h4 className="text-xl font-bold text-rose-600 mt-1">{formatIDR(2000000)}</h4>
          </div>
       </div>

       <div className="flex justify-between items-center bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 shadow-sm">
          <h4 className="font-semibold text-slate-800">Daftar Faktur</h4>
          <button onClick={() => setShowInvoiceModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium shadow-sm hover:bg-blue-700 transition-colors flex items-center">
             <Plus className="w-4 h-4 mr-2" /> Buat Faktur
          </button>
       </div>

       <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
         <table className="w-full text-left border-collapse">
            <thead>
               <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-sm font-medium text-slate-500">ID Faktur</th>
                  <th className="px-6 py-4 text-sm font-medium text-slate-500">Pelanggan</th>
                  <th className="px-6 py-4 text-sm font-medium text-slate-500">Tanggal Buat</th>
                  <th className="px-6 py-4 text-sm font-medium text-slate-500">Jatuh Tempo</th>
                  <th className="px-6 py-4 text-sm font-medium text-slate-500 text-right">Total</th>
                  <th className="px-6 py-4 text-sm font-medium text-slate-500 text-center">Status</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
               {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setSelectedInvoice(inv)}>
                     <td className="px-6 py-4 text-sm font-medium text-blue-600">{inv.id}</td>
                     <td className="px-6 py-4 text-sm text-slate-900">{inv.customerName}</td>
                     <td className="px-6 py-4 text-sm text-slate-600">{new Date(inv.createdAt || inv.dueDate).toLocaleDateString('id-ID')}</td>
                     <td className="px-6 py-4 text-sm text-slate-600">{new Date(inv.dueDate).toLocaleDateString('id-ID')}</td>
                     <td className="px-6 py-4 text-sm font-medium text-slate-900 text-right">{formatIDR(inv.total)}</td>
                     <td className="px-6 py-4 text-sm text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                           inv.status?.toLowerCase() === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                           inv.status?.toLowerCase() === 'sent' ? 'bg-blue-100 text-blue-800' :
                           inv.status?.toLowerCase() === 'overdue' ? 'bg-rose-100 text-rose-800' :
                           'bg-slate-100 text-slate-800'
                        }`}>
                           {inv.status?.toLowerCase() === 'paid' ? 'Lunas' : inv.status?.toLowerCase() === 'sent' ? 'Terkirim' : inv.status?.toLowerCase() === 'overdue' ? 'Jatuh Tempo' : 'Draf'}
                        </span>
                     </td>
                  </tr>
               ))}
            </tbody>
         </table>
       </div>
    </motion.div>
  );

  const renderAnggaran = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center">
             <h4 className="text-lg font-semibold text-slate-800 mb-4 w-full text-left">Pemanfaatan Anggaran</h4>
             <div className="w-64 h-64">
                <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                      <Pie
                         data={budgets.map(b => ({ name: b.name, value: b.spent }))}
                         cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}
                         dataKey="value"
                      >
                         {budgets.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip formatter={(value: number) => formatIDR(value)} />
                   </PieChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm">
             <div className="flex justify-between items-center mb-6">
                <h4 className="text-lg font-semibold text-slate-800">Kategori Anggaran</h4>
                <button className="text-sm font-medium text-blue-600 hover:text-blue-700">Atur Anggaran</button>
             </div>
             <div className="space-y-6">
                {budgets.map((budget, i) => {
                   const percent = Math.min(100, Math.round((budget.spent / budget.allocated) * 100));
                   const colorClass = percent >= 90 ? 'bg-rose-500' : percent >= 75 ? 'bg-amber-500' : 'bg-emerald-500';
                   return (
                      <div key={i}>
                         <div className="flex justify-between text-sm mb-2">
                            <span className="font-medium text-slate-700">{budget.name}</span>
                            <span className="text-slate-500">{formatIDR(budget.spent)} / {formatIDR(budget.allocated)}</span>
                         </div>
                         <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                            <motion.div 
                               initial={{ width: 0 }} animate={{ width: `${percent}%` }}
                               className={`h-2.5 rounded-full ${colorClass}`}
                            />
                         </div>
                         {percent >= 90 && (
                            <p className="text-xs text-rose-500 mt-1 flex items-center">
                               <TrendingDown className="w-3 h-3 mr-1" /> Peringatan: Hampir melebihi batas anggaran
                            </p>
                         )}
                      </div>
                   );
                })}
             </div>
          </div>
       </div>
    </motion.div>
  );

  const renderLaporan = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
       <div className="flex justify-between items-center bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 shadow-sm">
          <h4 className="font-semibold text-slate-800">Laporan Laba Rugi</h4>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium shadow-xs hover:bg-slate-50 transition-colors flex items-center cursor-pointer text-xs">
               <Printer className="w-3.5 h-3.5 mr-1.5" /> Cetak Laporan
            </button>
            <button onClick={handleExportLaporanCSV} className="px-3.5 py-2 bg-slate-900 text-white rounded-xl font-medium shadow-sm hover:bg-slate-800 transition-colors flex items-center cursor-pointer text-xs">
               <Download className="w-3.5 h-3.5 mr-1.5" /> Ekspor CSV
            </button>
          </div>
       </div>

       <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-sm p-6 printable-report">
          <div className="border-b border-slate-200 pb-4 mb-4">
             <h5 className="font-bold text-slate-800 mb-4">Pendapatan</h5>
             <div className="flex justify-between text-sm py-2">
                <span className="text-slate-600">Penjualan E-commerce</span>
                <span className="font-medium">{formatIDR(currentMonthIncome * 0.6)}</span>
             </div>
             <div className="flex justify-between text-sm py-2">
                <span className="text-slate-600">Penjualan B2B</span>
                <span className="font-medium">{formatIDR(currentMonthIncome * 0.4)}</span>
             </div>
             <div className="flex justify-between text-sm font-bold text-emerald-600 pt-2 mt-2 border-t border-slate-100">
                <span>Total Pendapatan</span>
                <span>{formatIDR(currentMonthIncome)}</span>
             </div>
          </div>

          <div className="border-b border-slate-200 pb-4 mb-4">
             <h5 className="font-bold text-slate-800 mb-4">Pengeluaran</h5>
             {expenseByCategory.map((exp, i) => (
                <div key={i} className="flex justify-between text-sm py-2">
                   <span className="text-slate-600">{exp.name}</span>
                   <span className="font-medium">{formatIDR(exp.value)}</span>
                </div>
             ))}
             <div className="flex justify-between text-sm font-bold text-rose-600 pt-2 mt-2 border-t border-slate-100">
                <span>Total Pengeluaran</span>
                <span>{formatIDR(currentMonthExpense)}</span>
             </div>
          </div>

          <div className="flex justify-between text-lg font-bold text-slate-900 bg-slate-50 p-4 rounded-xl">
             <span>Laba Bersih</span>
             <span>{formatIDR(netIncome)}</span>
          </div>
       </div>
    </motion.div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Pusat Keuangan</h1>
          <p className="text-slate-500 mt-1">Kelola pendapatan, pengeluaran, faktur, dan anggaran perusahaan.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 border-b border-slate-200 mb-8 overflow-x-auto hide-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-6 py-3 text-sm font-medium transition-all relative whitespace-nowrap ${
                isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {tab.label}
              {isActive && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'ringkasan' && renderRingkasan()}
        {activeTab === 'transaksi' && renderTransaksi()}
        {activeTab === 'faktur' && renderFaktur()}
        {activeTab === 'anggaran' && renderAnggaran()}
        {activeTab === 'laporan' && renderLaporan()}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {showTransactionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-900">Tambah Transaksi</h3>
                <button onClick={() => setShowTransactionModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex gap-4 p-1 bg-slate-100 rounded-xl">
                   <button onClick={() => setNewTx({...newTx, type: 'income'})} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${newTx.type === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>Pemasukan</button>
                   <button onClick={() => setNewTx({...newTx, type: 'expense'})} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${newTx.type === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}>Pengeluaran</button>
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Jumlah</label>
                   <input type="number" value={newTx.amount || ''} onChange={e => setNewTx({...newTx, amount: Number(e.target.value)})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0" />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi</label>
                   <input type="text" value={newTx.description} onChange={e => setNewTx({...newTx, description: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Contoh: Pembayaran Hosting" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Kategori</label>
                      <select value={newTx.category} onChange={e => setNewTx({...newTx, category: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                         <option value="Operational">Operasional</option>
                         <option value="Raw Materials">Bahan Baku</option>
                         <option value="Marketing">Pemasaran</option>
                         <option value="Payroll">Gaji</option>
                         <option value="Sales">Penjualan</option>
                         <option value="Other">Lainnya</option>
                      </select>
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal</label>
                      <input type="date" value={newTx.date} onChange={e => setNewTx({...newTx, date: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                   </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button onClick={() => setShowTransactionModal(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors">Batal</button>
                <button onClick={handleAddTransaction} className="px-4 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-xl transition-colors">Simpan Transaksi</button>
              </div>
            </motion.div>
          </div>
        )}

        {selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center p-6 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-900">Detail Faktur - {selectedInvoice.id}</h3>
                <button onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-8 overflow-y-auto flex-1 printable-invoice">
                 <div className="flex justify-between items-start mb-8">
                    <div>
                       <h2 className="text-2xl font-bold text-slate-900">FAKTUR TAGIHAN</h2>
                       <p className="text-slate-500 mt-1">PT Ranura Berkah Abadi</p>
                    </div>
                    <div className="text-right">
                       <p className="font-medium text-slate-900">{selectedInvoice.customerName}</p>
                       <p className="text-slate-500 text-sm mt-1">Tanggal: {new Date(selectedInvoice.createdAt || selectedInvoice.dueDate).toLocaleDateString('id-ID')}</p>
                       <p className="text-slate-500 text-sm">Jatuh Tempo: {new Date(selectedInvoice.dueDate).toLocaleDateString('id-ID')}</p>
                    </div>
                 </div>
                 
                 <table className="w-full text-left border-collapse mb-8">
                    <thead>
                       <tr className="border-b border-slate-200">
                          <th className="py-3 text-sm font-medium text-slate-900">Item</th>
                          <th className="py-3 text-sm font-medium text-slate-900 text-center">Qty</th>
                          <th className="py-3 text-sm font-medium text-slate-900 text-right">Harga Satuan</th>
                          <th className="py-3 text-sm font-medium text-slate-900 text-right">Total</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {selectedInvoice.items.map((item, i) => {
                          const itemName = item.name || (item as any).description || 'Produk';
                          const itemQty = item.qty || (item as any).quantity || 1;
                          const itemTotal = item.total || (itemQty * item.unitPrice);
                          return (
                            <tr key={i}>
                               <td className="py-4 text-sm text-slate-600">{itemName}</td>
                               <td className="py-4 text-sm text-slate-600 text-center">{itemQty}</td>
                               <td className="py-4 text-sm text-slate-600 text-right">{formatIDR(item.unitPrice)}</td>
                               <td className="py-4 text-sm font-medium text-slate-900 text-right">{formatIDR(itemTotal)}</td>
                            </tr>
                          );
                       })}
                    </tbody>
                 </table>

                 <div className="flex justify-end">
                    <div className="w-64 space-y-3">
                       <div className="flex justify-between text-sm text-slate-600">
                          <span>Subtotal</span>
                          <span>{formatIDR(selectedInvoice.total)}</span>
                       </div>
                       <div className="flex justify-between text-sm text-slate-600">
                          <span>Pajak (0%)</span>
                          <span>{formatIDR(0)}</span>
                       </div>
                       <div className="flex justify-between text-lg font-bold text-slate-900 pt-3 border-t border-slate-200">
                          <span>Total Tagihan</span>
                          <span>{formatIDR(selectedInvoice.total)}</span>
                       </div>
                    </div>
                 </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button onClick={() => window.print()} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-medium hover:bg-slate-100 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5">
                  <Printer className="w-4 h-4" /> Cetak Faktur / PDF
                </button>
                <button onClick={() => setSelectedInvoice(null)} className="px-4 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-xl transition-colors cursor-pointer">Tutup</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
