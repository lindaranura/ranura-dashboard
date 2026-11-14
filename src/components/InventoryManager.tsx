import React, { useState, useMemo } from 'react';
import { 
  Printer,
  ScanBarcode,
  Package, 
  Layers, 
  Cpu, 
  Activity, 
  Wrench, 
  TrendingUp, 
  AlertTriangle,
  Plus, 
  Minus,
  Settings,
  RefreshCw,
  Gauge,
  Info,
  FileSpreadsheet,
  ExternalLink,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Check,
  Download
} from 'lucide-react';
import Barcode from 'react-barcode';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { ProductionItem, WarehouseZone } from '../types';
import { INITIAL_WAREHOUSE_ZONES } from '../data/mockData';
import { generateHistoricalMovements, StockMovement } from '../data/stockMovementGenerator';
import { exportMovementsToSheets, getCachedToken } from '../lib/sheetsService';

interface InventoryProps {
  inventory: ProductionItem[];
  shopeeAccounts?: any[];
  tiktokAccounts?: any[];
  googleSheets?: any[];
  onUpdateStock: (id: string, newStock: number, nextStockIn?: number, nextStockOut?: number, nextInitialStock?: number) => void;
  onAddLog: (platform: string, type: 'info' | 'success' | 'warning' | 'error', message: string) => void;
  onReplaceInventory?: (items: ProductionItem[]) => void;
}

export default function InventoryManager({ 
  inventory, 
  shopeeAccounts = [], 
  tiktokAccounts = [], 
  googleSheets = [], 
  onUpdateStock, 
  onAddLog,
  onReplaceInventory
}: InventoryProps) {
  const spreadsheetId = localStorage.getItem('apex_sheets_spreadsheet_id');
  const spreadsheetUrl = localStorage.getItem('apex_sheets_spreadsheet_url');
  const spreadsheetTitle = localStorage.getItem('apex_sheets_spreadsheet_title') || 'Ranura Berkah Abadi - Sinkronisasi Stok';

  // Date Filter & Log States
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  });
  const [selectedPeriod, setSelectedPeriod] = useState<'perhari' | 'perminggu' | 'perbulan'>('perhari');
  const [selectedSku, setSelectedSku] = useState<string>('all');
  const [isExportingLogs, setIsExportingLogs] = useState<boolean>(false);
  const [logsExportFeedback, setLogsExportFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ title?: string, message: string, type: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  const [isSyncingFromSheet, setIsSyncingFromSheet] = useState(false);

  const handleSyncFromGoogleSheet = async () => {
    setIsSyncingFromSheet(true);
    setToastMessage({ type: 'info', title: 'Menarik Data...', message: 'Sedang mensinkronkan data inventaris dari seluruh Google Sheet terhubung...' });
    try {
      const sheetsToSync = googleSheets && googleSheets.length > 0 
        ? googleSheets 
        : [{ spreadsheetId: spreadsheetId || '1u8oVPIyH7oh4rEpkXQGAHmOOQka01vWILVM8eOSAtD8' }];
      
      let allData: any[] = [];
      let successCount = 0;

      for (const sheet of sheetsToSync) {
        if (!sheet.spreadsheetId) continue;
        try {
          const res = await fetch('/api/inventory/sheet?id=' + sheet.spreadsheetId + '&t=' + Date.now());
          if (res.ok) {
            const data = await res.json();
            if (data && data.length > 0) {
              allData = [...allData, ...data];
              successCount++;
            }
          }
        } catch (e) {
          console.warn('Gagal menarik dari sheet:', sheet.spreadsheetId, e);
        }
      }
      
      if (allData.length > 0 && onReplaceInventory) {
        onReplaceInventory(allData);
        localStorage.setItem('apex_inventory', JSON.stringify(allData));
        setToastMessage({ type: 'success', title: 'Sinkronisasi Sukses', message: `Berhasil menarik ${allData.length} SKU dari ${successCount} Google Sheet.` });
        onAddLog('system', 'success', `Inventaris diperbarui secara live dari ${successCount} Google Sheet (${allData.length} barang).`);
      } else {
        throw new Error('Data sheet kosong dari seluruh sumber.');
      }
    } catch (err: any) {
      setToastMessage({ type: 'error', title: 'Gagal Sinkronisasi', message: err.message });
      onAddLog('system', 'error', `Gagal menarik data dari Sheet: ${err.message}`);
    } finally {
      setIsSyncingFromSheet(false);
    }
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  // Custom stock movements recorded via local form
  const [customMovements, setCustomMovements] = useState<StockMovement[]>(() => {
    const saved = localStorage.getItem('apex_custom_movements');
    return saved ? JSON.parse(saved) : [];
  });

  // State for Stock Transaction Form
  const [selectedItem, setSelectedItem] = useState<string>(inventory[0]?.id || '');
  const [scanInput, setScanInput] = useState<string>('');
  const [printBarcodeSku, setPrintBarcodeSku] = useState<string | null>(null);
  const [transactionType, setTransactionType] = useState<'in' | 'out' | 'initial'>('in');
  const [transactionQty, setTransactionQty] = useState<number>(0);
  const [keterangan, setKeterangan] = useState<string>('Produksi');
  const [platform, setPlatform] = useState<string>('BERIRRA');
  const [catatan, setCatatan] = useState<string>('');
  const [reference, setReference] = useState<string>(''); // Kept for historical type
  const [operator, setOperator] = useState<string>('Fachrie (Gudang)');

  // Load/Generate historical movements once
  const historicalMovements = useMemo(() => {
    return generateHistoricalMovements(inventory);
  }, [inventory]);

  // Merge custom and historical movements
  const allMovements = useMemo(() => {
    return [...customMovements, ...historicalMovements];
  }, [customMovements, historicalMovements]);

  // Generate last 24 months options
  const monthOptions = useMemo(() => {
    const opts = [];
    const d = new Date();
    for (let i = 0; i < 24; i++) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      opts.push(`${y}-${m}`);
      d.setMonth(d.getMonth() - 1);
    }
    return opts;
  }, []);

  // Filter movements
  const filteredMovements = useMemo(() => {
    const filtered = allMovements.filter(m => {
      const matchesSku = selectedSku === 'all' || m.sku === selectedSku;
      const matchesMonth = m.date.startsWith(selectedMonth);
      return matchesSku && matchesMonth;
    });
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allMovements, selectedSku, selectedMonth]);

  // KPI calculations for filtered set
  const totalStockInFiltered = useMemo(() => {
    return filteredMovements.filter(m => m.type === 'in').reduce((sum, m) => sum + m.qty, 0);
  }, [filteredMovements]);

  const totalValueInFiltered = useMemo(() => {
    return filteredMovements.filter(m => m.type === 'in').reduce((sum, m) => {
      const item = inventory.find(i => i.sku === m.sku);
      return sum + (m.qty * (item?.buyPrice || 0));
    }, 0);
  }, [filteredMovements, inventory]);

  const totalStockOutFiltered = useMemo(() => {
    return filteredMovements.filter(m => m.type === 'out').reduce((sum, m) => sum + m.qty, 0);
  }, [filteredMovements]);

  const totalValueOutFiltered = useMemo(() => {
    return filteredMovements.filter(m => m.type === 'out').reduce((sum, m) => {
      const item = inventory.find(i => i.sku === m.sku);
      return sum + (m.qty * (item?.sellPrice || 0));
    }, 0);
  }, [filteredMovements, inventory]);

  // Weekly summary
  const weeklyTrends = useMemo(() => {
    const weeks = Array(4).fill(0).map(() => ({ stockIn: 0, stockOut: 0 }));
    filteredMovements.forEach(m => {
      const day = parseInt(m.date.split('-')[2], 10);
      let weekIdx = 0;
      if (day > 7 && day <= 14) weekIdx = 1;
      else if (day > 14 && day <= 21) weekIdx = 2;
      else if (day > 21) weekIdx = 3;
      
      if (m.type === 'in') {
        weeks[weekIdx].stockIn += m.qty;
      } else {
        weeks[weekIdx].stockOut += m.qty;
      }
    });
    return weeks;
  }, [filteredMovements]);

  // Monthly summary

  const handleExportLogToSheets = async () => {
    setIsExportingLogs(true);
    try {
      const spreadsheetId = googleSheets && googleSheets.length > 0 ? googleSheets[0].spreadsheetId : null;
      if (!spreadsheetId) throw new Error("Belum ada Google Sheet yang terhubung.");
      
      const token = getCachedToken();
      if (!token) throw new Error("Akses token tidak ditemukan.");

      onAddLog('system', 'info', `Memulai ekspor ${filteredMovements.length} baris log mutasi stok ke Google Sheets...`);
      await exportMovementsToSheets(spreadsheetId, token, filteredMovements);
      
      setToastMessage({ type: 'success', title: 'Ekspor Mutasi Sukses', message: `Sukses mengekspor ${filteredMovements.length} log mutasi ke tab "Log Mutasi Stok" Google Sheet!` });
      onAddLog('system', 'success', `Ekspor Log Mutasi Sukses: ${filteredMovements.length} baris mutasi disinkronkan ke Google Sheet.`);
    } catch (err: any) {
      console.error(err);
      setToastMessage({ type: 'error', title: 'Ekspor Gagal', message: err.message });
    } finally {
      setIsExportingLogs(false);
    }
  };

  const weeklySummary = useMemo(() => {
    const summary = [
      { name: 'Minggu 1', stockIn: 0, stockOut: 0 },
      { name: 'Minggu 2', stockIn: 0, stockOut: 0 },
      { name: 'Minggu 3', stockIn: 0, stockOut: 0 },
      { name: 'Minggu 4', stockIn: 0, stockOut: 0 }
    ];
    filteredMovements.forEach(m => {
      const date = new Date(m.date);
      const weekIndex = Math.min(Math.floor((date.getDate() - 1) / 7), 3);
      if (m.type === 'in') summary[weekIndex].stockIn += m.qty;
      if (m.type === 'out') summary[weekIndex].stockOut += m.qty;
    });
    return summary;
  }, [filteredMovements]);

  const monthlySummary = useMemo(() => {
    let stockIn = 0;
    let stockOut = 0;
    filteredMovements.forEach(m => {
      if (m.type === 'in') stockIn += m.qty;
      else stockOut += m.qty;
    });
    return { stockIn, stockOut };
  }, [filteredMovements]);

  const handleExportLogsCSV = () => {
    const headers = 'ID Mutasi,Tanggal,Tipe,SKU,Nama Produk,Qty,Referensi,Operator\n';
    const rows = filteredMovements.map(m => `${m.id},${m.date},${m.type === 'in' ? 'Masuk' : m.type === 'initial' ? 'Stok Awal' : 'Keluar'},${m.sku},"${m.productName}",${m.qty},"${m.reference}","${m.operator}"`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `log_mutasi_stok_${selectedMonth}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onAddLog('system', 'success', `Log mutasi stok bulan ${selectedMonth} berhasil diekspor ke CSV.`);
  };

  const handleExportLogsToSheets = async () => {
    try {
      const token = getCachedToken();
      if (!token) throw new Error("Google Token tidak ditemukan. Harap putuskan lalu hubungkan ulang Google API di Pengaturan.");
      if (!spreadsheetId) throw new Error("ID Google Sheet tidak ditemukan. Harap masukkan di pengaturan Integrasi.");
      if (filteredMovements.length === 0) throw new Error("Tidak ada log mutasi pada periode yang dipilih untuk diekspor.");

      setIsExportingLogs(true);
      onAddLog('system', 'info', `Memulai ekspor ${filteredMovements.length} baris log mutasi stok ke Google Sheets...`);
      await exportMovementsToSheets(token, spreadsheetId, filteredMovements);
      onAddLog('system', 'success', `Ekspor Log Mutasi Sukses: ${filteredMovements.length} baris mutasi disinkronkan ke Google Sheet.`);
      
      setLogsExportFeedback({
        type: 'success',
        message: `Sukses mengekspor ${filteredMovements.length} log mutasi ke tab "Log Mutasi Stok" Google Sheet!`
      });
      setTimeout(() => setLogsExportFeedback(null), 5000);
    } catch (err: any) {
      onAddLog('system', 'error', `Gagal ekspor log ke Google Sheets: ${err.message}`);
      setLogsExportFeedback({
        type: 'error',
        message: err.message
      });
      setTimeout(() => setLogsExportFeedback(null), 5000);
    } finally {
      setIsExportingLogs(false);
    }
  };

  // Local state for production batch add
  const [selectedItemForProd, setSelectedItemForProd] = useState<string>(inventory[0]?.id || '');
  const [productionQty, setProductionQty] = useState<number>(0);
  const [isAssembling, setIsAssembling] = useState(false);

  // Sync selected items when inventory loads
  React.useEffect(() => {
    if (inventory.length > 0) {
      if (!selectedItem) setSelectedItem(inventory[0].id);
      if (!selectedItemForProd) setSelectedItemForProd(inventory[0].id);
    }
  }, [inventory, selectedItem, selectedItemForProd]);

  // Quick adjust stock
  const handleQuickAdjust = (id: string, currentStock: number, delta: number) => {
    const nextStock = Math.max(0, currentStock + delta);
    onUpdateStock(id, nextStock);
    const item = inventory.find(i => i.id === id);
    if (item) {
      onAddLog('system', delta > 0 ? 'success' : 'warning', `Manual Stock Adjust: ${item.name} (${item.sku}) ${delta > 0 ? '+' : ''}${delta} ${item.unit}. Stok baru: ${nextStock}`);
    }
  };

  // Simulate production assembly line run
  const handleRunProduction = (e: React.FormEvent) => {
    e.preventDefault();
    const item = inventory.find(i => i.id === selectedItemForProd);
    if (!item) return;

    setIsAssembling(true);
    onAddLog('system', 'info', `Memulai Jalur Produksi Utama untuk ${item.name} (+${productionQty} ${item.unit}). Mempersiapkan bahan baku...`);

      setTimeout(() => {
        const nextStock = item.stock + productionQty;
        const nextStockIn = (item.stockIn || 0) + productionQty;
        onUpdateStock(selectedItemForProd, nextStock, nextStockIn, item.stockOut, item.initialStock);

        const finalSheetId = item.sourceSheetId || spreadsheetId || '1u8oVPIyH7oh4rEpkXQGAHmOOQka01vWILVM8eOSAtD8';
        if (finalSheetId) {
          fetch('http://localhost:3000/api/inventory/update-stock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'in',
              sheetId: finalSheetId,
              sku: item.sku,
              name: item.name,
              qty: productionQty,
              keterangan: 'PRODUKSI',
              platform: '',
              catatan: '',
              date: new Date().toISOString().split('T')[0]
            })
          }).catch(err => console.error('Gagal sync mutasi ke Google Sheets:', err));
        }

        const newMovement: StockMovement = {
        id: `mvt-prod-${Date.now()}`,
        itemId: selectedItemForProd,
        productName: item.name,
        sku: item.sku,
        date: new Date().toISOString().split('T')[0],
        type: 'in',
        qty: productionQty,
        reference: `Produksi Batch Jalur Utama`,
        operator: 'Hendra (QC & Finishing)',
        balanceAfter: nextStock
      };
      
      setCustomMovements(prev => {
        const nextCustom = [newMovement, ...prev];
        localStorage.setItem('apex_custom_movements', JSON.stringify(nextCustom));
        return nextCustom;
      });

      onAddLog('system', 'success', `Produksi Batch selesai! ${productionQty} ${item.unit} ${item.name} telah diuji QC dan masuk ke Gudang Utama.`);
      setIsAssembling(false);
      setToastMessage({ type: 'success', title: 'Jalur Produksi Sukses', message: `Telah diproduksi: ${productionQty} ${item.unit} dari ${item.name}. Stok diperbarui.` });
    }, 2500);
  };


  const handleScanBarcode = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const skuToFind = e.currentTarget.value.trim().toLowerCase();
      if (!skuToFind) return;
      
      const foundItem = inventory.find(i => (i.sku || '').toLowerCase() === skuToFind || (i.id || '').toLowerCase() === skuToFind);
      if (foundItem) {
        setSelectedItem(foundItem.id);
        setScanInput('');
        setToastMessage({ type: 'success', title: 'Barcode Ditemukan', message: `Produk terpilih: ${foundItem.name}` });
        
        // Optional: Focus the quantity field automatically
        const qtyInput = document.getElementById('tx-qty-input');
        if (qtyInput) qtyInput.focus();
      } else {
        setToastMessage({ type: 'error', title: 'Barcode Tidak Dikenali', message: `SKU "${e.currentTarget.value}" tidak ada di inventaris.` });
      }
    }
  };
  


  // Handle Stock Transaction (Barang Masuk / Barang Keluar / Atur Stok Awal)
  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const item = inventory.find(i => i.id === selectedItem);
    if (!item) return;

    if (transactionType === 'initial') {
      const nextStock = transactionQty + (item.stockIn ?? 0) - (item.stockOut ?? 0);
      onUpdateStock(selectedItem, nextStock, item.stockIn, item.stockOut, transactionQty);
      
      const newMovement: StockMovement = {
        id: `mvt-custom-${Date.now()}`,
        itemId: selectedItem,
        productName: item.name,
        sku: item.sku,
        date: new Date().toISOString().split('T')[0],
        type: 'initial',
        qty: transactionQty,
        reference: reference || 'Penyesuaian Stok Awal',
        operator: operator || 'Gudang',
        balanceAfter: nextStock
      };
      const nextCustom = [newMovement, ...customMovements];
      setCustomMovements(nextCustom);
      localStorage.setItem('apex_custom_movements', JSON.stringify(nextCustom));

      onAddLog('system', 'success', `Update Stok Awal: ${item.name} (${item.sku}) diset ke ${transactionQty}. Stok Fisik disesuaikan ke ${nextStock}`);
      setToastMessage({ type: 'success', title: 'Stok Awal Diperbarui', message: `${item.name} memiliki Stok Awal: ${transactionQty}. Stok Fisik: ${nextStock}` });
    } else {
      let nextStock = item.stock;
      let nextStockIn = item.stockIn ?? 0;
      let nextStockOut = item.stockOut ?? 0;

      if (transactionType === 'in') {
        nextStock = item.stock + transactionQty;
        nextStockIn += transactionQty;
      } else {
        if (item.stock < transactionQty) {
          setToastMessage({ type: 'error', title: 'Stok Kurang', message: `Tidak dapat mengeluarkan ${transactionQty} pcs. Sisa stok hanya ${item.stock} pcs.` });
          return;
        }
        nextStock = item.stock - transactionQty;
        nextStockOut += transactionQty;
      }

      onUpdateStock(selectedItem, nextStock, nextStockIn, nextStockOut, item.initialStock);

      const finalSheetId = item.sourceSheetId || spreadsheetId || '1u8oVPIyH7oh4rEpkXQGAHmOOQka01vWILVM8eOSAtD8';
      if (finalSheetId) {
        fetch('http://localhost:3000/api/inventory/update-stock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: transactionType,
            sheetId: finalSheetId,
            sku: item.sku,
            name: item.name,
            qty: transactionQty,
            keterangan: transactionType === 'in' ? keterangan : catatan,
            platform: (transactionType === 'out' || keterangan === 'RETUR') ? platform : '',
            catatan: transactionType === 'in' ? catatan : '',
            date: new Date().toISOString().split('T')[0]
          })
        }).catch(err => console.error('Gagal sync mutasi ke Google Sheets:', err));
      }

      const newMovement: StockMovement = {
        id: `mvt-custom-${Date.now()}`,
        itemId: selectedItem,
        productName: item.name,
        sku: item.sku,
        date: new Date().toISOString().split('T')[0],
        type: transactionType === 'in' ? 'in' : 'out',
        qty: transactionQty,
        reference: reference || (transactionType === 'in' ? 'Barang Masuk Manual' : 'Barang Keluar Manual'),
        operator: operator || 'Gudang',
        balanceAfter: nextStock
      };
      const nextCustom = [newMovement, ...customMovements];
      setCustomMovements(nextCustom);
      localStorage.setItem('apex_custom_movements', JSON.stringify(nextCustom));

      onAddLog('system', transactionType === 'in' ? 'success' : 'warning', `Transaksi Stok Manual (${transactionType === 'in' ? 'Masuk' : 'Keluar'}): ${item.name} ${transactionType === 'in' ? '+' : '-'}${transactionQty} ${item.unit}. Stok Baru: ${nextStock}`);
      setToastMessage({ type: 'success', title: 'Transaksi Berhasil', message: `${item.name} mutasi ${transactionType === 'in' ? 'Masuk (+)' : 'Keluar (-)'} ${transactionQty}. Stok baru: ${nextStock}` });
    }

    // Reset qty and reference
    setTransactionQty(0);
    setPlatform('BERIRRA');
    setCatatan('');
  };

  const handleExportInventoryCSV = () => {
    const headers = ['ID', 'Nama Produk', 'SKU', 'Kategori', 'Stok Awal', 'Stok Fisik', 'Stok Masuk', 'Stok Keluar', 'Status', 'Satuan'];
    const rows = inventory.map(item => {
      const stockIn = item.stockIn ?? (item.stock + item.reserved);
      const stockOut = item.stockOut ?? item.reserved;
      const initialStock = item.initialStock ?? (item.stock - stockIn + stockOut);
      return [
        `"${item.id}"`,
        `"${item.name.replace(/"/g, '""')}"`,
        `"${item.sku}"`,
        `"${item.category}"`,
        initialStock,
        item.stock,
        stockIn,
        stockOut,
        `"${item.status}"`,
        `"${item.unit}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ranura-inventaris-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Berhasil mengekspor data inventaris ke format CSV!');
  };

  return (
    <div id="inventory-viewport" className="p-8 space-y-8 overflow-y-auto h-full flex-1 bg-[#f8fafc] text-slate-800 relative">
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-lg border max-w-sm flex gap-3
              ${toastMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 
                toastMessage.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : 
                'bg-blue-50 border-blue-200 text-blue-800'}`}
          >
            {toastMessage.type === 'success' ? <Check className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600" /> : <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-rose-600" />}
            <div>
              {toastMessage.title && <h4 className="font-bold text-sm">{toastMessage.title}</h4>}
              <p className="text-xs opacity-90 mt-1">{toastMessage.message}</p>
            </div>
            <button onClick={() => setToastMessage(null)} className="absolute top-2 right-2 text-slate-400 hover:text-slate-600">×</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div id="inventory-header" className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <span className="text-blue-600 font-mono text-xs font-semibold tracking-widest uppercase">Pemantauan Alur Fisik</span>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mt-1">Stok & Gudang Produksi</h1>
          <p className="text-slate-500 text-sm mt-1">
            Pantau status barang jadi (ready-to-ship), kapasitas tereservasi dari Shopee/TikTok, serta jadwalkan batch produksi jahit baru.
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-end md:items-center gap-3 shrink-0">
          <button
            onClick={handleSyncFromGoogleSheet}
            disabled={isSyncingFromSheet}
            className="flex items-center gap-2 px-4 py-3 md:py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-2xl md:rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-70"
          >
            {isSyncingFromSheet ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Tarik Data (Google Sheet)
          </button>

          {spreadsheetId && (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl p-3.5 shadow-sm">
              <div className="p-2 bg-emerald-600 text-white rounded-lg shrink-0">
                <FileSpreadsheet className="h-4 w-4" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-emerald-800 font-mono uppercase tracking-wider">Sheets Sync Aktif</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                </div>
                <a 
                  href={spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline"
                >
                  Buka Master File
                  <ArrowUpRight className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Assembly line quick info panels */}
      <div id="production-gauge-panels" className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Gauge 1 */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl">
            <Gauge className="h-5 w-5 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <div>
            <span className="text-slate-400 text-[10px] font-mono uppercase">Kapasitas Produksi Jahit</span>
            <p className="text-lg font-bold text-slate-800 font-mono mt-0.5">88.4% <span className="text-xs text-slate-500 font-sans font-normal">beban kerja</span></p>
          </div>
        </div>

        {/* Gauge 2 */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-100 rounded-xl">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <span className="text-slate-400 text-[10px] font-mono uppercase">Ready-To-Ship SKU</span>
            <p className="text-lg font-bold text-slate-800 font-mono mt-0.5">6 Aktif <span className="text-xs text-slate-500 font-sans font-normal">tipe barang</span></p>
          </div>
        </div>

        {/* Gauge 3 */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <span className="text-slate-400 text-[10px] font-mono uppercase">QC Pass Rate</span>
            <p className="text-lg font-bold text-slate-800 font-mono mt-0.5">99.2% <span className="text-xs text-slate-500 font-sans font-normal">standar mutu</span></p>
          </div>
        </div>
      </div>

      {/* Connected Channel Synchronizer Indicator */}
      <div id="inventory-channels-sync-status" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div>
            <h3 className="text-xs font-bold text-slate-850 uppercase tracking-wider flex items-center gap-1.5">
              <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" style={{ animationDuration: '10s' }} />
              Sinkronisasi Stok Saluran Aktif (Auto-Sync)
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Stok gudang fisik disinkronkan otomatis ke multi-akun Shopee & TikTok secara real-time</p>
          </div>
          <span className="text-[10px] font-mono bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-0.5 rounded-full font-bold">
            {shopeeAccounts.filter(a => a.connected).length + tiktokAccounts.filter(a => a.connected).length} Toko Terkoneksi
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Shopee stores */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase">Shopee Seller Accounts</span>
            {shopeeAccounts.filter(a => a.connected).length > 0 ? (
              shopeeAccounts.filter(a => a.connected).map(acc => (
                <div key={acc.id} className="flex items-center justify-between p-2.5 bg-orange-50/40 border border-orange-100 rounded-xl">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-850 truncate">{acc.shopName}</p>
                    <p className="text-[10px] text-slate-450 truncate">{acc.email}</p>
                  </div>
                  <span className="text-[9px] font-mono font-bold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                    <span className="h-1 w-1 bg-orange-600 rounded-full animate-ping"></span>
                    SYNCED
                  </span>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-slate-400 italic">Belum ada akun Shopee terhubung</p>
            )}
          </div>

          {/* TikTok stores */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase">TikTok Shop Accounts</span>
            {tiktokAccounts.filter(a => a.connected).length > 0 ? (
              tiktokAccounts.filter(a => a.connected).map(acc => (
                <div key={acc.id} className="flex items-center justify-between p-2.5 bg-fuchsia-50/40 border border-fuchsia-100 rounded-xl">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-850 truncate">{acc.shopName}</p>
                    <p className="text-[10px] text-slate-450 truncate">{acc.email}</p>
                  </div>
                  <span className="text-[9px] font-mono font-bold bg-fuchsia-100 text-fuchsia-700 px-1.5 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                    <span className="h-1 w-1 bg-fuchsia-600 rounded-full animate-ping"></span>
                    SYNCED
                  </span>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-slate-400 italic">Belum ada akun TikTok terhubung</p>
            )}
          </div>

          {/* Google Sheets */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase">Google Sheets Link</span>
            {googleSheets.length > 0 ? (
              <div className="flex flex-col gap-2 max-h-32 overflow-y-auto pr-1">
              {googleSheets.map(sheet => (
                <div key={sheet.id} className={`flex items-center justify-between p-2.5 ${sheet.active ? 'bg-emerald-50/40 border-emerald-100' : 'bg-slate-50 border-slate-200'} border rounded-xl`}>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-850 truncate">{sheet.title}</p>
                    <p className="text-[10px] text-slate-450 truncate font-mono">{sheet.spreadsheetId.slice(0, 12)}...</p>
                  </div>
                  {sheet.active && (
                  <span className="text-[9px] font-mono font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                    <span className="h-1 w-1 bg-emerald-600 rounded-full animate-ping"></span>
                    ACTIVE
                  </span>
                  )}
                </div>
              ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">Belum ada sheet terhubung</p>
            )}
          </div>
        </div>
      </div>

      {/* Warehouse Zones Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          {
            id: 'z-A',
            name: 'Zona A: Produk Jadi',
            description: 'Pakaian Apung & Perlengkapan Ibadah siap kirim',
            currentLoad: inventory.filter(i => i.category === 'Pakaian Apung' || i.category === 'Perlengkapan Ibadah').reduce((acc, curr) => acc + curr.stock, 0),
            capacity: 1000
          },
          {
            id: 'z-B',
            name: 'Zona B: Bahan Baku',
            description: 'Kain, benang, dan material mentah',
            currentLoad: 320,
            capacity: 500
          },
          {
            id: 'z-C',
            name: 'Zona C: Aksesoris & Packaging',
            description: 'Aksesoris renang dan bahan kemasan',
            currentLoad: inventory.filter(i => i.category === 'Aksesoris Renang').reduce((acc, curr) => acc + curr.stock, 0),
            capacity: 800
          }
        ].map(zone => {
          const util = (zone.currentLoad / zone.capacity) * 100;
          let color = 'bg-emerald-500';
          if (util >= 70 && util <= 90) color = 'bg-amber-500';
          else if (util > 90) color = 'bg-rose-500';

          return (
            <div key={zone.id} className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm text-slate-800">{zone.name}</h4>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{zone.description}</p>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs font-mono font-medium text-slate-600 mb-1.5">
                  <span>{zone.currentLoad} / {zone.capacity} unit</span>
                  <span className={util > 90 ? 'text-rose-600 font-bold' : ''}>{Math.round(util)}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className={`h-full ${color} transition-all`} style={{ width: `${Math.min(util, 100)}%` }}></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div id="inventory-split-grid" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Table of stocks (2 columns) */}
        <div className="lg:col-span-2 p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Inventaris Barang Jadi</h3>
              <p className="text-xs text-slate-500">Master data unit fisik yang terintegrasi dengan marketplace</p>
            </div>
            <button
              type="button"
              id="btn-export-inventory-csv"
              onClick={handleExportInventoryCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-all cursor-pointer shadow-xs hover:border-slate-300"
            >
              <Download className="h-3.5 w-3.5 text-blue-600" />
              <span>Ekspor CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-mono text-[10px] tracking-wider uppercase">
                  <th className="py-3 px-4">Nama Produk / SKU</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4 text-center">Stok Awal</th>
                  <th className="py-3 px-4 text-center">Stok Masuk</th>
                  <th className="py-3 px-4 text-center">Stok Keluar</th>
                  <th className="py-3 px-4 text-center">Fisik (Gudang)</th>
                  <th className="py-3 px-4 text-right">Harga Beli</th>
                  <th className="py-3 px-4 text-right">Total Val. Stok</th>
                  <th className="py-3 px-4 text-right">Harga Jual</th>
                  <th className="py-3 px-4 text-right">Total Sales</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {inventory.map((item) => {
                  const stockIn = item.stockIn ?? (item.stock + item.reserved);
                  const stockOut = item.stockOut ?? item.reserved;
                  const initialStock = item.initialStock ?? (item.stock - stockIn + stockOut);
                  
                  // Status badge style
                  let statusLabel = 'Optimal';
                  let statusBadge = 'bg-emerald-50 text-emerald-600 border border-emerald-100';
                  
                  if (item.stock <= 15) {
                    statusLabel = 'Warning';
                    statusBadge = 'bg-amber-50 text-amber-650 border border-amber-100';
                  }
                  if (item.stock <= 5) {
                    statusLabel = 'Critical';
                    statusBadge = 'bg-rose-50 text-rose-600 border border-rose-100';
                  }

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4.5 px-4">
                        <div className="flex flex-col gap-1.5">
                          <span className="font-semibold text-slate-900 leading-relaxed">{item.name}</span>
                          <img 
                            src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(item.sku)}&scale=2&height=12&includetext=false`} 
                            alt={`Barcode ${item.sku}`} 
                            className="h-8 w-auto object-contain bg-white px-1 py-0.5 rounded shadow-sm border border-slate-100" 
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                          <span className="font-mono text-[10px] text-slate-500 break-all">{item.sku}</span>
                        </div>
                      </td>
                      <td className="py-4.5 px-4 text-slate-500">
                        {item.category}
                      </td>
                      <td className="py-4.5 px-4 text-center font-mono font-medium text-slate-500 bg-slate-50/50">
                        {initialStock} {item.unit}
                      </td>
                      <td className="py-4.5 px-4 text-center font-mono text-emerald-600 font-semibold">
                        {stockIn} {item.unit}
                      </td>
                      <td className="py-4.5 px-4 text-center font-mono font-bold text-rose-600">
                        {stockOut} {item.unit}
                      </td>
                      <td className="py-4.5 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-mono font-semibold text-slate-800">{item.stock} {item.unit}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${statusBadge}`}>
                            {statusLabel}
                          </span>
                        </div>
                      </td>
                      <td className="py-4.5 px-4 text-right font-mono text-slate-500">
                        Rp {(item.buyPrice || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="py-4.5 px-4 text-right font-mono text-slate-800 font-bold">
                        Rp {(item.stock * (item.buyPrice || 0)).toLocaleString('id-ID')}
                      </td>
                      <td className="py-4.5 px-4 text-right font-mono text-emerald-600">
                        Rp {(item.sellPrice || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="py-4.5 px-4 text-right font-mono font-bold text-emerald-700">
                        Rp {(stockOut * (item.sellPrice || 0)).toLocaleString('id-ID')}
                      </td>
                      <td className="py-4.5 px-4 text-center">
                        <button 
                          type="button"
                          onClick={() => setPrintBarcodeSku(item.sku || item.id)}
                          className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors inline-flex items-center justify-center"
                          title="Cetak Barcode"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {inventory.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-12 px-6 text-center text-slate-400 font-medium bg-slate-50/20">
                      <div className="flex flex-col items-center justify-center py-6">
                        <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3 border border-slate-200">
                          <Package className="h-6 w-6" />
                        </div>
                        <p className="text-slate-700 font-bold text-sm">Belum ada data stok & produksi terhubung</p>
                        <p className="text-xs text-slate-500 max-w-sm mt-1 leading-normal">
                          Silakan hubungkan saluran integrasi (Shopee / TikTok) pada menu <strong className="text-blue-600">Integrasi Saluran</strong> untuk memuat data master produk dan stok pabrik secara otomatis.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right sidebar column with transaction form and manufacturing scheduler */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Form Transaksi Stok (Barang Masuk / Keluar / Stok Awal) */}
          <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col">
            <div className="border-b border-slate-100 pb-4 mb-4">
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-1.5">
                <Layers className="h-4.5 w-4.5 text-blue-600" />
                Form Transaksi Stok
              </h3>
              <p className="text-xs text-slate-500">Input mutasi Barang Masuk, Barang Keluar, atau sesuaikan Stok Awal</p>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-4 text-xs">
              {/* Barcode Scanner Input */}
              <div className="mb-3 p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                <label className="block text-xs text-blue-700 font-semibold mb-1.5 flex items-center gap-1.5">
                  <ScanBarcode className="w-3.5 h-3.5" /> Scan Barcode (SKU)
                </label>
                <input
                  type="text"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  onKeyDown={handleScanBarcode}
                  placeholder="Fokuskan kursor kesini, lalu scan barcode..."
                  autoFocus
                  className="w-full bg-white border border-blue-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 text-slate-900 outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Product Selection */}
              <div>
                <label className="block text-xs text-slate-500 font-semibold mb-1.5">Atau Pilih Manual</label>
                <select
                  id="tx-item-select"
                  value={selectedItem}
                  onChange={(e) => setSelectedItem(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3 py-2 text-slate-900 outline-none cursor-pointer transition-all"
                >
                  {inventory.length > 0 ? (
                    inventory.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.sku})
                      </option>
                    ))
                  ) : (
                    <option value="">Belum ada produk aktif</option>
                  )}
                </select>
              </div>

              {/* Transaction Type */}
              <div>
                <label className="block text-xs text-slate-500 font-semibold mb-1.5">Tipe Mutasi</label>
                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  {(['in', 'out', 'initial'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      id={`btn-tx-type-${type}`}
                      onClick={() => setTransactionType(type)}
                      className={`py-1.5 text-[10px] font-bold rounded-lg capitalize transition-all cursor-pointer ${
                        transactionType === type
                          ? type === 'in' 
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : type === 'out'
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {type === 'in' ? 'Masuk (+)' : type === 'out' ? 'Keluar (-)' : 'Stok Awal'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Qty */}
              <div>
                <label className="block text-xs text-slate-500 font-semibold mb-1.5">
                  Jumlah Mutasi (Qty)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  id="tx-qty-input"
                  value={transactionQty}
                  onChange={(e) => setTransactionQty(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3 py-2 text-slate-900 outline-none font-mono transition-all"
                />
              </div>

              {/* Keterangan */}
              {transactionType === 'in' ? (
                <div>
                  <label className="block text-xs text-slate-500 font-semibold mb-1.5">Keterangan / Referensi</label>
                  <select
                    value={keterangan}
                    onChange={(e) => setKeterangan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3 py-2 text-slate-900 outline-none transition-all"
                  >
                    <option value="PRODUKSI">Produksi</option>
                    <option value="RETUR">Retur</option>
                    <option value="LAINNYA">Lainnya</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs text-slate-500 font-semibold mb-1.5">Keterangan / Referensi</label>
                  <input
                    type="text"
                    placeholder="Kosongkan jika tidak ada, atau isi manual"
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3 py-2 text-slate-900 outline-none transition-all"
                  />
                </div>
              )}

              {/* Platform */}
              {(transactionType === 'out' || (transactionType === 'in' && keterangan === 'RETUR')) && (
                <div>
                  <label className="block text-xs text-slate-500 font-semibold mb-1.5">Platform / Orderan</label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3 py-2 text-slate-900 outline-none transition-all"
                  >
                    <option value="BERIRRA">BERIRRA</option>
                    <option value="KOMUNITAS">KOMUNITAS</option>
                    <option value="DROPSHIP">DROPSHIP</option>
                    <option value="OFFLINE STORE">OFFLINE STORE</option>
                    <option value="SHOPEE RANURA">SHOPEE RANURA</option>
                    <option value="SHOPEE SAFESWIM">SHOPEE SAFESWIM</option>
                    <option value="TOKOPEDIA">TOKOPEDIA</option>
                    <option value="BU SHINTA">BU SHINTA</option>
                    <option value="WHATSAPP">WHATSAPP</option>
                    <option value="BU MAYA">BU MAYA</option>
                    <option value="LAZADA">LAZADA</option>
                    <option value="WA IKLAN">WA IKLAN</option>
                    <option value="TIKTOK SHOP">TIKTOK SHOP</option>
                    <option value="REPEAT ORDER">REPEAT ORDER</option>
                    <option value="4EL">4EL</option>
                    <option value="GOOGLE ADS">GOOGLE ADS</option>
                    <option value="TUKER SIZE">TUKER SIZE</option>
                    <option value="FACEBOOK">FACEBOOK</option>
                    <option value="ENDORSEMENT">ENDORSEMENT</option>
                    <option value="WHATSAPP IKLAN">WHATSAPP IKLAN</option>
                    <option value="BUTIK SANIA">BUTIK SANIA</option>
                    <option value="AFFILIATE">AFFILIATE</option>
                    <option value="Ruang Konten">Ruang Konten</option>
                    <option value="AMBIL SENDIRI">AMBIL SENDIRI</option>
                    <option value="WHATSAPP 4EL">WHATSAPP 4EL</option>
                    <option value="KIRIM ULANG">KIRIM ULANG</option>
                    <option value="PEMBELIAN OFFLINE">PEMBELIAN OFFLINE</option>
                    <option value="TUKER BARANG">TUKER BARANG</option>
                    <option value="WEBSITE">WEBSITE</option>
                    <option value="BERDU">BERDU</option>
                    <option value="INSTAGRAM">INSTAGRAM</option>
                    <option value="DIPINJEM PRODUKSI">DIPINJEM PRODUKSI</option>
                    <option value="KOMPLAIN">KOMPLAIN</option>
                  </select>
                </div>
              )}

              {/* Catatan (hanya in) */}
              {transactionType === 'in' && (
                <div>
                  <label className="block text-xs text-slate-500 font-semibold mb-1.5">Catatan Khusus</label>
                  <input
                    type="text"
                    placeholder="Contoh: Tanggal Kembar"
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3 py-2 text-slate-900 outline-none transition-all"
                  />
                </div>
              )}

              {/* Operator */}
              <div>
                <label className="block text-xs text-slate-500 font-semibold mb-1.5">Operator Gudang</label>
                <select
                  id="tx-operator-select"
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3 py-2 text-slate-900 outline-none cursor-pointer transition-all"
                >
                  <option value="Fachrie (Gudang)">Fachrie (Gudang)</option>
                  <option value="Fadhil (Kepala Gudang)">Fadhil (Kepala Gudang)</option>
                </select>
              </div>

              <button
                type="submit"
                id="btn-save-transaction"
                className={`w-full flex items-center justify-center gap-2 py-2.5 text-white text-xs font-bold rounded-xl shadow-lg transition-all cursor-pointer ${
                  transactionType === 'in'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-100'
                    : transactionType === 'out'
                      ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-100'
                      : 'bg-blue-600 hover:bg-blue-500 shadow-blue-100'
                }`}
              >
                <Plus className="h-4 w-4" />
                {transactionType === 'in' ? 'Simpan Barang Masuk' : transactionType === 'out' ? 'Simpan Barang Keluar' : 'Atur Stok Awal'}
              </button>
            </form>
          </div>

          {/* Manufacturing pipeline & Assembly scheduler */}
          <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between">
            <div>
              <div className="border-b border-slate-100 pb-4 mb-4">
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-1.5">
                  <Wrench className="h-4.5 w-4.5 text-blue-600" />
                  Jalur Batch Produksi
                </h3>
                <p className="text-xs text-slate-500">Jadwalkan & simulasikan proses manufaktur mesin baru</p>
              </div>

              <form onSubmit={handleRunProduction} className="space-y-4">
                {/* Product Selection */}
                <div>
                  <label className="block text-xs text-slate-500 font-semibold mb-1.5">Pilih Item Produksi</label>
                  <select
                    id="production-item-select"
                    value={selectedItemForProd}
                    onChange={(e) => setSelectedItemForProd(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none cursor-pointer transition-all"
                  >
                    {inventory.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Qty target */}
                <div>
                  <label className="block text-xs text-slate-500 font-semibold mb-1.5">Target Jumlah Batch (Qty)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    id="production-qty-input"
                    value={productionQty}
                    onChange={(e) => setProductionQty(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none font-mono transition-all"
                  />
                </div>

                {/* Estimated completion info */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 text-[11px] text-slate-500 space-y-1.5">
                  <div className="flex justify-between">
                    <span>Alur Produksi:</span>
                    <span className="text-slate-600 font-semibold">Pola & Cutting Kain</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimasi Waktu:</span>
                    <span className="text-blue-600 font-bold font-mono">2.5 detik (Masa Uji)</span>
                  </div>
                </div>

                <button
                  type="submit"
                  id="btn-trigger-production"
                  disabled={isAssembling}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all cursor-pointer ${
                    isAssembling ? 'opacity-70 cursor-wait' : ''
                  }`}
                >
                  <RefreshCw className={`h-4 w-4 ${isAssembling ? 'animate-spin' : ''}`} />
                  {isAssembling ? 'Proses Produksi Sedang Bekerja...' : 'Mulai Produksi'}
                </button>
              </form>
            </div>

            {/* Quick Assembly pipeline indicator visual */}
            <div className="border-t border-slate-100 mt-6 pt-4 text-xs">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-2.5">Pipeline Status Terjadwal</span>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200/60 rounded-xl">
                  <span className="text-slate-600 font-medium font-sans">Pola & Cutting Kain</span>
                  <span className="text-[10px] text-emerald-600 font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 font-bold">ONLINE</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200/60 rounded-xl">
                  <span className="text-slate-600 font-medium font-sans">Jahit & Bordir</span>
                  <span className="text-[10px] text-emerald-600 font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 font-bold">ONLINE</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200/60 rounded-xl">
                  <span className="text-slate-600 font-medium font-sans">Inspeksi QC & Packaging</span>
                  <span className="text-[10px] text-blue-600 font-mono bg-blue-50 px-2 py-0.5 rounded border border-blue-100 font-bold">STANDBY</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Laporan Mutasi & Pergerakan Stok (Date Filtered - 2 Years Back) */}
      <div id="historical-stock-reports" className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-6">
        
        {/* Report Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <Calendar className="h-4.5 w-4.5" />
              </span>
              <h3 className="text-base font-bold text-slate-900">Analisa & Mutasi Log Stok</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Pantau total unit masuk (inflow) vs keluar (outflow) harian, mingguan, dan bulanan hingga 2 tahun terakhir.
            </p>
          </div>

          {/* Sync status and Action buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleExportLogsCSV}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer"
            >
              <Download className="h-4 w-4" />
              Ekspor CSV
            </button>
            {spreadsheetId ? (
              <button
                type="button"
                id="btn-export-log-sheets"
                onClick={handleExportLogToSheets}
                disabled={isExportingLogs}
                className={`flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer ${
                  isExportingLogs ? 'opacity-70 cursor-wait' : ''
                }`}
              >
                <FileSpreadsheet className="h-4 w-4" />
                {isExportingLogs ? 'Mengekspor Log...' : 'Ekspor Log ke Sheets'}
              </button>
            ) : (
              <div className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-xl font-medium">
                Hubungkan Sheets di tab "Integrasi Saluran" untuk ekspor log mutasi otomatis.
              </div>
            )}
          </div>
        </div>

        {/* Feedback Alert */}
        <AnimatePresence>
          {logsExportFeedback && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                logsExportFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-150'
                  : 'bg-rose-50 text-rose-800 border-rose-150'
              }`}
            >
              <Check className="h-4 w-4 shrink-0" />
              <span>{logsExportFeedback.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls Panel (Filters) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-150">
          
          {/* Select Month / Year (Max 2 Years Back) */}
          <div>
            <label className="block text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Periode Bulan
            </label>
            <select
              id="report-month-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none cursor-pointer transition-all font-medium"
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Grouping Model (Perhari, Perminggu, Perbulan) */}
          <div>
            <label className="block text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Filter className="h-3 w-3" /> Model Penayangan
            </label>
            <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-lg border border-slate-200">
              {(['perhari', 'perminggu', 'perbulan'] as const).map((period) => (
                <button
                  key={period}
                  type="button"
                  id={`btn-period-${period}`}
                  onClick={() => setSelectedPeriod(period)}
                  className={`py-1 text-[11px] font-bold rounded-md capitalize transition-all cursor-pointer ${
                    selectedPeriod === period
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {period === 'perhari' ? 'Harian' : period === 'perminggu' ? 'Mingguan' : 'Bulanan'}
                </button>
              ))}
            </div>
          </div>

          {/* Product SKU Filter */}
          <div>
            <label className="block text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Package className="h-3 w-3" /> Filter Produk SKU
            </label>
            <select
              id="report-sku-select"
              value={selectedSku}
              onChange={(e) => setSelectedSku(e.target.value)}
              className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none cursor-pointer transition-all font-medium"
            >
              <option value="all">Semua Produk</option>
              {inventory.map((item) => (
                <option key={item.id} value={item.sku}>
                  {item.name} ({item.sku})
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Metric KPI Overview for filtered period */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Total Stock In */}
          <div className="p-4 bg-gradient-to-br from-emerald-50/50 to-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest block font-mono">Total Unit Masuk</span>
              <p className="text-2xl font-bold text-emerald-700 font-mono mt-1">
                +{totalStockInFiltered.toLocaleString('id-ID')} <span className="text-xs font-sans text-slate-500 font-normal">unit</span>
              </p>
              <p className="text-[11px] font-bold text-emerald-600/80 mt-0.5">
                Rp {totalValueInFiltered.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-lg shrink-0">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </div>

          {/* Card 2: Total Stock Out */}
          <div className="p-4 bg-gradient-to-br from-rose-50/50 to-rose-50 border border-rose-100 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-rose-800 uppercase tracking-widest block font-mono">Total Unit Keluar</span>
              <p className="text-2xl font-bold text-rose-600 font-mono mt-1">
                -{totalStockOutFiltered.toLocaleString('id-ID')} <span className="text-xs font-sans text-slate-500 font-normal">unit</span>
              </p>
              <p className="text-[11px] font-bold text-rose-600/80 mt-0.5">
                Rp {totalValueOutFiltered.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="p-2.5 bg-rose-100 text-rose-600 rounded-lg shrink-0">
              <ArrowDownLeft className="h-5 w-5" />
            </div>
          </div>

          {/* Card 3: Delta / Net change */}
          <div className={`p-4 rounded-xl flex items-center justify-between border ${
            totalStockInFiltered - totalStockOutFiltered >= 0
              ? 'bg-blue-50/40 border-blue-100 text-blue-700'
              : 'bg-amber-50/40 border-amber-100 text-amber-700'
          }`}>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Mutasi Bersih (Delta)</span>
              <p className="text-2xl font-bold font-mono mt-1">
                {totalStockInFiltered - totalStockOutFiltered >= 0 ? '+' : ''}
                {(totalStockInFiltered - totalStockOutFiltered).toLocaleString('id-ID')}{' '}
                <span className="text-xs font-sans text-slate-500 font-normal">unit</span>
              </p>
              <p className={`text-[11px] font-bold mt-0.5 ${totalStockInFiltered - totalStockOutFiltered >= 0 ? 'text-blue-600/80' : 'text-amber-600/80'}`}>
                {totalValueInFiltered - totalValueOutFiltered >= 0 ? '+' : ''}
                Rp {(totalValueInFiltered - totalValueOutFiltered).toLocaleString('id-ID')}
              </p>
            </div>
            <div className={`p-2.5 rounded-lg shrink-0 ${
              totalStockInFiltered - totalStockOutFiltered >= 0
                ? 'bg-blue-100 text-blue-600'
                : 'bg-amber-100 text-amber-600'
            }`}>
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Dynamic List / Breakdown View */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          
          {selectedPeriod === 'perhari' && (
            <>
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Rincian Log Mutasi Harian ({filteredMovements.length} transaksi)</span>
                <span className="text-[10px] text-slate-400 font-mono">Periode: {selectedMonth}</span>
              </div>
              <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                {filteredMovements.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Tidak ada aktivitas mutasi stok tercatat untuk filter periode ini.
                  </div>
                ) : (
                  filteredMovements.slice(0, 150).map((m) => (
                    <div key={m.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/60 transition-colors">
                      <div className="flex items-start gap-3">
                        <span className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                          m.type === 'in' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                        }`}>
                          {m.type === 'in' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                        </span>
                        <div>
                          <p className="font-semibold text-slate-800">{m.productName}</p>
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-400 font-mono mt-0.5">
                            <span>{m.sku}</span>
                            <span>•</span>
                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-sans">{m.reference}</span>
                            <span>•</span>
                            <span className="font-sans">Oleh: {m.operator}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`font-mono font-bold text-sm ${m.type === 'in' ? 'text-emerald-600' : 'text-slate-850'}`}>
                          {m.type === 'in' ? '+' : '-'}{m.qty} pcs
                        </span>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {new Date(m.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                {filteredMovements.length > 150 && (
                  <div className="p-3 text-center text-[11px] text-slate-400 bg-slate-50 border-t border-slate-100">
                    Menampilkan 150 mutasi pertama. Sisa data dapat dilihat lengkap pada Google Sheets Anda.
                  </div>
                )}
              </div>
            </>
          )}

          {selectedPeriod === 'perminggu' && (
            <>
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Akumulasi Mutasi Mingguan</span>
                <span className="text-[10px] text-slate-400 font-mono">Periode: {selectedMonth}</span>
              </div>
              <div className="p-4 border-b border-slate-150 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklySummary} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <RechartsTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="stockIn" name="Stok Masuk" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
                    <Bar dataKey="stockOut" name="Stok Keluar" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="divide-y divide-slate-150">
                {weeklySummary.map((week, idx) => (
                  <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50/40 transition-all">
                    <div>
                      <p className="font-bold text-slate-850 text-xs">{week.name}</p>
                      <p className="text-[11px] text-slate-400 mt-1">Estimasi log gabungan aktivitas operasional gudang.</p>
                    </div>
                    <div className="flex items-center gap-6 text-xs">
                      <div className="text-center">
                        <span className="text-[10px] text-slate-400 block uppercase font-mono">Total Masuk</span>
                        <span className="font-mono font-bold text-emerald-600 text-sm">+{week.stockIn} unit</span>
                      </div>
                      <div className="text-center border-l border-slate-200 pl-6">
                        <span className="text-[10px] text-slate-400 block uppercase font-mono">Total Keluar</span>
                        <span className="font-mono font-bold text-rose-600 text-sm">-{week.stockOut} unit</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {selectedPeriod === 'perbulan' && (
            <>
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Akumulasi Bulanan Total</span>
                <span className="text-[10px] text-slate-400 font-mono">Periode: {selectedMonth}</span>
              </div>
              
              <div className="p-4 border-b border-slate-150 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[{ name: 'Bulan Ini', stockIn: monthlySummary.stockIn, stockOut: monthlySummary.stockOut }]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <RechartsTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="stockIn" name="Stok Masuk" fill="#10b981" radius={[4, 4, 0, 0]} barSize={80} />
                    <Bar dataKey="stockOut" name="Stok Keluar" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={80} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="p-6 flex flex-col md:flex-row items-center justify-around gap-6">
                <div className="text-center p-4 bg-emerald-50/40 border border-emerald-100 rounded-2xl w-full max-w-xs">
                  <div className="p-2.5 bg-emerald-500 text-white rounded-xl inline-block mb-3">
                    <ArrowUpRight className="h-5 w-5" />
                  </div>
                  <p className="text-[11px] text-emerald-800 uppercase tracking-widest font-bold">Inflow Bulanan</p>
                  <p className="text-3xl font-extrabold text-emerald-700 font-mono mt-1.5">+{monthlySummary.stockIn} pcs</p>
                </div>

                <div className="text-center p-4 bg-rose-50/40 border border-rose-100 rounded-2xl w-full max-w-xs">
                  <div className="p-2.5 bg-rose-500 text-white rounded-xl inline-block mb-3">
                    <ArrowDownLeft className="h-5 w-5" />
                  </div>
                  <p className="text-[11px] text-rose-800 uppercase tracking-widest font-bold">Outflow Bulanan</p>
                  <p className="text-3xl font-extrabold text-rose-600 font-mono mt-1.5">-{monthlySummary.stockOut} pcs</p>
                </div>
              </div>
            </>
          )}

        </div>


      {printBarcodeSku && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center">
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              #print-barcode-section, #print-barcode-section * { visibility: visible !important; }
              #print-barcode-section { position: absolute; left: 0; top: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
            }
          `}</style>
          <div id="print-barcode-section" className="text-center p-8 bg-white flex flex-col items-center justify-center">
             <Barcode value={printBarcodeSku} format="CODE128" width={2} height={100} displayValue={true} />
             <p className="mt-2 text-sm font-bold text-slate-700 uppercase">{printBarcodeSku}</p>
          </div>
          <div className="mt-8 flex gap-4 no-print hide-on-print print:hidden">
            <button 
              className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200" 
              onClick={() => { window.print(); setTimeout(() => setPrintBarcodeSku(null), 1000); }}
            >
              Cetak Sekarang
            </button>
            <button 
              className="px-6 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl" 
              onClick={() => setPrintBarcodeSku(null)}
            >
              Batal
            </button>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
