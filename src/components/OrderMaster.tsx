import * as XLSX from 'xlsx';
import React, { useState, useEffect } from 'react';
import { 
  Trash2, Edit, RefreshCw, X, CheckCircle, Truck, PackageSearch,
  Settings, Search, Calendar, ChevronDown, 
  Package, FileText, ClipboardList, XCircle, Printer, Receipt, MoreHorizontal, FileSpreadsheet,
  Wallet, Archive, RotateCcw, Ban, Clock, ClipboardPaste, Send, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function OrderMaster({ 
  orders, 
  onAddOrdersBatch, 
  onUpdateOrderStatus, 
  onDeleteOrder,
  onTriggerSync,
  isSyncing
}: any) {
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        if (!data || data.length === 0) {
          alert("File kosong atau format salah.");
          return;
        }

        const newOrders: any[] = [];
        data.forEach((row: any, i: number) => {
          const orderNumber = row['No. Pesanan'] || row['Order ID'] || row['Order Number'] || `IMP${Date.now().toString().slice(-6)}${i}`;
          const customerName = row['Username (Pembeli)'] || row['Nama Pembeli'] || row['Customer Name'] || '-';
          const productName = row['Nama Produk'] || row['Product Name'] || '-';
          const qty = parseInt(row['Jumlah'] || row['Quantity'] || row['Qty']) || 1;
          const statusRaw = row['Status Pesanan'] || row['Order Status'] || 'Menunggu Diproses';
          const totalPrice = parseFloat(row['Total Harga Produk'] || row['Order Amount'] || '0') || 0;
          const shippingAddress = row['Alamat Pengiriman'] || row['Shipping Address'] || '-';
          const customerPhone = row['No. Handphone'] || row['Phone Number'] || '-';
          const trackingNumber = row['No. Resi'] || row['Tracking Number'] || '-';
          const courier = row['Opsi Pengiriman'] || row['Shipping Provider'] || '-';
          const notes = row['Catatan dari Pembeli'] || row['Buyer Message'] || 'Upload Manual';
          const orderDateRaw = row['Waktu Pesanan Dibuat'] || row['Order Creation Time'] || new Date().toISOString();
          let orderDate = new Date().toISOString();
          try {
            if(orderDateRaw && typeof orderDateRaw === 'string') {
               orderDate = new Date(orderDateRaw).toISOString();
            } else if (typeof orderDateRaw === 'number') { 
               orderDate = new Date(Math.round((orderDateRaw - 25569) * 86400 * 1000)).toISOString();
            }
          } catch(e) {}

          let platform: 'shopee' | 'tiktok' | 'telegram' = 'shopee';
          let sumber = 'Shopee Upload';
          if (orderNumber.startsWith('TT') || row['Order ID']) { platform = 'tiktok'; sumber = 'TikTok Upload'; }

          let mappedStatus = 'Menunggu Diproses';
          const stLow = statusRaw.toLowerCase();
          if (stLow.includes('kirim') || stLow.includes('shipped')) mappedStatus = 'Pesanan Dikirim';
          else if (stLow.includes('selesai') || stLow.includes('completed')) mappedStatus = 'Pesanan Selesai';
          else if (stLow.includes('batal') || stLow.includes('cancel')) mappedStatus = 'Pesanan Dibatalkan';
          else if (stLow.includes('retur') || stLow.includes('return')) mappedStatus = 'Pesanan Retur';

          newOrders.push({
            orderNumber,
            platform,
            sumber,
            customerName,
            productName,
            sku: row['Nomor Referensi SKU'] || row['Seller SKU'] || `SKU-${productName.substring(0,4).toUpperCase()}`,
            qty,
            totalPrice,
            status: mappedStatus,
            orderDate,
            shippingAddress,
            customerPhone,
            trackingNumber,
            pengiriman: courier,
            notes
          });
        });

        if (newOrders.length > 0 && onAddOrdersBatch) {
          onAddOrdersBatch(newOrders);
        } else {
          alert("Gagal memproses baris data.");
        }
      } catch (error) {
        console.error(error);
        alert("Terjadi kesalahan saat membaca file Excel. Pastikan file valid.");
      }
    };
    reader.readAsBinaryString(file);
    if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState('');
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [printOrder, setPrintOrder] = useState<any>(null);

  const [isManualInputOpen, setIsManualInputOpen] = useState(false);
  const [manualText, setManualText] = useState('');
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [manualResult, setManualResult] = useState<{ success: boolean; message: string } | null>(null);

  // DATABASE LOKAL UNTUK MENGINGAT PESANAN YANG SUDAH DICETAK
  const [printedIds, setPrintedIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('apex_printed_ids');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeFilter, setActiveFilter] = useState('Menunggu Diproses');
  const [advFilters, setAdvFilters] = useState({
    marketplace: 'Semua', toko: 'Semua', pengiriman: 'Semua', statusCetak: 'Semua', penandaan: 'Semua', waktu: 'Semua', searchType: 'Nomor Pesanan', searchQuery: ''
  });

  const safeOrders = Array.isArray(orders) ? orders : [];

  const normalizeStatus = (rawStatus: string) => {
    const s = String(rawStatus || 'Menunggu Diproses').toUpperCase();
    if (s.includes('UNPAID') || s.includes('BELUM DIBAYAR')) return 'Pesanan Belum Dibayar';
    if (s.includes('PAID') || s.includes('CREATED') || s.includes('PENDING') || s.includes('BARU') || s.includes('MENUNGGU DIPROSES')) return 'Menunggu Diproses';
    if (s.includes('PRINTED') || s.includes('DICETAK')) return 'Menunggu Dicetak';
    if (s.includes('TO_HANDOVER') || s.includes('PICKUP')) return 'Menunggu Pickup';
    if (s.includes('SHIPPED') || s.includes('DELIVERED') || s.includes('DIKIRIM')) return 'Pesanan Dikirim';
    if (s.includes('COMPLETED') || s.includes('SELESAI')) return 'Pesanan Selesai';
    if (s.includes('RETURN') || s.includes('RETUR')) return 'Pesanan Retur';
    if (s.includes('CANCELLED') || s.includes('DIBATALKAN')) return 'Pesanan Dibatalkan';
    if (s.includes('DISISIHKAN')) return 'Pesanan Disisihkan';
    return 'Menunggu Diproses'; 
  };

  const getCount = (statusName: string) => safeOrders.filter(o => normalizeStatus(o.status) === statusName).length;
  const validSemuaStatuses = ['Menunggu Diproses', 'Menunggu Dicetak', 'Menunggu Pickup', 'Pesanan Dikirim', 'Pesanan Selesai', 'Pesanan Disisihkan'];
  const totalSemuaCount = safeOrders.filter(o => validSemuaStatuses.includes(normalizeStatus(o.status))).length;

  const getExpireDate = (order: any) => {
    const pForm = (order.platform || 'manual').toLowerCase();
    const orderDate = new Date(order.orderDate || new Date());
    if (pForm === 'telegram') {
      let addedDays = 0; let currentDate = new Date(orderDate);
      const publicHolidays = ['2026-08-17', '2026-09-16', '2026-12-25']; 
      while (addedDays < 7) {
        currentDate.setDate(currentDate.getDate() + 1);
        const isSunday = currentDate.getDay() === 0;
        const dateStr = currentDate.toISOString().split('T')[0];
        if (!isSunday && !publicHolidays.includes(dateStr)) addedDays++;
      }
      return currentDate;
    } else {
      if (order.expireDate) return new Date(order.expireDate);
      const exp = new Date(orderDate); exp.setDate(exp.getDate() + 2); return exp;
    }
  };

  const filteredOrders = safeOrders.filter(order => {
    const normStatus = normalizeStatus(order.status);
    if (activeFilter === 'Semua Pesanan') { if (!validSemuaStatuses.includes(normStatus)) return false; } 
    else { if (normStatus !== activeFilter) return false; }

    if (advFilters.marketplace !== 'Semua') {
      const plat = (order.platform || 'manual').toLowerCase();
      if (!plat.includes(advFilters.marketplace.toLowerCase())) return false;
    }
    
    // LOGIKA FILTER STATUS CETAK
    if (advFilters.statusCetak === 'b_label' && printedIds.includes(order.id)) return false;
    if (advFilters.statusCetak === 's_label' && !printedIds.includes(order.id)) return false;

    if (advFilters.searchQuery.trim() !== '') {
      const q = advFilters.searchQuery.toLowerCase();
      const orderNum = (order.orderNumber || '').toLowerCase();
      const custName = (order.customerName || '').toLowerCase();
      const tracking = (order.trackingNumber || '').toLowerCase();
      if (advFilters.searchType === 'Nomor Pesanan' && !orderNum.includes(q)) return false;
      if (advFilters.searchType === 'Nama Pelanggan' && !custName.includes(q)) return false;
      if (advFilters.searchType === 'Nomor Resi' && !tracking.includes(q)) return false;
      if (advFilters.searchType === 'Spesifik' && !orderNum.includes(q) && !custName.includes(q) && !tracking.includes(q)) return false;
    }
    return true;
  });

  const getPlatCount = (plat: string) => safeOrders.filter(o => (o.platform || '').toLowerCase().includes(plat.toLowerCase())).length;

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(filteredOrders.map((o: any) => String(o.id))); else setSelectedIds([]);
  };
  const handleSelectOne = (id: string) => {
    const stringId = String(id);
    setSelectedIds(prev => prev.includes(stringId) ? prev.filter(item => item !== stringId) : [...prev, stringId]);
  };

  // SISTEM PROTEKSI RESI UNTUK UPDATE MASSAL
  const handleBulkUpdate = () => {
    if (!bulkStatus) return alert("Pilih status terlebih dahulu!");
    
    if (bulkStatus === 'Menunggu Pickup') {
      const invalidTelegramOrders = selectedIds.filter(id => {
          const o = safeOrders.find((x:any) => x.id === id);
          const pForm = (o?.platform || '').toLowerCase();
          const hasResi = o?.trackingNumber && o?.trackingNumber !== '-' && o?.trackingNumber !== 'undefined';
          return pForm === 'telegram' && !hasResi;
      });
      if (invalidTelegramOrders.length > 0) {
          alert('⚠️ PROTEKSI AKTIF: Ada pesanan Telegram yang belum diisi Nomor Resi! Silakan Edit dan isi resi terlebih dahulu sebelum dipindah ke "Menunggu Pickup".');
          return;
      }
    }

    if (window.confirm(`Ubah status ${selectedIds.length} pesanan menjadi "${bulkStatus}"?`)) {
      selectedIds.forEach(id => onUpdateOrderStatus(id, bulkStatus));
      setSelectedIds([]); setBulkStatus('');
    }
  };

  const handleBulkDelete = () => {
    if (window.confirm(`⚠️ PERINGATAN!\nYakin menghapus permanen ${selectedIds.length} pesanan?`)) { selectedIds.forEach(id => onDeleteOrder(id)); setSelectedIds([]); }
  };

  const openEditModal = (order: any) => { setEditingOrder({ ...order, status: normalizeStatus(order.status) }); setIsEditModalOpen(true); };
  const saveEdit = () => { onUpdateOrderStatus(editingOrder.id, editingOrder.status, editingOrder.trackingNumber, editingOrder.shippingAddress, editingOrder.shippingDate, editingOrder.customerPhone); setIsEditModalOpen(false); };

  const handleManualSubmit = async () => {
    if (!manualText.trim()) return;
    setIsSubmittingManual(true);
    setManualResult(null);
    try {
      const res = await fetch('/api/orders/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: manualText.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setManualResult({ 
          success: true, 
          message: `✅ Pesanan berhasil dicatat! Order: ${data.data?.order_id || '-'} (${data.data?.nama}) otomatis masuk ke Google Sheets & Dasbor!` 
        });
        setTimeout(() => {
          setIsManualInputOpen(false);
          setManualText('');
          setManualResult(null);
          if (onTriggerSync) onTriggerSync();
        }, 1800);
      } else {
        setManualResult({ 
          success: false, 
          message: `❌ Format teks belum dapat dikenali oleh sistem.` 
        });
      }
    } catch (err: any) {
      setManualResult({ 
        success: false, 
        message: `❌ Error: ${err.message || 'Gagal menghubungi server bot'}` 
      });
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const mainFilterMenus = [
    { label: 'Menunggu Diproses', count: getCount('Menunggu Diproses') },
    { label: 'Menunggu Dicetak', count: getCount('Menunggu Dicetak') },
    { label: 'Menunggu Pickup', count: getCount('Menunggu Pickup') },
    { label: 'Pesanan Dikirim', count: getCount('Pesanan Dikirim') },
    { label: 'Pesanan Selesai', count: getCount('Pesanan Selesai') },
    { label: 'Pesanan Disisihkan', count: getCount('Pesanan Disisihkan') },
    { label: 'Semua Pesanan', count: totalSemuaCount },
  ];

  const exceptionFilterMenus = [
    { label: 'Pesanan Dibatalkan', count: getCount('Pesanan Dibatalkan') },
    { label: 'Pesanan Belum Dibayar', count: getCount('Pesanan Belum Dibayar') },
    { label: 'Pesanan Retur', count: getCount('Pesanan Retur') },
  ];

  const FilterBtn = ({ category, value, label, count }: any) => {
    const isActive = advFilters[category as keyof typeof advFilters] === value;
    return (
      <button onClick={() => setAdvFilters({...advFilters, [category]: value})} className={`px-2 py-0.5 rounded text-[12px] whitespace-nowrap transition-colors ${ isActive ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100'}`}>
        {label} {count !== undefined && `(${count})`}
      </button>
    );
  };

  const DummyBarcode = () => { const lines = [2,4,1,3,2,1,1,4,2,3,1,2,1,1,4,2,1,3,2,1,4,1,2,1,3]; return (<div className="flex h-14 w-full justify-between items-stretch">{lines.map((w, i) => <div key={i} className="bg-black" style={{ width: `${w}px` }}></div>)}</div>); };
  const DummyQRCode = () => (<div className="w-16 h-16 border-4 border-black p-1 flex flex-wrap gap-0.5 bg-white">{Array.from({length: 16}).map((_, i) => <div key={i} className={`w-3 h-3 ${Math.random() > 0.3 ? 'bg-black' : 'bg-transparent'}`}></div>)}</div>);

  const renderActionButtons = (order: any, displayStatus: string) => {
    const btnClass = "p-1.5 bg-white border border-slate-200 rounded text-slate-500 hover:bg-slate-100 shadow-sm transition-all";
    const pForm = (order.platform || 'manual').toLowerCase();
    
    let printerClass = "p-1.5 border rounded shadow-sm transition-all text-indigo-600 border-indigo-200 hover:bg-indigo-50";
    if (pForm === 'shopee') printerClass = "p-1.5 border rounded shadow-sm transition-all text-orange-500 border-orange-200 hover:bg-orange-50";
    else if (pForm === 'tiktok') printerClass = "p-1.5 border rounded shadow-sm transition-all text-fuchsia-600 border-fuchsia-200 hover:bg-fuchsia-50";
    
    // SISTEM PROTEKSI SAAT TOMBOL CETAK DITEKAN
    const handlePrintMarketplace = () => { 
       const hasResi = order.trackingNumber && order.trackingNumber !== '-' && order.trackingNumber !== 'undefined';
       if (pForm === 'telegram' && !hasResi) {
           alert('⚠️ GAGAL MENCETAK: Pesanan Telegram harus diinput Nomor Resi pengiriman terlebih dahulu sebelum dapat dicetak!');
           return;
       }
       if (!printedIds.includes(order.id)) {
           const newPrinted = [...printedIds, order.id];
           setPrintedIds(newPrinted);
           localStorage.setItem('apex_printed_ids', JSON.stringify(newPrinted));
       }
       setPrintOrder(order); 
    };

    // SISTEM PROTEKSI SAAT PINDAH KE PICKUP
    const handleMoveToPickup = () => {
       const hasResi = order.trackingNumber && order.trackingNumber !== '-' && order.trackingNumber !== 'undefined';
       if (pForm === 'telegram' && !hasResi) {
           alert('⚠️ GAGAL: Masukkan Nomor Resi terlebih dahulu (via tombol Edit) sebelum memindahkan pesanan Telegram ke Menunggu Pickup!');
           return;
       }
       onUpdateOrderStatus(order.id, 'Menunggu Pickup');
    };

    if (displayStatus === 'Pesanan Belum Dibayar') {
      return (
        <div className="flex flex-wrap justify-center gap-1.5 w-[70px]">
          <button onClick={() => onUpdateOrderStatus(order.id, 'Menunggu Diproses')} className={`${btnClass} !text-emerald-600 hover:!bg-emerald-50`} title="Tandai Sudah Dibayar"><Wallet className="h-4 w-4" /></button>
          <button onClick={() => openEditModal(order)} className={btnClass} title="Rincian Pesanan"><FileText className="h-4 w-4" /></button>
          <button onClick={() => { if(window.confirm('Batalkan pesanan ini?')) onUpdateOrderStatus(order.id, 'Pesanan Dibatalkan'); }} className={`${btnClass} hover:!text-rose-600 hover:!bg-rose-50`} title="Batalkan"><Ban className="h-4 w-4" /></button>
        </div>
      );
    }
    if (displayStatus === 'Menunggu Diproses') {
      return (
        <div className="flex flex-wrap justify-center gap-1.5 w-[70px]">
          <button onClick={() => onUpdateOrderStatus(order.id, 'Menunggu Dicetak')} className={`${btnClass} !text-indigo-600 hover:!bg-indigo-50`} title="Proses Pesanan"><Package className="h-4 w-4" /></button>
          <button onClick={() => openEditModal(order)} className={btnClass} title="Rincian Pesanan"><FileText className="h-4 w-4" /></button>
          <button className={btnClass} title="Catatan Pembeli"><ClipboardList className="h-4 w-4" /></button>
          <button onClick={() => { if(window.confirm('Batalkan pesanan ini?')) onUpdateOrderStatus(order.id, 'Pesanan Dibatalkan'); }} className={`${btnClass} hover:!text-rose-600 hover:!bg-rose-50`} title="Batalkan"><XCircle className="h-4 w-4" /></button>
        </div>
      );
    }
    if (displayStatus === 'Menunggu Dicetak') {
      return (
        <div className="flex flex-wrap justify-center gap-1.5 w-[70px]">
          <button onClick={handleMoveToPickup} className={`${btnClass} hover:!text-emerald-600 hover:!bg-emerald-50`} title="Kirim Pesanan (Pickup)"><Truck className="h-4 w-4" /></button>
          <button onClick={handlePrintMarketplace} className={printerClass} title="Cetak Label"><Printer className="h-4 w-4" /></button>
          <button onClick={() => openEditModal(order)} className={btnClass} title="Rincian Pesanan"><FileText className="h-4 w-4" /></button>
          <button onClick={() => { if(window.confirm('Sisihkan pesanan ini (Kekurangan Stok / Bermasalah)?')) onUpdateOrderStatus(order.id, 'Pesanan Disisihkan'); }} className={`${btnClass} hover:!text-amber-600 hover:!bg-amber-50`} title="Sisihkan Pesanan"><Archive className="h-4 w-4" /></button>
        </div>
      );
    }
    if (displayStatus === 'Menunggu Pickup') {
      return (
        <div className="flex flex-wrap justify-center gap-1.5 w-[70px]">
           <button onClick={() => openEditModal(order)} className={btnClass} title="Rincian Pesanan"><FileText className="h-4 w-4" /></button>
           <button onClick={handlePrintMarketplace} className={printerClass} title="Cetak Dokumen"><Printer className="h-4 w-4" /></button>
           <button className={btnClass} title="Daftar Pengambilan Barang"><FileSpreadsheet className="h-4 w-4" /></button>
        </div>
      );
    }
    if (displayStatus === 'Pesanan Dikirim') {
      return (
        <div className="flex flex-wrap justify-center gap-1.5 w-[70px]">
          <button onClick={() => onUpdateOrderStatus(order.id, 'Pesanan Selesai')} className={`${btnClass} !text-emerald-600 hover:!bg-emerald-50`} title="Selesaikan Pesanan"><CheckCircle className="h-4 w-4" /></button>
          <button className={btnClass} title="Cetak Invoice"><Receipt className="h-4 w-4" /></button>
          <button onClick={handlePrintMarketplace} className={printerClass} title="Cetak Label"><Printer className="h-4 w-4" /></button>
          <button onClick={() => openEditModal(order)} className={btnClass} title="Rincian Pesanan"><FileText className="h-4 w-4" /></button>
        </div>
      );
    }
    if (displayStatus === 'Pesanan Selesai') {
      return (
        <div className="flex flex-wrap justify-center gap-1.5 w-[70px]">
          <button onClick={handlePrintMarketplace} className={printerClass} title="Cetak Transaksi"><Printer className="h-4 w-4" /></button>
          <button onClick={() => openEditModal(order)} className={btnClass} title="Rincian Pesanan"><FileText className="h-4 w-4" /></button>
        </div>
      );
    }
    if (displayStatus === 'Pesanan Disisihkan') {
      return (
        <div className="flex flex-wrap justify-center gap-1.5 w-[70px]">
          <button onClick={() => onUpdateOrderStatus(order.id, 'Menunggu Dicetak')} className={`${btnClass} !text-indigo-600 hover:!bg-indigo-50`} title="Proses Kembali ke Antrean Cetak"><RotateCcw className="h-4 w-4" /></button>
          <button onClick={() => openEditModal(order)} className={btnClass} title="Rincian Pesanan"><FileText className="h-4 w-4" /></button>
        </div>
      );
    }
    
    // Default (Dibatalkan / Retur)
    return (
      <div className="flex flex-wrap justify-center gap-1.5 w-[70px]">
        <button onClick={() => openEditModal(order)} className={btnClass} title="Edit"><Edit className="h-4 w-4" /></button>
        <button onClick={() => { if(window.confirm('Hapus pesanan ini secara permanen?')) onDeleteOrder(order.id); }} className={`${btnClass} hover:!text-rose-600 hover:!bg-rose-50`} title="Hapus Permanen"><Trash2 className="h-4 w-4" /></button>
      </div>
    );
  };

  const printStyles = `@media print { body * { visibility: hidden; } #printable-area, #printable-area * { visibility: visible; } #printable-area { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; } .no-print { display: none !important; } }`;

  return (
    <div className="h-full overflow-y-auto p-6 md:p-8 pb-32">
      <style>{printStyles}</style>

      {/* HEADER DASBOR */}
      <div className="flex justify-between items-end mb-6 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <PackageSearch className="h-6 w-6 text-blue-600" /> Master Data Order
          </h1>
          <p className="text-sm text-slate-500 mt-1">Kelola semua pesanan dari Telegram, Shopee, dan TikTok dalam satu pintu.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { setIsManualInputOpen(true); setManualResult(null); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 font-semibold shadow-sm active:scale-95 transition-all"
            title="Tempelkan format pesanan CS / WhatsApp / Telegram langsung ke sistem"
          >
            <ClipboardPaste className="h-4 w-4 text-indigo-600" />
            <span>Paste Pesanan CS</span>
          </button>
          
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx,.xls,.csv" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors font-medium text-sm shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              <span>Upload Excel</span>
            </button>

            <button onClick={onTriggerSync} disabled={isSyncing} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-semibold shadow-lg transition-all ${isSyncing ? 'bg-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 active:scale-95'}`}>
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Menarik Data...' : 'Sinkronisasi Marketplace'}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 no-print">
        
        {/* SIDEBAR KIRI */}
        <div className="w-full lg:w-64 shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 sticky top-4 z-10">
            {mainFilterMenus.map((menu) => {
              const isActive = activeFilter === menu.label;
              return (
                <button key={menu.label} onClick={() => setActiveFilter(menu.label)} className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all mb-1 ${isActive ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600' : 'text-slate-600 hover:bg-slate-50 border-l-4 border-transparent'}`}>
                  <span>{menu.label}</span>
                  {menu.label !== 'Semua Pesanan' && (
                    <span className={`${isActive ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>{menu.count.toLocaleString('id-ID')}</span>
                  )}
                </button>
              );
            })}
            <hr className="border-t border-dashed border-slate-300 my-2 mx-2" />
            {exceptionFilterMenus.map((menu) => {
              const isActive = activeFilter === menu.label;
              return (
                <button key={menu.label} onClick={() => setActiveFilter(menu.label)} className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all mb-1 ${isActive ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600' : 'text-slate-600 hover:bg-slate-50 border-l-4 border-transparent'}`}>
                  <span>{menu.label}</span>
                  <span className={`${isActive ? 'text-indigo-600 font-bold' : (menu.label === 'Pesanan Dibatalkan' ? 'text-rose-500' : 'text-slate-400')}`}>
                    {menu.count.toLocaleString('id-ID')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* KOLOM KANAN */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6 text-[13px] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
              <span className="font-bold text-slate-800">Filter Pencarian</span>
              <Settings className="h-3.5 w-3.5 text-slate-400 cursor-pointer hover:text-slate-600" />
            </div>
            <div className="p-4 flex flex-col gap-3">
              <div className="flex items-start gap-4">
                <div className="w-24 shrink-0 text-slate-500 font-medium pt-0.5">Marketplace</div>
                <div className="flex flex-wrap gap-x-3 gap-y-2">
                  <FilterBtn category="marketplace" value="Semua" label="Semua" />
                  <button onClick={() => setAdvFilters({...advFilters, marketplace: 'shopee'})} className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[12px] transition-colors ${advFilters.marketplace === 'shopee' ? 'bg-orange-100 text-orange-700 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}>Shopee ({getPlatCount('shopee')})</button>
                  <button onClick={() => setAdvFilters({...advFilters, marketplace: 'tiktok'})} className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[12px] transition-colors ${advFilters.marketplace === 'tiktok' ? 'bg-fuchsia-100 text-fuchsia-700 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}>TikTok ({getPlatCount('tiktok')})</button>
                  <FilterBtn category="marketplace" value="telegram" label="Telegram" count={getPlatCount('telegram')} />
                </div>
              </div>
              
              <div className="flex items-start gap-4 border-t border-slate-100 pt-3">
                <div className="w-24 shrink-0 text-slate-500 font-medium pt-0.5">Status Cetak</div>
                <div className="flex flex-wrap gap-x-3 gap-y-2 flex-1">
                  <FilterBtn category="statusCetak" value="Semua" label="Semua" />
                  <FilterBtn category="statusCetak" value="b_label" label="Belum Dicetak (Label Pengiriman)" count={safeOrders.filter(o => !printedIds.includes(o.id)).length} />
                  <FilterBtn category="statusCetak" value="s_label" label="Sudah Dicetak (Label Pengiriman)" count={safeOrders.filter(o => printedIds.includes(o.id)).length} />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-2 border-t border-slate-100 pt-4">
                <div className="flex items-center border border-slate-300 rounded overflow-hidden shadow-sm flex-1 max-w-2xl bg-white">
                  <div className="relative bg-slate-50 border-r border-slate-300">
                    <select value={advFilters.searchType} onChange={(e) => setAdvFilters({...advFilters, searchType: e.target.value})} className="text-xs p-2 pl-3 pr-8 appearance-none bg-transparent outline-none font-medium text-slate-700">
                      <option value="Nomor Pesanan">Nomor Pesanan</option>
                      <option value="Nomor Resi">Nomor Resi</option>
                      <option value="Nama Pelanggan">Nama Pelanggan</option>
                      <option value="Spesifik">Spesifik (Global)</option>
                    </select>
                    <ChevronDown className="w-3 h-3 absolute right-2 top-2.5 text-slate-400 pointer-events-none"/>
                  </div>
                  <div className="flex items-center flex-1 px-3 bg-white">
                    <input type="text" placeholder="Pencarian Massal Dipisahkan dengan Koma / Spasi..." value={advFilters.searchQuery} onChange={(e) => setAdvFilters({...advFilters, searchQuery: e.target.value})} className="w-full text-xs py-2 outline-none" />
                    <Search className="w-4 h-4 text-slate-400 cursor-pointer" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {selectedIds.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white border-2 border-indigo-500 rounded-xl shadow-lg p-4 mb-6 flex items-center justify-between sticky top-4 z-20">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-100 text-indigo-700 p-2 rounded-lg"><CheckCircle className="h-5 w-5" /></div>
                  <span className="font-bold text-slate-800">{selectedIds.length} Pesanan Terpilih</span>
                </div>
                <div className="flex items-center gap-3">
                  <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} className="border-slate-300 rounded-lg text-sm font-medium focus:ring-indigo-500 py-2 px-4 bg-slate-50 text-slate-700">
                    <option value="">-- Ubah Status Massal --</option>
                    <option value="Pesanan Belum Dibayar">Pesanan Belum Dibayar</option>
                    <option value="Menunggu Diproses">Menunggu Diproses</option>
                    <option value="Menunggu Dicetak">Menunggu Dicetak</option>
                    <option value="Menunggu Pickup">Menunggu Pickup</option>
                    <option value="Pesanan Dikirim">Pesanan Dikirim</option>
                    <option value="Pesanan Selesai">Pesanan Selesai</option>
                    <option value="Pesanan Disisihkan">Pesanan Disisihkan</option>
                    <option value="Pesanan Dibatalkan">Pesanan Dibatalkan</option>
                    <option value="Pesanan Retur">Pesanan Retur</option>
                  </select>
                  <button onClick={handleBulkUpdate} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-md transition-colors">Terapkan</button>
                  <div className="w-px h-8 bg-slate-200 mx-2"></div>
                  <button onClick={handleBulkDelete} className="bg-rose-100 hover:bg-rose-200 text-rose-700 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"><Trash2 className="h-4 w-4" /> Hapus</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase text-slate-500 font-bold tracking-wider">
                  <tr>
                    <th className="px-4 py-4 w-12 text-center">
                      <input type="checkbox" onChange={handleSelectAll} checked={filteredOrders.length > 0 && selectedIds.length === filteredOrders.length} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer" />
                    </th>
                    <th className="px-4 py-4 min-w-[150px]">Saluran / No. Order</th>
                    <th className="px-4 py-4 min-w-[200px]">Pelanggan & Kontak</th>
                    <th className="px-4 py-4 min-w-[140px]">Batas Waktu Kirim</th>
                    <th className="px-4 py-4 min-w-[220px]">Produk & Keterangan</th>
                    <th className="px-4 py-4 text-center">Jumlah</th>
                    <th className="px-4 py-4 text-right min-w-[130px]">Total Tagihan</th>
                    <th className="px-4 py-4 text-center">Status Pesanan</th>
                    <th className="px-4 py-4 text-center min-w-[100px]">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-16 text-center text-slate-400 font-medium">Data tidak ditemukan dengan filter tersebut.</td></tr>
                  ) : (
                    filteredOrders.map((order: any) => {
                      const safeId = String(order?.id || Math.random());
                      const isChecked = selectedIds.includes(safeId);
                      const safePlatform = String(order?.platform || 'manual');
                      const displayStatus = normalizeStatus(order?.status);
                      
                      const rawOrderDate = new Date(order?.orderDate);
                      const safeOrderDate = isNaN(rawOrderDate.getTime()) ? '-' : rawOrderDate.toLocaleDateString('id-ID', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'});
                      
                      const expireDateObj = getExpireDate(order);
                      const safeExpireDate = isNaN(expireDateObj.getTime()) ? '-' : expireDateObj.toLocaleDateString('id-ID', {day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'});

                      let platformStyle = 'text-slate-600 border-slate-200 bg-slate-50';
                      if (safePlatform === 'shopee') platformStyle = 'text-orange-600 border-orange-200 bg-orange-50';
                      else if (safePlatform === 'tiktok') platformStyle = 'text-fuchsia-600 border-fuchsia-200 bg-fuchsia-50';
                      else if (safePlatform === 'telegram') platformStyle = 'text-sky-600 border-sky-200 bg-sky-50';

                      let statusBadge = "bg-slate-50 text-slate-600 border-slate-200";
                      if(displayStatus === 'Menunggu Diproses') statusBadge = "bg-amber-50 text-amber-700 border-amber-200";
                      else if(displayStatus === 'Menunggu Dicetak') statusBadge = "bg-blue-50 text-blue-700 border-blue-200";
                      else if(displayStatus === 'Menunggu Pickup') statusBadge = "bg-purple-50 text-purple-700 border-purple-200";
                      else if(displayStatus === 'Pesanan Dikirim') statusBadge = "bg-sky-50 text-sky-700 border-sky-200";
                      else if(displayStatus === 'Pesanan Selesai') statusBadge = "bg-emerald-50 text-emerald-700 border-emerald-200";
                      else if(displayStatus === 'Pesanan Dibatalkan') statusBadge = "bg-rose-50 text-rose-700 border-rose-200";
                      else if(displayStatus === 'Pesanan Retur') statusBadge = "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200";
                      else if(displayStatus === 'Pesanan Disisihkan') statusBadge = "bg-stone-100 text-stone-700 border-stone-200";
                      else if(displayStatus === 'Pesanan Belum Dibayar') statusBadge = "bg-slate-100 text-slate-700 border-slate-200";

                      const isTukerSize = order?.shopName === 'TUKER SIZE' || 
                        String(order?.productName || '').toLowerCase().includes('tuker size') || 
                        String(order?.orderNumber || '').includes('585577');

                      return (
                        <tr key={safeId} className={`hover:bg-slate-50 transition-colors ${isChecked ? 'bg-indigo-50/50' : ''}`}>
                          <td className="px-4 py-4 text-center align-top"><input type="checkbox" checked={isChecked} onChange={() => handleSelectOne(safeId)} className="w-4 h-4 rounded text-indigo-600 mt-1 cursor-pointer" /></td>
                          <td className="px-4 py-4 align-top">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${platformStyle} mb-1.5 inline-block`}>{safePlatform.toUpperCase()}</span>
                            <p className="font-bold text-slate-800 text-[13px]">{order?.orderNumber || '-'}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">📅 {safeOrderDate}</p>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <p className="font-semibold text-slate-800 text-[13px]">{order?.customerName || 'Anonim'}</p>
                            {order?.customerPhone && order?.customerPhone !== '-' && (
                              <a 
                                href={`https://wa.me/${String(order.customerPhone).replace(/[^0-9]/g, '')}`} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold inline-flex items-center gap-1 mt-0.5"
                                title="Chat WhatsApp Customer"
                              >
                                📱 {order.customerPhone}
                              </a>
                            )}
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 max-w-[200px] leading-relaxed">{order?.shippingAddress || '-'}</p>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded inline-flex items-center gap-1.5 w-fit border border-rose-100">
                                <Clock className="w-3 h-3" /> {safeExpireDate}
                              </span>
                              {safePlatform === 'telegram' ? (
                                <span className="text-[9px] font-semibold text-slate-400">7 Hari Kerja (Non Libur)</span>
                              ) : (
                                <span className="text-[9px] font-semibold text-slate-400">Batas SLA Marketplace</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <p className="font-medium text-indigo-600 text-[13px] line-clamp-2 max-w-[220px] whitespace-pre-wrap">{order?.productName || 'Produk'}</p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              <span className="text-[10px] text-slate-400 font-mono">SKU: {order?.sku || '-'}</span>
                              {order?.shopName && (
                                <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">{order.shopName}</span>
                              )}
                              {order?.trackingNumber && order?.trackingNumber !== '-' && order?.trackingNumber !== 'undefined' && (
                                <a href={`https://parcelsapp.com/id/tracking/${order.trackingNumber}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 rounded text-[9px] font-bold hover:bg-sky-100 transition-colors shadow-sm">
                                  <Truck className="w-2.5 h-2.5" /> Resi: {order.trackingNumber}
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center font-bold text-slate-700 align-top">{order?.qty || 1}</td>
                          <td className="px-4 py-4 text-right align-top">
                            <p className="font-bold text-slate-800 text-[13px] whitespace-nowrap">
                              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(order?.totalPrice || 0)}
                            </p>
                            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                              {safePlatform === 'telegram' ? 'Transfer / CS' : 'Marketplace'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center align-top">
                            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border inline-block whitespace-nowrap ${statusBadge}`}>{displayStatus}</span>
                            {isTukerSize && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200 block mt-1 mx-auto w-fit">
                                TUKER SIZE
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4 align-top">{renderActionButtons(order, displayStatus)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {printOrder && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-slate-100 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[95vh] border border-slate-300">
              
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white no-print">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Printer className="h-5 w-5 text-indigo-600" /> Pratinjau Label {printOrder.platform.toUpperCase()}</h2>
                <button onClick={() => setPrintOrder(null)} className="text-slate-400 hover:text-rose-600 p-1 bg-slate-50 rounded-full border border-slate-200 shadow-sm"><X className="h-4 w-4" /></button>
              </div>

              <div className="p-8 overflow-y-auto flex justify-center items-start bg-slate-200">
                <div id="printable-area" className="bg-white shadow-xl flex-shrink-0 text-black p-0 m-0" style={{ width: '100mm', minHeight: '150mm', fontFamily: 'Arial, sans-serif' }}>
                  
                  {printOrder.platform.toLowerCase() === 'shopee' && (
                    <div className="border-[3px] border-black text-xs leading-snug w-full h-full p-2 relative">
                      <div className="flex border-b-[3px] border-black pb-2 items-center justify-between">
                        <div className="font-black text-xl tracking-tighter">Shopee</div>
                        <div className="font-black text-2xl">ECO</div>
                        <div className="font-black text-xl tracking-tighter italic text-red-600">SPX</div>
                      </div>
                      <div className="flex border-b-[3px] border-black">
                        <div className="w-1/3 border-r-[3px] border-black p-2 flex items-center justify-center font-black text-3xl">BW-13</div>
                        <div className="w-2/3 p-2 flex flex-col items-center">
                          <div className="border border-black px-2 py-0.5 font-bold mb-1">SJB-A-16</div>
                          <DummyBarcode />
                          <div className="text-[10px] font-bold mt-1 border border-black px-2">Resi: {printOrder.trackingNumber || 'SPXID063104105798'}</div>
                        </div>
                      </div>
                      <div className="flex border-b-[3px] border-black p-1 relative overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none font-black text-[6rem]">COD</div>
                        <div className="w-1/2 pr-1 border-r border-black relative z-10">
                          <p className="font-bold">Penerima: {printOrder.customerName}</p>
                          <p className="text-[10px] mt-1">{printOrder.shippingAddress}</p>
                        </div>
                        <div className="w-1/2 pl-1 relative z-10">
                          <p className="font-bold">Pengirim: {printOrder.shopName || 'Ranura Official'}</p>
                          <p className="text-[10px] mt-1 font-bold">{printOrder.customerPhone || '628111376700'}</p>
                          <p className="text-[10px]">KOTA DEPOK</p>
                        </div>
                      </div>
                      <div className="flex border-b-[3px] border-black text-[10px] font-bold text-center">
                        <div className="w-1/3 border-r border-black p-1">KAB. SUKABUMI</div>
                        <div className="w-1/3 border-r border-black p-1">SUKARAJA</div>
                        <div className="w-1/3 p-1">Langensari</div>
                      </div>
                      <div className="flex border-b-[3px] border-black p-1">
                        <div className="w-2/3">
                          <p><b>Berat:</b> 1000 gr</p>
                          <p><b>Batas Kirim:</b> {isNaN(getExpireDate(printOrder).getTime()) ? '-' : getExpireDate(printOrder).toLocaleDateString('id-ID')}</p>
                          <p><b>No.Pesanan:</b> {printOrder.orderNumber}</p>
                        </div>
                        <div className="w-1/3 flex flex-col items-end">
                          <p className="font-bold text-right mb-1">COD Cek Dulu: Tidak</p>
                          <DummyQRCode />
                        </div>
                      </div>
                      <div className="p-1">
                        <table className="w-full text-[9px] text-left border-collapse">
                          <thead><tr className="border-b border-black"><th className="pb-1">#</th><th>Nama Produk</th><th>SKU</th><th>Variasi</th><th>Qty</th></tr></thead>
                          <tbody><tr><td className="pt-1 align-top">1</td><td className="pt-1 pr-1 align-top">{printOrder.productName}</td><td className="pt-1 pr-1 align-top break-all">{printOrder.sku}</td><td className="pt-1 pr-1 align-top">-</td><td className="pt-1 align-top font-bold">{printOrder.qty}</td></tr></tbody>
                        </table>
                        <p className="mt-4 font-bold text-[10px]">Pesan: ({printOrder.orderNumber}) ({printOrder.trackingNumber || 'SPXID063104105798'})</p>
                      </div>
                    </div>
                  )}

                  {printOrder.platform.toLowerCase() !== 'shopee' && (
                    <div className="border-[2px] border-black text-[11px] leading-tight w-full h-full">
                      <div className="flex justify-between items-center p-2 border-b border-black">
                        <div className="font-black text-2xl tracking-tighter italic text-red-600">JNE<span className="text-blue-800 text-xs ml-1 block not-italic">EXPRESS</span></div>
                        <div className="font-serif text-3xl font-bold">REG</div>
                        <DummyQRCode />
                      </div>
                      <div className="p-2 border-b border-black">
                        <div className="flex justify-between font-semibold"><p>Pengirim: {printOrder.shopName || 'Ranura Official'}</p><p>(+62)81528247440</p></div>
                        <p className="mb-2">Jawa Barat, Depok</p>
                        <div className="flex justify-between font-semibold"><p>Penerima: {printOrder.customerName}</p><p>{printOrder.customerPhone || '(+62)81****78'}</p></div>
                        <p className="text-[10px]">{printOrder.shippingAddress}</p>
                      </div>
                      <div className="flex border-b border-black text-center font-bold">
                        <div className="w-2/3 border-r border-black p-1">NON COD</div>
                        <div className="w-1/3 p-1 text-[10px] flex items-center justify-center">Ship: {isNaN(getExpireDate(printOrder).getTime()) ? '-' : getExpireDate(printOrder).toLocaleDateString('id-ID')}</div>
                      </div>
                      <div className="flex border-b border-black">
                        <div className="w-2/3 border-r border-black p-2">
                          <p>Jumlah: {printOrder.qty} pcs,</p>
                          <p className="mt-1">Barang: {printOrder.productName}</p>
                          <p className="mt-1">Note: -</p>
                        </div>
                        <div className="w-1/3 p-2 flex items-center justify-center font-serif text-4xl font-black">CGK</div>
                      </div>
                      <div className="p-2 border-b border-black text-center flex flex-col items-center">
                        <p className="font-bold text-[10px] mb-1">AWB Number</p>
                        <DummyBarcode />
                        <p className="font-bold text-lg mt-1 tracking-widest">{printOrder.trackingNumber || 'TG3577683268'}</p>
                      </div>
                      <div className="p-1 px-2 border-b border-black font-semibold text-[10px]">Order Id: {printOrder.orderNumber}</div>
                      <div className="p-2">
                        <p className="text-[9px] mb-1">In transit by: {isNaN(getExpireDate(printOrder).getTime()) ? '-' : getExpireDate(printOrder).toLocaleDateString('id-ID')}</p>
                        <table className="w-full text-[9px] text-left border-collapse border-b border-black mb-1">
                          <thead><tr className="border-b border-black"><th className="pb-1">Product Name</th><th>SKU</th><th>Seller SKU</th><th>Qty</th></tr></thead>
                          <tbody><tr><td className="py-1 pr-1">{printOrder.productName}</td><td className="py-1 pr-1">{printOrder.sku}</td><td className="py-1 pr-1">{printOrder.sku}</td><td className="py-1 font-bold text-center">{printOrder.qty}</td></tr></tbody>
                        </table>
                        <p className="text-right font-bold text-[10px]">Qty Total: {printOrder.qty}</p>
                      </div>
                      <div className="flex justify-between items-center p-2 border-t border-black bg-slate-50 mt-2">
                        <div className="font-bold text-lg tracking-tighter">tokopedia</div>
                        <div className="font-bold text-lg flex items-center gap-1"><Package className="w-4 h-4"/> Shop</div>
                        <div className="text-[7px] text-right"><p>Order ID: {printOrder.orderNumber}</p><p>Package ID: 1208508357115</p></div>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              <div className="p-4 border-t border-slate-200 bg-white flex justify-between items-center no-print">
                <p className="text-xs text-slate-500 font-medium">Siapkan kertas thermal berukuran 100x150mm (A6).</p>
                <button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-md flex items-center gap-2 transition-all active:scale-95">
                  <Printer className="w-4 h-4" /> Cetak Sekarang
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditModalOpen && editingOrder && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Edit className="h-5 w-5 text-indigo-600" /> Update Logistik & Produksi</h2>
                <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 bg-white rounded-full border border-slate-200 shadow-sm"><X className="h-4 w-4" /></button>
              </div>
              <div className="p-6 overflow-y-auto space-y-5">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">ORDER INFO</p>
                      <p className="font-bold text-slate-800 text-sm">{String(editingOrder.orderNumber || '-')}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{String(editingOrder.customerName || '-')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">TOTAL HARGA</p>
                      <p className="font-bold text-indigo-600 text-sm">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(editingOrder.totalPrice || 0)}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{editingOrder.shopName || 'Transfer'}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-200/60 text-xs text-slate-600">
                    <span className="font-medium text-slate-400 text-[10px] block uppercase">PRODUK & QTY:</span>
                    <span className="font-medium">{editingOrder.productName || '-'} ({editingOrder.qty || 1} pcs)</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Pilih Status Pesanan</label>
                  <select value={String(editingOrder.status || '')} onChange={(e) => setEditingOrder({...editingOrder, status: e.target.value})} className="w-full border border-slate-300 rounded-lg p-3 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm transition-shadow">
                    <option value="Pesanan Belum Dibayar">Pesanan Belum Dibayar</option>
                    <option value="Menunggu Diproses">Menunggu Diproses</option>
                    <option value="Menunggu Dicetak">Menunggu Dicetak</option>
                    <option value="Menunggu Pickup">Menunggu Pickup</option>
                    <option value="Pesanan Dikirim">Pesanan Dikirim</option>
                    <option value="Pesanan Selesai">Pesanan Selesai</option>
                    <option value="Pesanan Disisihkan">Pesanan Disisihkan</option>
                    <option value="Pesanan Dibatalkan">Pesanan Dibatalkan</option>
                    <option value="Pesanan Retur">Pesanan Retur</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Nomor Resi</label>
                  <input type="text" placeholder="Contoh: SPX02930291, JNT11029482" value={String(editingOrder.trackingNumber || '')} onChange={(e) => setEditingOrder({...editingOrder, trackingNumber: e.target.value})} className="w-full border border-slate-300 rounded-lg p-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 shadow-sm transition-shadow" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Nomor Telepon Customer</label>
                  <input type="text" value={String(editingOrder.customerPhone || '')} onChange={(e) => setEditingOrder({...editingOrder, customerPhone: e.target.value})} className="w-full border border-slate-300 rounded-lg p-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 shadow-sm transition-shadow" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Perbarui Alamat Pengiriman</label>
                  <textarea rows={3} value={String(editingOrder.shippingAddress || '')} onChange={(e) => setEditingOrder({...editingOrder, shippingAddress: e.target.value})} className="w-full border border-slate-300 rounded-lg p-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 shadow-sm resize-none transition-shadow" />
                </div>
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50">
                <button onClick={saveEdit} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95">Simpan Perubahan</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isManualInputOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-blue-50">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-600 rounded-lg text-white">
                    <ClipboardPaste className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-800">Paste Format Pesanan CS</h2>
                    <p className="text-xs text-slate-500">Otomatis ekstrak data, catat ke Google Sheets, & masukkan ke Dasbor</p>
                  </div>
                </div>
                <button onClick={() => setIsManualInputOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 bg-white rounded-full border border-slate-200 shadow-sm"><X className="h-4 w-4" /></button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4">
                <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Sparkles className="h-4 w-4 text-blue-600" /> Didukung Regex Mandiri + Gemini AI Fallback
                  </span>
                  <span className="bg-blue-200/60 px-2 py-0.5 rounded text-[11px] font-semibold text-blue-900">100% Otomatis</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Tempelkan Teks Format Pesanan (WhatsApp / Telegram / Form CS):
                  </label>
                  <textarea 
                    rows={8}
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder={`Contoh format yang didukung:
1. Hallo kak [Nama] dengan saya cs Selvia... Order Id: ... Total: ...
2. FORMAT RETUR / RETUR - ( TUKER SIZE )... No Pesanan: ...
3. Pembelian ofline ranura kids / cash
4. Form Order (Pack / Satuan) nama: ... ukuran: ...`}
                    className="w-full border border-slate-300 rounded-xl p-3 text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm resize-y transition-shadow leading-relaxed"
                  />
                </div>

                {manualResult && (
                  <div className={`p-3 rounded-xl text-xs font-medium border ${manualResult.success ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
                    {manualResult.message}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
                <button 
                  onClick={() => setIsManualInputOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={handleManualSubmit}
                  disabled={isSubmittingManual || !manualText.trim()}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-semibold shadow-md transition-all ${isSubmittingManual || !manualText.trim() ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'}`}
                >
                  <Send className={`h-4 w-4 ${isSubmittingManual ? 'animate-spin' : ''}`} />
                  {isSubmittingManual ? 'Memproses & Menyimpan...' : 'Proses & Simpan ke Sheets'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}