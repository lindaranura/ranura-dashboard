import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { Telegraf } from 'telegraf';
import * as XLSX from 'xlsx';

const app = express();
app.use(express.json());
app.use(cors());

// =================================================================
// 1. DATABASE LOKAL & PERSISTENSI (DASBOR)
// =================================================================
const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const ORDERS_FILE = path.join(DATA_DIR, 'telegram_orders.json');

let masterDataOrder: any[] = [];
try {
  if (fs.existsSync(ORDERS_FILE)) {
    const rawData = fs.readFileSync(ORDERS_FILE, 'utf8');
    masterDataOrder = JSON.parse(rawData);
    if (!Array.isArray(masterDataOrder)) masterDataOrder = [];
  }
} catch (e) {
  masterDataOrder = [];
}

function persistOrders() {
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(masterDataOrder, null, 2), 'utf8');
  } catch (e) {
    console.error("Gagal menyimpan orders ke file:", e);
  }
}

app.get('/api/orders', (req, res) => { 
  res.json(masterDataOrder); 
});

app.delete('/api/orders/:id', async (req, res) => {
  try {
    const id = req.params.id;
    
      const initialLength = masterDataOrder.length;
      const orderToDelete = masterDataOrder.find(o => o.order_id === id || o.id === id);
      
      // FIX RACE CONDITION: Delete from memory immediately
      masterDataOrder = masterDataOrder.filter(o => o.order_id !== id && o.id !== id);
      if (masterDataOrder.length < initialLength) {
          persistOrders();
      }
      
      const queryNama = req.query.nama ? String(req.query.nama) : '';
    
      const queryPhone = req.query.phone ? String(req.query.phone) : '';
      
      if (orderToDelete || (queryNama && queryPhone)) {
         // Hapus juga dari Google Sheets (Kosongkan barisnya)
       // Hapus juga dari Google Sheets (Kosongkan barisnya)
       const auth = getGoogleAuth();
       if (auth) {
           try {
             const sheets = google.sheets({ version: 'v4', auth });
             const existingSheets = await getExistingSheets(sheets);
             const currentYear = new Date().getFullYear().toString();
             const sheetsToSearch = existingSheets.filter(t => t.includes(currentYear)).reverse();
             
             if (sheetsToSearch.length > 0) {
      const ranges = sheetsToSearch.map(tab => `'${tab}'!A:P`);
      const dataResp = await sheets.spreadsheets.values.batchGet({ spreadsheetId: SPREADSHEET_ID, ranges });
      
      let foundRows: { tab: string, index: number }[] = [];
      if (dataResp.data.valueRanges) {
        for (let j = 0; j < dataResp.data.valueRanges.length; j++) {
          const valueRange = dataResp.data.valueRanges[j];
          const rows = valueRange.values || [];
          const tab = sheetsToSearch[j];
          
          for (let i = rows.length - 1; i >= 0; i--) {
            const r = rows[i];
            if (r.length > 5) {
               const cNama = r[2] || '';
               const cTelp = r[4] || '';
               const cOrder = r[14] || '';
               const namaToMatch = (orderToDelete && (orderToDelete.nama || orderToDelete.customerName)) || queryNama || '';
               const telpToMatch = (orderToDelete && (orderToDelete.telp || orderToDelete.customerPhone)) || queryPhone || '';
               
               const isIdMatch = (cOrder.trim() !== '-' && cOrder.trim() !== '' && cOrder.trim() === id);
               const isDataMatch = (namaToMatch && cNama.trim().toLowerCase() === namaToMatch.trim().toLowerCase() && cTelp.trim().replace(/'/g, '').replace(/[\s-]/g, '') === telpToMatch.trim().replace(/'/g, '').replace(/[\s-]/g, ''));
               
               if (isIdMatch || isDataMatch || (namaToMatch && cNama.trim().toLowerCase() === namaToMatch.trim().toLowerCase() && cNama.trim() !== '-' && cNama.trim() !== '')) {
                   foundRows.push({ tab, index: i + 1 });
                   break;
               }
            }
          }
          if (foundRows.length > 0) break;
        }
      }
      
      if (foundRows.length > 0) {
          const updateData = foundRows.map(row => ({
              range: `'${row.tab}'!A${row.index}:P${row.index}`,
              values: [Array(16).fill('')]
          }));
          await sheets.spreadsheets.values.batchUpdate({
              spreadsheetId: SPREADSHEET_ID,
              requestBody: { valueInputOption: 'USER_ENTERED', data: updateData }
          });
      }
}
           } catch (sheetErr) {
             console.error("Gagal menghapus baris di Sheets:", sheetErr);
           }
       }
    }

    
      return res.json({ success: true, message: "Order dihapus permanen dari Google Sheets" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sync-marketplace', (req, res) => {
  const timestamp = Date.now().toString().slice(-6);
  
  const newShopeeOrder = {
    id: `SHOPEE-${timestamp}`,
    platform: 'shopee',
    orderNumber: `SHP-${timestamp}`,
    sumber: 'Shopee Official',
    nama: 'Pembeli Shopee',
    alamat: 'Jl. Sudirman No 10, Jakarta',
    telp: '081234567890',
    produk: 'Ranura Female <Warna: Black> <Ukuran: L>',
    sku: 'SWIMWEAR-ITEM',
    jumlah: 1,
    pengiriman: 'Shopee Xpress',
    totalPrice: 350000,
    status: 'Menunggu Diproses',
    trackingNumber: '-',
    resi: '-',
    retur: '',
    orderDate: new Date().toISOString(),
    shippingDate: new Date(Date.now() + 86400000).toISOString()
  };
  
  const newTiktokOrder = {
    id: `TIKTOK-${timestamp}`,
    platform: 'tiktok',
    orderNumber: `TT-${timestamp}`,
    sumber: 'TikTok Shop',
    nama: 'Pembeli TikTok',
    alamat: 'Jl. Merdeka No 5, Bandung',
    telp: '081987654321',
    produk: 'Ranura Hijab Pasmina <Warna: Nude>',
    sku: 'HIJAB-ITEM',
    jumlah: 2,
    pengiriman: 'J&T Express',
    totalPrice: 150000,
    status: 'Menunggu Diproses',
    trackingNumber: '-',
    resi: '-',
    retur: '',
    orderDate: new Date().toISOString(),
    shippingDate: new Date(Date.now() + 86400000).toISOString()
  };

  masterDataOrder.unshift(newShopeeOrder, newTiktokOrder);
  persistOrders();
  
  res.json({ success: true, message: "Sinkronisasi Berhasil! 2 Pesanan baru ditarik." }); 
});

// Endpoint untuk pengujian langsung tanpa melalui chat Telegram
app.post('/api/orders/update-status', async (req, res) => {
  const { orderId, nama, phone, status } = req.body;
  if (!status) return res.status(400).json({ error: 'Missing status' });

  const existing = masterDataOrder.find((o: any) => 
    (o.id === orderId) || (o.orderNumber === orderId) || 
    (o.nama === nama && o.telp === phone && o.nama && o.telp && o.nama !== "-" && o.telp !== "-")
  );
  if (existing) {
    existing.status = status;
    persistOrders();
  }

  let kValue = '';
    let updateL = false;
    let lValue = ''; // default empty

    if (status === 'Menunggu Dicetak' || status === 'Menunggu Pickup' || status === 'Pesanan Dikirim') {
       kValue = 'KIRIM';
       updateL = true;
    } else if (status === 'Pesanan Retur') {
       kValue = 'RETUR';
    } else if (status === 'Pesanan Dibatalkan') {
       kValue = 'CANCEL';
       updateL = true;
       lValue = '';
    } else if (status === 'Menunggu Diproses') {
       kValue = '';
       updateL = true;
       lValue = '';
    } else if (status === 'Pesanan Selesai') {
       kValue = 'SELESAI';
    } else if (status === 'Pesanan Disisihkan') {
       kValue = '';
       updateL = true;
       lValue = '';
    } else {
       kValue = status.toUpperCase();
    }

  const auth = getGoogleAuth();
  if (!auth) return res.status(500).json({ error: 'No Auth' });

  try {
    const sheets = google.sheets({ version: 'v4', auth });
    const existingSheets = await getExistingSheets(sheets);
    
    const currentYear = new Date().getFullYear().toString();
    const sheetsToSearch = existingSheets.filter(t => t.includes(currentYear)).reverse();
    
    let foundRows: { tab: string, index: number }[] = [];

    
    const ranges = sheetsToSearch.map(tab => `'${tab}'!A:P`);
    const dataResp = await sheets.spreadsheets.values.batchGet({ spreadsheetId: SPREADSHEET_ID, ranges });
    
    if (dataResp.data.valueRanges) {
      for (let j = 0; j < dataResp.data.valueRanges.length; j++) {
        const valueRange = dataResp.data.valueRanges[j];
        const rows = valueRange.values || [];
        const tab = sheetsToSearch[j];
        
        for (let i = rows.length - 1; i >= 0; i--) {
          const r = rows[i];
          if (r.length > 5) {
             const cNama = r[2] || '';
               const cTelp = r[4] || '';
               const cOrder = r[14] || '';
               
               const isIdMatch = (cOrder.trim() !== '-' && cOrder.trim() !== '' && cOrder.trim() === orderId.trim());
               const isDataMatch = (nama && cNama.trim().toLowerCase() === nama.trim().toLowerCase() && cTelp.trim().replace(/'/g, '').replace(/[\s-]/g, '') === (phone || '').trim().replace(/'/g, '').replace(/[\s-]/g, ''));
               
               if (isIdMatch || isDataMatch || (nama && cNama.trim().toLowerCase() === nama.trim().toLowerCase() && cNama.trim() !== '')) {
                   foundRows.push({ tab, index: i + 1 });
                   break; // Stop inner loop to only update the most recent match
               }
          }
        }
        if (foundRows.length > 0) break;
      }
    }


    if (foundRows.length > 0) {
       const today = new Date();
         const dd = String(today.getDate()).padStart(2, '0');
         const mm = String(today.getMonth() + 1).padStart(2, '0');
         const yyyy = today.getFullYear();
         
         if (kValue === 'KIRIM') {
             lValue = `${dd}-${mm}-${yyyy}`;
         }
         
         const updateData = foundRows.map(row => {
          if (updateL) {
              return {
                  range: `'${row.tab}'!K${row.index}:L${row.index}`,
                  values: [[kValue, lValue]]
              };
          } else {
              return {
                  range: `'${row.tab}'!K${row.index}`,
                  values: [[kValue]]
              };
          }
       });

       await sheets.spreadsheets.values.batchUpdate({
           spreadsheetId: SPREADSHEET_ID,
           requestBody: {
               valueInputOption: 'USER_ENTERED',
               data: updateData
           }
       });

       return res.json({ success: true, updated: true, rowsUpdated: foundRows.length, kValue });
    } else {
       return res.json({ success: false, message: 'Not found in sheets' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders/test', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Parameter 'text' wajib diisi." });
  

app.post('/api/orders/insert-batch', async (req, res) => {
  try {
    const orders = req.body.orders;
    if (!Array.isArray(orders)) return res.status(400).json({ error: 'Invalid orders array' });
    
    let newCount = 0;
    
    for (const orderData of orders) {
      if (!orderData || !orderData.id) continue;
      
      if (masterDataOrder.find(o => o.id === orderData.id)) continue;
      
      masterDataOrder.unshift(orderData);
      newCount++;
      
      const orderDateObj = new Date(orderData.orderDate || Date.now());
      let isHijab = true;
      if (orderData.productName && orderData.productName.toLowerCase().includes('swimwear')) {
        isHijab = false;
      }
      const tabCategory = isHijab ? 'hijab' : 'swimwear';
      const safeTelp = orderData.customerPhone ? (orderData.customerPhone.startsWith('+') ? `'${orderData.customerPhone}` : orderData.customerPhone) : '-';
      const displayOrderId = (orderData.id.startsWith('ord-telegram') || orderData.id.startsWith('TELE-')) ? '-' : orderData.orderNumber;
      
      let kValue = '';
      let lValue = '';
      const st = orderData.status;
      if (st === 'Menunggu Dicetak' || st === 'Menunggu Pickup' || st === 'Pesanan Dikirim') {
         kValue = 'KIRIM';
         const d = new Date();
         lValue = `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
      } else if (st === 'Pesanan Retur') { kValue = 'RETUR'; }
      else if (st === 'Pesanan Dibatalkan') { kValue = 'CANCEL'; }
      else if (st === 'Pesanan Selesai') { kValue = 'SELESAI'; }
      
      const slaDateObj = new Date(orderDateObj.getTime() + 7 * 24 * 60 * 60 * 1000);
      const slaStr = `${String(slaDateObj.getDate()).padStart(2, '0')}-${String(slaDateObj.getMonth() + 1).padStart(2, '0')}-${slaDateObj.getFullYear()}`;
      
      const barisBaru = [
        getIndoDate(orderDateObj, "kolom_a"),
        orderData.sumber || orderData.platform,
        orderData.customerName || orderData.nama || '-',
        orderData.shippingAddress || orderData.alamat || '-',
        safeTelp,
        orderData.productName || orderData.produk || '-',
        orderData.notes || orderData.keterangan || '-',
        orderData.size || '-',
        String(orderData.qty || orderData.jumlah || 1),
        orderData.pengiriman || '-',
        kValue,
        lValue || slaStr,
        orderData.trackingNumber || orderData.resi || '-',
        orderData.retur || '',
        displayOrderId || '-',
        orderData.totalPrice ? Number(orderData.totalPrice).toLocaleString('id-ID') : ''
      ];
      
      await appendToGoogleSheets(tabCategory, barisBaru, orderDateObj);
    }
    
    if (newCount > 0) persistOrders();
    
    res.json({ success: true, message: `Inserted ${newCount} orders to Sheets` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/orders/insert', async (req, res) => {
  try {
    const orderData = req.body;
    if (!orderData || !orderData.id) return res.status(400).json({ error: 'Invalid order data' });
    
    // Check if already exists
    if (masterDataOrder.find(o => o.id === orderData.id)) {
      return res.json({ success: true, message: 'Already exists' });
    }
    
    // Add to memory and save
    masterDataOrder.unshift(orderData);
    persistOrders();
    
    // Prepare for Google Sheets
    const orderDateObj = new Date(orderData.orderDate || Date.now());
    let isHijab = true;
    if (orderData.productName && orderData.productName.toLowerCase().includes('swimwear')) {
      isHijab = false;
    }
    const tabCategory = isHijab ? 'hijab' : 'swimwear';
    const safeTelp = orderData.customerPhone ? (orderData.customerPhone.startsWith('+') ? `'${orderData.customerPhone}` : orderData.customerPhone) : '-';
    const displayOrderId = (orderData.id.startsWith('ord-telegram') || orderData.id.startsWith('TELE-')) ? '-' : orderData.orderNumber;
    
    // Determine K and L column based on status
    let kValue = '';
    let lValue = '';
    const st = orderData.status;
    if (st === 'Menunggu Dicetak' || st === 'Menunggu Pickup' || st === 'Pesanan Dikirim') {
       kValue = 'KIRIM';
       // We'll leave L blank here initially unless it was already sent, but let's just use current date
       const d = new Date();
       lValue = `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
    } else if (st === 'Pesanan Retur') { kValue = 'RETUR'; }
    else if (st === 'Pesanan Dibatalkan') { kValue = 'CANCEL'; }
    else if (st === 'Pesanan Selesai') { kValue = 'SELESAI'; }
    
    // SLA
    const slaDateObj = new Date(orderDateObj.getTime() + 7 * 24 * 60 * 60 * 1000);
    const slaD = String(slaDateObj.getDate()).padStart(2, '0');
    const slaM = String(slaDateObj.getMonth() + 1).padStart(2, '0');
    const slaY = slaDateObj.getFullYear();
    const slaStr = `${slaD}-${slaM}-${slaY}`;
    
    const barisBaru = [
      getIndoDate(orderDateObj, "kolom_a"), // Col A: Tanggal (tanggal pesanan dibuat/berlaku)
      orderData.sumber || orderData.platform, // Col B: Nama Pengirim
      orderData.customerName || orderData.nama || '-', // Col C: Nama Pembeli
      orderData.shippingAddress || orderData.alamat || '-', // Col D: Alamat Pembeli
      safeTelp, // Col E: Nomor Telepon
      orderData.productName || orderData.produk || '-', // Col F: Produk
      orderData.notes || orderData.keterangan || '-', // Col G: Keterangan
      orderData.size || '-', // Col H: Size
      String(orderData.qty || orderData.jumlah || 1), // Col I: Qty
      orderData.pengiriman || '-', // Col J: Pengiriman
      kValue, // Col K: Status
      lValue || slaStr, // Col L: SLA or Shipping Date
      orderData.trackingNumber || orderData.resi || '-', // Col M: No Resi
      orderData.retur || '', // Col N: Retur
      displayOrderId || '-', // Col O: No Order
      orderData.totalPrice ? Number(orderData.totalPrice).toLocaleString('id-ID') : '' // Col P: Harga
    ];
    
    await appendToGoogleSheets(tabCategory, barisBaru, orderDateObj); // Ensure we append to correct month tab based on orderDateObj
    
    res.json({ success: true, message: 'Inserted to Sheets' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});
try {
    const hasil = await processOrderFromTelegram(text);
    return res.json({ success: !!hasil, data: hasil });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =================================================================
// 2. KREDENSIAL & KONFIGURASI
// =================================================================
const SPREADSHEET_ID = process.env.SPREADSHEET_ID || "1XD0iua8lyFvE0PQ-3Qk-_Cu8JqayffDy_ObCqqqC8V0";
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const KATA_HIJAB = ["madani", "islah", "rosal", "hijab"];
const KATA_SWIMWEAR = ["kids", "female", "male", "proswim", "m2d", "meiza", "sportwear", "safeswim", "renang"];
const ALL_KEYWORDS = KATA_HIJAB.concat(KATA_SWIMWEAR);

const HARI_INDO = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN_INDO_SHORT = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const BULAN_INDO_FULL = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function getIndoDate(dateObj: Date, formatType: string) {
  const d = dateObj.getDay();
  const tgl = ("0" + dateObj.getDate()).slice(-2);
  const tglSimple = String(dateObj.getDate());
  const blnIndex = dateObj.getMonth() + 1;
  const thnShort = String(dateObj.getFullYear()).slice(-2);
  const thnFull = dateObj.getFullYear();

  if (formatType === "kolom_a") return `${HARI_INDO[d]}, ${tglSimple} ${BULAN_INDO_SHORT[blnIndex]} ${thnShort}`;
  if (formatType === "tab_bulan") return `${BULAN_INDO_FULL[blnIndex]} ${thnFull}`;
  return "";
}

function getSlaDateDDMMYYYY(dateObj: Date) {
  const day = ("0" + dateObj.getDate()).slice(-2);
  const month = ("0" + (dateObj.getMonth() + 1)).slice(-2);
  const year = dateObj.getFullYear();
  return `${day}/${month}/${year}`;
}

function getDeadline7Hari(startDate: Date) {
  let d = new Date(startDate.getTime());
  let added = 0;
  const publicHolidays = ['2026-08-17', '2026-09-16', '2026-12-25']; 
  while (added < 7) {
    d.setDate(d.getDate() + 1);
    const dateStr = d.toISOString().split('T')[0];
    if (d.getDay() !== 0 && !publicHolidays.includes(dateStr)) added++;
  }
  return d;
}

function extractSize(text: string): string {
  if (!text) return "";
  const tagMatch = text.match(/<Ukuran:\s*([^>(]+)/i);
  if (tagMatch) return tagMatch[1].trim().toUpperCase();
  const quoteMatch = text.match(/[-\s](XXXL|XXL|XL|XS|[SML])['"\s\)]*$/i) || text.match(/['"]?[A-Za-z\s]+-\s*(XXXL|XXL|XL|XS|[SML])['"]?/i);
  if (quoteMatch) return quoteMatch[1].toUpperCase();
  const wordMatch = text.match(/\b(XXXL|XXL|XL|XS|[SML])\b/i);
  if (wordMatch) return wordMatch[1].toUpperCase();
  return "";
}

// =================================================================
// 3. MESIN REGEX UTAMA
// =================================================================
function ekstrakDenganRegex(teks: string) {
  const cleanTeks = teks.replace(/\u00A0/g, ' ').replace(/\r/g, '');
  const txtL = cleanTeks.toLowerCase();
  const lines = cleanTeks.split('\n').map(l => l.trim()).filter(l => l !== '');

  let data = {
    nama: "-",
    no_telp: "-",
    alamat: "-",
    produk: "-",
    keterangan: "",
    size: "",
    jumlah_produk: 1,
    pembayaran: "transfer",
    order_id: `TELE-${Date.now().toString().slice(-6)}`,
    total_harga: 0,
    pengirim: "BERDU RANURA",
    pengirimanSheet: "TRANSFER/LINCAH",
    statusSheet: "KIRIM",
    statusDashboard: "Menunggu Diproses",
    resi: "",
    retur: "",
    sku: "SWIMWEAR-ITEM"
  };

  // 1. FORMAT RETUR / TUKER SIZE
  if (txtL.includes("retur") || txtL.includes("tuker size") || txtL.includes("format retur")) {
    data.nama = cleanTeks.match(/Nama lengkap\s*:\s*([^\n]+)/i)?.[1].trim() || "-";
    data.no_telp = cleanTeks.match(/No\.?\s*WhatsApp aktif\s*:\s*([^\n]+)/i)?.[1].trim() || "-";
    data.alamat = cleanTeks.match(/Alamat lengkap[^\n:]*:\s*([\s\S]*?)(?=\n\s*NO\s*PES|\n\s*Ongkir|\n\s*metode|$)/i)?.[1].replace(/\n/g, ' ').trim() || "-";
    data.produk = cleanTeks.match(/Nama Barang yang dikirimkan kembali\s*(?:\(di\s*tukar\s*jadi\s*apa\s*\)\s*)?:\s*([^\n]+)/i)?.[1].trim() || "-";
    
    const barangAwal = cleanTeks.match(/Nama barang\s*\(\s*awal\s*\)\s*:\s*([^\n]+)/i)?.[1].trim();
    if (barangAwal) data.keterangan = `Awal: ${barangAwal}`;

    const resiMatch = cleanTeks.match(/NO\s*PES[^\n:]*:\s*([^\n]+)/i);
    if (resiMatch) {
      data.order_id = resiMatch[1].trim();
      data.resi = resiMatch[1].trim();
    }

    const ongkirMatch = cleanTeks.match(/Ongkir kirim barang Kembali[^\n:]*:\s*Rp\s*([0-9.,]+)/i);
    if (ongkirMatch) data.total_harga = parseInt(ongkirMatch[1].replace(/[^0-9]/g, ''));

    data.pembayaran = cleanTeks.match(/metode pembayaran[^\n:]*:\s*([^\n]+)/i)?.[1].trim() || "transfer";
    
    data.size = extractSize(data.produk);
    data.pengirim = "TUKER SIZE";
    data.retur = "TUKER SIZE";
    data.statusSheet = "KIRIM";
    data.statusDashboard = "Menunggu Diproses";

    const byr = data.pembayaran.toLowerCase();
    data.pengirimanSheet = (byr.includes("transfer") || byr.includes("ovo") || byr.includes("bca") || byr.includes("mandiri")) ? "TRANSFER/LINCAH" : "CSS JNE/COD Ongkir";
  }
  // 2. FORMAT PEMBELIAN OFFLINE
  else if (txtL.includes("pembelian ofline") || txtL.includes("pembelian offline") || txtL.includes("( cash )")) {
    data.nama = cleanTeks.match(/Nama\s*:\s*([^\n]+)/i)?.[1].trim() || "-";
    data.pengirim = "Pembelian offline";
    data.order_id = `OFFLINE-${Date.now().toString().slice(-6)}`;
    data.statusSheet = "KIRIM";
    data.statusDashboard = "Menunggu Diproses";

    for (let i = 0; i < lines.length; i++) {
      let lowL = lines[i].toLowerCase();
      if (ALL_KEYWORDS.some(k => lowL.includes(k)) && !lowL.includes("info produk") && !lowL.includes("nama:")) {
        data.produk = lines[i];
        data.size = extractSize(lines[i]);
      }
      if (lowL.includes("rp ") || lowL.startsWith("rp")) {
        data.total_harga = parseInt(lowL.replace(/[^0-9]/g, '')) || data.total_harga;
      }
      if (lowL.includes("transfer") || lowL.includes("tf")) {
        data.pembayaran = "Bank Transfer";
        data.pengirimanSheet = "TRANSFER/AMBIL SENDIRI";
      } else if (lowL.includes("( cash )") || lowL.includes("cash")) {
        data.pembayaran = "Cash";
        data.pengirimanSheet = "CASH/AMBIL SENDIRI";
      }
      if (lowL.includes("info produk")) {
        data.keterangan = lines[i];
      }
    }
  }
  // 2.5 FORMAT WHATSAPP CS (PESANAN PACK) - PRIORITAS
  else if (txtL.includes("pesanan (pack)") && txtL.includes("format order")) {
    data.nama = cleanTeks.match(/Nama\s*:\s*([^\n]+)/i)?.[1].trim() || "-";
    data.no_telp = cleanTeks.match(/No\.?\s*(?:Hp|WA|Telp)\s*:\s*([^\n]+)/i)?.[1].trim() || "-";
    
    let alamatMatch = cleanTeks.match(/Alamat(?: lengkap)?\s*:\s*([\s\S]*?)(?=\n\s*\.|\n\s*Pembayaran|\n\s*Pesanan|$)/i);
    if (alamatMatch) data.alamat = alamatMatch[1].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

    const pesananBlock = cleanTeks.match(/Pesanan[^\n]*:\s*\n([\s\S]*?)(?=\n\s*Format Order|\n\s*Harga|\n\s*\*TOTAL|$)/i);
    if (pesananBlock) {
      const lines = pesananBlock[1].split('\n').map(l => l.trim()).filter(l => l.length > 3 && /^\d+\./.test(l));
      if (lines.length > 0) {
        data.produk = lines.map(l => l.replace(/^\d+\.\s*/, '')).join(', ');
        data.jumlah_produk = lines.length;
      }
    }
    
    const hrgMatch = cleanTeks.match(/\*TOTAL\s*:\s*Rp\s*([0-9.,]+)\*/i) || cleanTeks.match(/TOTAL\s*:\s*Rp\s*([0-9.,]+)/i);
    if (hrgMatch) data.total_harga = parseInt(hrgMatch[1].replace(/[^0-9]/g, ''));
    data.pembayaran = cleanTeks.match(/Metode Pembayaran\s*:\s*([^\n]+)/i)?.[1].trim() || "Bank Transfer";
    data.pengirim = "WA CS";
    data.size = extractSize(data.produk);
    
    const byr = data.pembayaran.toLowerCase();
    data.pengirimanSheet = (byr.includes("transfer") || byr.includes("bank")) ? "TRANSFER/LINCAH" : "COD/CSS JNE";
    data.statusSheet = "KIRIM";
    data.statusDashboard = "Menunggu Diproses";
  }
  // 3. FORMAT PESANAN (PACK) MAYOR PUTRA / MULTI-ITEM
  else if (txtL.includes("pesanan (pack)") || txtL.includes("form order") || txtL.includes("mayor inf")) {
    data.nama = cleanTeks.match(/Nama\s*:\s*([^\n]+)/i)?.[1].trim() || "-";
    data.no_telp = cleanTeks.match(/No\.?\s*(?:Hp|WA|Telp)\s*:\s*([^\n]+)/i)?.[1].trim() || "-";
    data.alamat = cleanTeks.match(/Alamat lengkap\s*:\s*([^\n]+)/i)?.[1].trim() || "-";
    data.pembayaran = cleanTeks.match(/Metode Pembayaran\s*:\s*([^\n]+)/i)?.[1].trim() || "Bank Transfer";
    data.pengirim = "WA Iklan";
    data.order_id = `TELE-${Date.now().toString().slice(-6)}`;
    data.statusSheet = "KIRIM";
    data.statusDashboard = "Menunggu Diproses";

    const hrgMatch = cleanTeks.match(/\*?TOTAL\s*:\s*Rp\s*([0-9.,]+)\*?/i);
    if (hrgMatch) data.total_harga = parseInt(hrgMatch[1].replace(/[^0-9]/g, ''));

    let prods: string[] = [];
    let sizes: string[] = [];
    let totalQty = 0;
    let isReading = false;

    for (let l of lines) {
      const lineTrim = l.trim();
      if (lineTrim.toLowerCase().includes("pesanan (pack)")) { isReading = true; continue; }
      if (isReading) {
        if (lineTrim.toLowerCase().includes("format order") || lineTrim.toLowerCase().startsWith("harga:")) break;
        if (/^[1-9]\d?\.\s+[A-Za-z]/i.test(lineTrim)) {
          prods.push(lineTrim);
          const qm = lineTrim.match(/\(\s*(\d+)\s*(?:PCS|pcs|pc|item)?\s*\)/i);
          totalQty += qm ? parseInt(qm[1]) : 1;
          const sz = extractSize(lineTrim);
          if (sz) sizes.push(sz);
        }
      }
    }

    if (prods.length > 0) {
      data.produk = prods.join('\n');
      data.jumlah_produk = totalQty > 0 ? totalQty : prods.length;
      data.size = sizes.join('\n');
    }

    const ongkirNote = cleanTeks.match(/ongkir\s*:\s*([^\n]+)/i);
    if (ongkirNote) data.keterangan = ongkirNote[1].trim();

    const byr = data.pembayaran.toLowerCase();
    data.pengirimanSheet = (byr.includes("transfer") || byr.includes("bank")) ? "TRANSFER/MANUAL" : "COD/CSS JNE";
  }
  // 4. FORMAT CS SELVIA / BERDU STANDAR / WHATSAPP PESANAN (PACK)
  else {
    const dikirimKePart = cleanTeks.split(/Dikirim Ke\s*:/i)[1] || cleanTeks;

    data.nama = dikirimKePart.match(/Nama\s*:\s*([^\n]+)/i)?.[1].trim() || cleanTeks.match(/Nama\s*:\s*([^\n]+)/i)?.[1].trim() || "-";
    data.no_telp = dikirimKePart.match(/No\.?\s*(?:Telp WA|Hp)\s*:\s*([^\n]+)/i)?.[1].trim() || cleanTeks.match(/No\.?\s*(?:Telp WA|Hp)\s*:\s*([^\n]+)/i)?.[1].trim() || "-";
    
    let alamatMatch = dikirimKePart.match(/Alamat(?: lengkap)?\s*:\s*([\s\S]*?)(?=\n\s*\.|\n\s*Pembayaran|\n\s*Pesanan|$)/i);
    if (alamatMatch) {
      data.alamat = alamatMatch[1].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    }

    data.produk = cleanTeks.match(/Produk\s*:\s*([^\n]+)/i)?.[1].trim() || "-";
    const qtyMatch = data.produk.match(/\(\s*(\d+)x\s*\)/i);
    if (qtyMatch) data.jumlah_produk = parseInt(qtyMatch[1]);
    
    const hrgMatch = cleanTeks.match(/Total Yang Dibayarkan\s*:\s*Rp\s*([0-9.,]+)/i);
    if (hrgMatch) data.total_harga = parseInt(hrgMatch[1].replace(/[^0-9]/g, ''));
    data.pembayaran = cleanTeks.match(/Pembayaran\s*:\s*([^\n]+)/i)?.[1].trim() || "Bank Transfer";
      
      if (txtL.includes("order id : rnr") || txtL.includes("order id: rnr") || txtL.includes("rnr.id")) {
        data.pengirim = "BERDU RANURA";
      } else if (txtL.includes("order id : 4el") || txtL.includes("order id: 4el")) {
        data.pengirim = "BERDU 4EL";
      } else {
        data.pengirim = "BERDU RANURA";
      }
    data.size = extractSize(data.produk);

    const warnaMatch = data.produk.match(/<Warna:\s*([^>]+)>/i);
    if (warnaMatch) data.keterangan = `Warna: ${warnaMatch[1].trim()}`;

    data.order_id = cleanTeks.match(/Order Id\s*:\s*([^\n]+)/i)?.[1].trim() || data.order_id;
    
    const byr = data.pembayaran.toLowerCase();
    data.pengirimanSheet = (byr.includes("transfer") || byr.includes("bank")) ? "TRANSFER/LINCAH" : "COD/CSS JNE";
    data.statusSheet = "KIRIM";
    data.statusDashboard = "Menunggu Diproses";
  }

  return data;
}

// =================================================================
// 4. GEMINI AI FALLBACK
// =================================================================
async function ekstrakDenganGemini(pesanTeks: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const prompt = `Ekstrak data pesanan berikut menjadi JSON murni.
  Aturan bidang JSON:
  - "nama": Nama pelanggan
  - "no_telp": Nomor HP / WA
  - "alamat": Alamat lengkap pengiriman
  - "produk": Nama produk yang dipesan (gabungkan jika lebih dari 1)
  - "keterangan": Catatan atau variasi warna/keterangan
  - "size": Ukuran produk (S, M, L, XL, XXL, XXXL dsb)
  - "jumlah_produk": Jumlah total item (angka murni)
  - "pembayaran": Metode pembayaran (misal Bank Transfer, Cash, COD)
  - "order_id": Nomor order jika ada (jika tidak ada isi "-")
  - "total_harga": Total nominal yang dibayarkan (angka murni tanpa Rp)
  - "pengirim": Sumber pesanan (BERDU RANURA, WA Iklan, Pembelian offline, TUKER SIZE)
  
  Pesan: """${pesanTeks}"""
  BALAS HANYA FORMAT JSON TANPA PENJELASAN LAIN:
  {"nama":"","no_telp":"","alamat":"","produk":"","keterangan":"","size":"","jumlah_produk":1,"pembayaran":"","order_id":"","total_harga":0,"pengirim":""}`;

  try {
    const response = await fetch(url, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) 
    });
    const data = await response.json();
    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) return null;
    let textResult = data.candidates[0].content.parts[0].text;
    
    const start = textResult.indexOf('{');
    const end = textResult.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      return JSON.parse(textResult.substring(start, end + 1));
    }
    return null;
  } catch (error) { 
    return null; 
  }
}

// =================================================================
// 5. GOOGLE SHEETS UPLOADER
// =================================================================

let cachedSheets: string[] = [];
let lastCacheTime = 0;
async function getExistingSheets(sheets: any) {
  if (Date.now() - lastCacheTime > 5 * 60 * 1000 || cachedSheets.length === 0) {
    try {
      const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
      cachedSheets = meta.data.sheets?.map((s: any) => s.properties?.title || '') || [];
      lastCacheTime = Date.now();
    } catch(e: any) { console.log('Meta cache err:', e.message); }
  }
  return cachedSheets;
}
function getGoogleAuth() {
  // 1. Cek keberadaan file service-account.json di root
  const keyPath = path.resolve(process.cwd(), 'service-account.json');
  if (fs.existsSync(keyPath)) {
    try {
      const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      if (keyData.client_email && keyData.private_key) {
        return new google.auth.JWT({
          email: keyData.client_email,
          key: keyData.private_key,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
      }
    } catch (e) {
      console.error("Gagal membaca service-account.json:", e);
    }
  }

  // 2. Cek environment variables
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL.includes('email-service-account-anda')) {
    return new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  }

  return null;
}

async function appendToGoogleSheets(tabCategory: 'hijab' | 'swimwear', dataBaris: any[], dateOverride?: Date) {
  const auth = getGoogleAuth();
  if (!auth) {
    console.log("❌ Kredensial Google Service Account tidak ditemukan! Data hanya tersimpan di Dasbor.");
    return { status: "NO_CREDENTIALS" };
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Ambil daftar sheet yang sudah ada di spreadsheet
    const existingSheets = await getExistingSheets(sheets);

    const now = dateOverride || new Date();
    const monthYear = getIndoDate(now, "tab_bulan"); // e.g. "September 2026"
    
    let targetPrefix = tabCategory === 'hijab' ? "Ranura Hijab" : "Ranura Swimwear";
    let preferredTitle = `${targetPrefix} ${monthYear}`;

    // Cari tab yang case-insensitively cocok
    let matchedTab = existingSheets.find(s => {
      const sLow = s.toLowerCase();
      const catMatch = tabCategory === 'hijab' ? sLow.includes('hijab') : sLow.includes('swimwear');
      return catMatch && sLow.includes(monthYear.toLowerCase());
    });

    if (!matchedTab) {
      // Jika belum ada, buat tab baru
      matchedTab = preferredTitle;
      try {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          requestBody: {
            requests: [{ addSheet: { properties: { title: matchedTab } } }]
          }
        });
        // Pasang header baris 7
        const headers = [
          "TANGGAL ", "NAMA PENGIRIM ", "NAMA PEMBELI", "ALAMAT PEMBELI", "NOMOR TELEPON", 
          "PRODUK", "KETERANGAN", "SIZE", "QTY", "PENGIRIMAN", "STATUS", "TANGGAL", 
          "NO RESI ", "RETUR", "NO ORDER", "HARGA NON COD"
        ];
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `'${matchedTab}'!A7:P7`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [headers] }
        });
      } catch (createErr: any) {
        console.error("Gagal membuat sheet baru:", createErr.message);
      }
    }

    const appendRes = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${matchedTab}'!A:P`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [dataBaris] }
    });

    const updatedRange = appendRes.data.updates?.updatedRange || `${matchedTab}`;
    return { status: "SUCCESS", range: updatedRange, tab: matchedTab };
  } catch (err: any) {
    console.error("Gagal append ke Google Sheets:", err.message);
    return { status: "ERROR_API", error: err.message };
  }
}

// =================================================================
// 6. PROSES UTAMA (REGEX MANDIRI -> GEMINI AI CADANGAN)
// =================================================================
async function processOrderFromTelegram(pesan: string) {
  const cleanPesan = pesan.replace(/\u00A0/g, ' ').replace(/\r/g, '');
  const pesanLower = cleanPesan.toLowerCase();

  // 1. Ekstraksi dengan Regex Mandiri
  let dataFinal = ekstrakDenganRegex(cleanPesan);
  let usedAI = false;

  // 2. Fallback ke Gemini AI jika kedua bidang nama & produk gagal diekstrak
  if (dataFinal.nama === "-" || dataFinal.produk === "-") {
    console.log("Format belum dikenali Regex, beralih ke Gemini AI...");
    const aiData = await ekstrakDenganGemini(cleanPesan);
    if (aiData && (aiData.nama || aiData.produk)) {
      dataFinal = {
        ...dataFinal,
        nama: aiData.nama || dataFinal.nama,
        no_telp: aiData.no_telp || dataFinal.no_telp,
        alamat: aiData.alamat || dataFinal.alamat,
        produk: aiData.produk || dataFinal.produk,
        keterangan: aiData.keterangan || dataFinal.keterangan,
        size: aiData.size || extractSize(aiData.produk || "") || dataFinal.size,
        jumlah_produk: aiData.jumlah_produk || dataFinal.jumlah_produk,
        pembayaran: aiData.pembayaran || dataFinal.pembayaran,
        order_id: aiData.order_id && aiData.order_id !== "-" ? aiData.order_id : dataFinal.order_id,
        total_harga: Number(aiData.total_harga) || dataFinal.total_harga,
        pengirim: aiData.pengirim || dataFinal.pengirim
      };
      usedAI = true;
    }
  }

  // Jika tetap kosong, tidak dapat diproses
  if (dataFinal.nama === "-" && dataFinal.produk === "-") {
    return null;
  }

  const now = new Date();
  const deadlineSla = getDeadline7Hari(now);
  
  // Tentukan kategori tab (Hijab vs Swimwear)
  let isHijab = KATA_HIJAB.some(k => (dataFinal.produk.toLowerCase() + " " + pesanLower).includes(k));
  if (pesanLower.includes("format order ranura swimwear")) isHijab = false;
  if (pesanLower.includes("format order ranura hijab")) isHijab = true;
  const tabCategory = isHijab ? 'hijab' : 'swimwear';

  const safeTelp = dataFinal.no_telp.startsWith('+') ? `'${dataFinal.no_telp}` : dataFinal.no_telp;

  // Format 16 Kolom Sesuai Format Google Sheet Ranura (A s/d P)
  const isGeneratedId = dataFinal.order_id.startsWith('OFFLINE-') || dataFinal.order_id.startsWith('TELE-');
  const displayOrderId = isGeneratedId ? "-" : dataFinal.order_id;

  const barisBaru = [
    getIndoDate(now, "kolom_a"),                                                      // Col A: Tanggal
    dataFinal.pengirim,                                                               // Col B: Nama Pengirim
    dataFinal.nama,                                                                   // Col C: Nama Pembeli
    dataFinal.alamat,                                                                 // Col D: Alamat Pembeli
    safeTelp,                                                                         // Col E: Nomor Telepon
    dataFinal.produk,                                                                 // Col F: Produk
    dataFinal.keterangan || "",                                                       // Col G: Keterangan
    dataFinal.size || "",                                                             // Col H: Size
    String(dataFinal.jumlah_produk),                                                  // Col I: Qty
    dataFinal.pengirimanSheet,                                                        // Col J: Pengiriman
    "",                                                                               // Col K: Status
    "",                                                                               // Col L: Tanggal Batas Kirim (SLA)
    dataFinal.resi || "",                                                             // Col M: No Resi
    dataFinal.retur || "",                                                            // Col N: Retur
    displayOrderId,                                                                   // Col O: No Order
    dataFinal.total_harga ? dataFinal.total_harga.toLocaleString('id-ID') : ""        // Col P: Harga Non COD
  ];

  // Masukkan ke database memori & file lokal untuk Dasbor
  const newDashboardOrder = {
    id: dataFinal.order_id,
    platform: 'telegram',
    orderNumber: displayOrderId,
    sumber: dataFinal.pengirim,
    nama: dataFinal.nama,
    alamat: dataFinal.alamat,
    telp: dataFinal.no_telp,
    produk: dataFinal.produk,
    sku: dataFinal.sku || (isHijab ? 'HIJAB-ITEM' : 'SWIMWEAR-ITEM'),
    jumlah: dataFinal.jumlah_produk,
    pengiriman: dataFinal.pengirimanSheet,
    totalPrice: dataFinal.total_harga,
    status: dataFinal.statusDashboard || 'Menunggu Diproses',
    trackingNumber: dataFinal.resi || '-',
    resi: dataFinal.resi || '-',
    retur: dataFinal.retur || '',
    orderDate: now.toISOString(),
    shippingDate: deadlineSla.toISOString()
  };

  // Hilangkan duplikat jika ID order sudah pernah ada
  const existingIndex = masterDataOrder.findIndex(o => o.id === newDashboardOrder.id);
  if (existingIndex > -1) {
    masterDataOrder[existingIndex] = newDashboardOrder;
  } else {
    masterDataOrder.unshift(newDashboardOrder);
  }
  persistOrders();

  // Unggah baris ke Google Sheets
  const sheetResult = await appendToGoogleSheets(tabCategory, barisBaru);

  return {
    nama: dataFinal.nama,
    order_id: dataFinal.order_id,
    produk: dataFinal.produk,
    qty: dataFinal.jumlah_produk,
    total_harga: dataFinal.total_harga,
    pengirim: dataFinal.pengirim,
    ai: usedAI,
    sheetResult
  };
}

// =================================================================
// 7. INISIALISASI TELEGRAM BOT
// =================================================================
function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const bot = new Telegraf(TELEGRAM_TOKEN);

bot.catch((err: any, ctx) => {
  console.error(`Telegram Bot Error [${ctx?.updateType}]:`, err.message || err);
});

bot.command('start', async (ctx) => {
  await ctx.reply(
    `👋 <b>Halo! Bot Order Ranura Aktif</b>\n\n` +
    `Sistem otomatis mengekstrak pesanan dari chat dan langsung mencatatnya ke <b>Google Sheets</b> dan <b>Dasbor Ranura</b>.\n\n` +
    `📌 <b>Tips Penggunaan di Grup Telegram:</b>\n` +
    `Agar bot dapat membaca pesan di grup CS/operasional:\n` +
    `1. Jadikan bot ini sebagai <b>Admin Grup</b>, ATAU\n` +
    `2. Matikan fitur Group Privacy via @BotFather (<code>/setprivacy -> Disable</code>).\n\n` +
    `Ketik /status untuk memeriksa koneksi bot.`,
    { parse_mode: 'HTML' }
  );
});

bot.command('status', async (ctx) => {
  await ctx.reply(
    `📊 <b>Status Sistem Ranura Bot</b>\n` +
    `• Status Bot: 🟢 Aktif & Polling Lancar\n` +
    `• Endpoint Backend: <code>http://localhost:3001</code>\n` +
    `• Jumlah Pesanan Tersimpan: <b>${masterDataOrder.length}</b> pesanan\n` +
    `• Google Sheet ID: <code>${SPREADSHEET_ID}</code>`,
    { parse_mode: 'HTML' }
  );
});

let processQueue = Promise.resolve();



bot.on('document', async (ctx) => {
  try {
    const doc = ctx.message.document;
    if (!doc.file_name.match(/\.(xlsx|xls|csv)$/i)) {
      return; 
    }

    const waitMsg = await ctx.reply('📥 Menerima file Excel/CSV BigSeller... Memproses data...');
    
    const fileLink = await ctx.telegram.getFileLink(doc.file_id);
    const response = await fetch(fileLink.href);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Ambil rawRows (header: 1) untuk deteksi kolom A s/d K (Kolom H = index 7)
    const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (rawRows.length < 2) {
      return ctx.reply('❌ File kosong atau tidak memiliki data pesanan.');
    }

    const headers: string[] = (rawRows[0] || []).map((h: any) => String(h || '').trim());
    
    // Pencari index kolom cerdas berdasarkan header atau fallback urutan standar BigSeller
    const getColIndex = (regex: RegExp, fallbackIndex: number) => {
      const idx = headers.findIndex(h => regex.test(h));
      return idx !== -1 ? idx : fallbackIndex;
    };

    // Index kolom BigSeller:
    // Kolom A (0): Nama Panggilan Toko BigSeller
    // Kolom B (1): Waktu Berlaku
    // Kolom C (2): Waktu Pesanan Dibuat
    // Kolom D (3): Waktu Kedaluwarsa
    // Kolom E (4): Nama Penerima
    // Kolom F (5): Nomor Telepon
    // Kolom G (6): Alamat Lengkap
    // Kolom H (7): SKU / Nama Produk
    // Kolom I (8): Jumlah
    // Kolom J (9): Jasa Kirim yang Dipilih Pembeli
    // Kolom K (10): Nomor Pesanan
    const colShopIdx = getColIndex(/^(nama\s*panggilan\s*toko|nama\s*toko|toko|shop|store)/i, 0);
    const colValidTimeIdx = getColIndex(/^(waktu\s*berlaku)/i, 1);
    const colOrderDateIdx = getColIndex(/^(waktu\s*pesanan\s*dibuat|waktu\s*dibuat|tanggal\s*pesanan|order\s*time|created)/i, 2);
    const colExpiryIdx = getColIndex(/^(waktu\s*kedaluwarsa|batas\s*waktu|deadline|sla)/i, 3);
    const colCustomerIdx = getColIndex(/^(nama\s*penerima|penerima|nama\s*pembeli|username\s*\(pembeli\)|customer|buyer)/i, 4);
    const colPhoneIdx = getColIndex(/^(nomor\s*telepon|no\.?\s*telp|no\.?\s*hp|phone|telepon)/i, 5);
    const colAddressIdx = getColIndex(/^(alamat\s*lengkap|alamat\s*pengiriman|alamat|address)/i, 6);
    const colSkuIdx = getColIndex(/^(sku|nama\s*produk|produk|product\s*name|product|item)/i, 7); // Kolom H (index 7)
    const colQtyIdx = getColIndex(/^(jumlah|qty|quantity)/i, 8);
    const colCourierIdx = getColIndex(/^(jasa\s*kirim|kurir|opsi\s*pengiriman|shipping|courier)/i, 9);
    const colOrderNumIdx = getColIndex(/^(nomor\s*pesanan|no\.?\s*pesanan|order\s*(?:id|number|no)|no\s*order)/i, 10);
    const colPriceIdx = headers.findIndex(h => /^(total|harga|price|amount|tagihan)/i.test(h));
    const colStatusIdx = headers.findIndex(h => /^(status)/i.test(h));

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (let r = 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0 || row.every((c: any) => c === '' || c === undefined || c === null)) continue;

      // 1. Nomor Pesanan (Kolom K / colOrderNumIdx)
      let rawOrderNum = row[colOrderNumIdx];
      if (!rawOrderNum || String(rawOrderNum).trim() === '') {
        for (let c = 0; c < row.length; c++) {
          if (c !== colOrderDateIdx && c !== colValidTimeIdx && c !== colExpiryIdx) {
            const valStr = String(row[c] || '').trim();
            if (/^[0-9]{2}[0-1][0-9][0-3][0-9][A-Za-z0-9]{6,}$/.test(valStr) || /^\d{15,19}$/.test(valStr)) {
              rawOrderNum = valStr;
              break;
            }
          }
        }
      }
      const orderNumber = String(rawOrderNum || `BS-${Date.now()}-${r}`).trim();

      // 2. Nama Toko & Platform (Kolom A / colShopIdx)
      const shopName = String(row[colShopIdx] || 'Ranura Official').trim();

      // 3. Nama Penerima (Kolom E / colCustomerIdx)
      const customerName = String(row[colCustomerIdx] || 'Pembeli').trim();

      // 4. Nomor Telepon (Kolom F / colPhoneIdx)
      const customerPhone = String(row[colPhoneIdx] || '-').trim();

      // 5. Alamat Lengkap (Kolom G / colAddressIdx)
      const shippingAddress = String(row[colAddressIdx] || '-').trim();

      // 6. PRODUK & KETERANGAN / SKU (KOLOM H / colSkuIdx / index 7)
      // Sesuai instruksi: diisi sesuai dengan nama produk pada kolom H file excel
      const rawProductColH = String(
        (row[colSkuIdx] !== undefined && row[colSkuIdx] !== '') ? row[colSkuIdx] : (row[7] || 'Produk')
      ).trim();
      const productName = rawProductColH;
      const sku = rawProductColH;

      // Ekstrak Size jika ada (e.g. " M", "- L", " XL")
      let detectedSize = '-';
      const sizeMatch = rawProductColH.match(/\b(XXXL|XXL|XL|XS|[SML])\b/i);
      if (sizeMatch) {
        detectedSize = sizeMatch[1].toUpperCase();
      }

      // 7. Jumlah / Qty (Kolom I / colQtyIdx)
      const rawQty = row[colQtyIdx];
      const qty = parseInt(String(rawQty || '1').replace(/\D/g, '')) || 1;

      // 8. Jasa Kirim / Kurir (Kolom J / colCourierIdx)
      const courier = String(row[colCourierIdx] || '-').trim();

      // 9. Tanggal Pesanan (Kolom C / colOrderDateIdx)
      const rawDate = row[colOrderDateIdx] || row[colValidTimeIdx];
      let parsedDate = new Date();
      if (rawDate) {
        if (typeof rawDate === 'number') {
          // Excel serial date to JS Date (25569 = 1970-01-01)
          parsedDate = new Date((rawDate - 25569) * 86400 * 1000);
        } else if (typeof rawDate === 'string') {
          let cleanStr = rawDate.replace(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/, '$3-$2-$1');
          const dTest = new Date(cleanStr);
          if (!isNaN(dTest.getTime())) {
            parsedDate = dTest;
          }
        }
      }
      if (isNaN(parsedDate.getTime())) {
        parsedDate = new Date();
      }

      // 10. Waktu Kedaluwarsa / SLA (Kolom D / colExpiryIdx)
      const rawExpiry = row[colExpiryIdx];
      let expireDate: Date | null = null;
      if (rawExpiry) {
        if (typeof rawExpiry === 'number') {
          expireDate = new Date((rawExpiry - 25569) * 86400 * 1000);
        } else if (typeof rawExpiry === 'string') {
          const dTest = new Date(rawExpiry);
          if (!isNaN(dTest.getTime())) expireDate = dTest;
        }
      }
      const slaDateObj = expireDate || new Date(parsedDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      const slaStr = `${String(slaDateObj.getDate()).padStart(2, '0')}-${String(slaDateObj.getMonth() + 1).padStart(2, '0')}-${slaDateObj.getFullYear()}`;

      // 11. Harga / Total Tagihan
      let totalPrice = 0;
      if (colPriceIdx !== -1) {
        const rawP = row[colPriceIdx];
        totalPrice = typeof rawP === 'number' ? rawP : parseInt(String(rawP || '0').replace(/\D/g, '')) || 0;
      }

      // 12. Status Pesanan
      let mappedStatus = 'Menunggu Diproses';
      if (colStatusIdx !== -1) {
        const rawStatus = String(row[colStatusIdx] || '').toLowerCase();
        if (rawStatus.includes('kirim') || rawStatus.includes('jalan') || rawStatus.includes('pickup') || rawStatus.includes('cetak')) mappedStatus = 'Pesanan Dikirim';
        else if (rawStatus.includes('selesai') || rawStatus.includes('terima') || rawStatus.includes('sampai') || rawStatus.includes('completed')) mappedStatus = 'Pesanan Selesai';
        else if (rawStatus.includes('batal') || rawStatus.includes('cancel')) mappedStatus = 'Pesanan Dibatalkan';
        else if (rawStatus.includes('retur') || rawStatus.includes('kembali') || rawStatus.includes('return')) mappedStatus = 'Pesanan Retur';
      }

      // 13. Platform
      let platform = 'shopee';
      if (/^\d{15,19}$/.test(orderNumber) || /tiktok/i.test(shopName)) {
        platform = 'tiktok';
      } else if (/shopee/i.test(shopName) || /spx/i.test(courier) || /^[0-9]{2}[0-1][0-9][0-3][0-9][A-Za-z0-9]+$/.test(orderNumber)) {
        platform = 'shopee';
      }

      const uniqueId = `ord-${platform}-${orderNumber}`;

      const orderData = {
        id: uniqueId,
        orderNumber: String(orderNumber),
        orderDate: parsedDate.toISOString(),
        platform: platform,
        customerName: String(customerName),
        nama: String(customerName),
        productName: String(productName),
        produk: String(productName),
        sku: String(sku),
        qty: qty,
        jumlah: qty,
        totalPrice: totalPrice,
        total_harga: totalPrice,
        status: mappedStatus,
        shippingAddress: String(shippingAddress),
        alamat: String(shippingAddress),
        trackingNumber: '-',
        resi: '-',
        customerPhone: String(customerPhone),
        telp: String(customerPhone),
        no_telp: String(customerPhone),
        shopName: String(shopName),
        sumber: String(shopName),
        pengirim: String(shopName),
        shippingDate: slaDateObj.toISOString(),
        pengiriman: String(courier || '-'),
        notes: String(rawProductColH)
      };

      // Cek apakah pesanan sudah ada
      const existingIdx = masterDataOrder.findIndex((o: any) => o.id === uniqueId || o.orderNumber === orderNumber);
      if (existingIdx !== -1) {
        masterDataOrder[existingIdx] = {
          ...masterDataOrder[existingIdx],
          ...orderData
        };
        updated++;
      } else {
        masterDataOrder.unshift(orderData);
        inserted++;
      }

      // Kirim / Sinkron ke Google Sheets (16 Kolom Lengkap A s/d P)
      const prodCheckStr = (productName + ' ' + shopName).toLowerCase();
      let isHijab = true;
      if (prodCheckStr.includes('swimwear') || prodCheckStr.includes('safeswim') || prodCheckStr.includes('male') || prodCheckStr.includes('female') || prodCheckStr.includes('renang')) {
        isHijab = false;
      }
      if (prodCheckStr.includes('hijab') || prodCheckStr.includes('pasmina') || prodCheckStr.includes('pashmina') || prodCheckStr.includes('khimar') || prodCheckStr.includes('bergo')) {
        isHijab = true;
      }
      const tabCategory: 'hijab' | 'swimwear' = isHijab ? 'hijab' : 'swimwear';

      let kValue = '';
      let lValue = '';
      if (mappedStatus === 'Pesanan Dikirim') {
        kValue = 'KIRIM';
        const d = new Date();
        lValue = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
      } else if (mappedStatus === 'Pesanan Retur') {
        kValue = 'RETUR';
      } else if (mappedStatus === 'Pesanan Dibatalkan') {
        kValue = 'CANCEL';
      } else if (mappedStatus === 'Pesanan Selesai') {
        kValue = 'SELESAI';
      }

      const safeTelp = customerPhone ? (customerPhone.startsWith('+') ? `'${customerPhone}` : customerPhone) : '-';

      const barisBaru = [
        getIndoDate(parsedDate, "kolom_a"), // Col A: Tanggal
        shopName || platform,               // Col B: Nama Pengirim (safeswim official / Ranura Official)
        customerName,                       // Col C: Nama Pembeli (F**y)
        shippingAddress,                    // Col D: Alamat Pembeli
        safeTelp,                           // Col E: Nomor Telepon
        productName,                        // Col F: Produk (Kolom H Excel)
        rawProductColH,                     // Col G: Keterangan (Kolom H Excel)
        detectedSize,                       // Col H: Size
        String(qty),                        // Col I: Qty
        courier,                            // Col J: Pengiriman
        kValue,                             // Col K: Status
        lValue || slaStr,                   // Col L: SLA / Tanggal Kirim
        '-',                                // Col M: No Resi
        '',                                 // Col N: Retur
        orderNumber,                        // Col O: No Order
        totalPrice ? Number(totalPrice).toLocaleString('id-ID') : '' // Col P: Harga Non COD
      ];

      await appendToGoogleSheets(tabCategory, barisBaru, parsedDate).catch(e => console.log("Gagal push ke sheet", e));
    }

    if (inserted > 0 || updated > 0) {
      persistOrders();
      let notif = `✅ <b>Berhasil memproses file Excel BigSeller!</b>\n\n`;
      if (inserted > 0) notif += `📥 <b>${inserted}</b> pesanan baru dimasukkan ke Dasbor & Google Sheets.\n`;
      if (updated > 0) notif += `🔄 <b>${updated}</b> pesanan diperbarui (Nama Produk & SKU Kolom H telah disesuaikan).\n`;
      if (skipped > 0) notif += `⚠️ ${skipped} baris dilewati.\n`;
      ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, undefined, notif, { parse_mode: 'HTML' });
    } else {
      ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, undefined, `⚠️ Tidak ada data pesanan baru yang diproses dari file Excel.`);
    }

  } catch (err: any) {
    console.error(err);
    ctx.reply('❌ Terjadi kesalahan saat membaca/memproses file Excel: ' + err.message);
  }
});


bot.on(['text', 'message'], async (ctx) => {
  const msgObj = ctx.message as any;
  const rawText = msgObj?.text || msgObj?.caption || '';
  if (!rawText) return;

  const cleanTeks = rawText.replace(/\u00A0/g, ' ').replace(/\r/g, '');
  const txtLower = cleanTeks.toLowerCase();

  console.log(`[TELEGRAM INCOMING] Dari: ${ctx.from?.first_name || 'Anonim'} (@${ctx.from?.username || '-'}), Panjang Teks: ${cleanTeks.length} karakter`);

  // Pemicu pendeteksi order (mencakup semua kata kunci format)
  const isOrderMessage = 
    /Nama(?:\s*lengkap)?\s*:/i.test(cleanTeks) ||
    /Order\s*Id\s*:/i.test(cleanTeks) ||
    txtLower.includes("pembelian ofline") ||
    txtLower.includes("pembelian offline") ||
    txtLower.includes("format retur") ||
    txtLower.includes("tuker size") ||
    txtLower.includes("pesanan (pack)") ||
    txtLower.includes("form order") ||
    txtLower.includes("dikirim ke") ||
    txtLower.includes("cs selvia") ||
    ALL_KEYWORDS.some(k => txtLower.includes(k));

  if (isOrderMessage) {
    console.log(`[ORDER DETECTED] Mengantre pesanan...`);
    
    // Gunakan antrean (queue) agar pemrosesan & pengiriman ke Sheets berurutan (tidak saling tumpuk)
    processQueue = processQueue.then(async () => {
      console.log(`[ORDER DETECTED] Memproses format pesanan...`);
      try {
        try {
          await ctx.reply(`🔄 <b>Memproses Data Pesanan...</b>`, { parse_mode: 'HTML' });
        } catch (rErr) {}

        const hasil = await processOrderFromTelegram(cleanTeks);
      
      if (hasil) {
        const ikon = hasil.ai ? "🧠 (Gemini AI Fallback)" : "⚙️ (Regex Mandiri)";
        let msg = `✅ <b>Pesanan Berhasil Dicatat!</b> (${ikon})\n\n`;
        msg += `• <b>Nama:</b> ${escapeHtml(hasil.nama)}\n`;
        msg += `• <b>Order ID:</b> <code>${escapeHtml(hasil.order_id)}</code>\n`;
        msg += `• <b>Sumber:</b> ${escapeHtml(hasil.pengirim)}\n`;
        msg += `• <b>Jumlah Item:</b> ${hasil.qty} pcs\n`;
        if (hasil.total_harga) {
          msg += `• <b>Total Harga:</b> Rp ${hasil.total_harga.toLocaleString('id-ID')}\n`;
        }
        msg += `• <b>Dasbor:</b> ✅ Tersinkronisasi\n`;

        if (hasil.sheetResult.status === "SUCCESS") {
          msg += `• <b>Google Sheets:</b> ✅ Masuk ke <code>${escapeHtml(hasil.sheetResult.range)}</code>`;
          console.log(`[SHEETS SUCCESS] Data tercatat di Google Sheets: ${hasil.sheetResult.range}`);
        } else if (hasil.sheetResult.status === "NO_CREDENTIALS") {
          msg += `• <b>Google Sheets:</b> ⚠️ Kredensial Service Account belum terdeteksi.`;
          console.warn(`[SHEETS WARNING] Service account credentials tidak ditemukan.`);
        } else {
          msg += `• <b>Google Sheets:</b> ❌ Gagal: ${escapeHtml(hasil.sheetResult.error || 'Galat tidak diketahui')}`;
          console.error(`[SHEETS ERROR] ${hasil.sheetResult.error}`);
        }

        await ctx.reply(msg, { parse_mode: 'HTML' });
      } else {
        console.warn(`[PARSER UNKNOWN] Format teks belum dapat diekstrak.`);
        await ctx.reply(`⚠️ Format teks belum dapat dikenali oleh sistem.`);
      }
    } catch (e: any) {
      console.error("Error Telegram bot handler:", e);
      try {
        await ctx.reply(`❌ Terjadi kendala saat memproses pesanan: ${escapeHtml(e.message)}`);
      } catch (rErr) {}
    }
    }); // Tutup processQueue.then
  }
});

// Peluncur bot dengan konfirmasi getMe & auto-reconnect
async function startTelegramBot() {
  try {
    console.log(`📡 Menghubungkan Telegram Bot...`);
    try {
      await bot.telegram.deleteWebhook({ drop_pending_updates: false });
    } catch (wErr: any) {}

    const me = await bot.telegram.getMe();
    console.log(`🤖 ✅ Berhasil terhubung ke Telegram sebagai @${me.username} (${me.first_name})!`);
    console.log(`🔒 Status Privacy Mode: ${me.can_read_all_group_messages ? 'Membaca semua pesan grup' : 'Hanya membaca mention/admin di grup'}`);

    bot.launch().then(() => {
      console.log("Telegram bot stopped.");
    }).catch(async (err: any) => {
      console.error(`❌ Telegram Bot Error: ${err.message}. Mencoba menghubungkan kembali dalam 5 detik...`);
      setTimeout(startTelegramBot, 5000);
    });

    console.log("🤖 ✅ Telegram Bot + HYBRID V3 POLLING AKTIF!");
  } catch (err: any) {
    console.error(`❌ Gagal inisialisasi Telegram Bot: ${err.message}. Mencoba lagi dalam 5 detik...`);
    setTimeout(startTelegramBot, 5000);
  }
}

startTelegramBot();

async function syncFromGoogleSheets() {
  const auth = getGoogleAuth();
  if (!auth) return;
  try {
    const sheets = google.sheets({ version: 'v4', auth });
    const existingSheets = await getExistingSheets(sheets);
    
    const currentYear = new Date().getFullYear().toString();
    const sheetsToSearch = existingSheets.filter(t => t.includes(currentYear)).reverse();

    let anyUpdated = false;
    if (sheetsToSearch.length > 0) {
      const ranges = sheetsToSearch.map(tab => `'${tab}'!A:P`);
      const dataResp = await sheets.spreadsheets.values.batchGet({ spreadsheetId: SPREADSHEET_ID, ranges });
      
      if (dataResp.data.valueRanges) {
        for (const vr of dataResp.data.valueRanges) {
          const rows = vr.values || [];
          for (let i = rows.length - 1; i >= Math.max(0, rows.length - 300); i--) {
            const r = rows[i];
            if (r.length > 5) {
              const cOrder = r[14] || '';
              const cNama = r[2] || '';
              const cStatus = r[10] || ''; // Kolom K (STATUS)
              
              if (cStatus) {
                 let dashStatus = '';
                 const existingOrder = masterDataOrder.find((o: any) => o.id === cOrder || o.orderNumber === cOrder || (o.nama === cNama && o.nama !== "-" && o.nama !== ""));
                 
                 if (cStatus === 'KIRIM') {
                    if (existingOrder && (existingOrder.status === 'Menunggu Dicetak' || existingOrder.status === 'Menunggu Pickup')) {
                        dashStatus = existingOrder.status;
                    } else {
                        dashStatus = 'Pesanan Dikirim';
                    }
                 }
                 if (cStatus === 'RETUR') dashStatus = 'Pesanan Retur';
                 if (cStatus === 'CANCEL') dashStatus = 'Pesanan Dibatalkan';
                 if (cStatus === 'SELESAI') dashStatus = 'Pesanan Selesai';
                 
                 if (dashStatus) {
                    if (existingOrder && existingOrder.status !== dashStatus) {
                       existingOrder.status = dashStatus;
                       anyUpdated = true;
                    }
                 }
              }
            }
          }
        }
      }
    }
    if (anyUpdated) persistOrders();
  } catch (e: any) {
    console.error("Gagal sync dari sheets:", e.message);
  }
}

  // Jalankan sinkronisasi dua arah setiap 30 detik (untuk menghemat kuota Google Sheets API)
  setInterval(syncFromGoogleSheets, 30000);
syncFromGoogleSheets();

const PORT = 3001;
const server = app.listen(PORT, () => { 
  console.log(`🧠 BACKEND API MENYALA DI PORT ${PORT}`); 
});

const cleanup = () => {
  console.log("Menutup Telegram Bot & Server API...");
  try { bot.stop(); } catch (e) {}
  try { server.close(); } catch (e) {}
};

process.once('SIGINT', cleanup);
process.once('SIGTERM', cleanup);