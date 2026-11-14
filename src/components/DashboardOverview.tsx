import React, { useMemo, useState } from 'react';
import { 
  TrendingUp, 
  ShoppingBag, 
  Percent, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight,
  RefreshCw,
  PlayCircle,
  History,
  Award,
  ChevronRight,
  BarChart3,
  Package,
  X
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart, 
  Pie, 
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line
} from 'recharts';
import { motion } from 'motion/react';
import { Order, SyncLog, ProductionItem } from '../types';

interface DashboardProps {
  orders: Order[];
  logs: SyncLog[];
  inventory: ProductionItem[];
  onTriggerSync: () => void;
  onSimulateOrder: () => void;
  isSyncing: boolean;
}

const COLORS = ['#f97316', '#d946ef', '#06b6d4', '#0ea5e9']; // Shopee, TikTok, Manual/Direct, Telegram

export default function DashboardOverview({ orders, logs, inventory, onTriggerSync, onSimulateOrder, isSyncing }: DashboardProps) {
  
  // Format Currency to IDR (Rupiah)
  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(value);
  };

  const [dateRange, setDateRange] = useState<string>('7d');
  const [showAllProducts, setShowAllProducts] = useState(false);

  const filterDates = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let prevStart = new Date();
    let prevEnd = new Date();

    switch (dateRange) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        prevStart = new Date(start);
        prevStart.setDate(prevStart.getDate() - 1);
        prevEnd = new Date(start);
        prevEnd.setMilliseconds(-1);
        break;
      case '7d':
        start.setDate(now.getDate() - 7);
        prevStart = new Date(start);
        prevStart.setDate(prevStart.getDate() - 7);
        prevEnd = new Date(start);
        prevEnd.setMilliseconds(-1);
        break;
      case '30d':
        start.setDate(now.getDate() - 30);
        prevStart = new Date(start);
        prevStart.setDate(prevStart.getDate() - 30);
        prevEnd = new Date(start);
        prevEnd.setMilliseconds(-1);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        prevStart = new Date(start);
        prevStart.setMonth(prevStart.getMonth() - 1);
        prevEnd = new Date(start);
        prevEnd.setMilliseconds(-1);
        break;
      case 'quarter':
        start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        prevStart = new Date(start);
        prevStart.setMonth(prevStart.getMonth() - 3);
        prevEnd = new Date(start);
        prevEnd.setMilliseconds(-1);
        break;
    }
    return { start, end: now, prevStart, prevEnd };
  }, [dateRange]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const d = new Date(o.orderDate);
      return d >= filterDates.start && d <= filterDates.end;
    });
  }, [orders, filterDates]);

  const prevFilteredOrders = useMemo(() => {
    return orders.filter(o => {
      const d = new Date(o.orderDate);
      return d >= filterDates.prevStart && d <= filterDates.prevEnd;
    });
  }, [orders, filterDates]);

  // Date range context for display
  const dateDisplay = useMemo(() => {
    const fmt = (d: Date) => d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    return { oldest: fmt(filterDates.start), newest: fmt(filterDates.end) };
  }, [filterDates]);

  // 1. Calculate general stats with dynamic growth
  const stats = useMemo(() => {
    const validOrders = filteredOrders.filter(o => o.status !== 'Cancelled' && o.status !== 'Pesanan Dibatalkan');
    const totalSales = validOrders.reduce((sum, order) => sum + order.totalPrice, 0);
    const totalCount = filteredOrders.length;
    const completedCount = filteredOrders.filter(o => o.status === 'Completed' || o.status === 'Pesanan Selesai').length;
    const pendingCount = filteredOrders.filter(o => o.status === 'Pending' || o.status === 'Processed' || o.status === 'Menunggu Diproses' || o.status === 'Menunggu Dicetak').length;
    const shippedCount = filteredOrders.filter(o => o.status === 'Shipped' || o.status === 'Pesanan Dikirim' || o.status === 'Menunggu Pickup').length;
    const processedCount = filteredOrders.filter(o => o.status === 'Processed' || o.status === 'Menunggu Dicetak').length;
    
    const activeFulfillmentCount = completedCount + shippedCount + processedCount;
    const fulfillmentRate = totalCount > 0 ? (activeFulfillmentCount / totalCount) * 100 : 100;
    const averageValue = validOrders.length > 0 ? totalSales / validOrders.length : 0;

    const prevValidOrders = prevFilteredOrders.filter(o => o.status !== 'Cancelled' && o.status !== 'Pesanan Dibatalkan');
    const prevSales = prevValidOrders.reduce((s, o) => s + o.totalPrice, 0) || 1;
    const prevCount = prevFilteredOrders.length || 1;
    
    const salesGrowth = prevSales === 1 && totalSales > 0 ? 100 : ((totalSales - prevSales) / prevSales) * 100;
    const ordersGrowth = prevCount === 1 && totalCount > 0 ? 100 : ((totalCount - prevCount) / prevCount) * 100;

    const prevAvg = prevValidOrders.length > 0 ? prevSales / prevValidOrders.length : 0;
    const avgGrowth = prevAvg > 0 ? ((averageValue - prevAvg) / prevAvg) * 100 : (averageValue > 0 ? 100 : 0);

    return {
      totalSales,
      totalCount,
      fulfillmentRate,
      averageValue,
      pendingCount,
      completedCount,
      shippedCount,
      processedCount,
      salesGrowth,
      ordersGrowth,
      avgGrowth
    };
  }, [filteredOrders, prevFilteredOrders]);

  // 2. Prepare sales channel breakdown dynamically (with Telegram)
  const channelData = useMemo(() => {
    const validOrders = filteredOrders.filter(o => o.status !== 'Cancelled' && o.status !== 'Pesanan Dibatalkan');
    const platformTotals: Record<string, number> = {};
    validOrders.forEach(order => {
      const p = order.platform || 'manual';
      platformTotals[p] = (platformTotals[p] || 0) + order.totalPrice;
    });

    const total = Object.values(platformTotals).reduce((sum: number, val: number) => sum + Number(val), 0) || 1;

    const platformMap: Record<string, { name: string; colorIdx: number }> = {
      'shopee': { name: 'Shopee Seller', colorIdx: 0 },
      'tiktok': { name: 'TikTok Shop', colorIdx: 1 },
      'manual': { name: 'Direct / Manual', colorIdx: 2 },
      'telegram': { name: 'Telegram Bot', colorIdx: 3 },
    };

    return Object.entries(platformTotals)
      .map(([platform, value]) => ({
        name: platformMap[platform]?.name || platform,
        value: Number(value),
        percentage: Math.round((Number(value) / total) * 100),
        colorIdx: platformMap[platform]?.colorIdx ?? 2,
      }))
      .filter(item => item.value > 0);
  }, [filteredOrders]);

  // 3. Prepare daily trend data dynamically (grouped by orderDate) with zero-filling
  const trendData = useMemo(() => {
    const dailyMap: Record<string, { sales: number; orders: number }> = {};
    
    const current = new Date(filterDates.start);
    const endDay = new Date(Math.min(filterDates.end.getTime(), new Date().getTime()));
    while (current <= endDay) {
      const label = current.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      dailyMap[label] = { sales: 0, orders: 0 };
      current.setDate(current.getDate() + 1);
    }
    
    filteredOrders.forEach(order => {
      if (order.status === 'Cancelled' || order.status === 'Pesanan Dibatalkan') return;
      const dateObj = new Date(order.orderDate);
      const label = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      
      if (dailyMap[label]) {
        dailyMap[label].sales += order.totalPrice;
        dailyMap[label].orders += 1;
      }
    });

    return Object.entries(dailyMap).map(([date, data]) => ({
      date,
      sales: data.sales,
      orders: data.orders
    }));
  }, [filteredOrders, filterDates]);

  // 4. Order volume by platform per day (stacked bar) with zero-filling
  const volumeByPlatform = useMemo(() => {
    const dailyMap: Record<string, { shopee: number; tiktok: number; manual: number; telegram: number }> = {};
    
    const current = new Date(filterDates.start);
    const endDay = new Date(Math.min(filterDates.end.getTime(), new Date().getTime()));
    while (current <= endDay) {
      const label = current.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      dailyMap[label] = { shopee: 0, tiktok: 0, manual: 0, telegram: 0 };
      current.setDate(current.getDate() + 1);
    }
    
    filteredOrders.forEach(order => {
      if (order.status === 'Cancelled' || order.status === 'Pesanan Dibatalkan') return;
      const dateObj = new Date(order.orderDate);
      const label = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      
      if (dailyMap[label]) {
        const p = order.platform || 'manual';
        if (p in dailyMap[label]) {
          (dailyMap[label] as any)[p] += 1;
        }
      }
    });

    return Object.entries(dailyMap).map(([date, data]) => ({
      date,
      ...data
    }));
  }, [filteredOrders, filterDates]);

  // 5. Top Products by revenue
  const allProducts = useMemo(() => {
    const productMap: Record<string, { name: string; revenue: number; qty: number }> = {};
    const validOrders = filteredOrders.filter(o => o.status !== 'Cancelled' && o.status !== 'Pesanan Dibatalkan');
    
    validOrders.forEach(order => {
      const key = order.productName;
      if (!productMap[key]) {
        productMap[key] = { name: key, revenue: 0, qty: 0 };
      }
      productMap[key].revenue += order.totalPrice;
      productMap[key].qty += order.qty;
    });

    return Object.values(productMap).sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders]);

  const topProducts = useMemo(() => allProducts.slice(0, 5), [allProducts]);

  // 6. Fulfillment funnel
  const funnelData = useMemo(() => {
    return [
      { label: 'Pending', count: filteredOrders.filter(o => o.status === 'Pending' || o.status === 'Menunggu Diproses' || o.status === 'Pesanan Belum Dibayar').length, color: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
      { label: 'Diproses', count: filteredOrders.filter(o => o.status === 'Processed' || o.status === 'Menunggu Dicetak').length, color: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
      { label: 'Dikirim', count: filteredOrders.filter(o => o.status === 'Shipped' || o.status === 'Pesanan Dikirim' || o.status === 'Menunggu Pickup').length, color: 'bg-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
      { label: 'Selesai', count: filteredOrders.filter(o => o.status === 'Completed' || o.status === 'Pesanan Selesai').length, color: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    ];
  }, [filteredOrders]);

  // 7. Financial summary
  const financialSummary = useMemo(() => {
    const completedRevenue = filteredOrders
      .filter(o => o.status === 'Completed' || o.status === 'Pesanan Selesai')
      .reduce((sum, o) => sum + o.totalPrice, 0);
    const pendingRevenue = filteredOrders
      .filter(o => o.status !== 'Completed' && o.status !== 'Pesanan Selesai' && o.status !== 'Cancelled' && o.status !== 'Pesanan Dibatalkan')
      .reduce((sum, o) => sum + o.totalPrice, 0);
    
    const daysWithData = new Set(filteredOrders.map(o => new Date(o.orderDate).toDateString())).size || 1;
    const dailyAvg = (completedRevenue + pendingRevenue) / daysWithData;
    const projectedMonthly = dailyAvg * 30;

    return { completedRevenue, pendingRevenue, projectedMonthly };
  }, [filteredOrders]);

  // 8. Inventory Health Ring
  const inventoryHealth = useMemo(() => {
    let optimal = 0;
    let warning = 0;
    let critical = 0;
    inventory?.forEach(item => {
      if (item.status === 'optimal') optimal++;
      else if (item.status === 'warning') warning++;
      else if (item.status === 'critical') critical++;
    });
    return [
      { name: 'Optimal', value: optimal, color: '#10b981' },
      { name: 'Peringatan', value: warning, color: '#f59e0b' },
      { name: 'Kritis', value: critical, color: '#ef4444' }
    ].filter(i => i.value > 0);
  }, [inventory]);

  const GrowthBadge = ({ value }: { value: number }) => {
    const isPositive = value >= 0;
    return (
      <span className={`font-medium flex items-center ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
        {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
        {isPositive ? '+' : ''}{value.toFixed(1)}%
      </span>
    );
  };

  const Sparkline = ({ data, color }: { data: number[], color: string }) => {
    if (data.length === 0) return null;
    const chartData = data.map((val, i) => ({ index: i, value: val }));
    return (
      <div className="w-[60px] h-[24px] ml-auto opacity-70">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} isAnimationActive={true} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div id="dashboard-overview-viewport" className="p-8 space-y-8 overflow-y-auto h-full flex-1 bg-[#f8fafc] text-slate-800">
      {/* Banner/Header */}
      <div id="dashboard-welcome-banner" className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <span className="text-blue-600 font-mono text-xs font-semibold tracking-widest uppercase">Overview Performa Utama</span>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mt-1">Dashboard Analitik Real-Time</h1>
          <div className="flex items-center gap-3 mt-2">
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="text-sm border border-slate-200 bg-white text-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 shadow-sm font-medium cursor-pointer hover:border-blue-300 transition-colors"
            >
              <option value="today">Hari Ini</option>
              <option value="7d">7 Hari Terakhir</option>
              <option value="30d">30 Hari</option>
              <option value="month">Bulan Ini</option>
              <option value="quarter">Kuartal Ini</option>
            </select>
            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-mono font-semibold border border-slate-200">
              {dateDisplay.oldest} — {dateDisplay.newest}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            id="btn-simulate-order"
            onClick={onSimulateOrder}
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-xl border border-slate-200 hover:border-slate-300 shadow-sm transition-all cursor-pointer"
          >
            <PlayCircle className="h-4 w-4 text-emerald-600" />
            Simulasi Order Masuk
          </button>
          
          <button
            id="btn-manual-sync"
            onClick={onTriggerSync}
            disabled={isSyncing}
            className={`flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-medium rounded-xl shadow-md shadow-blue-500/10 transition-all cursor-pointer ${isSyncing ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sinkronisasi...' : 'Sinkronkan Sekarang'}
          </button>
        </div>
      </div>

      {/* Analytics Grid Cards */}
      <div id="analytics-grid-cards" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Sales Card */}
        <motion.div
          whileHover={{ y: -4 }}
          className="p-6 bg-white border border-slate-200 rounded-2xl relative overflow-hidden group shadow-sm flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 h-24 w-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors"></div>
          <div className="flex justify-between items-start">
            <div>
              <span className="text-slate-500 text-xs font-medium">Akumulasi Penjualan</span>
              <h3 className="text-2xl font-bold tracking-tight text-slate-900 mt-2 font-mono">
                {formatRupiah(stats.totalSales)}
              </h3>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 text-xs">
            <div className="flex items-center gap-1.5">
              <GrowthBadge value={stats.salesGrowth} />
              <span className="text-slate-500">tren penjualan</span>
            </div>
            <Sparkline data={trendData.map(d => d.sales)} color="#3b82f6" />
          </div>
        </motion.div>

        {/* Total Orders Card */}
        <motion.div
          whileHover={{ y: -4 }}
          className="p-6 bg-white border border-slate-200 rounded-2xl relative overflow-hidden group shadow-sm flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 h-24 w-24 bg-orange-500/5 rounded-full blur-2xl group-hover:bg-orange-500/10 transition-colors"></div>
          <div className="flex justify-between items-start">
            <div>
              <span className="text-slate-500 text-xs font-medium">Total Pesanan Masuk</span>
              <h3 className="text-2xl font-bold tracking-tight text-slate-900 mt-2 font-mono">
                {stats.totalCount} <span className="text-xs text-slate-500">pesanan</span>
              </h3>
            </div>
            <div className="p-3 bg-orange-50 border border-orange-100 text-orange-600 rounded-xl">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 text-xs">
            <div className="flex items-center gap-1.5">
              <GrowthBadge value={stats.ordersGrowth} />
              <span className="text-slate-500">volume pesanan</span>
            </div>
            <Sparkline data={trendData.map(d => d.orders)} color="#f97316" />
          </div>
        </motion.div>

        {/* Average Value Card */}
        <motion.div
          whileHover={{ y: -4 }}
          className="p-6 bg-white border border-slate-200 rounded-2xl relative overflow-hidden group shadow-sm flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 h-24 w-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors"></div>
          <div className="flex justify-between items-start">
            <div>
              <span className="text-slate-500 text-xs font-medium">Rata-Rata Nilai Order</span>
              <h3 className="text-xl font-bold tracking-tight text-slate-900 mt-2.5 font-mono">
                {formatRupiah(stats.averageValue)}
              </h3>
            </div>
            <div className="p-3 bg-purple-50 border border-purple-100 text-purple-600 rounded-xl">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 text-xs">
            <div className="flex items-center gap-1.5">
              <GrowthBadge value={stats.avgGrowth} />
              <span className="text-slate-500">rata-rata AOV</span>
            </div>
          </div>
        </motion.div>

        {/* Fulfillment Rate Card */}
        <motion.div
          whileHover={{ y: -4 }}
          className="p-6 bg-white border border-slate-200 rounded-2xl relative overflow-hidden group shadow-sm flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 h-24 w-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors"></div>
          <div className="flex justify-between items-start">
            <div>
              <span className="text-slate-500 text-xs font-medium">Persentase Terpenuhi</span>
              <h3 className="text-2xl font-bold tracking-tight text-slate-900 mt-2 font-mono">
                {stats.fulfillmentRate.toFixed(1)}%
              </h3>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl">
              <Percent className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-xs">
            <span className="text-slate-600 font-mono text-[10px] bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
              {stats.pendingCount} antrian pending
            </span>
          </div>
        </motion.div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="p-12 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
          <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
            <Package className="h-8 w-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Belum ada data pesanan untuk rentang waktu ini</h3>
          <button 
            onClick={() => setDateRange('30d')}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
          >
            Ubah Rentang Waktu
          </button>
        </div>
      ) : (
        <>
          {/* Fulfillment Funnel */}
          <div id="fulfillment-funnel" className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Alur Pemenuhan Pesanan</h3>
                <p className="text-xs text-slate-500">Visualisasi pipeline pesanan dari masuk hingga selesai</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {funnelData.map((step, idx) => (
                <div key={step.label} className={`relative p-4 ${step.bg} border ${step.border} rounded-xl text-center`}>
                  <div className={`w-10 h-10 ${step.color} rounded-xl flex items-center justify-center mx-auto mb-2 text-white font-bold text-lg shadow-sm`}>
                    {step.count}
                  </div>
                  <p className={`text-xs font-bold ${step.text}`}>{step.label}</p>
                  {idx < funnelData.length - 1 && (
                    <ChevronRight className="absolute -right-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 z-10" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Main Charts Row */}
          <div id="dashboard-charts-row" className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Trend Area Chart */}
            <div className="lg:col-span-2 p-6 bg-white border border-slate-200 rounded-2xl flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Tren Penjualan Harian</h3>
                  <p className="text-xs text-slate-500">Total nilai pesanan tervalidasi harian dalam Rupiah</p>
                </div>
                <span className="text-[10px] font-mono bg-blue-50 text-blue-600 border border-blue-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                  REAL-TIME SYNC
                </span>
              </div>
              
              <div className="h-72 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#94a3b8" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '12px' }}
                      labelStyle={{ color: '#64748b', fontWeight: 'bold', fontSize: '12px' }}
                      formatter={(value: any, name: string) => [formatRupiah(Number(value)), name === 'sales' ? 'Penjualan' : name]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorSales)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Platform Share Pie Chart */}
            <div className="lg:col-span-1 p-6 bg-white border border-slate-200 rounded-2xl flex flex-col justify-between shadow-sm">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-slate-900">Saluran Penjualan</h3>
                <p className="text-xs text-slate-500">Kontribusi e-commerce & offline</p>
              </div>

              <div className="h-56 w-full flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={channelData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {channelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.colorIdx]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px' }}
                      itemStyle={{ color: '#0f172a', fontSize: '11px' }}
                      formatter={(value: any) => [formatRupiah(Number(value)), 'Pendapatan']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Center Content of Donut */}
                <div className="absolute flex flex-col items-center">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400">Total Valid</span>
                  <span className="text-base font-bold text-slate-900 font-mono mt-0.5">
                    {filteredOrders.filter(o => o.status !== 'Cancelled' && o.status !== 'Pesanan Dibatalkan').length} Order
                  </span>
                </div>
              </div>

              {/* Legends */}
              <div className="space-y-2 mt-2">
                {channelData.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[entry.colorIdx] }}></span>
                      <span className="text-slate-700 font-medium">{entry.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-900 font-mono font-semibold">{entry.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Inventory Health Pie Chart */}
            <div className="lg:col-span-1 p-6 bg-white border border-slate-200 rounded-2xl flex flex-col justify-between shadow-sm">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-slate-900">Kesehatan Inventaris</h3>
                <p className="text-xs text-slate-500">Distribusi status persediaan barang</p>
              </div>

              <div className="h-56 w-full flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={inventoryHealth}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {inventoryHealth.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px' }}
                      itemStyle={{ color: '#0f172a', fontSize: '11px' }}
                      formatter={(value: any) => [value, 'Item']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="absolute flex flex-col items-center">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400">Total SKU</span>
                  <span className="text-base font-bold text-slate-900 font-mono mt-0.5">
                    {inventory?.length || 0} Item
                  </span>
                </div>
              </div>

              <div className="space-y-2 mt-2">
                {inventoryHealth.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                      <span className="text-slate-700 font-medium">{entry.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-900 font-mono font-semibold">{entry.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Volume Stacked Bar + Top Products */}
          <div id="volume-and-products" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stacked bar chart */}
            <div className="lg:col-span-2 p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-slate-900">Volume Pesanan per Saluran</h3>
                <p className="text-xs text-slate-500">Jumlah pesanan harian berdasarkan platform</p>
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={volumeByPlatform} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '11px' }} />
                    <Bar dataKey="shopee" stackId="a" fill="#f97316" radius={[0, 0, 0, 0]} name="Shopee" />
                    <Bar dataKey="tiktok" stackId="a" fill="#d946ef" name="TikTok" />
                    <Bar dataKey="manual" stackId="a" fill="#06b6d4" name="Direct" />
                    <Bar dataKey="telegram" stackId="a" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Telegram" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Products */}
            <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
                    <Award className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Produk Terlaris</h3>
                    <p className="text-xs text-slate-500">Berdasarkan total pendapatan</p>
                  </div>
                </div>
                {allProducts.length > 5 && (
                  <button 
                    onClick={() => setShowAllProducts(true)}
                    className="text-xs text-blue-600 font-medium hover:text-blue-700 cursor-pointer"
                  >
                    Lihat Semua
                  </button>
                )}
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[250px] pr-2">
                {topProducts.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-8">Belum ada data penjualan</p>
                )}
                {topProducts.map((product, idx) => {
                  const maxRev = topProducts[0]?.revenue || 1;
                  const maxQty = Math.max(...topProducts.map(p => p.qty)) || 1;
                  const barWidth = (product.revenue / maxRev) * 100;
                  const qtyWidth = (product.qty / maxQty) * 100;
                  return (
                    <div key={product.name} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] font-bold w-5 h-5 rounded flex items-center justify-center text-white shrink-0 ${
                          idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-orange-300' : 'bg-slate-300'
                        }`}>
                          {idx + 1}
                        </span>
                        <p className="text-xs font-semibold text-slate-800 truncate flex-1">{product.name}</p>
                      </div>
                      <div className="flex items-center justify-between text-[10px] mb-1.5">
                        <span className="text-slate-500">{product.qty} pcs terjual</span>
                        <span className="text-slate-800 font-mono font-bold">{formatRupiah(product.revenue)}</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mb-1">
                        <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all" style={{ width: `${barWidth}%` }} title="Pendapatan" />
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all" style={{ width: `${qtyWidth}%` }} title="Kuantitas" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Financial Summary Section */}
          <div id="financial-summary" className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Ringkasan Keuangan</h3>
                  <p className="text-xs text-slate-500">Pendapatan terkonfirmasi vs. dalam proses</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Completed Revenue */}
              <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest block font-mono">Pembayaran Selesai</span>
                <p className="text-2xl font-extrabold text-emerald-700 font-mono mt-2">{formatRupiah(financialSummary.completedRevenue)}</p>
                <p className="text-[10px] text-emerald-600 mt-1">{stats.completedCount} pesanan terselesaikan</p>
              </div>

              {/* Pending Revenue */}
              <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-widest block font-mono">Menunggu Pembayaran</span>
                <p className="text-2xl font-extrabold text-amber-700 font-mono mt-2">{formatRupiah(financialSummary.pendingRevenue)}</p>
                <p className="text-[10px] text-amber-600 mt-1">{stats.pendingCount + stats.shippedCount} pesanan aktif</p>
              </div>

              {/* Projected Monthly */}
              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                <span className="text-[10px] font-bold text-blue-800 uppercase tracking-widest block font-mono">Proyeksi Bulanan</span>
                <p className="text-2xl font-extrabold text-blue-700 font-mono mt-2">{formatRupiah(financialSummary.projectedMonthly)}</p>
                <p className="text-[10px] text-blue-600 mt-1">Estimasi 30 hari berdasarkan rata-rata harian</p>
              </div>
            </div>

            {/* Platform revenue comparison */}
            <div className="mt-5 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono mb-3">Pendapatan per Platform</span>
              <div className="space-y-2.5">
                {channelData.map((ch) => (
                  <div key={ch.name} className="flex items-center gap-3">
                    <span className="w-24 text-xs text-slate-600 font-medium truncate">{ch.name}</span>
                    <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all" 
                        style={{ 
                          width: `${ch.percentage}%`, 
                          backgroundColor: COLORS[ch.colorIdx]
                        }} 
                      />
                    </div>
                    <span className="text-xs text-slate-800 font-mono font-bold w-20 text-right">{formatRupiah(ch.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Sync Log Monitor Stream */}
      <div id="sync-log-monitor-container" className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
              <History className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Live Monitor Sinkronisasi API</h3>
              <p className="text-xs text-slate-500">Log sinkronisasi platform otomatis dan aktivitas webhook</p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-slate-400">MENAMPILKAN {logs.length} AKTIVITAS TERBARU</span>
        </div>

        {/* Logs Stream */}
        <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
          {logs.map((log) => {
            const dateStr = new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            
            let platformBadge = 'bg-slate-100 text-slate-600 border border-slate-200';
            if (log.platform === 'shopee') platformBadge = 'bg-orange-50 text-orange-600 border border-orange-100';
            if (log.platform === 'tiktok') platformBadge = 'bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-100';
            if (log.platform === 'telegram') platformBadge = 'bg-sky-50 text-sky-600 border border-sky-100';

            let msgColor = 'text-slate-600';
            if (log.type === 'success') msgColor = 'text-emerald-600 font-semibold';
            if (log.type === 'warning') msgColor = 'text-amber-600 font-semibold';
            if (log.type === 'error') msgColor = 'text-rose-600 font-semibold';

            return (
              <div 
                key={log.id} 
                className="flex items-center justify-between p-3 bg-slate-50/60 border border-slate-100 rounded-xl hover:border-slate-200 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-[10px] font-mono text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded">
                    {dateStr}
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${platformBadge} uppercase font-semibold`}>
                    {log.platform}
                  </span>
                  <p className={`text-xs ${msgColor} truncate`}>{log.message}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    log.type === 'success' ? 'bg-emerald-500' :
                    log.type === 'warning' ? 'bg-amber-500' :
                    log.type === 'error' ? 'bg-rose-500' : 'bg-blue-500'
                  }`}></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* All Products Modal */}
      {showAllProducts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" />
                Daftar Lengkap Produk Terjual
              </h2>
              <button 
                onClick={() => setShowAllProducts(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 space-y-3">
              {allProducts.map((product, idx) => {
                const maxRev = allProducts[0]?.revenue || 1;
                const maxQty = Math.max(...allProducts.map(p => p.qty)) || 1;
                const barWidth = (product.revenue / maxRev) * 100;
                const qtyWidth = (product.qty / maxQty) * 100;
                return (
                  <div key={product.name} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`text-xs font-bold w-6 h-6 rounded flex items-center justify-center text-white shrink-0 ${
                        idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-orange-300' : 'bg-slate-300'
                      }`}>
                        {idx + 1}
                      </span>
                      <p className="text-sm font-semibold text-slate-800 flex-1">{product.name}</p>
                    </div>
                    <div className="flex items-center justify-between text-xs mb-1.5 px-9">
                      <span className="text-slate-500">{product.qty} pcs terjual</span>
                      <span className="text-slate-800 font-mono font-bold">{formatRupiah(product.revenue)}</span>
                    </div>
                    <div className="px-9 space-y-1.5">
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all" style={{ width: `${barWidth}%` }} title="Pendapatan" />
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all" style={{ width: `${qtyWidth}%` }} title="Kuantitas" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
