import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

const SWIMWEAR_ID = '1u8oVPIyH7oh4rEpkXQGAHmOOQka01vWILVM8eOSAtD8';
const HIJAB_ID = '1YAkmsRxamdK5XiK-IpvpS-p9jym3vn3z-M5gLkqrYC8';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { type, sheetId, sku, name, qty, keterangan, platform, catatan, date } = req.body || {};
    const targetSheetId = sheetId || SWIMWEAR_ID;
    if (!name || !qty || !type) {
      return res.status(400).json({ error: 'Missing required fields (name, qty, type)' });
    }

    // Try service account from env var, or local file
    let keyData: any = null;
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      try {
        keyData = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      } catch (e) {
        console.warn('Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON env var');
      }
    } else if (process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_CLIENT_EMAIL) {
      keyData = {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      };
    } else {
      const keyPath = path.resolve(process.cwd(), 'service-account.json');
      if (fs.existsSync(keyPath)) {
        keyData = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      }
    }

    if (!keyData || !keyData.client_email || !keyData.private_key) {
      // Return gracefully so the UI still succeeds and logs
      return res.status(200).json({
        success: true,
        localOnly: true,
        message: 'Mutasi stok tersimpan di dasbor. Pasang GOOGLE_SERVICE_ACCOUNT_JSON di Environment Variables Vercel untuk sinkronisasi cloud Google Sheets.'
      });
    }

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

    // Search target tab: e.g. "Barang Masuk Agustus 2026" or "Barang Masuk Hijab Agustus 2026"
    const monthsDesc = ['desember', 'november', 'oktober', 'september', 'agustus', 'juli', 'juni', 'mei', 'april', 'maret', 'februari', 'januari'];
    let targetSheetName: string | undefined;

    // 1. Try exact month match
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
    const startRowNumber = 5;
    
    if (type === 'in') {
      // Masuk: [Tanggal, Nama Barang, Qty, Keterangan, Platform, Catatan]
      rowValues = [formattedDate, name, qty, keterangan || 'PRODUKSI', platform || '', catatan || ''];
      startCol = 'A';
      endCol = 'F';
    } else {
      // Keluar: [Tanggal, Nama Barang, Qty, Orderan/Platform, Keterangan/Catatan]
      rowValues = [formattedDate, name, qty, platform || 'SHOPEE', catatan || keterangan || ''];
      startCol = 'B';
      endCol = 'F';
    }

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
        const d = r[0] ? String(r[0]).trim() : '';
        if (d.match(/^\d{2}\/\d{2}\/\d{4}$/) || d.match(/^\d{5}$/)) {
          lastDate = d;
        }
      }
    }

    const targetRow = maxPopulatedRow + 1;
    const valuesToUpdate: any[][] = [];
    if (maxPopulatedRow >= startRowNumber && lastDate && lastDate !== formattedDate) {
      // Insert spacer row between different days if needed
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

    return res.status(200).json({ success: true, targetSheetName, rowValues, updateRange });
  } catch (err: any) {
    console.error("Failed to append stock:", err);
    return res.status(500).json({ error: err.message });
  }
}
