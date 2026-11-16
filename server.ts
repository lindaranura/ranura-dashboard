import express from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Orders (reads directly from data/telegram_orders.json)
  app.get("/api/orders", (req, res) => {
    try {
      const ordersFile = path.join(process.cwd(), 'data', 'telegram_orders.json');
      if (fs.existsSync(ordersFile)) {
        const raw = fs.readFileSync(ordersFile, 'utf8');
        return res.json(JSON.parse(raw));
      }
    } catch (e) {}
    res.json([]);
  });

  app.delete("/api/orders/:id", async (req, res) => {
    try {
      const resp = await fetch('http://localhost:3001/api/orders/' + req.params.id, {
        method: 'DELETE'
      });
      const data = await resp.json();
      return res.json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/orders/test", async (req, res) => {
    try {
      const resp = await fetch('http://localhost:3001/api/orders/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body)
      });
      const data = await resp.json();
      return res.json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // API: Update Inventory Google Sheet directly
  // ==========================================
  const DEFAULT_SWIMWEAR_SHEET_ID = '1u8oVPIyH7oh4rEpkXQGAHmOOQka01vWILVM8eOSAtD8';
  const DEFAULT_HIJAB_SHEET_ID = '1YAkmsRxamdK5XiK-IpvpS-p9jym3vn3z-M5gLkqrYC8';

  function parseNumber(val: any): number {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    const cleaned = String(val).replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.-]/g, '');
    return parseInt(cleaned) || 0;
  }

  function parseCurrency(val: any): number {
    if (!val) return 0;
    if (typeof val === 'number') return Math.round(val);
    let str = String(val).trim();
    if (str.includes(',')) str = str.split(',')[0];
    const cleaned = str.replace(/[^0-9]/g, '');
    return parseInt(cleaned) || 0;
  }

  app.post("/api/inventory/update-stock", async (req, res) => {
    try {
      const { type, sheetId, sku, name, qty, keterangan, platform, catatan, date } = req.body;
      const targetSheetId = sheetId || DEFAULT_SWIMWEAR_SHEET_ID;
      if (!name || !qty || !type) return res.status(400).json({ error: "Missing required fields" });

      const keyPath = path.resolve(process.cwd(), 'service-account.json');
      if (!fs.existsSync(keyPath)) {
        return res.status(500).json({ error: "No service-account.json found" });
      }

      const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      const auth = new google.auth.JWT({
        email: keyData.client_email,
        key: keyData.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const sheets = google.sheets({ version: 'v4', auth });

      // Parse date to find the month
      const dateObj = date ? new Date(date) : new Date();
      const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const monthStr = monthNames[dateObj.getMonth()];
      const yearStr = dateObj.getFullYear();
      
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const formattedDate = `${day}/${month}/${yearStr}`;

      // Get available tabs
      const meta = await sheets.spreadsheets.get({ spreadsheetId: targetSheetId });
      const availableTabs = meta.data.sheets?.map(s => s.properties?.title || '') || [];
      
      const searchKeyword = type === 'in' ? 'masuk' : 'keluar';
      
      // Look from current month down to januari to find the latest valid month tab
      const monthsDesc = ['desember', 'november', 'oktober', 'september', 'agustus', 'juli', 'juni', 'mei', 'april', 'maret', 'februari', 'januari'];
      let targetSheetName: string | undefined;

      // 1. Try exact month match first
      const currentMonthLower = monthStr.toLowerCase();
      targetSheetName = availableTabs.find(t => {
        const lower = t.toLowerCase();
        return lower.includes(searchKeyword) && (lower.includes(currentMonthLower) || lower.includes(currentMonthLower.substring(0, 3)));
      });

      // 2. Fallback: find latest available month tab
      if (!targetSheetName) {
        for (const m of monthsDesc) {
          targetSheetName = availableTabs.find(t => {
            const lower = t.toLowerCase();
            return lower.includes(searchKeyword) && lower.includes(m);
          });
          if (targetSheetName) break;
        }
      }

      // 3. Fallback: any tab matching searchKeyword
      if (!targetSheetName) {
        targetSheetName = availableTabs.find(t => t.toLowerCase().includes(searchKeyword)) || availableTabs[0];
      }

      let rowValues: any[] = [];
      let startCol = '';
      let endCol = '';
      let startRowNumber = 5;
      
      if (type === 'in') {
        // Masuk: [Tanggal, Nama Barang, Qty, Keterangan, Platform, Catatan] -> 6 columns (A to F)
        rowValues = [formattedDate, name, qty, keterangan || 'PRODUKSI', platform || '', catatan || ''];
        startCol = 'A';
        endCol = 'F';
        startRowNumber = 5;
      } else {
        // Keluar: [Tanggal, Nama Barang, Qty, Orderan/Platform, Keterangan/Catatan] -> 5 columns (B to F, Col A blank)
        rowValues = [formattedDate, name, qty, platform || 'SHOPEE', catatan || keterangan || ''];
        startCol = 'B';
        endCol = 'F';
        startRowNumber = 5;
      }

      // Check last row's date to determine if a spacer row is needed
      const dataResp = await sheets.spreadsheets.values.get({
        spreadsheetId: targetSheetId,
        range: `'${targetSheetName}'!${startCol}${startRowNumber}:${endCol}`
      });
      
      const rows = dataResp.data.values || [];
      let lastDate = '';
      let maxPopulatedRow = startRowNumber - 1; 
      
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (r && r.length > 0 && r.some(c => c && String(c).trim() !== '')) {
          maxPopulatedRow = startRowNumber + i;
          let d = r[0] ? String(r[0]).trim() : '';
          if (d.match(/^\d{2}\/\d{2}\/\d{4}$/) || d.match(/^\d{5}$/)) {
            lastDate = d;
          }
        }
      }

      let targetRow = maxPopulatedRow + 1;

      const valuesToUpdate: any[][] = [];
      if (maxPopulatedRow >= startRowNumber && lastDate && lastDate !== formattedDate) {
        // Insert spacer row
        valuesToUpdate.push(Array(rowValues.length).fill('')); 
      }
      valuesToUpdate.push(rowValues);

      const endRow = targetRow + valuesToUpdate.length - 1;
      const updateRange = `'${targetSheetName}'!${startCol}${targetRow}:${endCol}${endRow}`;

      await sheets.spreadsheets.values.update({
        spreadsheetId: targetSheetId,
        range: updateRange,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: valuesToUpdate
        }
      });

      console.log(`[INVENTORY] Updated stock (${type}) for ${name} into '${targetSheetName}'!${updateRange}`);
      res.json({ success: true, targetSheetName, rowValues, updateRange });
    } catch (err: any) {
      console.error("Failed to append stock:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Helper function to fetch catalog items from a specific sheet
  async function fetchItemsFromSheet(sheetId: string, monthParam?: string) {
    const keyPath = path.resolve(process.cwd(), 'service-account.json');
    if (!fs.existsSync(keyPath)) {
      throw new Error("No service-account.json found");
    }

    const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    const auth = new google.auth.JWT({
      email: keyData.client_email,
      key: keyData.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const availableTabs = meta.data.sheets?.map(s => s.properties?.title || '') || [];

    let isHijab = sheetId === DEFAULT_HIJAB_SHEET_ID;
    const targetMonth = monthParam && monthParam !== 'default' && monthParam !== 'all' 
      ? monthParam.toLowerCase() 
      : (isHijab ? 'september' : 'agustus');

    let matchedTab: string | undefined = availableTabs.find(t => {
      const lower = t.toLowerCase();
      return (lower.includes('katalog') || lower.includes('barang')) && lower.includes(targetMonth);
    });

    if (!matchedTab) {
      const monthsDesc = ['desember', 'november', 'oktober', 'september', 'agustus', 'juli', 'juni', 'mei', 'april', 'maret', 'februari', 'januari'];
      for (const m of monthsDesc) {
        matchedTab = availableTabs.find(t => {
          const lower = t.toLowerCase();
          return (lower.includes('katalog') || lower.includes('barang')) && lower.includes(m);
        });
        if (matchedTab) break;
      }
    }

    if (!matchedTab) {
      matchedTab = availableTabs.find(t => t.toLowerCase().includes('katalog')) || availableTabs[0];
    }

    console.log(`[INVENTORY] Fetching items for sheet ${sheetId} using tab "${matchedTab}"`);
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `'${matchedTab}'!A1:N600`
    });

    const rows = resp.data.values || [];
    let headerRowIdx = -1;

    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const rowStr = (rows[i] || []).join(' ').toLowerCase();
      if (rowStr.includes('nama barang') && (rowStr.includes('kode barang') || rowStr.includes('stok awal') || rowStr.includes('bulan'))) {
        headerRowIdx = i;
        if (rowStr.includes('bulan')) isHijab = true;
        break;
      }
    }

    const startIdx = headerRowIdx >= 0 ? headerRowIdx + 2 : (isHijab ? 4 : 5);
    const items: any[] = [];
    let skuCounter = 1;

    for (let i = startIdx; i < rows.length; i++) {
      const r = rows[i];
      if (!r || !r[1]) continue;
      const name = String(r[1]).trim();
      if (!name || name.toLowerCase().includes('kosongkan') || name.toLowerCase().includes('nama barang')) continue;

      let sku = r[0] ? String(r[0]).trim() : '';
      if (!sku || ['januari','februari','maret','april','mei','juni','juli','agustus','september','oktober','november','desember','bulan'].includes(sku.toLowerCase())) {
        sku = name;
      }

      const initialStock = parseNumber(r[2]);
      const stockIn = parseNumber(r[3]);
      const stockOut = parseNumber(r[4]);
      const stock = parseNumber(r[5]);
      const buyPrice = parseCurrency(r[6]);
      const sellPrice = parseCurrency(r[8]);

      let category = "Pakaian Apung";
      if (isHijab) {
        if (name.toLowerCase().includes('rosal')) category = "Rompi Sholat Rosal";
        else if (name.toLowerCase().includes('outer') || name.toLowerCase().includes('murih')) category = "Ranura Outer & Hijab";
        else category = "Ranura Hijab";
      } else {
        if (name.toLowerCase().includes('kids')) category = "Baju Renang Anak";
        else if (name.toLowerCase().includes('female')) category = "Baju Renang Muslimah";
        else if (name.toLowerCase().includes('male')) category = "Baju Renang Pria";
        else if (name.toLowerCase().includes('proswim')) category = "Ranura Proswim";
        else category = "Baju Renang Ranura";
      }

      items.push({
        id: `item-${sheetId.substring(0, 6)}-${skuCounter++}`,
        name,
        sku,
        category,
        stock,
        reserved: 0,
        initialStock,
        stockIn,
        stockOut,
        buyPrice,
        sellPrice,
        status: stock > 15 ? 'optimal' : stock > 5 ? 'warning' : 'critical',
        unit: 'pcs',
        sourceSheetId: sheetId,
        sourceSheetName: isHijab ? 'Ranura Hijab & Rosal' : 'Ranura Swimwear'
      });
    }

    return items;
  }

  app.get("/api/inventory/sheet", async (req, res) => {
    try {
      const requestedId = req.query.id as string;
      const month = (req.query.month as string) || 'default';
      console.log(`[INVENTORY] Fetching sheet: ${requestedId || 'all'}, month: ${month}`);

      if (!requestedId || requestedId === 'all') {
        const [swimwearItems, hijabItems] = await Promise.all([
          fetchItemsFromSheet(DEFAULT_SWIMWEAR_SHEET_ID, month).catch(e => { console.warn("Failed swimwear fetch:", e.message); return []; }),
          fetchItemsFromSheet(DEFAULT_HIJAB_SHEET_ID, month).catch(e => { console.warn("Failed hijab fetch:", e.message); return []; })
        ]);
        const allItems = [...swimwearItems, ...hijabItems];
        console.log(`[INVENTORY] Fetched total ${allItems.length} items (${swimwearItems.length} Swimwear + ${hijabItems.length} Hijab)`);
        return res.json(allItems);
      } else {
        const items = await fetchItemsFromSheet(requestedId, month);
        console.log(`[INVENTORY] Fetched ${items.length} items from ${requestedId}`);
        return res.json(items);
      }
    } catch (err: any) {
      console.error("Failed to fetch sheet", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { message, history } = req.body;
      
      const systemInstruction = `
        Anda adalah AI Asisten Customer Service 24-Jam untuk toko online Ranura & Mayudee, produsen pakaian renang apung keselamatan dan perlengkapan ibadah premium di Indonesia.
        Tugas utama Anda adalah menjawab pertanyaan pelanggan di marketplace (Shopee, TikTok Shop, dll) dengan sangat cepat, ramah, profesional, dan akurat untuk mempertahankan performa chat toko di atas 95% (standar marketplace).
        
        Informasi Produk:
        1. Baju Renang Apung Ranura (SKU: RANURA-APUNG-V2)
           - Kategori: Pakaian Apung / Keselamatan Renang
           - Deskripsi: Baju renang dengan teknologi apung built-in yang menjaga tubuh tetap mengambang di air. Aman untuk pemula dan anak-anak. Bahan lycra premium anti-UV, ringan, cepat kering.
           - Ukuran: S, M, L, XL, XXL
           - Harga: Rp 450.000 per pcs
        2. Baju Renang Apung Anak Ranura (SKU: RANURA-APUNG-KIDS)
           - Kategori: Pakaian Apung / Keselamatan Renang Anak
           - Deskripsi: Versi anak dari Baju Renang Apung Ranura. Dilengkapi pelampung internal yang tidak terlihat, desain ceria dan nyaman. Cocok untuk usia 3-12 tahun.
           - Ukuran: XS (3-5th), S (5-7th), M (7-9th), L (9-12th)
           - Harga: Rp 350.000 per pcs
        3. Rompi Sholat Madani Mayudee (SKU: MAYUDEE-MADANI-M1)
           - Kategori: Perlengkapan Ibadah
           - Deskripsi: Rompi sholat katun premium yang sangat adem dan nyaman digunakan ibadah. Desain elegan dan rapi. Dilengkapi pouch (tas penyimpanan) mini eksklusif bermerk Mayudee.
           - Ukuran: M, L, XL
           - Harga: Rp 150.000 per pcs
        4. Rompi Sholat Islah Mayudee (SKU: MAYUDEE-ISLAH-I1)
           - Kategori: Perlengkapan Ibadah
           - Deskripsi: Model Islah dengan desain modern minimalis. Bahan katun combed 30s, jahitan presisi rapi, cocok untuk sehari-hari dan bepergian.
           - Ukuran: M, L, XL
           - Harga: Rp 180.000 per pcs
        5. Rompi Sholat Premium Mayudee (SKU: MAYUDEE-PREMIUM)
           - Kategori: Perlengkapan Ibadah
           - Deskripsi: Edisi premium dengan bahan katun pima ekstra lembut, detail bordir eksklusif, dan kemasan gift box. Cocok untuk hadiah.
           - Ukuran: M, L, XL
           - Harga: Rp 250.000 per pcs
        6. Kacamata Renang Antifog Ranura (SKU: RANURA-ACC-01)
           - Kategori: Aksesoris Renang
           - Deskripsi: Kacamata renang anti-fog dengan lensa polycarbonate UV protection. Tali silikon adjustable, nyaman untuk dewasa dan anak 8+.
           - Harga: Rp 75.000 per pcs

        Kebijakan Pengiriman & Operasional:
        - Pengiriman: Menggunakan SPX (Shopee Express), J&T, SiCepat, atau ambil langsung di Gudang Utama (Depok, Jawa Barat).
        - Waktu Pengemasan: Biasanya dikirim dalam 2 hari setelah pemesanan dikonfirmasi.
        - Jam Operasional Gudang: Senin - Sabtu (08:00 - 17:00 WIB). Chat asisten ini aktif 24 jam nonstop untuk merespons pembeli.
        - Garansi: Semua produk Ranura bergaransi 30 hari untuk cacat produksi.
        - Nada Bicara: Sopan, profesional, membantu, menggunakan bahasa Indonesia yang baik, informatif, ringkas, dan fokus pada solusi serta membantu memicu pembelian (sales-driven).

        Jawablah pertanyaan pelanggan berikut berdasarkan konteks di atas secara persuasif, ramah, dan solutif.
      `;

      const contents = [];
      
      if (history && Array.isArray(history)) {
        for (const msg of history) {
          contents.push({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
          });
        }
      }
      
      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        },
      });

      res.json({ reply: response.text });
    } catch (error: any) {
      console.error("Gemini Chat API Error:", error);
      res.status(500).json({ error: error.message || "Gagal mendapatkan respon dari asisten Gemini" });
    }
  });

  // Fallback proxy to internal bot (port 3001) for unhandled /api/*
  app.all("/api/*", async (req, res, next) => {
    try {
      const targetUrl = `http://localhost:3001${req.originalUrl}`;
      const headers: any = { 'Content-Type': 'application/json' };
      if (req.headers['authorization']) headers['Authorization'] = req.headers['authorization'];
      
      const fetchOpts: any = {
        method: req.method,
        headers
      };
      if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
        fetchOpts.body = JSON.stringify(req.body);
      }
      
      const resp = await fetch(targetUrl, fetchOpts).catch(() => null);
      if (!resp || resp.status === 404) return next();
      
      const cType = resp.headers.get('content-type') || '';
      if (cType.includes('application/json')) {
        const json = await resp.json();
        return res.status(resp.status).json(json);
      } else {
        const text = await resp.text();
        return res.status(resp.status).send(text);
      }
    } catch (err) {
      return next();
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });

  const cleanup = () => {
    console.log("Menutup Dasbor Server...");
    try { server.close(); } catch (e) {}
  };

  process.once('SIGINT', cleanup);
  process.once('SIGTERM', cleanup);
}

startServer();
