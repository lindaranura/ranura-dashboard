import React from 'react';
import { 
  Database, 
  Package, 
  Bot, 
  ArrowRight, 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  MessageSquare, 
  AlertTriangle,
  FileSpreadsheet,
  Wallet,
  BarChart3,
  Receipt,
  ShieldCheck,
  Calendar,
  Sparkles,
  ArrowUpRight,
  TrendingDown,
  FileText,
  Megaphone,
  UserCheck
} from 'lucide-react';
import { motion } from 'motion/react';
import { Order, ProductionItem, FinanceTransaction, Invoice, CalendarPost } from '../types';
import { INITIAL_TRANSACTIONS, INITIAL_INVOICES, INITIAL_CALENDAR_POSTS } from '../data/mockData';

interface BerandaProps {
  orders: Order[];
  inventory: ProductionItem[];
  threads?: any[];
  setActiveTab: (tab: string) => void;
  transactions?: FinanceTransaction[];
  invoices?: Invoice[];
  calendarPosts?: CalendarPost[];
  googleUser?: any;
}

export default function Beranda({ 
  orders, 
  inventory, 
  threads, 
  setActiveTab,
  transactions,
  invoices,
  calendarPosts,
  googleUser
}: BerandaProps) {
  // 1. Calculations for Order Summary
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'Pending' || o.status === 'Menunggu Diproses').length;
  const processedOrders = orders.filter(o => o.status === 'Processed' || o.status === 'Shipped' || o.status === 'Menunggu Dicetak' || o.status === 'Menunggu Pickup' || o.status === 'Pesanan Dikirim').length;
  const completedOrders = orders.filter(o => o.status === 'Completed' || o.status === 'Pesanan Selesai').length;
  const cancelledOrders = orders.filter(o => o.status === 'Cancelled' || o.status === 'Pesanan Dibatalkan').length;
  const validOrders = orders.filter(o => o.status !== 'Cancelled' && o.status !== 'Pesanan Dibatalkan');
  const totalRevenue = validOrders.reduce((sum, o) => sum + o.totalPrice, 0);

  // Chronological sorting (most recent first)
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
    .slice(0, 3);

  // 2. Financial KPIs & Data
  const liveTransactions = transactions || INITIAL_TRANSACTIONS;
  const liveInvoices = invoices || INITIAL_INVOICES;
  const livePosts = calendarPosts || INITIAL_CALENDAR_POSTS;

  const aov = validOrders.length > 0 ? totalRevenue / validOrders.length : 0;
  const completedRevenue = orders
    .filter(o => o.status === 'Completed' || o.status === 'Pesanan Selesai')
    .reduce((sum, o) => sum + o.totalPrice, 0);
  const paymentRate = totalRevenue > 0 ? (completedRevenue / totalRevenue) * 100 : 0;
  const estimatedMarginPercent = 35; // configurable
  const estimatedMargin = totalRevenue * (estimatedMarginPercent / 100);

  // Cashflow & Invoices
  const totalIncome = liveTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = liveTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netCashflow = totalIncome - totalExpense;
  const unpaidInvoices = liveInvoices.filter(i => {
    const s = (i.status || '').toLowerCase();
    return s === 'unpaid' || s === 'overdue' || s === 'belum lunas' || s === 'jatuh tempo';
  });
  const unpaidTotal = unpaidInvoices.reduce((sum, i) => sum + i.total, 0);
  const recentTransactions = [...liveTransactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  // Content Calendar KPIs
  const upcomingPosts = [...livePosts]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);
  const scheduledCount = livePosts.filter(p => p.status === 'scheduled').length;
  const publishedCount = livePosts.filter(p => p.status === 'published').length;

  // Platform revenue breakdown
  const platformRevenue = validOrders.reduce((acc, o) => {
    const p = o.platform || 'manual';
    acc[p] = (acc[p] || 0) + o.totalPrice;
    return acc;
  }, {} as Record<string, number>);
  const maxPlatformRevenue = Math.max(...Object.values(platformRevenue), 1);

  // 3. Calculations for Stock & Production Summary
  const totalSKUs = inventory.length;
  const lowStockItems = inventory.filter(item => item.stock <= item.reserved || item.status === 'critical' || item.status === 'warning');
  const totalStock = inventory.reduce((sum, i) => sum + i.stock, 0);
  const optimalCount = inventory.filter(i => i.status === 'optimal').length;
  const efficiencyRate = totalSKUs > 0 ? ((optimalCount / totalSKUs) * 100).toFixed(1) : '100.0';
  const quickStockList = [...inventory]
    .sort((a, b) => (a.stock - a.reserved) - (b.stock - b.reserved))
    .slice(0, 3);

  // 4. Chat Threads (aligned to real products)
  const mockThreads = [
    {
      id: 'thr-1',
      customerName: 'Rian Kurniawan',
      platform: 'shopee' as const,
      productName: 'Baju Renang Apung Ranura',
      lastMessage: 'Halo Kak, apakah Baju Renang Apung ukuran L ready?',
      timestamp: '08:12',
      unread: true
    },
    {
      id: 'thr-2',
      customerName: 'Santi Sitorus (PT Citra)',
      platform: 'tiktok' as const,
      productName: 'Rompi Sholat Madani Mayudee',
      lastMessage: 'Hi, Rompi Sholat Madani ini apakah bahannya tebal?',
      timestamp: 'Kemarin',
      unread: false
    },
    {
      id: 'thr-3',
      customerName: 'Dian Pratama (CV Jaya)',
      platform: 'shopee' as const,
      productName: 'Baju Renang Apung Anak Ranura',
      lastMessage: 'Pagi Gan, apakah aman untuk anak yang belum bisa berenang?',
      timestamp: 'Kemarin',
      unread: false
    }
  ];

  const liveThreads = threads || mockThreads;
  const unreadChatsCount = liveThreads.filter(t => t.unread).length;
  const recentThreads = [...liveThreads].slice(0, 3);

  // Format currency helper
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  const formatShort = (num: number) => {
    if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
    return num.toString();
  };

  return (
    <div id="beranda-viewport" className="flex-1 overflow-y-auto p-8 space-y-8 glow-grid animate-fade-up">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 text-white p-7 rounded-3xl shadow-xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold font-sans tracking-tight">
            {googleUser?.displayName 
              ? `Selamat Datang, ${googleUser.displayName} 👋` 
              : 'Selamat Datang di Ranura Dashboard'}
          </h1>
          <p className="text-xs text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
            {googleUser?.email ? <span className="text-blue-300 font-semibold">{googleUser.email} • </span> : null}
            Sistem operasional terpadu manufaktur garmen busana muslim & baju renang apung anak: sinkronisasi order marketplace, kontrol gudang, pembukuan kas, serta otomasi konten promosi.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10 shrink-0">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="text-xs font-mono font-semibold tracking-wider text-slate-200">AI AGENT ACTIVE</span>
        </div>
      </div>

      {/* ============================================================= */}
      {/* FINANCIAL KPI ROW */}
      {/* ============================================================= */}
      <div id="beranda-financial-kpis" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Revenue */}
        <motion.div whileHover={{ y: -3 }} className="financial-card-glow p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Total Pendapatan Order</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-slate-900 font-mono">{formatIDR(totalRevenue)}</p>
          <div className="mt-3 space-y-1.5">
            {Object.entries(platformRevenue).map(([platform, rev]) => (
              <div key={platform} className="flex items-center gap-2 text-[10px]">
                <span className="w-14 text-slate-500 font-medium capitalize truncate">{platform}</span>
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`platform-bar ${platform}`}
                    style={{ width: `${(rev / maxPlatformRevenue) * 100}%`, height: '100%' }}
                  />
                </div>
                <span className="text-slate-600 font-mono font-semibold w-10 text-right">{formatShort(rev)}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* KPI 2: AOV */}
        <motion.div whileHover={{ y: -3 }} className="financial-card-glow p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Rata-Rata Nilai Order</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg border border-purple-100">
              <BarChart3 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-slate-900 font-mono">{formatIDR(aov)}</p>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">
            dari {validOrders.length} pesanan valid terdaftar
          </p>
        </motion.div>

        {/* KPI 3: Payment Completion Rate */}
        <motion.div whileHover={{ y: -3 }} className="financial-card-glow p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Tingkat Pembayaran</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-slate-900 font-mono">{paymentRate.toFixed(1)}%</p>
          <div className="mt-2.5 flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all" style={{ width: `${paymentRate}%` }} />
            </div>
            <span className="text-[9px] text-slate-400 font-mono">{completedOrders}/{totalOrders}</span>
          </div>
        </motion.div>

        {/* KPI 4: Estimated Gross Margin */}
        <motion.div whileHover={{ y: -3 }} className="financial-card-glow p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Est. Margin Kotor</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-slate-900 font-mono">{formatIDR(estimatedMargin)}</p>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">
            <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-bold border border-amber-100">{estimatedMarginPercent}%</span> margin target pabrik
          </p>
        </motion.div>
      </div>

      {/* ============================================================= */}
      {/* 3 CORE OPERATIONAL BLOCKS */}
      {/* ============================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* BLOCK 1: Master Data Order Summary */}
        <div id="beranda-order-card" className="glass-panel card-hover-effect rounded-2xl p-6 flex flex-col justify-between shadow-sm">
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center border border-blue-100">
                  <Database className="h-4.5 w-4.5" />
                </div>
                <h3 className="font-bold text-sm text-slate-800">Master Data Order</h3>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full font-mono">
                {totalOrders} TOTAL
              </span>
            </div>

            {/* Micro KPIs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Pending Harian</span>
                <span className="text-lg font-bold text-slate-800 font-mono mt-0.5 block">{pendingOrders} order</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Diproses / Kirim</span>
                <span className="text-lg font-bold text-slate-800 font-mono mt-0.5 block">{processedOrders} order</span>
              </div>
            </div>

            {/* Payment Status Breakdown */}
            <div className="bg-blue-50/40 p-3.5 rounded-xl border border-blue-100/50">
              <span className="text-[10px] text-blue-600 font-bold block uppercase">Status Pemrosesan</span>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex-1">
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Selesai</span>
                    <span className="font-mono font-bold text-emerald-700">{completedOrders}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-amber-600 font-semibold flex items-center gap-1"><Clock className="h-3 w-3" /> Diproses</span>
                    <span className="font-mono font-bold text-amber-700">{pendingOrders + processedOrders}</span>
                  </div>
                  {cancelledOrders > 0 && (
                    <div className="flex justify-between text-[10px] mt-1">
                      <span className="text-rose-500 font-semibold">Dibatalkan</span>
                      <span className="font-mono font-bold text-rose-600">{cancelledOrders}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* List of Recent Orders (Sorted Chronologically) */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pesanan Terbaru Masuk</span>
              <div className="divide-y divide-slate-100">
                {recentOrders.map((order) => (
                  <div key={order.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 truncate">{order.customerName}</p>
                      <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                        <span className={`px-1 rounded-[4px] text-[8px] font-bold uppercase ${
                          order.platform === 'shopee' ? 'bg-orange-100 text-orange-700' :
                          order.platform === 'tiktok' ? 'bg-fuchsia-100 text-fuchsia-700' :
                          order.platform === 'telegram' ? 'bg-sky-100 text-sky-700' :
                          'bg-cyan-100 text-cyan-700'
                        }`}>
                          {order.platform === 'shopee' ? 'SHOPEE SC' : order.platform === 'tiktok' ? 'TIKTOK SC' : order.platform === 'telegram' ? 'TELEGRAM' : 'MANUAL B2B'}
                        </span>
                        <span className="truncate">{order.sku}</span>
                      </p>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      order.status === 'Completed' || order.status === 'Pesanan Selesai' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                      order.status === 'Pending' || order.status === 'Menunggu Diproses' ? 'bg-amber-50 text-amber-600 border border-amber-100 animate-pulse' :
                      'bg-blue-50 text-blue-600 border border-blue-100'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('orders')}
            className="w-full mt-6 flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-blue-500/10 cursor-pointer active:scale-[0.98]"
          >
            Kelola Master Data Order
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* BLOCK 2: Stok & Produksi Summary */}
        <div id="beranda-inventory-card" className="glass-panel card-hover-effect rounded-2xl p-6 flex flex-col justify-between shadow-sm">
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
                  <Package className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-800">Stok & Pergudangan</h3>
              </div>
              <span className="text-[10px] bg-emerald-50 text-emerald-650 font-bold px-2.5 py-1 rounded-full font-mono">
                {totalSKUs} SKU
              </span>
            </div>

            {/* Micro KPIs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 flex flex-col justify-between">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Item Kritis / Menipis</span>
                <span className="text-lg font-bold text-slate-800 font-mono mt-0.5 block flex items-center gap-1.5">
                  {lowStockItems.length} SKU
                  {lowStockItems.length > 0 && <AlertTriangle className="h-4 w-4 text-amber-500 inline shrink-0 animate-bounce" />}
                </span>
              </div>
              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Total Fisik Gudang</span>
                <span className="text-lg font-bold text-slate-800 font-mono mt-0.5 block">{totalStock.toLocaleString('id-ID')} pcs</span>
              </div>
            </div>

            <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100/40 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-emerald-600 font-bold block uppercase">Kesehatan Kapasitas Stok</span>
                <span className="text-base font-extrabold text-emerald-900 font-mono mt-0.5 block">
                  {Number(efficiencyRate) >= 80 ? 'Optimal' : Number(efficiencyRate) >= 50 ? 'Cukup' : 'Perlu Perhatian'} ({efficiencyRate}%)
                </span>
              </div>
              <TrendingUp className="h-6 w-6 text-emerald-600 shrink-0" />
            </div>

            {/* Low stock list with health bars */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Kondisi Stok SKU Terendah</span>
              <div className="divide-y divide-slate-100">
                {quickStockList.map((item) => {
                  const maxCap = Math.max(item.stock, item.reserved * 3, 50);
                  const fillPercent = Math.min((item.stock / maxCap) * 100, 100);
                  const healthClass = item.stock <= 5 ? 'critical' : item.stock <= 15 ? 'warning' : 'optimal';
                  return (
                    <div key={item.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-800 truncate">{item.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          SKU: {item.sku}
                        </p>
                        <div className="stock-health-bar mt-1.5" style={{ width: '100%' }}>
                          <div className={`stock-health-bar-fill ${healthClass}`} style={{ width: `${fillPercent}%` }} />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-slate-800 font-mono">{item.stock} {item.unit}</p>
                        <p className="text-[9px] text-slate-400 font-mono">Book: {item.reserved}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('inventory')}
            className="w-full mt-6 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-emerald-500/10 cursor-pointer active:scale-[0.98]"
          >
            Kelola Stok & Pergudangan
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* BLOCK 3: Chat Toko Summary */}
        <div id="beranda-chat-card" className="glass-panel card-hover-effect rounded-2xl p-6 flex flex-col justify-between shadow-sm">
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 bg-fuchsia-50 text-fuchsia-600 rounded-xl flex items-center justify-center border border-fuchsia-100">
                  <Bot className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-800">Chat Toko AI Autopilot</h3>
              </div>
              <span className="text-[10px] bg-fuchsia-50 text-fuchsia-650 font-bold px-2.5 py-1 rounded-full font-mono">
                GEMINI AI
              </span>
            </div>

            {/* Micro KPIs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Belum Dijawab</span>
                <span className="text-lg font-bold text-slate-800 font-mono mt-0.5 block flex items-center gap-1.5">
                  {unreadChatsCount} Chat
                  {unreadChatsCount > 0 && (
                    <span className="h-2 w-2 rounded-full bg-red-500 inline-block animate-ping"></span>
                  )}
                </span>
              </div>
              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Auto-Replied Aktif</span>
                <span className="text-lg font-bold text-slate-800 font-mono mt-0.5 block">142 obrolan</span>
              </div>
            </div>

            <div className="bg-fuchsia-50/50 p-3.5 rounded-xl border border-fuchsia-100/40 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-fuchsia-600 font-bold block uppercase">Respon Bot AI Toko</span>
                <span className="text-base font-extrabold text-fuchsia-900 font-mono mt-0.5 block">
                  Online 24 Jam
                </span>
              </div>
              <MessageSquare className="h-6 w-6 text-fuchsia-600 shrink-0" />
            </div>

            {/* Active Threads Preview */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Percakapan Calon Pembeli</span>
              <div className="divide-y divide-slate-100">
                {recentThreads.map((thr) => (
                  <div key={thr.id} className="py-2 flex flex-col gap-0.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 truncate">{thr.customerName}</span>
                      <span className="text-[9px] text-slate-400 font-mono">{thr.timestamp}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] text-slate-500 truncate flex-1 leading-relaxed">{thr.lastMessage}</p>
                      <span className={`px-1.5 py-0.5 text-[7px] font-bold rounded shrink-0 uppercase ${
                        thr.platform === 'shopee' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-100'
                      }`}>
                        {thr.platform === 'shopee' ? 'SHOPEE' : 'TIKTOK'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('chat')}
            className="w-full mt-6 flex items-center justify-center gap-1.5 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-fuchsia-500/10 cursor-pointer active:scale-[0.98]"
          >
            Kelola Chat Toko AI
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

      </div>

      {/* ============================================================= */}
      {/* 2 COMPLEMENTARY ENTERPRISE SNAPSHOTS: FINANCE & MEDIA */}
      {/* ============================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* SNAPSHOT 1: Keuangan & Faktur Tagihan */}
        <div className="glass-panel card-hover-effect rounded-2xl p-6 flex flex-col justify-between shadow-sm">
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Keuangan & Tagihan Faktur</h3>
                  <p className="text-[11px] text-slate-400">Pembukuan kas masuk/keluar & piutang grosir</p>
                </div>
              </div>
              <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2.5 py-1 rounded-full font-mono">
                LABA BERSIH: {formatShort(netCashflow)}
              </span>
            </div>

            {/* Financial Quick Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                <span className="text-[10px] text-emerald-700 font-semibold block uppercase">Kas Masuk</span>
                <span className="text-sm font-bold text-emerald-900 font-mono mt-0.5 block">{formatShort(totalIncome)}</span>
              </div>
              <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100">
                <span className="text-[10px] text-rose-700 font-semibold block uppercase">Kas Keluar</span>
                <span className="text-sm font-bold text-rose-900 font-mono mt-0.5 block">{formatShort(totalExpense)}</span>
              </div>
              <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100">
                <span className="text-[10px] text-amber-700 font-semibold block uppercase">Faktur Tertunda</span>
                <span className="text-sm font-bold text-amber-900 font-mono mt-0.5 block">{unpaidInvoices.length} Tagihan</span>
              </div>
            </div>

            {/* Recent Ledger Entries */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Catatan Transaksi Terakhir</span>
              <div className="divide-y divide-slate-100">
                {recentTransactions.map((tx) => (
                  <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="min-w-0 flex-1 pr-3">
                      <p className="font-semibold text-slate-800 truncate">{tx.description}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                        <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded text-[9px] uppercase font-bold">{tx.category}</span>
                        <span>{tx.date}</span>
                      </p>
                    </div>
                    <span className={`font-mono font-bold text-xs shrink-0 ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatIDR(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('finance')}
            className="w-full mt-6 flex items-center justify-center gap-1.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-all shadow-sm cursor-pointer active:scale-[0.98]"
          >
            Buka Pusat Keuangan & Laba
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* SNAPSHOT 2: Kalender Konten & Kampanye Promosi */}
        <div className="glass-panel card-hover-effect rounded-2xl p-6 flex flex-col justify-between shadow-sm">
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center border border-purple-100">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Kalender Konten & Media Toko</h3>
                  <p className="text-[11px] text-slate-400">Jadwal postingan TikTok, IG, & promosi Shopee</p>
                </div>
              </div>
              <span className="text-[10px] bg-purple-50 text-purple-700 font-bold px-2.5 py-1 rounded-full font-mono">
                {scheduledCount} TERJADWAL
              </span>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-purple-50/50 p-3 rounded-xl border border-purple-100">
                <span className="text-[10px] text-purple-700 font-semibold block uppercase">Postingan Terjadwal</span>
                <span className="text-base font-bold text-purple-900 font-mono mt-0.5 block">{scheduledCount} Konten</span>
              </div>
              <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                <span className="text-[10px] text-emerald-700 font-semibold block uppercase">Sudah Dipublikasikan</span>
                <span className="text-base font-bold text-emerald-900 font-mono mt-0.5 block">{publishedCount} Konten</span>
              </div>
            </div>

            {/* Upcoming Scheduled Posts Preview */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Jadwal Konten Mendatang</span>
              <div className="divide-y divide-slate-100">
                {upcomingPosts.map((post) => (
                  <div key={post.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 text-[8px] font-bold uppercase rounded ${
                          post.platform === 'tiktok' ? 'bg-fuchsia-100 text-fuchsia-700' :
                          post.platform === 'shopee' ? 'bg-orange-100 text-orange-700' :
                          post.platform === 'instagram' ? 'bg-pink-100 text-pink-700' :
                          'bg-sky-100 text-sky-700'
                        }`}>
                          {post.platform}
                        </span>
                        <p className="font-semibold text-slate-800 truncate">{post.title}</p>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 truncate">{post.content}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-mono font-semibold text-slate-700 block">{post.date}</span>
                      <span className={`text-[8px] font-bold uppercase px-1.5 py-0.2 rounded-full mt-0.5 inline-block ${
                        post.status === 'published' ? 'bg-emerald-50 text-emerald-600' :
                        post.status === 'scheduled' ? 'bg-blue-50 text-blue-600' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {post.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('mediacenter')}
            className="w-full mt-6 flex items-center justify-center gap-1.5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-purple-500/10 cursor-pointer active:scale-[0.98]"
          >
            Buka Pusat Konten & Media
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
}

