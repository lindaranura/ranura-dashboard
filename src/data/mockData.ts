import { 
  Order, 
  IntegrationConfig, 
  SyncLog, 
  ProductionItem, 
  WarehouseZone, 
  FinanceTransaction, 
  Invoice, 
  BudgetCategory, 
  CalendarPost, 
  Campaign, 
  ChatThread 
} from '../types';

// Helper for dynamic ISO dates
const daysAgo = (days: number, hours: number = 0): string => {
  const d = new Date(Date.now() - (days * 24 * 3600 * 1000) - (hours * 3600 * 1000));
  return d.toISOString();
};

export const INITIAL_INTEGRATIONS: IntegrationConfig[] = [
  {
    id: 'shopee',
    name: 'Shopee Seller API',
    icon: 'shopee',
    type: 'ecommerce',
    connected: true,
    email: 'finance.ranura@shopee-seller.co.id',
    password: '••••••••••••••••',
    lastSynced: daysAgo(0, 1),
    autoSync: true,
    webhookUrl: 'https://api.ranura-berkah.com/v1/webhooks/shopee'
  },
  {
    id: 'tiktok',
    name: 'TikTok Shop Partner',
    icon: 'tiktok',
    type: 'ecommerce',
    connected: true,
    email: 'ops.ranura@ranura-berkah.id',
    password: '••••••••••••••••',
    lastSynced: daysAgo(0, 2),
    autoSync: true,
    webhookUrl: 'https://api.ranura-berkah.com/v1/webhooks/tiktok'
  },
  {
    id: 'telegram',
    name: 'Telegram Order Notification Bot',
    icon: 'telegram',
    type: 'bot',
    connected: true,
    botToken: 'bot829103810:AAG7q1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p',
    botUsername: 'RanuraOrderBot',
    lastSynced: daysAgo(0, 0),
    autoSync: true,
    webhookUrl: 'https://api.ranura-berkah.com/v1/webhooks/telegram'
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-telegram-RNR.ID260824000009',
    orderNumber: 'RNR.ID260824000009',
    platform: 'telegram',
    customerName: 'Sri sri',
    productName: 'Ranura Female <Warna: Black Maroon> <Ukuran: M (50-60 kg)> (1x)',
    sku: 'SWIMWEAR-ITEM',
    qty: 1,
    totalPrice: 339473,
    status: 'Menunggu Diproses',
    orderDate: '2026-08-24T10:00:00.000Z',
    shippingAddress: 'Jln merpati raya , perumahan citra garden bintaro blok A 09 no 08 ., Ciputat, Kota Tangerang Selatan, Banten, 15411',
    customerPhone: '62811901056',
    shopName: 'BERDU RANURA',
    trackingNumber: '-'
  },
  {
    id: 'ord-telegram-585577747247498640',
    orderNumber: '585577747247498640',
    platform: 'telegram',
    customerName: 'Hantoro[pak Toro Hs)',
    productName: "Baju Renang mengapung 'Black Green-M'",
    sku: 'SWIMWEAR-ITEM',
    qty: 1,
    totalPrice: 11500,
    status: 'Menunggu Diproses',
    orderDate: '2026-09-07T07:13:34.772Z',
    shippingAddress: 'Jl Raya bogor km34,Gg Sawo Rt 02 Rw 002,No 52, Curug Cimanggis Depok 16453',
    customerPhone: '081806749878',
    shopName: 'TUKER SIZE',
    trackingNumber: '585577747247498640'
  },
  {
    id: 'ord-telegram-OFFLINE-216085',
    orderNumber: 'OFFLINE-216085',
    platform: 'telegram',
    customerName: 'ibu intan',
    productName: 'Ranura kids grey purple  XL',
    sku: 'SWIMWEAR-ITEM',
    qty: 1,
    totalPrice: 230000,
    status: 'Menunggu Diproses',
    orderDate: '2026-09-07T07:13:36.085Z',
    shippingAddress: '-',
    customerPhone: '-',
    shopName: 'Pembelian offline',
    trackingNumber: '-'
  },
  {
    id: 'ord-telegram-TELE-217430',
    orderNumber: 'TELE-217430',
    platform: 'telegram',
    customerName: 'Mayor inf Putra Zendrato',
    productName: '1. ranura Male  XXL  ( 9 PCS ) = 375.000* 9 = Rp 3.375.000\n2. ranura Male  XL ( 6 PCS )\n3. ranura Male L ( 6 PCS )\n4. ranura Male M ( 6 PCS )',
    sku: 'SWIMWEAR-ITEM',
    qty: 27,
    totalPrice: 8707500,
    status: 'Menunggu Diproses',
    orderDate: '2026-09-07T07:13:37.431Z',
    shippingAddress: 'Piket Disjasad Baros Cimahi, Jalan HMS Mintareja No 80',
    customerPhone: '+62 822-8228-2118',
    shopName: 'WA Iklan',
    trackingNumber: '-'
  },
  {
    id: 'ord-101',
    orderNumber: 'SHP-20260904-9481',
    platform: 'shopee',
    customerName: 'Budi Santoso',
    productName: 'Baju Renang Apung Ranura',
    sku: 'RANURA-APUNG-V2',
    qty: 15,
    totalPrice: 6750000,
    status: 'Pesanan Selesai',
    orderDate: daysAgo(0, 2),
    shippingAddress: 'Kawasan Industri Jababeka Tahap V Blok B No. 12, Cikarang, Jawa Barat',
    trackingNumber: 'SPX948102928',
    shippingDate: daysAgo(0, 1),
    customerPhone: '0812-4567-8901',
    shopName: 'Ranura Official Store'
  },
  {
    id: 'ord-102',
    orderNumber: 'TTS-20260904-1052',
    platform: 'tiktok',
    customerName: 'Siti Aminah (PT Citra Mandiri)',
    productName: 'Rompi Sholat Madani Mayudee',
    sku: 'MAYUDEE-MADANI-M1',
    qty: 5,
    totalPrice: 750000,
    status: 'Pesanan Dikirim',
    orderDate: daysAgo(0, 5),
    shippingAddress: 'Jl. Jenderal Sudirman Kav. 21, Karet Semanggi, Jakarta Selatan, DKI Jakarta',
    trackingNumber: 'JNT39029103',
    shippingDate: daysAgo(0, 3),
    customerPhone: '0811-9283-7411',
    shopName: 'Mayudee Hijab Premium'
  },
  {
    id: 'ord-103',
    orderNumber: 'SHP-20260903-4820',
    platform: 'shopee',
    customerName: 'CV Sinar Jaya Teknika',
    productName: 'Rompi Sholat Islah Mayudee',
    sku: 'MAYUDEE-ISLAH-I1',
    qty: 3,
    totalPrice: 540000,
    status: 'Menunggu Diproses',
    orderDate: daysAgo(1, 4),
    shippingAddress: 'Jl. Rungkut Industri III No. 45, Surabaya, Jawa Timur',
    customerPhone: '0812-9988-7766',
    shopName: 'Ranura Official Store'
  },
  {
    id: 'ord-104',
    orderNumber: 'MHF-20260902-0294',
    platform: 'manual',
    customerName: 'PT Dirgantara Mega Pratama',
    productName: 'Baju Renang Apung Anak Ranura',
    sku: 'RANURA-APUNG-KIDS',
    qty: 8,
    totalPrice: 2800000,
    status: 'Menunggu Pickup',
    orderDate: daysAgo(2, 6),
    shippingAddress: 'Kawasan Industri MM2100 Blok DD-3, Cibitung, Bekasi, Jawa Barat',
    trackingNumber: 'SICEPAT-MHF0294',
    shippingDate: daysAgo(1, 2),
    customerPhone: '0855-1122-3344',
    shopName: 'Direct B2B Sales'
  },
  {
    id: 'ord-105',
    orderNumber: 'TTS-20260902-7721',
    platform: 'tiktok',
    customerName: 'Hendrik Wijaya',
    productName: 'Rompi Sholat Premium Mayudee',
    sku: 'MAYUDEE-PREMIUM',
    qty: 2,
    totalPrice: 500000,
    status: 'Pesanan Selesai',
    orderDate: daysAgo(2, 9),
    shippingAddress: 'Ruko Golden Boulevard Blok G-12, BSD City, Tangerang, Banten',
    trackingNumber: 'JNT11029482',
    shippingDate: daysAgo(2, 3),
    customerPhone: '0813-2233-4455',
    shopName: 'Mayudee Hijab Premium'
  },
  {
    id: 'ord-106',
    orderNumber: 'SHP-20260901-0293',
    platform: 'shopee',
    customerName: 'PT Wahana Logam Abadi',
    productName: 'Kacamata Renang Antifog Ranura',
    sku: 'RANURA-ACC-01',
    qty: 30,
    totalPrice: 2250000,
    status: 'Pesanan Selesai',
    orderDate: daysAgo(3, 8),
    shippingAddress: 'Jl. Margomulyo No. 18, Tandes, Surabaya, Jawa Timur',
    trackingNumber: 'SPX02930291',
    shippingDate: daysAgo(3, 2),
    customerPhone: '0812-7788-9900',
    shopName: 'Ranura Official Store'
  },
  {
    id: 'ord-107',
    orderNumber: 'TEL-20260901-5512',
    platform: 'telegram',
    customerName: 'Ustadz Ahmad Farhan',
    productName: 'Rompi Sholat Madani Mayudee',
    sku: 'MAYUDEE-MADANI-M1',
    qty: 10,
    totalPrice: 1500000,
    status: 'Menunggu Dicetak',
    orderDate: daysAgo(3, 11),
    shippingAddress: 'Komplek Masjid Al-Barkah, Cimanggis, Depok, Jawa Barat',
    customerPhone: '0812-8877-6655',
    shopName: 'Telegram Ranura Bot'
  },
  {
    id: 'ord-108',
    orderNumber: 'TTS-20260831-8891',
    platform: 'tiktok',
    customerName: 'CV Maju Jaya Moldings',
    productName: 'Baju Renang Apung Ranura',
    sku: 'RANURA-APUNG-V2',
    qty: 10,
    totalPrice: 4500000,
    status: 'Pesanan Selesai',
    orderDate: daysAgo(4, 5),
    shippingAddress: 'Kawasan Industri Wijayakusuma Blok C-10, Semarang, Jawa Tengah',
    trackingNumber: 'JNT99881122',
    shippingDate: daysAgo(3, 1),
    customerPhone: '0812-3344-5566',
    shopName: 'Mayudee Hijab Premium'
  },
  {
    id: 'ord-109',
    orderNumber: 'SHP-20260830-1920',
    platform: 'shopee',
    customerName: 'Rina Kusuma Dewi',
    productName: 'Baju Renang Apung Anak Ranura',
    sku: 'RANURA-APUNG-KIDS',
    qty: 2,
    totalPrice: 700000,
    status: 'Pesanan Selesai',
    orderDate: daysAgo(5, 7),
    shippingAddress: 'Jl. Kaliurang KM 9.5 No. 88, Sleman, DI Yogyakarta',
    trackingNumber: 'SPX19203948',
    shippingDate: daysAgo(4, 8),
    customerPhone: '0813-8822-1199',
    shopName: 'Ranura Official Store'
  },
  {
    id: 'ord-110',
    orderNumber: 'TEL-20260829-3310',
    platform: 'telegram',
    customerName: 'Fajar Nugraha (Komunitas Renang)',
    productName: 'Baju Renang Apung Ranura',
    sku: 'RANURA-APUNG-V2',
    qty: 20,
    totalPrice: 9000000,
    status: 'Pesanan Selesai',
    orderDate: daysAgo(6, 2),
    shippingAddress: 'Jl. Pajajaran No. 45, Baranangsiang, Bogor, Jawa Barat',
    trackingNumber: 'JNE-REG-882910',
    shippingDate: daysAgo(5, 5),
    customerPhone: '0878-1122-4455',
    shopName: 'Telegram Ranura Bot'
  },
  {
    id: 'ord-111',
    orderNumber: 'SHP-20260828-4411',
    platform: 'shopee',
    customerName: 'Hj. Fatimah Zahra',
    productName: 'Rompi Sholat Islah Mayudee',
    sku: 'MAYUDEE-ISLAH-I1',
    qty: 6,
    totalPrice: 1080000,
    status: 'Pesanan Selesai',
    orderDate: daysAgo(7, 3),
    shippingAddress: 'Jl. Diponegoro No. 12, Bandung Wetan, Bandung, Jawa Barat',
    trackingNumber: 'SPX44119922',
    shippingDate: daysAgo(6, 8),
    customerPhone: '0811-3344-9988',
    shopName: 'Ranura Official Store'
  },
  {
    id: 'ord-112',
    orderNumber: 'MHF-20260827-9901',
    platform: 'manual',
    customerName: 'Yayasan Bina Ummah Mandiri',
    productName: 'Rompi Sholat Madani Mayudee',
    sku: 'MAYUDEE-MADANI-M1',
    qty: 25,
    totalPrice: 3750000,
    status: 'Pesanan Selesai',
    orderDate: daysAgo(8, 4),
    shippingAddress: 'Jl. Margonda Raya No. 100, Beji, Depok, Jawa Barat',
    trackingNumber: 'LALAMOVE-DEP01',
    shippingDate: daysAgo(7, 6),
    customerPhone: '0812-5566-7788',
    shopName: 'Direct Corporate'
  },
  {
    id: 'ord-113',
    orderNumber: 'TTS-20260826-6632',
    platform: 'tiktok',
    customerName: 'Rudi Hermawan',
    productName: 'Kacamata Renang Antifog Ranura',
    sku: 'RANURA-ACC-01',
    qty: 4,
    totalPrice: 300000,
    status: 'Pesanan Selesai',
    orderDate: daysAgo(9, 2),
    shippingAddress: 'Jl. Veteran No. 14, Malang, Jawa Timur',
    trackingNumber: 'JNT66321100',
    shippingDate: daysAgo(8, 9),
    customerPhone: '0821-4455-6677',
    shopName: 'Mayudee Hijab Premium'
  },
  {
    id: 'ord-114',
    orderNumber: 'SHP-20260825-7744',
    platform: 'shopee',
    customerName: 'Dewi Lestari',
    productName: 'Baju Renang Apung Ranura',
    sku: 'RANURA-APUNG-V2',
    qty: 1,
    totalPrice: 450000,
    status: 'Pesanan Dibatalkan',
    orderDate: daysAgo(10, 6),
    shippingAddress: 'Jl. Malioboro No. 22, Danurejan, Yogyakarta',
    customerPhone: '0813-7788-9900',
    shopName: 'Ranura Official Store'
  },
  {
    id: 'ord-115',
    orderNumber: 'TEL-20260824-1199',
    platform: 'telegram',
    customerName: 'Keluarga Hasanudin',
    productName: 'Baju Renang Apung Anak Ranura',
    sku: 'RANURA-APUNG-KIDS',
    qty: 4,
    totalPrice: 1400000,
    status: 'Pesanan Selesai',
    orderDate: daysAgo(11, 8),
    shippingAddress: 'Jl. Cipto Mangunkusumo No. 50, Cirebon, Jawa Barat',
    trackingNumber: 'JNE-REG-119922',
    shippingDate: daysAgo(10, 2),
    customerPhone: '0818-9900-1122',
    shopName: 'Telegram Ranura Bot'
  }
];

export const INITIAL_LOGS: SyncLog[] = [
  {
    id: 'log-1',
    timestamp: daysAgo(0, 1),
    platform: 'tiktok',
    type: 'success',
    message: 'TikTok Shop API Sync berhasil. Menemukan 1 pesanan baru.'
  },
  {
    id: 'log-2',
    timestamp: daysAgo(0, 2),
    platform: 'shopee',
    type: 'success',
    message: 'Shopee Seller API Sync berhasil. Sinkronisasi status 4 pesanan.'
  },
  {
    id: 'log-3',
    timestamp: daysAgo(0, 3),
    platform: 'shopee',
    type: 'info',
    message: 'Pesanan baru SHP-20260904-9481 masuk ke antrean master data order.'
  },
  {
    id: 'log-4',
    timestamp: daysAgo(0, 4),
    platform: 'telegram',
    type: 'success',
    message: 'Bot Telegram order webhook aktif. Mengirimkan konfirmasi pesanan ke pembeli.'
  },
  {
    id: 'log-5',
    timestamp: daysAgo(0, 6),
    platform: 'tiktok',
    type: 'success',
    message: 'Pesanan baru TTS-20260904-1052 dari PT Citra Mandiri terintegrasi.'
  },
  {
    id: 'log-6',
    timestamp: daysAgo(0, 8),
    platform: 'system',
    type: 'info',
    message: 'Sistem Manufaktur PT Ranura Berkah Abadi online. Sinkronisasi multi-channel & logistik aktif.'
  }
];

export const INITIAL_PRODUCTION: ProductionItem[] = [
  {
    id: 'prod-1',
    name: 'Baju Renang Apung Ranura (Dewasa)',
    sku: 'RANURA-APUNG-V2',
    category: 'Pakaian Apung',
    stock: 142,
    reserved: 17,
    initialStock: 100,
    stockIn: 80,
    stockOut: 38,
    status: 'optimal',
    unit: 'pcs',
    zoneId: 'zone-a'
  },
  {
    id: 'prod-2',
    name: 'Rompi Sholat Madani Mayudee',
    sku: 'MAYUDEE-MADANI-M1',
    category: 'Perlengkapan Ibadah',
    stock: 45,
    reserved: 5,
    initialStock: 30,
    stockIn: 35,
    stockOut: 20,
    status: 'warning',
    unit: 'pcs',
    zoneId: 'zone-a'
  },
  {
    id: 'prod-3',
    name: 'Rompi Sholat Islah Mayudee',
    sku: 'MAYUDEE-ISLAH-I1',
    category: 'Perlengkapan Ibadah',
    stock: 12,
    reserved: 3,
    initialStock: 10,
    stockIn: 15,
    stockOut: 13,
    status: 'critical',
    unit: 'pcs',
    zoneId: 'zone-a'
  },
  {
    id: 'prod-4',
    name: 'Baju Renang Apung Anak Ranura',
    sku: 'RANURA-APUNG-KIDS',
    category: 'Pakaian Apung',
    stock: 28,
    reserved: 8,
    initialStock: 20,
    stockIn: 30,
    stockOut: 22,
    status: 'optimal',
    unit: 'pcs',
    zoneId: 'zone-a'
  },
  {
    id: 'prod-5',
    name: 'Rompi Sholat Premium Mayudee',
    sku: 'MAYUDEE-PREMIUM',
    category: 'Perlengkapan Ibadah',
    stock: 80,
    reserved: 2,
    initialStock: 50,
    stockIn: 50,
    stockOut: 20,
    status: 'optimal',
    unit: 'pcs',
    zoneId: 'zone-a'
  },
  {
    id: 'prod-6',
    name: 'Kacamata Renang Antifog Ranura',
    sku: 'RANURA-ACC-01',
    category: 'Aksesoris Renang',
    stock: 310,
    reserved: 30,
    initialStock: 200,
    stockIn: 180,
    stockOut: 70,
    status: 'optimal',
    unit: 'pcs',
    zoneId: 'zone-c'
  }
];

// ==========================================
// ZONA GUDANG (WAREHOUSE ZONES)
// ==========================================
export const INITIAL_WAREHOUSE_ZONES: WarehouseZone[] = [
  {
    id: 'zone-a',
    code: 'ZONA-A',
    name: 'Zona Barang Jadi (Pakaian & Rompi)',
    description: 'Rak penyimpanan produk jadi siap kemas dan kirim kurir marketplace',
    capacity: 500,
    currentLoad: 307,
    category: 'Gudang Utama Depok',
    temperature: '24°C Suhu Ruang'
  },
  {
    id: 'zone-b',
    code: 'ZONA-B',
    name: 'Zona Bahan Baku Tekstil & Busa',
    description: 'Penyimpanan roll kain katun premium, bahan lycra, dan busa apung EVA',
    capacity: 400,
    currentLoad: 260,
    category: 'Workshop Manufaktur',
    temperature: '22°C Kontrol Kelembaban'
  },
  {
    id: 'zone-c',
    code: 'ZONA-C',
    name: 'Zona Aksesoris, Pouch & Box',
    description: 'Rak khusus kacamata renang, pouch eksklusif Mayudee, dan karton packing',
    capacity: 600,
    currentLoad: 380,
    category: 'Logistik Depok'
  },
  {
    id: 'zone-d',
    code: 'ZONA-D',
    name: 'Zona Karantina & QC Finishing',
    description: 'Area inspeksi jahitan, uji apung busa, dan sortir produk sebelum masuk rak',
    capacity: 100,
    currentLoad: 24,
    category: 'Ruang QC'
  }
];

// ==========================================
// TRANSAKSI KEUANGAN (FINANCE TRANSACTIONS)
// ==========================================
export const INITIAL_TRANSACTIONS: FinanceTransaction[] = [
  {
    id: 'trx-1',
    description: 'Penerimaan Penjualan Shopee Batch 1',
    amount: 14250000,
    category: 'Penjualan Marketplace',
    type: 'income',
    date: daysAgo(1),
    reference: 'PAYOUT-SHP-0901',
    paymentMethod: 'BCA Virtual Account',
    status: 'completed'
  },
  {
    id: 'trx-2',
    description: 'Pembelian Kain Katun Madani (Roll)',
    amount: 5800000,
    category: 'Bahan Baku Tekstil',
    type: 'expense',
    date: daysAgo(2),
    reference: 'INV-SUP-KATUN-88',
    paymentMethod: 'Transfer Bank Mandiri',
    status: 'completed'
  },
  {
    id: 'trx-3',
    description: 'Penerimaan Penjualan TikTok Shop',
    amount: 8750000,
    category: 'Penjualan Marketplace',
    type: 'income',
    date: daysAgo(3),
    reference: 'PAYOUT-TTS-0831',
    paymentMethod: 'BCA Escrow',
    status: 'completed'
  },
  {
    id: 'trx-4',
    description: 'Pembelian Busa Apung EVA Foam 20mm',
    amount: 4200000,
    category: 'Bahan Baku Produksi',
    type: 'expense',
    date: daysAgo(4),
    reference: 'PO-EVA-FOAM-09',
    paymentMethod: 'Transfer BCA',
    status: 'completed'
  },
  {
    id: 'trx-5',
    description: 'Biaya Iklan Shopee Ads & TikTok Ads',
    amount: 2500000,
    category: 'Pemasaran & Iklan',
    type: 'expense',
    date: daysAgo(5),
    reference: 'ADS-EXP-0826',
    paymentMethod: 'Kartu Kredit Perusahaan',
    status: 'completed'
  },
  {
    id: 'trx-6',
    description: 'Gaji Operator Jahit & QC (Tahap 1)',
    amount: 9500000,
    category: 'Upah & Gaji Karyawan',
    type: 'expense',
    date: daysAgo(6),
    reference: 'PAYROLL-MGF-01',
    paymentMethod: 'Transfer Payroll BCA',
    status: 'completed'
  },
  {
    id: 'trx-7',
    description: 'Pelunasan Order B2B PT Dirgantara',
    amount: 6800000,
    category: 'Penjualan B2B',
    type: 'income',
    date: daysAgo(7),
    reference: 'INV-B2B-DIRG01',
    paymentMethod: 'Transfer Bank Mandiri',
    status: 'completed'
  },
  {
    id: 'trx-8',
    description: 'Biaya Packaging & Karton Kardus Sablon',
    amount: 1450000,
    category: 'Perlengkapan Logistik',
    type: 'expense',
    date: daysAgo(8),
    reference: 'INV-BOX-DEP-44',
    paymentMethod: 'Tunai Operasional',
    status: 'completed'
  },
  {
    id: 'trx-9',
    description: 'Sewa Fasilitas Workshop Depok (Bulanan)',
    amount: 4500000,
    category: 'Sewa & Operasional Fasilitas',
    type: 'expense',
    date: daysAgo(10),
    reference: 'RENT-WORKSHOP-09',
    paymentMethod: 'Transfer BCA',
    status: 'completed'
  },
  {
    id: 'trx-10',
    description: 'Penerimaan Penjualan Direct Reseller Telegram',
    amount: 10500000,
    category: 'Penjualan Direct',
    type: 'income',
    date: daysAgo(11),
    reference: 'RESELLER-TEL-0824',
    paymentMethod: 'BCA Virtual Account',
    status: 'completed'
  },
  {
    id: 'trx-11',
    description: 'Biaya Ongkir Kurir Ekspedisi (JNE & SiCepat)',
    amount: 1850000,
    category: 'Biaya Pengiriman',
    type: 'expense',
    date: daysAgo(12),
    reference: 'EXPEDITION-SUB-08',
    paymentMethod: 'Corporate Postpaid',
    status: 'completed'
  },
  {
    id: 'trx-12',
    description: 'Penjualan Rompi Madani Komunitas Pengajian',
    amount: 3750000,
    category: 'Penjualan Direct',
    type: 'income',
    date: daysAgo(14),
    reference: 'DIR-KOMUNITAS-08',
    paymentMethod: 'QRIS Dinamis',
    status: 'completed'
  }
];

// ==========================================
// FAKTUR KEUANGAN (INVOICES)
// ==========================================
export const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV/2026/09/001',
    customerName: 'Yayasan Bina Ummah Mandiri',
    customerEmail: 'finance@binaummah.org',
    customerPhone: '0812-5566-7788',
    items: [
      { id: 'ii-1', name: 'Rompi Sholat Madani Mayudee (L & XL)', sku: 'MAYUDEE-MADANI-M1', qty: 25, unitPrice: 150000, total: 3750000 },
      { id: 'ii-2', name: 'Pouch Eksklusif Mayudee Gift Box', sku: 'MAYUDEE-POUCH-EXC', qty: 25, unitPrice: 20000, total: 500000 }
    ],
    subtotal: 4250000,
    tax: 0,
    total: 4250000,
    status: 'paid',
    dueDate: daysAgo(-5),
    createdAt: daysAgo(8),
    notes: 'Pelunasan pesanan seragam umroh rompi sholat.'
  },
  {
    id: 'inv-2',
    invoiceNumber: 'INV/2026/09/002',
    customerName: 'PT Dirgantara Mega Pratama',
    customerEmail: 'procurement@dirgantaramega.co.id',
    customerPhone: '0855-1122-3344',
    items: [
      { id: 'ii-3', name: 'Baju Renang Apung Ranura Dewasa', sku: 'RANURA-APUNG-V2', qty: 10, unitPrice: 450000, total: 4500000 },
      { id: 'ii-4', name: 'Baju Renang Apung Anak Ranura', sku: 'RANURA-APUNG-KIDS', qty: 8, unitPrice: 350000, total: 2800000 }
    ],
    subtotal: 7300000,
    tax: 0,
    total: 7300000,
    status: 'sent',
    dueDate: daysAgo(-7),
    createdAt: daysAgo(2),
    notes: 'Pengadaan peralatan keselamatan renang waterpark anak.'
  },
  {
    id: 'inv-3',
    invoiceNumber: 'INV/2026/08/045',
    customerName: 'CV Sinar Jaya Teknika',
    customerEmail: 'admin@sinarjayateknika.id',
    customerPhone: '0812-9988-7766',
    items: [
      { id: 'ii-5', name: 'Rompi Sholat Islah Mayudee', sku: 'MAYUDEE-ISLAH-I1', qty: 3, unitPrice: 180000, total: 540000 }
    ],
    subtotal: 540000,
    tax: 0,
    total: 540000,
    status: 'paid',
    dueDate: daysAgo(1),
    createdAt: daysAgo(5),
    notes: 'Pembayaran pesanan marketplace Shopee direct order.'
  },
  {
    id: 'inv-4',
    invoiceNumber: 'INV/2026/09/003',
    customerName: 'Komunitas Renang Tirta Jaya',
    customerEmail: 'info@tirtajaya.org',
    customerPhone: '0878-1122-4455',
    items: [
      { id: 'ii-6', name: 'Baju Renang Apung Dewasa Ranura', sku: 'RANURA-APUNG-V2', qty: 20, unitPrice: 420000, total: 8400000 },
      { id: 'ii-7', name: 'Kacamata Renang Antifog Ranura', sku: 'RANURA-ACC-01', qty: 20, unitPrice: 75000, total: 1500000 }
    ],
    subtotal: 9900000,
    tax: 0,
    total: 9900000,
    status: 'draft',
    dueDate: daysAgo(-14),
    createdAt: daysAgo(0, 4),
    notes: 'Draft penawaran paket pelatihan renang pemula.'
  }
];

// ==========================================
// KATEGORI ANGGARAN (BUDGET)
// ==========================================
export const INITIAL_BUDGET: BudgetCategory[] = [
  { id: 'b-1', name: 'Bahan Baku Kain & Busa', allocated: 25000000, spent: 18600000, period: '2026-09', color: '#2563eb' },
  { id: 'b-2', name: 'Upah & Gaji Produksi', allocated: 18000000, spent: 14200000, period: '2026-09', color: '#10b981' },
  { id: 'b-3', name: 'Pemasaran & Iklan Ads', allocated: 8000000, spent: 5800000, period: '2026-09', color: '#f59e0b' },
  { id: 'b-4', name: 'Operasional Gudang & Sewa', allocated: 7500000, spent: 6200000, period: '2026-09', color: '#8b5cf6' },
  { id: 'b-5', name: 'Logistik & Ekspedisi', allocated: 4000000, spent: 2850000, period: '2026-09', color: '#06b6d4' },
  { id: 'b-6', name: 'Pengembangan & Media', allocated: 3000000, spent: 1400000, period: '2026-09', color: '#ec4899' }
];

// ==========================================
// KAMPANYE & KALENDER KONTEN
// ==========================================
export const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: 'camp-1',
    name: 'Promo Liburan & Safety Renang 2026',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    targetPostCount: 16,
    publishedPostCount: 9,
    status: 'active',
    budget: 3500000
  },
  {
    id: 'camp-2',
    name: 'Mayudee Sholat Khusyuk - Koleksi Madani',
    startDate: '2026-08-15',
    endDate: '2026-09-15',
    targetPostCount: 12,
    publishedPostCount: 11,
    status: 'active',
    budget: 2000000
  },
  {
    id: 'camp-3',
    name: 'Edukasi Baju Apung Anak vs Pelampung Biasa',
    startDate: '2026-09-10',
    endDate: '2026-10-10',
    targetPostCount: 8,
    publishedPostCount: 2,
    status: 'draft',
    budget: 1500000
  }
];

export const INITIAL_CALENDAR_POSTS: CalendarPost[] = [
  {
    id: 'cp-1',
    title: 'Tips Aman Mengajarkan Balita Berenang Tanpa Takut Tenggelam',
    platform: 'tiktok',
    date: daysAgo(0).split('T')[0],
    time: '19:30',
    status: 'published',
    content: 'Pernah panik saat si kecil lepas dari ban pelampung? Baju Renang Apung Ranura dilengkapi busa apung terintegrasi yang menjaga posisi kepala tetap di atas air. Cek link di bio!',
    campaignId: 'camp-1'
  },
  {
    id: 'cp-2',
    title: 'Kelebihan Rompi Sholat Madani Mayudee: Ringan & Sejuk untuk Saf Rapat',
    platform: 'instagram',
    date: daysAgo(-1).split('T')[0],
    time: '11:45',
    status: 'scheduled',
    content: 'Kenyamanan ibadah dimulai dari pakaian yang rapi dan menutup aurat dengan sempurna. Rompi Sholat Mayudee hadir dengan katun premium breathable.',
    campaignId: 'camp-2'
  },
  {
    id: 'cp-3',
    title: 'Flash Sale Shopee 9.9 Super Shopping Day - Diskon s/d 40%',
    platform: 'shopee',
    date: daysAgo(-3).split('T')[0],
    time: '00:00',
    status: 'scheduled',
    content: 'Siapkan keranjangmu! Promo 9.9 Ranura Official Store memberikan voucher gratis ongkir dan potongan langsung untuk semua varian Rompi & Baju Apung.',
    campaignId: 'camp-1'
  },
  {
    id: 'cp-4',
    title: 'Behind The Scene Produksi: Uji Daya Apung Baju Renang Ranura di Pabrik',
    platform: 'tiktok',
    date: daysAgo(-5).split('T')[0],
    time: '16:00',
    status: 'draft',
    content: 'Setiap jahitan diinspeksi dengan standar keselamatan tinggi. Simak bagaimana tim QC kami menguji daya apung busa EVA sebelum sampai ke tangan Anda.',
    campaignId: 'camp-3'
  }
];

// ==========================================
// PERCAKAPAN CHAT TOKO (CUSTOMER CHATS)
// ==========================================
export const INITIAL_CHAT_THREADS: ChatThread[] = [
  {
    id: 'thr-1',
    customerName: 'Rian Kurniawan',
    platform: 'shopee',
    productName: 'Rompi Sholat Islah Mayudee',
    lastMessage: 'Halo Kak, apakah ukuran L ready?',
    timestamp: '08:12',
    unread: true,
    messages: [
      { id: 'm1', sender: 'user', text: 'Halo Kak, apakah Rompi Sholat Islah Mayudee ukuran L ready? Butuh cepat untuk dikirim sebelum hari Jumat.', timestamp: '08:12' }
    ]
  },
  {
    id: 'thr-2',
    customerName: 'Santi Sitorus (PT Citra)',
    platform: 'tiktok',
    productName: 'Rompi Sholat Madani Mayudee',
    lastMessage: 'Halo Ibu Santi, untuk Rompi Sholat Madani...',
    timestamp: 'Kemarin',
    unread: false,
    messages: [
      { id: 'm2', sender: 'user', text: 'Hi, Rompi Sholat Madani Mayudee ini apakah bahannya tebal? Dan apakah ada tas penyimpanan kecilnya?', timestamp: 'Kemarin 14:20' },
      { id: 'm3', sender: 'assistant', text: 'Halo Ibu Santi, untuk Rompi Sholat Madani Mayudee bahannya menggunakan katun premium yang sangat adem dan nyaman digunakan ibadah. Setiap pembelian sudah dilengkapi dengan pouch (tas penyimpanan) mini eksklusif bermerk Mayudee agar mudah dibawa bepergian. Ada lagi yang bisa kami bantu?', timestamp: 'Kemarin 14:25', isAiResponse: true }
    ]
  },
  {
    id: 'thr-3',
    customerName: 'Dian Pratama (CV Jaya)',
    platform: 'shopee',
    productName: 'Baju Renang Apung Ranura',
    lastMessage: 'Pagi Gan, Baju Renang Apung ini apakah aman?',
    timestamp: 'Kemarin',
    unread: false,
    messages: [
      { id: 'm4', sender: 'user', text: 'Pagi Gan, Baju Renang Apung Ranura ini apakah aman digunakan untuk anak yang belum bisa berenang sama sekali?', timestamp: 'Kemarin 09:15' },
      { id: 'm5', sender: 'assistant', text: 'Pagi Kak Dian! Sangat aman, karena Baju Renang Apung Ranura dirancang khusus dengan busa apung fleksibel yang menyatu di bagian dada dan punggung, menopang bobot anak agar posisi kepala tetap tegak di atas permukaan air.', timestamp: 'Kemarin 09:18', isAiResponse: true }
    ]
  },
  {
    id: 'thr-4',
    customerName: 'Ustadz Ahmad Farhan',
    platform: 'telegram',
    productName: 'Rompi Sholat Madani Mayudee',
    lastMessage: 'Terima kasih, nomor resinya sudah saya terima.',
    timestamp: '2 hari lalu',
    unread: false,
    messages: [
      { id: 'm6', sender: 'user', text: 'Assalamu alaikum, pesanan 10 pcs rompi sholat madani untuk santri sudah dikirim?', timestamp: '2 hari lalu 10:00' },
      { id: 'm7', sender: 'assistant', text: 'Waalaikumsalam Warahmatullah Ustadz. Sudah kami proses dan kirimkan via JNE dengan nomor resi JNE-REG-882910. Semoga berkah dan bermanfaat.', timestamp: '2 hari lalu 10:15', isAiResponse: true },
      { id: 'm8', sender: 'user', text: 'Terima kasih, nomor resinya sudah saya terima.', timestamp: '2 hari lalu 10:20' }
    ]
  }
];

