import REAL_PRODUCTION_DATA from '../../src/data/realProductionItems.json';

const SWIMWEAR_ID = '19oOIWUVLd8UiVkG8BgOI2YG1cbCsQ_Wx_EWJ3Ujo2pA';
const HIJAB_ID = '1dJUmz5-vh8DhSV60PVMV3bjix-TmyEtJZSQzSPv3zLM';

async function fetchFromGViz(sheetId: string, monthParam: string = 'default') {
  const isHijab = sheetId === HIJAB_ID;
  
  let month = monthParam;
  if (!month || month === 'default' || month === 'all') {
    month = 'November';
  }

  const tabName = isHijab 
    ? `Katalog Barang Hijab ${month} 2026` 
    : `Katalog Barang ${month} 2026`;

  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?sheet=${encodeURIComponent(tabName)}&tqx=out:json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${tabName}`);
  const text = await res.text();
  const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
  const data = JSON.parse(jsonStr);
  const rows = data.table?.rows || [];

  // Base map from all 313 products filtered by sheet
  const baseItems: any[] = JSON.parse(JSON.stringify(REAL_PRODUCTION_DATA));
  const sheetItems = baseItems.filter(i => i.sourceSheetId === sheetId);
  const itemsMap = new Map<string, any>();
  sheetItems.forEach(it => {
    itemsMap.set(it.name.trim().toUpperCase(), it);
  });

  for (let i = 0; i < rows.length; i++) {
    const c = rows[i]?.c || [];
    const name = c[1]?.v ? String(c[1].v).trim() : '';
    if (!name || name.toLowerCase().includes('kosongkan') || name.toLowerCase().includes('nama barang')) continue;

    const key = name.toUpperCase();
    const initialStock = Number(c[2]?.v) || 0;
    const stockIn = Number(c[3]?.v) || 0;
    const stockOut = Number(c[4]?.v) || 0;
    const stock = Number(c[5]?.v) || 0;
    const buyPrice = Math.round(Number(c[6]?.v) || 0);
    const sellPrice = Math.round(Number(c[8]?.v) || 0);

    if (itemsMap.has(key)) {
      const existing = itemsMap.get(key);
      existing.stock = stock;
      existing.initialStock = initialStock;
      existing.stockIn = stockIn;
      existing.stockOut = stockOut;
      if (buyPrice > 0) existing.buyPrice = buyPrice;
      if (sellPrice > 0) existing.sellPrice = sellPrice;
      existing.status = stock > 15 ? 'optimal' : stock > 5 ? 'warning' : 'critical';
      existing.activeMonth = tabName;
    } else {
      let sku = c[0]?.v ? String(c[0].v).trim() : name;
      if (!sku || ['januari','februari','maret','april','mei','juni','juli','agustus','september','oktober','november','desember','bulan'].includes(sku.toLowerCase())) {
        sku = name;
      }

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

      itemsMap.set(key, {
        id: `item-${sheetId.substring(0, 6)}-${itemsMap.size + 1}`,
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
        sourceSheetName: isHijab ? 'Ranura Hijab & Rosal' : 'Ranura Swimwear',
        activeMonth: tabName
      });
    }
  }

  return Array.from(itemsMap.values());
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const requestedId = req.query?.id as string;
    const month = (req.query?.month as string) || 'default';

    if (!requestedId || requestedId === 'all') {
      const [swimwear, hijab] = await Promise.all([
        fetchFromGViz(SWIMWEAR_ID, month).catch(e => { console.warn(e); return []; }),
        fetchFromGViz(HIJAB_ID, month).catch(e => { console.warn(e); return []; })
      ]);
      const merged = [...swimwear, ...hijab];
      return res.status(200).json(merged);
    } else {
      const items = await fetchFromGViz(requestedId, month);
      return res.status(200).json(items);
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
