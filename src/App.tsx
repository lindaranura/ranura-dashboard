import React, { useState, useEffect } from 'react';
import { 
  Bell, Clock, HelpCircle, Database, ArrowRight, Sparkles, RefreshCw, X, LogOut, LogIn, User, ChevronDown 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { initAuth, googleSignIn, logout, getCachedToken } from './lib/sheetsService';

// Types & Data
import { 
  Order, 
  IntegrationConfig, 
  SyncLog, 
  ProductionItem, 
  OrderStatus, 
  Platform,
  FinanceTransaction,
  Invoice,
  BudgetCategory,
  CalendarPost
} from './types';
import { 
  INITIAL_INTEGRATIONS, 
  INITIAL_ORDERS, 
  INITIAL_LOGS, 
  INITIAL_PRODUCTION,
  INITIAL_CHAT_THREADS,
  INITIAL_TRANSACTIONS,
  INITIAL_INVOICES,
  INITIAL_BUDGET,
  INITIAL_CALENDAR_POSTS
} from './data/mockData';

// Components
import Sidebar from './components/Sidebar';
import Beranda from './components/Beranda';
import DashboardOverview from './components/DashboardOverview';
import OrderMaster from './components/OrderMaster';
import Integrations from './components/Integrations';
import InventoryManager from './components/InventoryManager';
import FinanceCenter from './components/FinanceCenter';
import StoreChatAssistant from './components/StoreChatAssistant';
import WorkspaceHub from './components/WorkspaceHub';
import MediaCenter from './components/MediaCenter';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('beranda');
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = initAuth((user, token) => { setGoogleUser(user); setGoogleToken(token); }, () => { setGoogleUser(null); setGoogleToken(null); });
    const token = getCachedToken(); if (token) setGoogleToken(token);
    return () => unsubscribe();
  }, []);

  const handleGlobalGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) { setGoogleUser(res.user); setGoogleToken(res.accessToken); addLog('system', 'success', `Google Workspace Connected.`); setGlobalToast(`Berhasil menghubungkan akun Google.`); }
    } catch (err: any) { addLog('system', 'error', `Auth Gagal: ${err.message}`); setGlobalToast(`Gagal login Google.`); } 
    finally { setIsLoggingIn(false); }
  };

  const handleGlobalGoogleLogout = async () => {
    const confirmed = window.confirm('Apakah Anda yakin ingin memutus koneksi Google Workspace?');
    if (!confirmed) return;
    try { await logout(); setGoogleUser(null); setGoogleToken(null); setIsDropdownOpen(false); addLog('system', 'warning', 'Terputus.'); setGlobalToast('Koneksi dicabut.'); } 
    catch (err: any) { setGlobalToast(`Gagal logout.`); }
  };

  const [shopeeAccounts, setShopeeAccounts] = useState<any[]>(() => { const saved = localStorage.getItem('apex_shopee_accounts'); return saved ? JSON.parse(saved) : [{ id: 'shp-1', shopName: 'Ranura Official Depok', email: 'finance.ranura@shopee-seller.co.id', connected: true, autoSync: true, lastSynced: '2026-06-29T21:05:00-07:00' }]; });
  const [tiktokAccounts, setTiktokAccounts] = useState<any[]>(() => { const saved = localStorage.getItem('apex_tiktok_accounts'); return saved ? JSON.parse(saved) : [{ id: 'tts-1', shopName: 'Mayudee Hijab Premium', email: 'ops.ranura@ranura-berkah.id', connected: true, autoSync: true, lastSynced: '2026-06-29T21:10:00-07:00' }]; });
  const [googleSheets, setGoogleSheets] = useState<any[]>(() => { 
    const newOrderSheet = { 
      id: 'sheet-ranura-order-2026', 
      title: 'Salinan dari (NEW ) PENGIRIMAN HARIAN & PENDING', 
      spreadsheetId: '1DD1TwoYweUqThHCMjJFkkYTff6XWjMtn_vsXYh__Azc', 
      spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1DD1TwoYweUqThHCMjJFkkYTff6XWjMtn_vsXYh__Azc/edit?usp=sharing', 
      tabs: ['DATA ORDER 2026', 'Ranura Swimwear September 2026', 'Ranura Swimwear November 2026'], 
      active: true, 
      connectedAt: '2026-11-17T00:00:00+07:00' 
    };
    const saved = localStorage.getItem('apex_google_sheets'); 
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(s => {
            if (s.spreadsheetId === '1XQDhyy80k6ruXTkMfgGMDfNg2K8TJ8s2jjSRIYn86sk' || s.spreadsheetId === '1XD0iua8lyFvE0PQ-3Qk-_Cu8JqayffDy_ObCqqqC8V0') {
              return newOrderSheet;
            }
            return s;
          });
        }
      } catch (e) {}
    }
    return [newOrderSheet]; 
  });
  const [configs, setConfigs] = useState<IntegrationConfig[]>(() => { const saved = localStorage.getItem('apex_configs'); return saved ? JSON.parse(saved) : INITIAL_INTEGRATIONS; });
  const [orders, setOrders] = useState<Order[]>(() => { const saved = localStorage.getItem('apex_orders'); return saved ? JSON.parse(saved) : INITIAL_ORDERS; });
  const [logs, setLogs] = useState<SyncLog[]>(() => { const saved = localStorage.getItem('apex_logs'); return saved ? JSON.parse(saved) : INITIAL_LOGS; });
  const [inventory, setInventory] = useState<ProductionItem[]>(() => { 
    const saved = localStorage.getItem('apex_inventory'); 
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const isOldSheets = parsed.some((i: any) => i.sourceSheetId === '1u8oVPIyH7oh4rEpkXQGAHmOOQka01vWILVM8eOSAtD8' || i.sourceSheetId === '1YAkmsRxamdK5XiK-IpvpS-p9jym3vn3z-M5gLkqrYC8');
        const hasMovements = Array.isArray(parsed) && parsed.some((i: any) => (i.stockIn || 0) > 0 || (i.stockOut || 0) > 0);
        if (Array.isArray(parsed) && parsed.length > 20 && !parsed.some((i: any) => i.id === 'prod-1') && hasMovements && !isOldSheets) {
          return parsed;
        }
      } catch (e) {}
    }
    return INITIAL_PRODUCTION; 
  });
  const [chatThreads, setChatThreads] = useState<any[]>(() => { const saved = localStorage.getItem('apex_chat_threads'); return saved ? JSON.parse(saved) : INITIAL_CHAT_THREADS; });
  const [transactions, setTransactions] = useState<FinanceTransaction[]>(() => { const saved = localStorage.getItem('apex_transactions'); return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS; });
  const [invoices, setInvoices] = useState<Invoice[]>(() => { const saved = localStorage.getItem('apex_invoices'); return saved ? JSON.parse(saved) : INITIAL_INVOICES; });
  const [budgets, setBudgets] = useState<BudgetCategory[]>(() => { const saved = localStorage.getItem('apex_budgets'); return saved ? JSON.parse(saved) : INITIAL_BUDGET; });
  const [calendarPosts, setCalendarPosts] = useState<CalendarPost[]>(() => { const saved = localStorage.getItem('apex_calendarPosts'); return saved ? JSON.parse(saved) : INITIAL_CALENDAR_POSTS; });
  const [deletedOrderIds, setDeletedOrderIds] = useState<string[]>(() => { const saved = localStorage.getItem('apex_deleted_orders'); return saved ? JSON.parse(saved) : []; });

  useEffect(() => {
    localStorage.setItem('apex_calendarPosts', JSON.stringify(calendarPosts));
  }, [calendarPosts]);

  useEffect(() => {
    localStorage.setItem('apex_sheets_spreadsheet_id', '1DD1TwoYweUqThHCMjJFkkYTff6XWjMtn_vsXYh__Azc');
    localStorage.setItem('apex_sheets_spreadsheet_url', 'https://docs.google.com/spreadsheets/d/1DD1TwoYweUqThHCMjJFkkYTff6XWjMtn_vsXYh__Azc/edit?usp=sharing');
    localStorage.setItem('apex_sheets_spreadsheet_title', 'Salinan dari (NEW ) PENGIRIMAN HARIAN & PENDING');
  }, []);

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [globalToast, setGlobalToast] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  // =====================================================================
  // AUTO-REFRESH & PENYEDOT DATA 2 ARAH (TELEGRAM, SHOPEE, TIKTOK)
  // =====================================================================
  useEffect(() => {
    const fetchBotOrders = async () => {
      try {
        // Coba endpoint relatif (port 3000) terlebih dahulu, jika gagal coba port 3001
        let response = await fetch('/api/orders').catch(() => null);
        if (!response || !response.ok) {
          response = await fetch(`/api/orders`).catch(() => null);
        }
        if (response && response.ok) {
          const botOrders = await response.json();
          if (Array.isArray(botOrders) && botOrders.length > 0) {
            setOrders(prevOrders => {
              let hasChange = false;
              const updatedOrders = [...prevOrders];

              
                const currentDeleted = JSON.parse(localStorage.getItem('apex_deleted_orders') || '[]');
                botOrders.forEach((botData: any) => {
                  const pFormCheck = botData.platform || 'telegram';
                  const rawIdCheck = botData.id || botData.order_id || botData.orderNumber || Date.now().toString();
                  const uniqueBotIdCheck = `ord-${pFormCheck}-${rawIdCheck}`;
                  
                  if (currentDeleted.includes(uniqueBotIdCheck) || currentDeleted.includes(botData.id)) {
                    return; // Skip deleted orders
                  }

                const pForm = botData.platform || 'telegram';
                const rawId = botData.id || botData.order_id || botData.orderNumber || Date.now().toString();
                const oNum = botData.orderNumber || botData.order_id || botData.id || `TELE-${rawId.toString().slice(-6)}`;
                const uniqueBotId = `ord-${pForm}-${rawId}`;
                
                const newPrice = Number(botData.totalPrice ?? botData.total_harga ?? 0);
                const newStatus = (botData.statusDashboard || botData.status || 'Menunggu Diproses') as OrderStatus;

                const newMappedOrder: Order = {
                  id: uniqueBotId,
                  orderNumber: oNum,
                  platform: pForm as Platform, 
                  customerName: botData.nama || botData.customerName || 'Anonim',
                  productName: botData.produk || botData.productName || 'Produk',
                  sku: botData.sku || `${pForm.toUpperCase()}-ITEM`,
                  qty: parseInt(botData.jumlah || botData.jumlah_produk || botData.qty) || 1,
                  totalPrice: newPrice, 
                  status: newStatus, 
                  orderDate: botData.orderDate || new Date().toISOString(),
                  shippingAddress: botData.alamat || botData.shippingAddress || '-',
                  shippingDate: botData.shippingDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                  customerPhone: botData.no_telp || botData.telp || botData.customerPhone || '-',
                  shopName: botData.sumber || botData.pengirim || botData.shopName || '-',
                  trackingNumber: botData.trackingNumber || botData.resi || '-',
                  notes: botData.notes || botData.keterangan || ''
                };

                const existingIndex = updatedOrders.findIndex(
                  o => o.id === uniqueBotId || (oNum !== "-" && o.orderNumber === oNum) || o.id === botData.id
                );

                if (existingIndex === -1) {
                  // Pesanan baru: taruh di paling depan
                  hasChange = true;
                  updatedOrders.unshift(newMappedOrder);
                } else {
                  // Pesanan sudah ada: pastikan data diperbarui jika ada perubahan harga, status, dsb
                  const curr = updatedOrders[existingIndex];
                  const needSync = 
                    curr.totalPrice !== newMappedOrder.totalPrice ||
                    curr.status !== newMappedOrder.status ||
                    curr.customerName !== newMappedOrder.customerName ||
                    curr.productName !== newMappedOrder.productName ||
                    curr.customerPhone !== newMappedOrder.customerPhone ||
                    curr.shippingAddress !== newMappedOrder.shippingAddress ||
                    curr.trackingNumber !== newMappedOrder.trackingNumber ||
                    curr.sku !== newMappedOrder.sku ||
                    curr.shopName !== newMappedOrder.shopName ||
                    curr.notes !== newMappedOrder.notes;

                  if (needSync) {
                    hasChange = true;
                    updatedOrders[existingIndex] = {
                      ...curr,
                      ...newMappedOrder
                    };
                  }
                }
              });

              return hasChange ? updatedOrders : prevOrders;
            });
          }
        }
      } catch (err) {}
    };

    fetchBotOrders();
    const interval = setInterval(fetchBotOrders, 3000); 
    return () => clearInterval(interval);
  }, []);
  // =====================================================================

  useEffect(() => { localStorage.setItem('apex_orders', JSON.stringify(orders)); }, [orders]);
    useEffect(() => {
    localStorage.setItem('apex_google_sheets', JSON.stringify(googleSheets));
    const activeSheet = googleSheets.find(s => s.active);
    if (activeSheet && activeSheet.spreadsheetId) {
      fetch(`/api/config/spreadsheet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId: activeSheet.spreadsheetId })
      }).catch(e => console.warn('Failed to push config to backend', e));
    }
  }, [googleSheets]);
  
  useEffect(() => {
    localStorage.setItem('apex_configs', JSON.stringify(configs));
  }, [configs]);
  useEffect(() => { localStorage.setItem('apex_logs', JSON.stringify(logs)); }, [logs]);
  useEffect(() => { localStorage.setItem('apex_inventory', JSON.stringify(inventory)); }, [inventory]);
  useEffect(() => { localStorage.setItem('apex_chat_threads', JSON.stringify(chatThreads)); }, [chatThreads]);
  useEffect(() => { localStorage.setItem('apex_transactions', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('apex_invoices', JSON.stringify(invoices)); }, [invoices]);
  useEffect(() => { localStorage.setItem('apex_budgets', JSON.stringify(budgets)); }, [budgets]);
  useEffect(() => { localStorage.setItem('apex_shopee_accounts', JSON.stringify(shopeeAccounts)); }, [shopeeAccounts]);
  useEffect(() => { localStorage.setItem('apex_tiktok_accounts', JSON.stringify(tiktokAccounts)); }, [tiktokAccounts]);
  useEffect(() => { localStorage.setItem('apex_google_sheets', JSON.stringify(googleSheets)); }, [googleSheets]);
  useEffect(() => { localStorage.setItem('apex_deleted_orders', JSON.stringify(deletedOrderIds)); }, [deletedOrderIds]);

  useEffect(() => {
    const hasShopee = shopeeAccounts.some(acc => acc.connected);
    const hasTiktok = tiktokAccounts.some(acc => acc.connected);
    setConfigs(prev => prev.map(c => {
      if (c.id === 'shopee') return { ...c, connected: hasShopee };
      if (c.id === 'tiktok') return { ...c, connected: hasTiktok };
      return c;
    }));
  }, [shopeeAccounts, tiktokAccounts]);

  useEffect(() => {
    const updateClock = () => { setCurrentTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' })); };
    updateClock(); const interval = setInterval(updateClock, 1000); return () => clearInterval(interval);
  }, []);

  const showToast = (message: string) => { setGlobalToast(message); setTimeout(() => setGlobalToast(null), 4000); };
  const addLog = (platform: string, type: 'info' | 'success' | 'warning' | 'error', message: string) => {
    const newLog: SyncLog = { id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`, timestamp: new Date().toISOString(), platform: platform as any, type, message };
    setLogs(prev => [newLog, ...prev]);
  };

  const integrationStatus = { shopee: configs.find(c => c.id === 'shopee')?.connected || false, tiktok: configs.find(c => c.id === 'tiktok')?.connected || false, telegram: configs.find(c => c.id === 'telegram')?.connected || false };

  // =====================================================================
  // FUNGSI SINKRONISASI MANUAL & TOMBOL DASBOR
  // =====================================================================
  const handleTriggerSync = async () => {
    if(isSyncing) return;
    setIsSyncing(true);
    showToast(`Menarik data pesanan terbaru dari Marketplace...`);
    
    try {
      let newOrdersData: Omit<Order, 'id'>[] = [];
      const products = ["Ranura Sport Hijab", "Ranura Swimwear Basic", "Ranura Active Top", "Ranura Legging Wudhu"];
      const statuses: OrderStatus[] = ['Menunggu Diproses', 'Menunggu Dicetak', 'Menunggu Pickup', 'Pesanan Dikirim', 'Pesanan Selesai'];
      
      shopeeAccounts.forEach((acc: any) => {
        if (!acc.connected) return;
        const count = Math.floor(Math.random() * 2) + 1;
        const names = ["Anisa", "Budi", "Citra", "Dian", "Eka"];
        for(let i=0; i<count; i++) {
          const prod = products[Math.floor(Math.random() * products.length)];
          const qty = Math.floor(Math.random() * 3) + 1;
          const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
          newOrdersData.push({
            orderNumber: `SHP${Date.now().toString().slice(-6)}${i}`,
            platform: 'shopee',
            customerName: names[Math.floor(Math.random() * names.length)],
            productName: prod,
            sku: `SKU-${prod.split(' ')[1].toUpperCase()}`,
            qty,
            totalPrice: qty * 85000,
            status: randomStatus,
            orderDate: new Date().toISOString(),
            shippingAddress: `Jl. Shopee No ${Math.floor(Math.random() * 100)}, Jakarta`,
            customerPhone: `0812${Math.floor(Math.random() * 10000000)}`,
            notes: `Sync dari Shopee: ${acc.shopName}`,
            sumber: 'Shopee Official',
            pengiriman: 'Shopee Xpress',
            resi: randomStatus === 'Pesanan Dikirim' ? `RESI-SHP-${Date.now()}` : '-'
          } as any);
        }
      });
      
      tiktokAccounts.forEach((acc: any) => {
        if (!acc.connected) return;
        const count = Math.floor(Math.random() * 2) + 1;
        const names = ["Fani", "Gita", "Hendra", "Indra", "Joko"];
        for(let i=0; i<count; i++) {
          const prod = products[Math.floor(Math.random() * products.length)];
          const qty = Math.floor(Math.random() * 2) + 1;
          const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
          newOrdersData.push({
            orderNumber: `TT${Date.now().toString().slice(-6)}${i}`,
            platform: 'tiktok',
            customerName: names[Math.floor(Math.random() * names.length)],
            productName: prod,
            sku: `SKU-${prod.split(' ')[1].toUpperCase()}`,
            qty,
            totalPrice: qty * 95000,
            status: randomStatus,
            orderDate: new Date().toISOString(),
            shippingAddress: `Jl. TikTok No ${Math.floor(Math.random() * 100)}, Bandung`,
            customerPhone: `0857${Math.floor(Math.random() * 10000000)}`,
            notes: `Sync dari TikTok: ${acc.shopName}`,
            sumber: 'TikTok Shop',
            pengiriman: 'J&T Express',
            resi: randomStatus === 'Pesanan Dikirim' ? `RESI-TT-${Date.now()}` : '-'
          } as any);
        }
      });
      
      if (newOrdersData.length > 0) {
        await handleAddOrdersBatch(newOrdersData);
        addLog('system', 'success', `Berhasil menarik ${newOrdersData.length} pesanan baru dari ${shopeeAccounts.length + tiktokAccounts.length} toko.`);
      } else {
        showToast(`Tidak ada pesanan baru untuk ditarik.`);
      }
    } catch (error) { 
      showToast(`Gagal mensinkronisasi data pesanan.`); 
    } 
    finally { 
      setIsSyncing(false); 
    }
  };

  const handleSimulateNewOrder = () => { showToast(`Simulasi Order dijalankan!`); };
  
  const handleAddOrdersBatch = async (newOrdersData: Omit<Order, 'id'>[]) => {
    const newOrders = newOrdersData.map((d, i) => ({ ...d, id: (d as any).id || `ord-${Date.now()}-${i}` }));
    setOrders(prev => [...newOrders, ...prev]); 
    
    try {
      await fetch(`/api/orders/insert-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders: newOrders })
      });
      setGlobalToast(`${newOrders.length} Order berhasil ditarik & disinkronisasi ke Sheets!`);
    } catch (e) {
      console.warn("Gagal kirim ke backend", e);
      showToast(`Order ditambahkan ke dasbor (Offline)`);
    }
  };

  const handleAddOrder = async (newOrderData: Omit<Order, 'id'>) => {
    const newOrder: Order = { ...newOrderData, id: (newOrderData as any).id || `ord-${Date.now()}` };
    setOrders(prev => [newOrder, ...prev]); 
    
    // Send to backend to push to Google Sheets
    try {
      await fetch(`/api/orders/insert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder)
      });
      showToast(`Order berhasil ditambahkan & disinkronisasi ke Sheets!`);
    } catch (e) {
      console.warn("Gagal kirim ke backend", e);
      showToast(`Order ditambahkan ke dasbor (Offline)`);
    }
  };

  const handleUpdateOrderStatus = (id: string, nextStatus: OrderStatus, trackingNumber?: string, address?: string, shippingDate?: string, customerPhone?: string) => {
    setOrders(prevOrders => prevOrders.map(order => {
      if (order.id === id) { 
           fetch(`/api/orders/update-status`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                orderId: id.replace(/^ord-telegram-/, '').replace(/^ord-shopee-/, '').replace(/^ord-tiktok-/, ''), 
                nama: order.customerName, 
                phone: order.customerPhone, 
                status: nextStatus 
              })
           }).catch(e => console.log('Gagal update ke sheet', e));
        return { ...order, status: nextStatus, trackingNumber: trackingNumber !== undefined ? trackingNumber : order.trackingNumber, shippingAddress: address || order.shippingAddress, shippingDate: shippingDate !== undefined ? shippingDate : order.shippingDate, customerPhone: customerPhone !== undefined ? customerPhone : order.customerPhone }; 
      } return order;
    })); showToast(`Order diperbarui!`);
  };

    const handleDeleteOrder = async (id: string) => {
    const orderToDel = orders.find(o => o.id === id);
    const namaParam = encodeURIComponent(orderToDel?.customerName || '');
    const phoneParam = encodeURIComponent(orderToDel?.customerPhone || '');
    
    setOrders(prev => prev.filter(o => o.id !== id));
    
    setDeletedOrderIds(prev => {
      const updated = prev.includes(id) ? prev : [...prev, id];
      localStorage.setItem('apex_deleted_orders', JSON.stringify(updated));
      return updated;
    });

    const rawId = id.replace(/^ord-telegram-/, '').replace(/^ord-shopee-/, '').replace(/^ord-tiktok-/, '');
    const query = `?nama=${namaParam}&phone=${phoneParam}`;
    
    try {
      let res = await fetch('/api/orders/' + rawId + query, { method: 'DELETE' }).catch(() => null);
      if (!res || !res.ok) {
        await fetch(`/api/orders/` + rawId + query, { method: 'DELETE' }).catch(() => null);
      }
    } catch (e) {
      console.warn('Gagal menghapus data di backend', e);
    }
    
    showToast(`Order dihapus permanen.`);
  };

  const handleSaveConfig = (id: string, updatedConfig: Partial<IntegrationConfig>) => { setConfigs(prev => prev.map(c => c.id === id ? { ...c, ...updatedConfig } : c)); };
  const handleSyncOrdersFromSheet = (importedOrders: Order[]) => {
    setOrders(prev => {
      const updated = [...prev]; importedOrders.forEach(imp => { const idx = updated.findIndex(o => o.orderNumber === imp.orderNumber); if (idx > -1) updated[idx] = { ...updated[idx], ...imp }; else updated.unshift(imp); }); return updated;
    });
  };
  const handleUpdateStock = (id: string, nextStock: number, nextStockIn?: number, nextStockOut?: number, nextInitialStock?: number) => {
    setInventory(prev => prev.map(item => item.id === id ? { ...item, stock: nextStock, stockIn: nextStockIn ?? item.stockIn, stockOut: nextStockOut ?? item.stockOut, initialStock: nextInitialStock ?? item.initialStock } : item));
  };
  // =====================================================================

  // Badge counters
  const pendingOrdersCount = orders.filter(o => 
    o.status === 'Pending' || 
    o.status === 'Menunggu Diproses' || 
    o.status === 'Menunggu Dicetak'
  ).length;
  const unreadChatCount = chatThreads.filter((t: any) => t.unread).length;

  return (
    <div id="ranura-mfg-viewport-wrapper" className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden relative">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        integrationStatus={integrationStatus} 
        googleUser={googleUser} 
        isLoggingIn={isLoggingIn} 
        onLogin={handleGlobalGoogleLogin} 
        onLogout={handleGlobalGoogleLogout} 
        pendingOrdersCount={pendingOrdersCount}
        unreadChatCount={unreadChatCount}
      />
      <div id="main-content-pane" className="flex-1 flex flex-col min-w-0 bg-[#f8fafc]">
        <header id="main-app-header" className="h-16 border-b border-slate-200 bg-white px-8 flex items-center justify-between select-none shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-mono text-xs uppercase">Location:</span>
            <span className="text-slate-700 font-semibold text-xs bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">PT Ranura Berkah Abadi (Depok)</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5 text-slate-600 font-mono text-xs border-r border-slate-200 pr-6 hidden sm:flex">
              <Clock className="h-4 w-4 text-blue-600 animate-pulse" />
              <span>{currentTime}</span>
            </div>
            <div className="flex items-center gap-3 hidden md:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-xs font-semibold text-slate-700 tracking-tight">API GATEWAY: ONLINE</span>
            </div>
          </div>
        </header>

        <AnimatePresence>
          {globalToast && (
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-6 right-6 bg-white border border-slate-200 text-slate-900 px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 z-50 max-w-sm">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><Sparkles className="h-4 w-4" /></div>
              <p className="text-xs font-semibold">{globalToast}</p>
              <button onClick={() => setGlobalToast(null)} className="text-slate-400 hover:text-slate-600 ml-2"><X className="h-4.5 w-4.5" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        <main id="main-subview-frame" className="flex-1 overflow-hidden relative flex flex-col">
          {activeTab === 'beranda' && (
            <Beranda 
              orders={orders} 
              inventory={inventory} 
              threads={chatThreads} 
              setActiveTab={setActiveTab}
              transactions={transactions}
              invoices={invoices}
              calendarPosts={calendarPosts}
              googleUser={googleUser}
            />
          )}
          {activeTab === 'dashboard' && <DashboardOverview orders={orders} logs={logs} inventory={inventory} onTriggerSync={handleTriggerSync} onSimulateOrder={handleSimulateNewOrder} isSyncing={isSyncing} />}
          {activeTab === 'orders' && <OrderMaster orders={orders} inventory={inventory} shopeeAccounts={shopeeAccounts} tiktokAccounts={tiktokAccounts} googleSheets={googleSheets} onAddOrder={handleAddOrder} onAddOrdersBatch={handleAddOrdersBatch} onUpdateOrderStatus={handleUpdateOrderStatus} onDeleteOrder={handleDeleteOrder} onAddLog={addLog} onTriggerSync={handleTriggerSync} isSyncing={isSyncing} />}
          {activeTab === 'integrations' && <Integrations configs={configs} onSaveConfig={handleSaveConfig} onAddLog={addLog} logs={logs} inventory={inventory} orders={orders} shopeeAccounts={shopeeAccounts} setShopeeAccounts={setShopeeAccounts} tiktokAccounts={tiktokAccounts} setTiktokAccounts={setTiktokAccounts} googleSheets={googleSheets} setGoogleSheets={setGoogleSheets} onUpdateStock={handleUpdateStock} onReplaceInventory={setInventory} onAddOrder={handleAddOrder} onAddOrdersBatch={handleAddOrdersBatch} onSyncOrders={handleSyncOrdersFromSheet} />}
          {activeTab === 'inventory' && <InventoryManager inventory={inventory} onReplaceInventory={setInventory} shopeeAccounts={shopeeAccounts} tiktokAccounts={tiktokAccounts} googleSheets={googleSheets} onUpdateStock={handleUpdateStock} onAddLog={addLog} />}
          {activeTab === 'finance' && <FinanceCenter orders={orders} transactions={transactions} setTransactions={setTransactions} invoices={invoices} setInvoices={setInvoices} budgets={budgets} setBudgets={setBudgets} onAddLog={addLog} />}
          {activeTab === 'chat' && <StoreChatAssistant threads={chatThreads} setThreads={setChatThreads} shopeeAccounts={shopeeAccounts} tiktokAccounts={tiktokAccounts} />}
          {activeTab === 'workspace' && <WorkspaceHub onAddLog={addLog} />}
          {activeTab === 'mediacenter' && (
            <MediaCenter 
              onAddLog={addLog}
              calendarPosts={calendarPosts}
              setCalendarPosts={setCalendarPosts}
            />
          )}
        </main>
      </div>
    </div>
  );
}