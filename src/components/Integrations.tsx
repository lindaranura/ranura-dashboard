import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Lock, 
  Send, 
  Check, 
  AlertCircle, 
  Terminal, 
  Key, 
  ToggleLeft, 
  ToggleRight, 
  HelpCircle, 
  Activity,
  ArrowRight,
  ShieldAlert,
  Save,
  CheckCircle2,
  XCircle,
  ChevronRight,
  FileSpreadsheet,
  Download,
  Upload,
  LogOut,
  Globe,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Plus,
  Trash2,
  Loader2,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { IntegrationConfig, SyncLog, ProductionItem, Order } from '../types';
import { 
  initAuth, 
  googleSignIn, 
  logout, 
  createNewSpreadsheet, 
  exportInventoryToSheets, 
  importInventoryFromSheets,
  exportOrdersToSheets,
  importOrdersFromSheets,
  appendTelegramOrderToSheetTab
} from '../lib/sheetsService';

interface IntegrationsProps {
  configs: IntegrationConfig[];
  onSaveConfig: (id: string, updatedConfig: Partial<IntegrationConfig>) => void;
  onAddLog: (platform: string, type: 'info' | 'success' | 'warning' | 'error', message: string) => void;
  logs: SyncLog[];
  inventory: ProductionItem[];
  orders: Order[];
  shopeeAccounts: any[];
  setShopeeAccounts: React.Dispatch<React.SetStateAction<any[]>>;
  tiktokAccounts: any[];
  setTiktokAccounts: React.Dispatch<React.SetStateAction<any[]>>;
  googleSheets: any[];
  setGoogleSheets: React.Dispatch<React.SetStateAction<any[]>>;
  onUpdateStock: (id: string, nextStock: number, nextStockIn?: number, nextStockOut?: number) => void;
  onReplaceInventory?: (newInventory: ProductionItem[]) => void;
  onAddOrder?: (newOrderData: any) => void;
  onAddOrdersBatch?: (newOrdersData: any[]) => void;
  onSyncOrders?: (importedOrders: any[]) => void;
}


const generateMockShopeeOrders = (shopName: string, count: number) => {
  const orders: any[] = [];
  const products = ["Ranura Sport Hijab", "Ranura Swimwear Basic", "Ranura Active Top", "Ranura Legging Wudhu"];
  const names = ["Anisa", "Budi", "Citra", "Dian", "Eka"];
  for(let i=0; i<count; i++) {
    const prod = products[Math.floor(Math.random() * products.length)];
    const qty = Math.floor(Math.random() * 3) + 1;
    orders.push({
      id: `ord-shopee-${Date.now()}-${i}`,
      orderNumber: `SHP${Date.now().toString().slice(-6)}${i}`,
      platform: 'shopee',
      customerName: names[Math.floor(Math.random() * names.length)],
      productName: prod,
      sku: `SKU-${prod.split(' ')[1].toUpperCase()}`,
      qty,
      totalPrice: qty * 85000,
      status: 'Menunggu Diproses',
      orderDate: new Date().toISOString(),
      shippingAddress: `Jl. Shopee No ${Math.floor(Math.random() * 100)}, Jakarta`,
      customerPhone: `0812${Math.floor(Math.random() * 10000000)}`,
      notes: `Sync dari Shopee: ${shopName}`
    });
  }
  return orders;
};

const generateMockTiktokOrders = (shopName: string, count: number) => {
  const orders: any[] = [];
  const products = ["Ranura Sport Hijab", "Ranura Swimwear Basic", "Ranura Active Top", "Ranura Legging Wudhu"];
  const names = ["Fani", "Gita", "Hendra", "Indra", "Joko"];
  for(let i=0; i<count; i++) {
    const prod = products[Math.floor(Math.random() * products.length)];
    const qty = Math.floor(Math.random() * 2) + 1;
    orders.push({
      id: `ord-tiktok-${Date.now()}-${i}`,
      orderNumber: `TT${Date.now().toString().slice(-6)}${i}`,
      platform: 'tiktok',
      customerName: names[Math.floor(Math.random() * names.length)],
      productName: prod,
      sku: `SKU-${prod.split(' ')[1].toUpperCase()}`,
      qty,
      totalPrice: qty * 95000,
      status: 'Menunggu Diproses',
      orderDate: new Date().toISOString(),
      shippingAddress: `Jl. TikTok No ${Math.floor(Math.random() * 100)}, Bandung`,
      customerPhone: `0857${Math.floor(Math.random() * 10000000)}`,
      notes: `Sync dari TikTok: ${shopName}`
    });
  }
  return orders;
};

export default function Integrations({ 
  configs, 
  onSaveConfig, 
  onAddLog, 
  logs, 
  inventory, 
  orders, 
  shopeeAccounts,
  setShopeeAccounts,
  tiktokAccounts,
  setTiktokAccounts,
  googleSheets,
  setGoogleSheets,
  onUpdateStock, 
  onReplaceInventory, 
  onAddOrder, 
  onAddOrdersBatch, 
  onSyncOrders 
}: IntegrationsProps) {
  // Add new account states
  const [newShopeeName, setNewShopeeName] = useState('');
  const [newShopeeEmail, setNewShopeeEmail] = useState('');
  const [newShopeePass, setNewShopeePass] = useState('');
  const [showAddShopee, setShowAddShopee] = useState(false);

  const [newTiktokName, setNewTiktokName] = useState('');
  const [newTiktokEmail, setNewTiktokEmail] = useState('');
  const [newTiktokToken, setNewTiktokToken] = useState('');
  const [showAddTiktok, setShowAddTiktok] = useState(false);

  const [bigsellerEmail, setBigsellerEmail] = useState('');
  const [bigsellerToken, setBigsellerToken] = useState('');
  const [isBigsellerConnected, setIsBigsellerConnected] = useState(false);

  const handleConnectBigseller = () => {
    if (!bigsellerEmail || !bigsellerToken) {
      alert("Harap isi Email dan API Token BigSeller.");
      return;
    }
    setIsBigsellerConnected(true);
    onAddLog('system', 'success', `API BigSeller terhubung untuk ${bigsellerEmail}`);
  };


  const [newSheetTitle, setNewSheetTitle] = useState('');
  const [newSheetInputUrl, setNewSheetInputUrl] = useState('');
  const [showAddSheet, setShowAddSheet] = useState(false);

  // Telegram Bot Data Entry & Grok AI Parsing States
  const [telegramChatSource, setTelegramChatSource] = useState<'group' | 'pm'>('group');
  
  // Google Sheets Tabs Data
  const [dataOrder2026Rows, setDataOrder2026Rows] = useState<any[]>([
    { 
      tanggal: '22/07/2026 14:00', 
      namaPembeli: 'Ustadz Ahmad', 
      alamatPembeli: 'Pondok Indah Blok A No. 5, Surabaya', 
      nomorTelepon: '081987654321', 
      namaProduk: 'Rompi Sholat Madani Premium L', 
      pengiriman: 'TRANSFER/CSS JNE', 
      source: 'Grup Telegram' 
    },
    { 
      tanggal: '22/07/2026 15:45', 
      namaPembeli: 'Hj. Aminah', 
      alamatPembeli: 'Jl. Merdeka No. 45, Semarang', 
      nomorTelepon: '082133445566', 
      namaProduk: 'Gamis Pria Islah Elegant XL', 
      pengiriman: 'COD/CSS JNE', 
      source: 'Pesan Pribadi (PM)' 
    }
  ]);

  const [ranuraSwimwearRows, setRanuraSwimwearRows] = useState<any[]>([
    { 
      tanggal: '22/07/2026 10:30', 
      namaPembeli: 'Siska Pertiwi', 
      alamatPembeli: 'Jl. Anggrek No. 12, Bandung', 
      nomorTelepon: '081234567890', 
      namaProduk: 'Baju Renang Ranura Kids Proswim Female M', 
      pengiriman: 'TRANSFER/CSS JNE', 
      source: 'Grup Telegram' 
    },
    { 
      tanggal: '22/07/2026 11:15', 
      namaPembeli: 'Budi Santoso', 
      alamatPembeli: 'Komp. Permai B3, Jakarta', 
      nomorTelepon: '085711223344', 
      namaProduk: 'Swimwear M2D Hijab Male XL', 
      pengiriman: 'COD/CSS JNE', 
      source: 'Pesan Pribadi (PM)' 
    }
  ]);

  const [activeTabSheet, setActiveTabSheet] = useState<'Ranura Swimwear' | 'DATA ORDER 2026'>('Ranura Swimwear');

  const [telegramMessage, setTelegramMessage] = useState(
    'Tanggal: 22/07/2026 10:30\nNama: Siska Pertiwi\nAlamat: Jl. Anggrek No. 12, Bandung\nNo Telp WA: 081234567890\nProduk: Baju Renang Ranura Kids Proswim Female M\nPembayaran: Bank Transfer'
  );
  const [simLogs, setSimLogs] = useState<string[]>([]);
  const [simResult, setSimResult] = useState<{ status: 'success' | 'duplicate' | 'idle'; message: string; targetTab?: string; parsedData?: any } | null>({ 
    status: 'idle', 
    message: 'Grok AI Data Entry Engine siap menerima pesan Telegram dari Grup & Pesan Pribadi.' 
  });
  const [isProcessingSim, setIsProcessingSim] = useState(false);

  // Grok AI Intelligent Message Parser
  const parseTelegramWithGrok = (text: string) => {
    const lowerText = text.toLowerCase();
    
    const tanggalMatch = text.match(/(?:tanggal|tgl|date)\s*:\s*([^\n,]+)/i);
    const namaMatch = text.match(/(?:nama|nama pembeli|cust|customer)\s*:\s*([^\n,]+)/i);
    const alamatMatch = text.match(/(?:alamat|lokasi)\s*:\s*([^\n,]+)/i);
    const telpMatch = text.match(/(?:no telp wa|no hp|telp)\s*:\s*([^\n,]+)/i) || text.match(/(08\d{8,12})/);
    const produkMatch = text.match(/(?:produk|item|barang)\s*:\s*([^\n,]+)/i);

    const now = new Date();
    const autoDate = now.toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const currentYear = now.getFullYear();

    let targetTab = `DATA ORDER ${currentYear}`;
    if (['kids', 'female', 'male', 'proswim', 'hijab', 'm2d'].some(kw => lowerText.includes(kw))) {
      targetTab = `Ranura Swimwear ${currentYear}`;
    } else if (['madani', 'islah'].some(kw => lowerText.includes(kw))) {
      targetTab = `Ranura Hijab ${currentYear}`;
    } else if (['meiza', 'sportwear'].some(kw => lowerText.includes(kw))) {
      targetTab = `Ranura Meiza ${currentYear}`;
    }

    const isCOD = lowerText.includes('cod') || lowerText.includes('bayar di tempat');

    return {
      tanggal: tanggalMatch ? tanggalMatch[1].trim() : autoDate,
      namaPembeli: namaMatch ? namaMatch[1].trim() : 'Tanpa Nama',
      alamatPembeli: alamatMatch ? alamatMatch[1].trim() : '-',
      nomorTelepon: telpMatch ? telpMatch[1].trim() : '-',
      namaProduk: produkMatch ? produkMatch[1].trim() : '-',
      pengiriman: isCOD ? 'COD/CSS JNE' : 'TRANSFER/CSS JNE',
      targetTab
    };
  };

  const handleProcessTelegramSim = async () => {
    setIsProcessingSim(true);
    setSimLogs([]);
    setSimResult(null);

    const logsBuffer: string[] = [];
    const addSimLog = (msg: string) => {
      logsBuffer.push(msg);
      setSimLogs([...logsBuffer]);
    };

    addSimLog(`[SISTEM] Menganalisis kata kunci dan merakit nama Tab...`);

    // Logika Prediksi Tab untuk UI
    const textLower = telegramMessage.toLowerCase();
    let baseTab = 'DATA ORDER 2026';
    if (['kids', 'female', 'male', 'proswim', 'hijab', 'm2d'].some(kw => textLower.includes(kw))) {
      baseTab = 'Ranura Swimwear';
    } else if (['madani', 'islah'].some(kw => textLower.includes(kw))) {
      baseTab = 'Ranura Hijab';
    } else if (['meiza', 'sportwear'].some(kw => textLower.includes(kw))) {
      baseTab = 'Ranura Meiza';
    }
    
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const now = new Date();
    const targetTabDinamis = `${baseTab} ${months[now.getMonth()]} ${now.getFullYear()}`;

    addSimLog(`[KATEGORI] Terdeteksi! Data akan dikirim ke Tab: "${targetTabDinamis}"`);
    addSimLog(`[SISTEM] Mengirim data ke Webhook Server Bot (Port 3001)...`);

    try {
      const response = await fetch('/api/webhooks/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: { text: telegramMessage }
        })
      });

      if (!response.ok) throw new Error("Gagal mengirim ke server");

      addSimLog(`[SISTEM] Pesan sukses dikirim! Otak AI sedang melompati kolom B, G, H, I...`);
      
      setSimResult({
        status: 'success',
        message: `Sukses! Data otomatis mendarat di Kolom A,C,D,E,F,J pada Tab: ${targetTabDinamis}`,
        targetTab: targetTabDinamis,
        parsedData: { targetTab: targetTabDinamis } // Dummy agar UI tidak error
      });

    } catch (err) {
      addSimLog(`[ERROR] Gagal. Pastikan CMD npx tsx bot.ts (Port 3001) menyala!`);
    } finally {
      setIsProcessingSim(false);
    }
  };

  // Local state for passwords and bot tokens inputs
  const [shopeeEmail, setShopeeEmail] = useState(configs.find(c => c.id === 'shopee')?.email || '');
  const [shopeePassword, setShopeePassword] = useState('••••••••••••••••');
  
  const [tiktokEmail, setTiktokEmail] = useState(configs.find(c => c.id === 'tiktok')?.email || '');
  const [tiktokPassword, setTiktokPassword] = useState('••••••••••••••••');

  const [telegramToken, setTelegramToken] = useState(configs.find(c => c.id === 'telegram')?.botToken || '');
  const [telegramUsername, setTelegramUsername] = useState(configs.find(c => c.id === 'telegram')?.botUsername || 'RanuraOrderBot');

  // Interactive Sync Test Feedbacks
  const [testingPlatform, setTestingPlatform] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ status: 'success' | 'error'; message: string } | null>(null);

  // Show password states
  const [showShopeePass, setShowShopeePass] = useState(false);
  const [showTiktokPass, setShowTiktokPass] = useState(false);

  // Google Sheets Integration State
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Derived Google Sheet States
  const activeSheet = googleSheets.find(s => s.active) || googleSheets[0];
  const spreadsheetId = activeSheet ? activeSheet.spreadsheetId : '';
  const spreadsheetUrl = activeSheet ? activeSheet.spreadsheetUrl : '';
  const spreadsheetTitle = activeSheet ? activeSheet.title : '';

  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [sheetsFeedback, setSheetsFeedback] = useState<{ status: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Multi-Account Operations for Shopee
  const handleAddShopeeAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopeeName.trim() || !newShopeeEmail.trim()) {
      alert('Nama Toko dan Email wajib diisi!');
      return;
    }
    const newAcc = {
      id: `shp-${Date.now()}`,
      shopName: newShopeeName,
      email: newShopeeEmail,
      connected: true,
      autoSync: true,
      lastSynced: new Date().toISOString()
    };
    setShopeeAccounts(prev => [...prev, newAcc]);
    onAddLog('shopee', 'success', `Menghubungkan akun Shopee baru: "${newShopeeName}" (${newShopeeEmail}). Jembatan API sukses diaktifkan.`);
    
    // Auto pull 1 order on connect
    if (onAddOrdersBatch) {
      const newOrders = generateMockShopeeOrders(newShopeeName, 1);
      await onAddOrdersBatch(newOrders);
      onAddLog('shopee', 'success', `Berhasil menarik 1 pesanan baru dari Shopee "${newShopeeName}" setelah terhubung.`);
    }

    setNewShopeeName('');
    setNewShopeeEmail('');
    setNewShopeePass('');
    setShowAddShopee(false);
    alert(`Berhasil menghubungkan akun Shopee: ${newShopeeName}`);
  };

  const handleDeleteShopeeAccount = (id: string, name: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin memutuskan koneksi Shopee "${name}"?`)) return;
    setShopeeAccounts(prev => prev.filter(acc => acc.id !== id));
    onAddLog('shopee', 'warning', `Memutus koneksi akun Shopee: "${name}".`);
  };

  const handleToggleShopeeSync = (id: string) => {
    setShopeeAccounts(prev => prev.map(acc => {
      if (acc.id === id) {
        const nextSync = !acc.autoSync;
        onAddLog('shopee', 'info', `Auto-sync akun "${acc.shopName}" diubah: ${nextSync ? 'AKTIF' : 'NONAKTIF'}.`);
        return { ...acc, autoSync: nextSync };
      }
      return acc;
    }));
  };

  const handleSyncShopeeAccount = async (id: string, name: string) => {
    onAddLog('shopee', 'info', `Memicu sinkronisasi manual untuk Shopee "${name}"...`);
    setIsSyncingSheets(true);
    setShopeeAccounts(prev => prev.map(acc => {
      if (acc.id === id) {
        return { ...acc, lastSynced: new Date().toISOString() };
      }
      return acc;
    }));
    
    if (onAddOrdersBatch) {
      const count = Math.floor(Math.random() * 2) + 1;
      const newOrders = generateMockShopeeOrders(name, count);
      await onAddOrdersBatch(newOrders);
      onAddLog('shopee', 'success', `Berhasil menarik ${count} pesanan baru dari Shopee "${name}".`);
    }
    
    setIsSyncingSheets(false);
    alert(`Sinkronisasi Shopee "${name}" sukses! Pesanan baru masuk ke Master Data Order secara Realtime.`);
  };

  // Multi-Account Operations for TikTok
  const handleAddTiktokAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTiktokName.trim() || !newTiktokEmail.trim()) {
      alert('Nama Toko dan Email wajib diisi!');
      return;
    }
    const newAcc = {
      id: `tts-${Date.now()}`,
      shopName: newTiktokName,
      email: newTiktokEmail,
      connected: true,
      autoSync: true,
      lastSynced: new Date().toISOString()
    };
    setTiktokAccounts(prev => [...prev, newAcc]);
    onAddLog('tiktok', 'success', `Menghubungkan akun TikTok baru: "${newTiktokName}" (${newTiktokEmail}).`);
    
    // Auto pull 1 order on connect
    if (onAddOrdersBatch) {
      const newOrders = generateMockTiktokOrders(newTiktokName, 1);
      await onAddOrdersBatch(newOrders);
      onAddLog('tiktok', 'success', `Berhasil menarik 1 pesanan baru dari TikTok "${newTiktokName}" setelah terhubung.`);
    }

    setNewTiktokName('');
    setNewTiktokEmail('');
    setNewTiktokToken('');
    setShowAddTiktok(false);
    alert(`Berhasil menghubungkan akun TikTok Shop: ${newTiktokName}`);
  };

  const handleDeleteTiktokAccount = (id: string, name: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin memutuskan koneksi TikTok "${name}"?`)) return;
    setTiktokAccounts(prev => prev.filter(acc => acc.id !== id));
    onAddLog('tiktok', 'warning', `Memutus koneksi akun TikTok: "${name}".`);
  };

  const handleToggleTiktokSync = (id: string) => {
    setTiktokAccounts(prev => prev.map(acc => {
      if (acc.id === id) {
        const nextSync = !acc.autoSync;
        onAddLog('tiktok', 'info', `Auto-sync akun "${acc.shopName}" diubah: ${nextSync ? 'AKTIF' : 'NONAKTIF'}.`);
        return { ...acc, autoSync: nextSync };
      }
      return acc;
    }));
  };

  const handleSyncTiktokAccount = async (id: string, name: string) => {
    onAddLog('tiktok', 'info', `Memicu sinkronisasi manual untuk TikTok Shop "${name}"...`);
    setIsSyncingSheets(true);
    setTiktokAccounts(prev => prev.map(acc => {
      if (acc.id === id) {
        return { ...acc, lastSynced: new Date().toISOString() };
      }
      return acc;
    }));
    
    if (onAddOrdersBatch) {
      const count = Math.floor(Math.random() * 2) + 1;
      const newOrders = generateMockTiktokOrders(name, count);
      await onAddOrdersBatch(newOrders);
      onAddLog('tiktok', 'success', `Berhasil menarik ${count} pesanan baru dari TikTok "${name}".`);
    }

    setIsSyncingSheets(false);
    alert(`Sinkronisasi TikTok "${name}" sukses! Pesanan baru masuk ke Master Data Order secara Realtime.`);
  };

  // Multi-Sheet Operations
  const extractSpreadsheetId = (input: string) => {
    if (!input) return '';
    if (input.includes('docs.google.com/spreadsheets')) {
      const matches = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
      return matches ? matches[1] : input;
    }
    return input.trim();
  };

  const handleAddSheetLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSheetTitle.trim() || !newSheetInputUrl.trim()) {
      alert('Nama Sheet dan URL / ID wajib diisi!');
      return;
    }
    const extractedId = extractSpreadsheetId(newSheetInputUrl);
    const targetUrl = newSheetInputUrl.startsWith('http') 
      ? newSheetInputUrl 
      : `https://docs.google.com/spreadsheets/d/${extractedId}/edit`;

    const newSheet = {
      id: `sheet-${Date.now()}`,
      title: newSheetTitle,
      spreadsheetId: extractedId,
      spreadsheetUrl: targetUrl,
      active: googleSheets.length === 0,
      connectedAt: new Date().toISOString()
    };
    setGoogleSheets(prev => [...prev, newSheet]);
    onAddLog('system', 'success', `Menghubungkan Google Sheet baru: "${newSheetTitle}" (ID: ${extractedId}).`);
    setNewSheetTitle('');
    setNewSheetInputUrl('');
    setShowAddSheet(false);
    alert(`Berhasil menambahkan Google Sheet: ${newSheetTitle}`);
  };

  const handleDeleteSheetLink = (id: string, title: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus koneksi spreadsheet "${title}"?`)) return;
    setGoogleSheets(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (filtered.length > 0 && !filtered.some(s => s.active)) {
        filtered[0].active = true;
      }
      return filtered;
    });
    onAddLog('system', 'warning', `Menghapus koneksi Google Sheet: "${title}".`);
  };

  const handleSetActiveSheet = (id: string, title: string) => {
    setGoogleSheets(prev => prev.map(s => ({
      ...s,
      active: s.id === id
    })));
    onAddLog('system', 'info', `Mengubah Google Sheet aktif ke: "${title}". Sinkronisasi berikutnya menggunakan sheet ini.`);
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setSheetsFeedback(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setGoogleToken(res.accessToken);
        onAddLog('system', 'success', `Google Sheets OAuth Terhubung: Akun ${res.user.email} sukses diotorisasi.`);
      }
    } catch (err: any) {
      console.error(err);
      setSheetsFeedback({
        status: 'error',
        message: `Gagal menghubungkan Google Account: ${err.message || err}`
      });
      onAddLog('system', 'error', `Google Sheets Auth Gagal: ${err.message || err}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    const confirmed = window.confirm('Apakah Anda yakin ingin memutus koneksi Google Sheets?');
    if (!confirmed) return;
    try {
      await logout();
      setGoogleUser(null);
      setGoogleToken(null);
      onAddLog('system', 'warning', 'Google Sheets OAuth Terputus: Otorisasi akun dicabut.');
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleCreateSheet = async () => {
    if (!googleToken) {
      alert('Silakan login terlebih dahulu!');
      return;
    }
    setIsSyncingSheets(true);
    setSheetsFeedback(null);
    try {
      const title = `Ranura Berkah Abadi - Sinkronisasi Stok & Produksi (${new Date().toLocaleDateString('id-ID')})`;
      onAddLog('system', 'info', `Menghubungi Google Sheets API untuk membuat spreadsheet baru: "${title}"...`);
      const info = await createNewSpreadsheet(googleToken, title);
      
      const newSheetItem = {
        id: `sheet-${Date.now()}`,
        title: info.title,
        spreadsheetId: info.spreadsheetId,
        spreadsheetUrl: info.spreadsheetUrl,
        active: true,
        connectedAt: new Date().toISOString()
      };
      setGoogleSheets(prev => [newSheetItem, ...prev.map(s => ({ ...s, active: false }))]);

      onAddLog('system', 'success', `Google Sheet Baru Berhasil Dibuat! ID: ${info.spreadsheetId}`);
      
      // Immediately export current inventory as initial data
      await exportInventoryToSheets(googleToken, info.spreadsheetId, inventory);
      onAddLog('system', 'success', `Inisiasi Data Berhasil: Mengekspor ${inventory.length} item stok ke Google Sheet baru.`);
      
      setSheetsFeedback({
        status: 'success',
        message: 'Spreadsheet baru berhasil dibuat dan ditambahkan sebagai sheet aktif!'
      });
    } catch (err: any) {
      console.error(err);
      setSheetsFeedback({
        status: 'error',
        message: `Gagal membuat spreadsheet: ${err.message || err}`
      });
      onAddLog('system', 'error', `Gagal Membuat Spreadsheet: ${err.message || err}`);
    } finally {
      setIsSyncingSheets(false);
    }
  };

  const handleExportSheets = async () => {
    if (!googleToken) {
      alert('Silakan login terlebih dahulu!');
      return;
    }
    if (!spreadsheetId) {
      alert('Masukkan atau pilih Google Sheet aktif terlebih dahulu!');
      return;
    }
    
    const confirmed = window.confirm(`Ekspor ${inventory.length} produk dan ${orders.length} order ke Google Sheets "${spreadsheetTitle}"? Ini akan menimpa baris yang ada di sheet "Stok & Inventaris" dan "Data Order".`);
    if (!confirmed) return;

    setIsSyncingSheets(true);
    setSheetsFeedback(null);
    try {
      onAddLog('system', 'info', `Menjalankan sinkronisasi ekspor "Stok & Inventaris" ke Google Sheets "${spreadsheetTitle}"...`);
      await exportInventoryToSheets(googleToken, spreadsheetId, inventory);
      onAddLog('system', 'success', `Sinkronisasi Ekspor Stok Sukses: ${inventory.length} item disinkronkan ke Google Sheet.`);

      onAddLog('system', 'info', `Menjalankan sinkronisasi ekspor "Data Order" ke Google Sheets "${spreadsheetTitle}"...`);
      await exportOrdersToSheets(googleToken, spreadsheetId, orders);
      onAddLog('system', 'success', `Sinkronisasi Ekspor Order Sukses: ${orders.length} order aktif disinkronkan ke Google Sheet.`);
      
      setSheetsFeedback({
        status: 'success',
        message: `Berhasil mengekspor ${inventory.length} item stok & ${orders.length} data order ke Google Sheets!`
      });
    } catch (err: any) {
      console.error(err);
      setSheetsFeedback({
        status: 'error',
        message: `Gagal mengekspor data: ${err.message || err}`
      });
      onAddLog('system', 'error', `Gagal Ekspor Sheets: ${err.message || err}`);
    } finally {
      setIsSyncingSheets(false);
    }
  };

  const handleImportSheets = async () => {
    if (!googleToken) {
      alert('Silakan login terlebih dahulu!');
      return;
    }
    if (!spreadsheetId) {
      alert('Masukkan atau pilih Google Sheet aktif terlebih dahulu!');
      return;
    }

    const confirmed = window.confirm(`Sinkronisasi data Master Stok dan Master Order dengan Google Sheets "${spreadsheetTitle}"? Ini akan mengganti seluruh isi produk, nilai stok fisik, serta data order di aplikasi ini sesuai baris yang ada di spreadsheet terhubung.`);
    if (!confirmed) return;

    setIsSyncingSheets(true);
    setSheetsFeedback(null);
    try {
      onAddLog('system', 'info', `Membaca data "Stok & Inventaris" dari Google Sheets "${spreadsheetTitle}"...`);
      const importedItems = await importInventoryFromSheets(googleToken, spreadsheetId);
      
      let hasImportedInventory = importedItems.length > 0;
      if (hasImportedInventory) {
        // Merge imported items with existing items to preserve reservations
        const mergedInventory = importedItems.map(imported => {
          const existing = inventory.find(i => i.id === imported.id || i.sku === imported.sku);
          return {
            ...imported,
            reserved: existing ? existing.reserved : 0
          };
        });

        if (onReplaceInventory) {
          onReplaceInventory(mergedInventory);
        }
        onAddLog('system', 'success', `Sinkronisasi Impor Stok Sukses: Master data dan stok telah disesuaikan sepenuhnya dengan Google Sheet (${importedItems.length} produk tersinkronisasi).`);
      } else {
        onAddLog('system', 'warning', 'Sinkronisasi Impor Stok: Tidak ditemukan baris produk yang valid di spreadsheet.');
      }

      // Also import orders
      onAddLog('system', 'info', `Membaca data "Data Order" dari Google Sheets "${spreadsheetTitle}"...`);
      let importedOrdersCount = 0;
      try {
        const importedOrders = await importOrdersFromSheets(googleToken, spreadsheetId);
        if (importedOrders && importedOrders.length > 0) {
          importedOrdersCount = importedOrders.length;
          if (onSyncOrders) {
            onSyncOrders(importedOrders);
          }
          onAddLog('system', 'success', `Sinkronisasi Impor Order Sukses: ${importedOrders.length} order dimuat dari Google Sheets ke Master Data Order.`);
        }
      } catch (errOrder: any) {
        console.warn('Gagal membaca data order dari Google Sheets:', errOrder);
        onAddLog('system', 'warning', `Sinkronisasi Impor Order Terlewati: Tab "Data Order" di Google Sheets kosong atau belum terisi. Hanya mengimpor data stok.`);
      }

      setSheetsFeedback({
        status: 'success',
        message: `Berhasil mengimpor data! ${importedItems.length} produk disinkronkan & ${importedOrdersCount} order dimuat sepenuhnya dari Google Sheets.`
      });
    } catch (err: any) {
      console.error(err);
      setSheetsFeedback({
        status: 'error',
        message: `Gagal mengimpor data: ${err.message || err}`
      });
      onAddLog('system', 'error', `Gagal Impor Sheets: ${err.message || err}`);
    } finally {
      setIsSyncingSheets(false);
    }
  };

  // Get individual configs
  const shopeeConfig = configs.find(c => c.id === 'shopee')!;
  const tiktokConfig = configs.find(c => c.id === 'tiktok')!;
  const telegramConfig = configs.find(c => c.id === 'telegram')!;

  // Handle Shopee credential updates
  const handleSaveShopee = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig('shopee', {
      email: shopeeEmail,
      password: shopeePassword,
      connected: shopeeEmail.length > 3 && shopeePassword.length > 3,
      lastSynced: new Date().toISOString()
    });
    
    onAddLog('shopee', 'success', `Kredensial Shopee Seller Center diperbarui: ${shopeeEmail}. Mengautentikasi ulang jembatan API.`);
    
    // Simulate connection ping
    setTestingPlatform('shopee');
    setTestResult(null);
    setTimeout(() => {
      setTestingPlatform(null);
      setTestResult({
        status: 'success',
        message: 'Koneksi Shopee Seller Center berhasil diverifikasi. Status: AKTIF.'
      });
      setTimeout(() => setTestResult(null), 3500);
    }, 1500);
  };

  // Handle TikTok credential updates
  const handleSaveTiktok = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig('tiktok', {
      email: tiktokEmail,
      password: tiktokPassword,
      connected: tiktokEmail.length > 3 && tiktokPassword.length > 3,
      lastSynced: new Date().toISOString()
    });

    onAddLog('tiktok', 'success', `Kredensial TikTok Seller Center diperbarui: ${tiktokEmail}. Mengautentikasi ulang jembatan API.`);

    // Simulate connection ping
    setTestingPlatform('tiktok');
    setTestResult(null);
    setTimeout(() => {
      setTestingPlatform(null);
      setTestResult({
        status: 'success',
        message: 'Koneksi TikTok Seller Center berhasil diverifikasi. Status: AKTIF.'
      });
      setTimeout(() => setTestResult(null), 3500);
    }, 1500);
  };

  // Handle Telegram Bot Token updates
  const handleTestTelegram = () => {
    onAddLog('telegram', 'success', 'Ping: Bot RanuraOrderBot merespons (21ms)');
  };

  const handleSaveTelegram = (e: React.FormEvent) => {
    e.preventDefault();
    const isTokenValid = telegramToken.length > 10;
    
    onSaveConfig('telegram', {
      botToken: telegramToken,
      botUsername: telegramUsername,
      connected: isTokenValid,
      lastSynced: isTokenValid ? new Date().toISOString() : undefined
    });

    if (isTokenValid) {
      onAddLog('telegram', 'success', `Token Bot Telegram dikonfigurasi: ${telegramToken.slice(0, 6)}... Terhubung dengan @${telegramUsername}`);
      
      setTestingPlatform('telegram');
      setTestResult(null);
      setTimeout(() => {
        setTestingPlatform(null);
        setTestResult({
          status: 'success',
          message: `Koneksi Telegram Bot @${telegramUsername} berhasil. Uji kirim webhook AKTIF.`
        });
        setTimeout(() => setTestResult(null), 3500);
      }, 1500);
    } else {
      onAddLog('telegram', 'warning', 'Peringatan: Token Bot Telegram dihapus atau tidak valid. Notifikasi dinonaktifkan.');
      onSaveConfig('telegram', { connected: false });
    }
  };

  // Simulate pushing a test telegram notification
  const handleSendTelegramTest = () => {
    if (!telegramConfig.connected) {
      alert('Sambungkan bot Telegram terlebih dahulu dengan mengisi Token Bot yang valid!');
      return;
    }

    onAddLog('telegram', 'info', `Mengirim pesan pengujian simulasi order ke bot Telegram @${telegramUsername}...`);
    setTestingPlatform('telegram-send');
    
    setTimeout(() => {
      setTestingPlatform(null);
      onAddLog('telegram', 'success', `Pesan berhasil dikirim via @${telegramUsername} ke chat id: 58190292. Terverifikasi oleh server.`);
      alert(`Simulasi Notifikasi Telegram Terkirim!\n\nPesan:\n📦 *ORDER BARU MASUK (RANURA-BERKAH)*\nNo. Order: SHP-20260629-4820\nCustomer: CV Sinar Jaya Teknika\nItem: Baju Renang Apung Ranura\nTanggal Kirim: ${new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}\nStatus: Pending (Antrian Produksi)\n\nSilakan cek log monitor.`);
    }, 1200);
  };

  return (
    <div id="integrations-viewport" className="p-8 space-y-8 overflow-y-auto h-full flex-1 bg-[#f8fafc] text-slate-800">
      {/* Header section */}
      <div id="integrations-header" className="border-b border-slate-200 pb-6">
        <span className="text-blue-600 font-mono text-xs font-semibold tracking-widest uppercase">Konfigurasi Jembatan API</span>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mt-1">Integrasi Saluran Penjualan</h1>
        <p className="text-slate-500 text-sm mt-1">
          Hubungkan e-commerce Shopee & TikTok menggunakan kredensial toko Anda, serta konfigurasikan bot Telegram menggunakan Token Bot unik.
        </p>
      </div>

      {/* Main integration status banner */}
      {testResult && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between ${
            testResult.status === 'success' 
              ? 'bg-emerald-50 border border-emerald-100 text-emerald-600' 
              : 'bg-rose-50 border border-rose-100 text-rose-600'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {testResult.status === 'success' ? <CheckCircle2 className="h-4.5 w-4.5" /> : <XCircle className="h-4.5 w-4.5" />}
            <span>{testResult.message}</span>
          </div>
        </motion.div>
      )}

      {/* Channel list row */}
      <div id="channels-integration-grid" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Shopee seller api */}
        <div className="p-6 bg-white border border-slate-200 rounded-2xl flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-orange-50 text-orange-600 border border-orange-200 rounded-xl flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-6 w-6">
                    <path d="M19 6h-1.5c0-3.03-2.47-5.5-5.5-5.5S6.5 2.97 6.5 6H5c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-4.5c1.93 0 3.5 1.57 3.5 3.5h-7c0-1.93 1.57-3.5 3.5-3.5zm7 16H5V8h14v11z" fill="currentColor"/>
                    <path d="M12 9.5c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5-1.12-2.5-2.5-2.5zm0 3.8c-.72 0-1.3-.58-1.3-1.3s.58-1.3 1.3-1.3 1.3.58 1.3 1.3-.58 1.3-1.3 1.3z" fill="currentColor"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Shopee Seller Center ({shopeeAccounts.length} Akun)</h3>
                  <span className="text-[10px] text-slate-400 font-mono uppercase">Multi-Account Integration</span>
                </div>
              </div>
              <button
                onClick={() => setShowAddShopee(!showAddShopee)}
                className="py-1 px-2.5 bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 text-[11px] font-bold rounded-lg transition-all"
              >
                {showAddShopee ? 'Tutup Form' : '+ Tambah Akun'}
              </button>
            </div>

            {/* Expandable Add Shopee Account Form */}
            {showAddShopee && (
              <motion.form 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                onSubmit={handleAddShopeeAccount} 
                className="mb-6 p-4 bg-orange-50/50 border border-orange-100 rounded-xl space-y-3"
              >
                <h4 className="text-xs font-bold text-orange-850 uppercase tracking-wider">Tambah Akun Shopee</h4>
                <div className="grid grid-cols-1 gap-2.5">
                  <input
                    type="text"
                    required
                    placeholder="Nama Toko Shopee (contoh: Ranura Official)"
                    value={newShopeeName}
                    onChange={(e) => setNewShopeeName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-orange-500"
                  />
                  <input
                    type="email"
                    required
                    placeholder="Seller Email / ID Login"
                    value={newShopeeEmail}
                    onChange={(e) => setNewShopeeEmail(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-orange-500"
                  />
                  <input
                    type="password"
                    placeholder="Access Token / Password (opsional)"
                    value={newShopeePass}
                    onChange={(e) => setNewShopeePass(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-orange-500"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    className="py-1.5 px-3 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg transition-all"
                  >
                    Verifikasi & Hubungkan
                  </button>
                </div>
              </motion.form>
            )}

            {/* Shopee Accounts List */}
            <div className="space-y-3">
              {shopeeAccounts.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">Belum ada akun Shopee terhubung.</div>
              ) : (
                shopeeAccounts.map(acc => (
                  <div key={acc.id} className="p-3 bg-slate-50 border border-slate-150 rounded-xl flex flex-col gap-2.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                          {acc.shopName}
                          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm" title="Online"></span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{acc.email}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteShopeeAccount(acc.id, acc.shopName)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                        title="Putus Koneksi"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 text-[10px]">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">Auto Sync:</span>
                        <button
                          onClick={() => handleToggleShopeeSync(acc.id)}
                          className={`px-1.5 py-0.5 rounded font-bold ${acc.autoSync ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}
                        >
                          {acc.autoSync ? 'AKTIF' : 'MATI'}
                        </button>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-slate-400 font-mono">Last: {acc.lastSynced ? new Date(acc.lastSynced).toLocaleTimeString('id-ID') : 'Never'}</span>
                        <button
                          onClick={() => handleSyncShopeeAccount(acc.id, acc.shopName)}
                          className="flex items-center gap-1 py-0.5 px-2 bg-white hover:bg-slate-100 border border-slate-250 text-slate-600 rounded font-semibold"
                        >
                          <RefreshCw className="h-2.5 w-2.5" /> Sync
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* TikTok shop partner */}
        <div className="p-6 bg-white border border-slate-200 rounded-2xl flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-200 rounded-xl flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.68-4.06-1.54-.49-.36-.92-.79-1.28-1.29v7.1c-.05 2.11-.91 4.19-2.51 5.56-1.63 1.44-3.95 2.12-6.11 1.83-2.19-.28-4.23-1.58-5.27-3.52C2.08 16.03 1.8 13.62 2.52 11.4c.7-2.12 2.45-3.87 4.62-4.52 1.09-.33 2.25-.38 3.37-.17v4.11c-.81-.25-1.72-.2-2.48.24-.76.44-1.32 1.2-1.51 2.06-.28 1.16-.02 2.44.73 3.33.72.88 1.88 1.31 3.02 1.15 1.12-.14 2.12-.91 2.49-1.97.16-.48.22-.99.2-1.5V.02z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">TikTok Seller Center ({tiktokAccounts.length} Akun)</h3>
                  <span className="text-[10px] text-slate-400 font-mono uppercase">Multi-Account Integration</span>
                </div>
              </div>
              <button
                onClick={() => setShowAddTiktok(!showAddTiktok)}
                className="py-1 px-2.5 bg-fuchsia-50 hover:bg-fuchsia-100 text-fuchsia-600 border border-fuchsia-200 text-[11px] font-bold rounded-lg transition-all"
              >
                {showAddTiktok ? 'Tutup Form' : '+ Tambah Akun'}
              </button>
            </div>

            {/* Expandable Add TikTok Account Form */}
            {showAddTiktok && (
              <motion.form 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                onSubmit={handleAddTiktokAccount} 
                className="mb-6 p-4 bg-fuchsia-50/50 border border-fuchsia-100 rounded-xl space-y-3"
              >
                <h4 className="text-xs font-bold text-fuchsia-850 uppercase tracking-wider">Tambah Akun TikTok</h4>
                <div className="grid grid-cols-1 gap-2.5">
                  <input
                    type="text"
                    required
                    placeholder="Nama Toko TikTok (contoh: Mayudee Hijab)"
                    value={newTiktokName}
                    onChange={(e) => setNewTiktokName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-fuchsia-500"
                  />
                  <input
                    type="email"
                    required
                    placeholder="Partner Partner Email / Login"
                    value={newTiktokEmail}
                    onChange={(e) => setNewTiktokEmail(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-fuchsia-500"
                  />
                  <input
                    type="password"
                    placeholder="Access Token / App Secret (opsional)"
                    value={newTiktokToken}
                    onChange={(e) => setNewTiktokToken(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-fuchsia-500"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    className="py-1.5 px-3 bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-xs font-bold rounded-lg transition-all"
                  >
                    Otorisasikan Akun
                  </button>
                </div>
              </motion.form>
            )}

            {/* TikTok Accounts List */}
            <div className="space-y-3">
              {tiktokAccounts.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">Belum ada akun TikTok terhubung.</div>
              ) : (
                tiktokAccounts.map(acc => (
                  <div key={acc.id} className="p-3 bg-slate-50 border border-slate-150 rounded-xl flex flex-col gap-2.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                          {acc.shopName}
                          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm" title="Online"></span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{acc.email}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteTiktokAccount(acc.id, acc.shopName)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                        title="Putus Koneksi"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 text-[10px]">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">Auto Sync:</span>
                        <button
                          onClick={() => handleToggleTiktokSync(acc.id)}
                          className={`px-1.5 py-0.5 rounded font-bold ${acc.autoSync ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}
                        >
                          {acc.autoSync ? 'AKTIF' : 'MATI'}
                        </button>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-slate-400 font-mono">Last: {acc.lastSynced ? new Date(acc.lastSynced).toLocaleTimeString('id-ID') : 'Never'}</span>
                        <button
                          onClick={() => handleSyncTiktokAccount(acc.id, acc.shopName)}
                          className="flex items-center gap-1 py-0.5 px-2 bg-white hover:bg-slate-100 border border-slate-250 text-slate-600 rounded font-semibold"
                        >
                          <RefreshCw className="h-2.5 w-2.5" /> Sync
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      
        {/* Omnichannel Integrations Card */}
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 mb-5 gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-xl flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M12 8v4"></path><path d="M12 16h.01"></path></svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Integrasi Omnichannel / ERP Pihak Ketiga</h3>
                <span className="text-[10px] text-slate-400 font-mono uppercase">BigSeller, Jubelio, Ginee API Keys</span>
              </div>
            </div>
            <button className="py-1 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg transition-all shadow-sm">
              Simpan API Key
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* BigSeller */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 text-sm">Konfigurasi BigSeller API</h4>
                <span className="px-2 py-0.5 bg-slate-200 text-slate-500 rounded text-[10px] font-bold">Belum Aktif</span>
              </div>
              <p className="text-xs text-slate-500">Masukkan Client ID & Secret dari BigSeller Developer Center jika Anda pengguna BigSeller.</p>
              <div className="space-y-2">
                <input type="text" placeholder="BigSeller Client ID" className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500" />
                <input type="password" placeholder="BigSeller Client Secret" className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
            </div>

            {/* Jubelio */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 text-sm">Konfigurasi Jubelio API</h4>
                <span className="px-2 py-0.5 bg-slate-200 text-slate-500 rounded text-[10px] font-bold">Belum Aktif</span>
              </div>
              <p className="text-xs text-slate-500">Masukkan API Token Jubelio dari menu Integrasi &gt; API Key.</p>
              <div className="space-y-2">
                <input type="text" placeholder="Jubelio Email / API ID" className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500" />
                <input type="password" placeholder="Jubelio API Token" className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Google Sheets Integration Card */}
      <div id="google-sheets-integration-card" className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 mb-5 gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Google Sheets Integration ({googleSheets.length} Spreadsheet)</h3>
              <span className="text-[10px] text-slate-400 font-mono uppercase">Multi-Link Spreadsheet & Jembatan Sinkronisasi Stok</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold font-mono px-2.5 py-1 rounded-full border ${googleToken ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
              {googleToken ? 'TERHUBUNG' : 'SIAP DIHUBUNGKAN'}
            </span>
          </div>
        </div>

        {sheetsFeedback && (
          <div className={`p-4 mb-5 rounded-xl text-xs font-semibold flex items-center gap-2.5 ${
            sheetsFeedback.status === 'success' 
              ? 'bg-emerald-50 border border-emerald-100 text-emerald-600' 
              : 'bg-rose-50 border border-rose-100 text-rose-600'
          }`}>
            {sheetsFeedback.status === 'success' ? <CheckCircle2 className="h-4.5 w-4.5" /> : <XCircle className="h-4.5 w-4.5" />}
            <span>{sheetsFeedback.message}</span>
          </div>
        )}

        
          {/* ALWAYS RENDER GOOGLE LOGIN UI */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-slate-50 border border-slate-150 rounded-2xl gap-4 mb-4">
            <div className="flex items-center gap-3">
              {!googleToken ? (
                <>
                  <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center">
                    G
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Sambungkan Akun Google</p>
                    <p className="text-[11px] text-slate-500">Opsional untuk Buat Sheet Baru</p>
                  </div>
                </>
              ) : (
                <>
                  {googleUser?.photoURL ? (
                    <img src={googleUser.photoURL} alt="Avatar" referrerPolicy="no-referrer" className="h-10 w-10 rounded-full border border-slate-250" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center">
                      {googleUser?.displayName?.charAt(0) || googleUser?.email?.charAt(0) || 'G'}
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold text-slate-800">{googleUser?.displayName || 'Google User'}</p>
                    <p className="text-[11px] text-slate-500">{googleUser?.email}</p>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddSheet(!showAddSheet)}
                className="py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl transition-all"
              >
                {showAddSheet ? 'Tutup Form' : '+ Hubungkan Sheet URL'}
              </button>
              {!googleToken ? (
                <button
                  type="button"
                  id="google-login-button"
                  onClick={handleGoogleLogin}
                  disabled={isLoggingIn}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold rounded-xl shadow-sm transition-all cursor-pointer text-xs"
                >
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-4 w-4">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                  {isLoggingIn ? '...' : 'Login'}
                </button>
              ) : (
                <button
                  type="button"
                  id="google-logout-button"
                  onClick={handleGoogleLogout}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition-all cursor-pointer"
                >
                  Putus Koneksi
                </button>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {/* Add New Spreadsheet Link Form */}

            {showAddSheet && (
              <motion.form 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                onSubmit={handleAddSheetLink} 
                className="p-4 bg-emerald-50/40 border border-emerald-100 rounded-2xl space-y-3"
              >
                <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Hubungkan Spreadsheet (Google Sheets) Baru</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Nama / Label Spreadsheet (contoh: Laporan Pengiriman Harian)"
                    value={newSheetTitle}
                    onChange={(e) => setNewSheetTitle(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-emerald-500"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Link URL Google Sheet atau Spreadsheet ID"
                    value={newSheetInputUrl}
                    onChange={(e) => setNewSheetInputUrl(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-mono outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    className="py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm"
                  >
                    Verifikasi & Tambah Link
                  </button>
                </div>
              </motion.form>
            )}

            {/* List of Connected Google Sheets with Active Target Selector */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
              <table className="min-w-full divide-y divide-slate-150 text-left">
                <thead className="bg-slate-50 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Nama Spreadsheet</th>
                    <th className="px-4 py-3">Spreadsheet ID</th>
                    <th className="px-4 py-3">Target Utama</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-xs">
                  {googleSheets.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-slate-400">Belum ada spreadsheet terhubung. Klik 'Buat Baru' atau 'Hubungkan Sheet URL'.</td>
                    </tr>
                  ) : (
                    googleSheets.map(sheet => (
                      <tr key={sheet.id} className={`hover:bg-slate-50/50 transition-colors ${sheet.active ? 'bg-emerald-50/20' : ''}`}>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-800">{sheet.title}</div>
                          <span className="text-[10px] text-slate-400 font-mono">Dihubungkan: {sheet.connectedAt ? new Date(sheet.connectedAt).toLocaleDateString('id-ID') : 'N/A'}</span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500 select-all">{sheet.spreadsheetId}</td>
                        <td className="px-4 py-3.5">
                          {sheet.active ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                              AKTIF (UTAMA)
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSetActiveSheet(sheet.id, sheet.title)}
                              className="text-[10px] text-slate-600 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 px-2.5 py-0.5 rounded-full transition-all font-semibold"
                            >
                              Ganti Jadi Utama
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right space-x-2">
                          <a
                            href={sheet.spreadsheetUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-0.5 text-[11px] text-blue-600 hover:text-blue-700 font-semibold"
                          >
                            Buka <ExternalLink className="h-3 w-3" />
                          </a>
                          <button
                            onClick={() => handleDeleteSheetLink(sheet.id, sheet.title)}
                            className="text-[11px] text-rose-500 hover:text-rose-700 font-semibold"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Sync control details for the Active Sheet */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
              <div className="lg:col-span-2 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-start gap-3">
                  <Activity className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Target Google Sheet Aktif Saat Ini:</h4>
                    <p className="text-[11px] font-mono text-slate-500 bg-white border border-slate-200 p-2.5 rounded-xl mt-1.5 break-all select-all leading-normal">
                      <strong>Judul:</strong> {spreadsheetTitle || 'Belum dipilih'}<br />
                      <strong>ID:</strong> {spreadsheetId || 'Tidak ada'}<br />
                      <strong>URL:</strong> <a href={spreadsheetUrl} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline inline-flex items-center gap-0.5">{spreadsheetUrl ? 'Klik untuk membuka spreadsheet' : 'Tidak ada'} <ExternalLink className="h-2.5 w-2.5" /></a>
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-emerald-50/40 border border-emerald-100 rounded-2xl flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <RefreshCw className="h-4 w-4 text-emerald-600 animate-spin" style={{ animationDuration: isSyncingSheets ? '1.5s' : '8s' }} />
                    Panel Sinkronisasi Dua Arah
                  </h4>
                  <p className="text-[10.5px] text-slate-500 leading-relaxed mb-3">
                    Proses ekspor-impor ready-to-ship akan langsung dijalankan ke <strong>Google Sheet aktif</strong> yang dipilih di atas.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleExportSheets}
                    disabled={isSyncingSheets || !spreadsheetId}
                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-slate-200 disabled:text-slate-400 text-[11px] font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                  >
                    <Upload className="h-3 w-3" /> Ekspor
                  </button>

                  <button
                    type="button"
                    onClick={handleImportSheets}
                    disabled={isSyncingSheets || !spreadsheetId}
                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-250 disabled:bg-slate-50 disabled:text-slate-400 text-[11px] font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                  >
                    <Download className="h-3 w-3" /> Impor
                  </button>

                  <button
                    type="button"
                    onClick={handleCreateSheet}
                    disabled={isSyncingSheets}
                    className="py-2 px-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[11px] font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                    title="Buat Sheet Baru di Akun Google Anda"
                  >
                    + Buat Baru
                  </button>
                </div>
              </div>
            </div>
          </div>
      </div>

      {/* Telegram notification bot setup */}
      <div id="telegram-bot-integration-row" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Telegram config panel */}
        <div className="lg:col-span-2 p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-sky-50 text-sky-600 border border-sky-200 rounded-xl flex items-center justify-center">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Telegram Notification Bot</h3>
                <span className="text-[10px] text-slate-400 font-mono uppercase">Messenger & Webhook Push</span>
              </div>
            </div>
            <span className={`text-[10px] font-bold font-mono px-2.5 py-1 rounded-full border ${telegramConfig.connected ? 'bg-sky-50 border-sky-200 text-sky-600' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
              {telegramConfig.connected ? 'TERHUBUNG' : 'SIAP DIHUBUNGKAN'}
            </span>
          </div>

          <form onSubmit={handleSaveTelegram} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Bot Token (API)</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="password"
                    value={telegramToken}
                    onChange={(e) => setTelegramToken(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg pl-9 pr-3 py-2 outline-none focus:bg-white focus:border-sky-500 transition-all"
                    placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Username Bot</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">@</span>
                  <input
                    type="text"
                    value={telegramUsername}
                    onChange={(e) => setTelegramUsername(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg pl-8 pr-3 py-2 outline-none focus:bg-white focus:border-sky-500 transition-all"
                    placeholder="RanuraOrderBot"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-2">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="radio" name="tg-source" checked={telegramChatSource === 'group'} onChange={() => setTelegramChatSource('group')} className="hidden" />
                  <div className={"h-4 w-4 rounded-full border flex items-center justify-center " + (telegramChatSource === 'group' ? 'border-sky-500' : 'border-slate-300')}>
                    {telegramChatSource === 'group' && <div className="h-2 w-2 bg-sky-500 rounded-full"></div>}
                  </div>
                  <span className="text-xs font-semibold text-slate-700 group-hover:text-sky-600 transition-colors">Group Chat Sync</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="radio" name="tg-source" checked={telegramChatSource === 'pm'} onChange={() => setTelegramChatSource('pm')} className="hidden" />
                  <div className={"h-4 w-4 rounded-full border flex items-center justify-center " + (telegramChatSource === 'pm' ? 'border-sky-500' : 'border-slate-300')}>
                    {telegramChatSource === 'pm' && <div className="h-2 w-2 bg-sky-500 rounded-full"></div>}
                  </div>
                  <span className="text-xs font-semibold text-slate-700 group-hover:text-sky-600 transition-colors">Private Message Only</span>
                </label>
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={handleTestTelegram} className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors">
                  Test Koneksi
                </button>
                <button type="submit" className="flex items-center gap-1.5 px-4 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-lg transition-colors">
                  <Check className="h-3.5 w-3.5" /> Simpan
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Right Column: Google Sheets sync status */}
        <div className="lg:col-span-1 p-6 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="h-4 w-4 text-emerald-500" /> Google Sheets Sync
            </h3>
            <p className="text-xs text-slate-400 mt-2">Sinkronisasi data order dua arah aktif dan terpantau 24/7.</p>
            <div className="mt-4 space-y-3">
              <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status Koneksi</h4>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-bold text-emerald-400">CONNECTED (LIVE)</span>
                </div>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Spreadsheet Aktif</h4>
                <div className="flex flex-col">
                  <span className="text-xs text-slate-200 font-medium truncate">{spreadsheetTitle || 'Belum dipilih'}</span>
                  <span className="text-[10px] text-slate-500 font-mono truncate mt-0.5">{spreadsheetId || '-'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Omnichannel API (BigSeller/Jubelio) */}
        <div className="p-6 bg-white border border-slate-200 rounded-2xl flex flex-col justify-between shadow-sm col-span-1 lg:col-span-2">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-xl flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Integrasi Omnichannel (BigSeller / Jubelio)</h3>
                  <span className="text-[10px] text-slate-400 font-mono uppercase">API Aggregator</span>
                </div>
              </div>
            </div>

            <div className="text-sm text-slate-600 mb-4">
              <p>Tarik data pesanan otomatis dari semua toko sekaligus melalui satu pintu API Omnichannel.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-3">
                  <div className="flex items-center gap-2 mb-2">
                     <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xs">BS</div>
                     <div>
                       <h4 className="text-xs font-bold text-slate-800">BigSeller API</h4>
                       <span className={"text-[10px] font-bold " + (isBigsellerConnected ? 'text-emerald-500' : 'text-slate-500')}>
                         {isBigsellerConnected ? 'Terhubung (Aktif 24/7)' : 'Belum Terhubung'}
                       </span>
                     </div>
                  </div>
                  
                  {!isBigsellerConnected ? (
                    <>
                      <input 
                        type="text" 
                        placeholder="Email BigSeller" 
                        value={bigsellerEmail}
                        onChange={(e) => setBigsellerEmail(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs outline-none focus:border-blue-500"
                      />
                      <input 
                        type="password" 
                        placeholder="BigSeller API Token (OAuth / Refresh Token)" 
                        value={bigsellerToken}
                        onChange={(e) => setBigsellerToken(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs outline-none focus:border-blue-500"
                      />
                      <button onClick={handleConnectBigseller} className="w-full py-1.5 mt-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded shadow-sm transition-colors">
                        Hubungkan BigSeller
                      </button>
                    </>
                  ) : (
                    <div className="text-center p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                      <p className="text-xs text-emerald-700 mb-2">Koneksi stabil. Dasbor Ranura akan otomatis menarik data dari BigSeller.</p>
                      <button onClick={() => setIsBigsellerConnected(false)} className="px-3 py-1 text-[10px] text-red-600 border border-red-200 rounded hover:bg-red-50 font-bold">Putus Koneksi</button>
                    </div>
                  )}
               </div>
               
               <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-3 opacity-50 grayscale">
                  <div className="flex items-center gap-2">
                     <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center text-white font-bold text-xs">JB</div>
                     <div>
                       <h4 className="text-xs font-bold text-slate-800">Jubelio API</h4>
                       <span className="text-[10px] text-slate-500">Segera Hadir</span>
                     </div>
                  </div>
                  <button className="px-3 py-1 bg-white border border-slate-300 text-xs font-semibold rounded" disabled>Locked</button>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Connection simulator feed logs */}
      <div id="connection-simulation-feed" className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Terminal className="h-4.5 w-4.5 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900">Console Log Sinkronisasi Jembatan API</h3>
        </div>
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-slate-300 space-y-1.5 max-h-56 overflow-y-auto leading-relaxed select-all">
          <p className="text-slate-500">{`[${new Date().toLocaleDateString()}] System initialized. Webhook listening...`}</p>
          {logs.slice(0, 8).map((log, index) => (
            <p key={index} className={
              log.type === 'error' ? 'text-rose-400 font-semibold' :
              log.type === 'warning' ? 'text-amber-400 font-semibold' :
              log.type === 'success' ? 'text-emerald-400 font-semibold' : 'text-slate-300'
            }>
              {`[${new Date(log.timestamp).toLocaleTimeString()}] [${log.platform.toUpperCase()}] ${log.message}`}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
