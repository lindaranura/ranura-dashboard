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

  // Fallback proxy to internal bot (port 3001) for unhandled /api/*
  app.all("/api/*", async (req, res, next) => {
    try {
      const targetUrl = `http://localhost:3001${req.originalUrl}`;
      const headers = { 'Content-Type': 'application/json' };
      if (req.headers['authorization']) headers['Authorization'] = req.headers['authorization'];
      
      const fetchOpts = {
        method: req.method,
        headers
      };
      if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
        fetchOpts.body = JSON.stringify(req.body);
      }
      
      const resp = await fetch(targetUrl, fetchOpts).catch(() => null);
      if (!resp) return next();
      
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

  // ==========================================
  // API: Update Inventory Google Sheet directly
  // ==========================================
  app.post("/api/inventory/update-stock", async (req, res) => {
    try {
      const { type, sheetId, sku, name, qty, keterangan, platform, catatan, date } = req.body;
      if (!sheetId || !name || !qty || !type) return res.status(400).json({ error: "Missing required fields" });

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

      // Find correct tab name by fuzzy matching
      const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
      const availableTabs = meta.data.sheets?.map(s => s.properties?.title || '') || [];
      
      const searchKeyword = type === 'in' ? 'masuk' : 'keluar';
      const monthSearch = monthStr.toLowerCase();
      
      let targetSheetName = availableTabs.find(t => {
        const lowerT = t.toLowerCase();
        // Match keyword (Barang Masuk / Keluar) AND either full month ("september") or short month ("sep")
        return lowerT.includes(searchKeyword.toLowerCase()) && 
               (lowerT.includes(monthSearch) || lowerT.includes(monthSearch.substring(0, 3)));
      });
      
      if (!targetSheetName) {
        targetSheetName = `Barang ${type === 'in' ? 'Masuk' : 'Keluar'} ${monthStr} ${yearStr}`;
      }

      let rowValues = [];
      let startCol = '';
      let endCol = '';
      let startRowNumber = 0;
      
      if (type === 'in') {
        // Masuk: [Tanggal, Nama Barang, Qty, Keterangan, Platform, Catatan] -> 6 columns (A to F)
        rowValues = [formattedDate, name, qty, keterangan || catatan || '', platform || '', catatan || ''];
        startCol = 'A';
        endCol = 'F';
        startRowNumber = 5; // Starts at A5
      } else {
        // Keluar: NO SKU based on user request. [Tanggal, Nama Barang, Qty, Platform, Catatan] -> 5 columns (B to F)
        rowValues = [formattedDate, name, qty, platform || '', catatan || keterangan || ''];
        startCol = 'B';
        endCol = 'F';
        startRowNumber = 6; // Starts at B6
      }

      // Check last row's date to determine if a spacer row is needed
      // Fetch ONLY startCol:endCol so we ignore column I completely!
      const dataResp = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `'${targetSheetName}'!${startCol}${startRowNumber}:${endCol}`
      });
      
      const rows = dataResp.data.values || [];
      let lastDate = '';
      let maxPopulatedRow = startRowNumber - 1; 
      
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (r && r.length > 0 && r.some(c => c && String(c).trim() !== '')) {
          maxPopulatedRow = startRowNumber + i;
          
          // Date is always at index 0 because both startCol='A' (in) and startCol='B' (out) have date as the first element!
          let d = r[0] ? String(r[0]).trim() : '';
          
          if (d.match(/^\d{2}\/\d{2}\/\d{4}$/) || d.match(/^\d{5}$/)) {
            lastDate = d;
          }
        }
      }

      let targetRow = maxPopulatedRow + 1;

      const valuesToUpdate = [];
      if (maxPopulatedRow >= startRowNumber && lastDate && lastDate !== formattedDate) {
        // Insert spacer row
        valuesToUpdate.push(Array(rowValues.length).fill('')); 
      }
      valuesToUpdate.push(rowValues);

      const endRow = targetRow + valuesToUpdate.length - 1;
      const updateRange = `'${targetSheetName}'!${startCol}${targetRow}:${endCol}${endRow}`;

      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: updateRange,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: valuesToUpdate
        }
      });

      res.json({ success: true, targetSheetName, rowValues, updateRange });
    } catch (err: any) {
      console.error("Failed to append stock:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/inventory/sheet", async (req, res) => {
    console.log("[INVENTORY] Fetching sheet: " + req.query.id);
    try {
      const sheetId = req.query.id as string;
      if (!sheetId) return res.status(400).json({ error: "Missing sheet id" });
      
      let sheetUrl = "https://docs.google.com/spreadsheets/d/" + sheetId + "/export?format=csv";
      
      const keyPath = path.resolve(process.cwd(), 'service-account.json');
      let accessToken = null;
      let matchedSheet = null;
      
      let availableTabs = [];

      // 1. Try to get tabs via Service Account API
      if (fs.existsSync(keyPath)) {
        try {
          const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
          const auth = new google.auth.JWT({
            email: keyData.client_email,
            key: keyData.private_key,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
          });
          const tokenRes = await auth.getAccessToken();
          accessToken = tokenRes.token;

          const sheets = google.sheets({version: 'v4', auth});
          const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
          
          if (meta.data.sheets) {
            availableTabs = meta.data.sheets.map(s => ({
              title: s.properties.title,
              sheetId: s.properties.sheetId
            }));
          }
        } catch (err) {
          console.warn("[INVENTORY] API Metadata error (falling back to HTML scrape):", err.message);
        }
      }

      // 2. Fallback: Scrape tabs from public HTML view if API failed
      if (availableTabs.length === 0) {
        try {
          const htmlRes = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/htmlview`);
          if (htmlRes.ok) {
            const htmlText = await htmlRes.text();
            const regex = /{name:\s*"([^"]+)",[^}]*?gid:\s*"(\d+)"/g;
            const matches = [...htmlText.matchAll(regex)];
            availableTabs = matches.map(m => ({ title: m[1], sheetId: m[2] }));
            console.log(`[INVENTORY] Scraped ${availableTabs.length} tabs from HTML for ${sheetId}`);
          }
        } catch (e) {
          console.warn("[INVENTORY] Failed to scrape HTML for tabs:", e.message);
        }
      }
      
      // 3. Find the best matching tab
      if (availableTabs.length > 0) {
          const dateNow = new Date();
          const currentMonth = dateNow.toLocaleString('id-ID', { month: 'long', year: 'numeric' }).toLowerCase();
          
          const targetTitle = `katalog barang ${currentMonth}`;
          console.log(`[INVENTORY] Searching for exact tab: "${targetTitle}"`);
          
          matchedSheet = availableTabs.find(s => s.title.toLowerCase() === targetTitle);
          
          // Fallback: look for current month somewhere in the title
          if (!matchedSheet) {
            const monthOnly = dateNow.toLocaleString('id-ID', { month: 'long' }).toLowerCase();
            const yearOnly = dateNow.getFullYear().toString();
            matchedSheet = availableTabs.find(s => {
              const t = s.title.toLowerCase();
              return (t.includes('katalog') || t.includes('stok') || t.includes('inventory') || t.includes('barang')) 
                     && t.includes(monthOnly) && t.includes(yearOnly);
            });
          }
          
          // Fallback: look for ANY inventory-related tab
          if (!matchedSheet) {
            matchedSheet = availableTabs.find(s => {
               const t = s.title.toLowerCase();
               return t.includes('katalog') || t.includes('stok') || t.includes('inventory') || t.includes('barang');
            });
          }
          
          // Ultimate fallback: just use the first tab
          if (!matchedSheet) {
             matchedSheet = availableTabs[0];
          }
          
          if (matchedSheet && matchedSheet.sheetId !== undefined) {
            console.log(`[INVENTORY] Selected tab: "${matchedSheet.title}" (gid=${matchedSheet.sheetId})`);
            sheetUrl += `&gid=${matchedSheet.sheetId}`;
          }
      }

      const fetchOptions = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};
      const resp = await fetch(sheetUrl, fetchOptions);
      if (!resp.ok) { 
        console.error(`[INVENTORY] Fetch failed with status ${resp.status}`); 
        throw new Error("Failed to fetch sheet"); 
      }
      
      const csvData = await resp.text();
      const lines = csvData.split('\n');
      const items = [];
      let startParsing = false;
      let skuCounter = 1000;
      let formatType = 'legacy';
      
      for (const line of lines) {
        const cleanLine = line.trim();
        
        if (!startParsing) {
           const lower = cleanLine.toLowerCase();
           if ((lower.includes('kode barang') && lower.includes('nama barang')) || 
               (lower.includes('barang') && lower.includes('stok awal'))) {
             startParsing = true;
             formatType = 'legacy';
             continue;
           }
           if (lower.includes('id produk') && lower.includes('nama produk') && lower.includes('sku')) {
             startParsing = true;
             formatType = 'new';
             continue;
           }
        }
        
        if (!startParsing || !cleanLine) continue;
        if (cleanLine.toLowerCase().includes('kosongkan saja')) continue;
        if (cleanLine.toLowerCase().includes('id produk') || cleanLine.toLowerCase().includes('kode barang')) continue; // Skip header row if guessed
        
        const cols = cleanLine.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        
        if (formatType === 'legacy') {
          if (cols.length >= 6 && cols[1]) {
            const name = cols[1].replace(/"/g, '').trim();
            if (!name) continue;
            
            const initialStock = parseInt(cols[2].replace(/\./g, '')) || 0;
            const stockIn = parseInt(cols[3].replace(/\./g, '')) || 0;
            const stockOut = parseInt(cols[4].replace(/\./g, '')) || 0;
            const stock = parseInt(cols[5].replace(/\./g, '')) || 0;
            
            let buyPriceStr = cols[6] || '0';
            let sellPriceStr = cols[8] || '0';
            if (buyPriceStr.includes(',')) buyPriceStr = buyPriceStr.split(',')[0];
            if (sellPriceStr.includes(',')) sellPriceStr = sellPriceStr.split(',')[0];
            
            const buyPrice = parseInt(buyPriceStr.replace(/[^0-9]/g, '')) || 0;
            const sellPrice = parseInt(sellPriceStr.replace(/[^0-9]/g, '')) || 0;
            
            let category = "Pakaian Apung";
            if (name.toLowerCase().includes("rompi")) category = "Perlengkapan Ibadah";
            if (name.toLowerCase().includes("kacamata") || name.toLowerCase().includes("ban")) category = "Aksesoris Renang";
  
            let sku = cols[0].replace(/"/g, '').trim();
            if (!sku || ["januari","februari","maret","april","mei","juni","juli","agustus","september","oktober","november","desember","bulan"].includes(sku.toLowerCase())) {
              sku = name;
            }
            
            items.push({
              id: 'item-' + sheetId.substring(0,8) + '-' + skuCounter,
              name: name,
              sku: sku,
              category: category,
              stock: stock,
              reserved: 0,
              initialStock: initialStock,
              stockIn: stockIn,
              stockOut: stockOut,
              buyPrice: buyPrice,
              sellPrice: sellPrice,
              status: stock > 15 ? 'optimal' : stock > 5 ? 'warning' : 'critical',
              unit: 'pcs',
              sourceSheetId: sheetId
            });
            skuCounter++;
          }
        } else if (formatType === 'new') {
          if (cols.length >= 7 && cols[1]) {
            const name = cols[1].replace(/"/g, '').trim();
            if (!name) continue;
            
            const sku = cols[2].replace(/"/g, '').trim() || name;
            const category = cols[3].replace(/"/g, '').trim();
            
            const stockIn = parseInt(cols[4].replace(/\./g, '')) || 0;
            const stockOut = parseInt(cols[5].replace(/\./g, '')) || 0;
            const stock = parseInt(cols[6].replace(/\./g, '')) || 0;
            
            items.push({
              id: 'item-' + sheetId.substring(0,8) + '-' + skuCounter,
              name: name,
              sku: sku,
              category: category,
              stock: stock,
              reserved: 0,
              initialStock: stock - stockIn + stockOut,
              stockIn: stockIn,
              stockOut: stockOut,
              buyPrice: 0,
              sellPrice: 0,
              status: stock > 15 ? 'optimal' : stock > 5 ? 'warning' : 'critical',
              unit: cols[7]?.replace(/"/g, '').trim() || 'pcs',
              sourceSheetId: sheetId
            });
            skuCounter++;
          }
        }
      }
      
      console.log(`[INVENTORY] Fetched ${items.length} items from ${sheetId}`);
      res.json(items);
    } catch (err) {
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
