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

  const items: any[] = [];
  let counter = 1;

  for (let i = 4; i < rows.length; i++) {
    const c = rows[i].c || [];
    const name = c[1]?.v ? String(c[1].v).trim() : '';
    if (!name || name.toLowerCase().includes('kosongkan') || name.toLowerCase().includes('nama barang')) continue;

    let sku = c[0]?.v ? String(c[0].v).trim() : name;
    if (!sku || ['januari','februari','maret','april','mei','juni','juli','agustus','september','oktober','november','desember','bulan'].includes(sku.toLowerCase())) {
      sku = name;
    }

    const initialStock = Number(c[2]?.v) || 0;
    const stockIn = Number(c[3]?.v) || 0;
    const stockOut = Number(c[4]?.v) || 0;
    const stock = Number(c[5]?.v) || 0;
    const buyPrice = Math.round(Number(c[6]?.v) || 0);
    const sellPrice = Math.round(Number(c[8]?.v) || 0);

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
      id: `item-${sheetId.substring(0, 6)}-${counter++}`,
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
      activeMonth: `${month} 2026`
    });
  }

  return items;
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
