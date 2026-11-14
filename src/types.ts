export type Platform = 'shopee' | 'tiktok' | 'manual' | 'telegram';

export type OrderStatus = 
  | 'Pending' 
  | 'Processed' 
  | 'Shipped' 
  | 'Completed' 
  | 'Cancelled' 
  | 'Returned'
  | 'Menunggu Diproses'
  | 'Menunggu Dicetak'
  | 'Menunggu Pickup'
  | 'Pesanan Dikirim'
  | 'Pesanan Selesai'
  | 'Pesanan Disisihkan'
  | 'Pesanan Dibatalkan'
  | 'Pesanan Belum Dibayar'
  | 'Pesanan Retur'
  | string;

export interface Order {
  id: string;
  orderNumber: string;
  platform: Platform;
  customerName: string;
  productName: string;
  sku: string;
  qty: number;
  totalPrice: number;
  status: OrderStatus;
  orderDate: string;
  shippingAddress: string;
  trackingNumber?: string;
  shippingDate?: string;
  notes?: string;
  customerPhone?: string;
  shopName?: string;
}

export interface IntegrationConfig {
  id: string;
  name: string;
  icon: string;
  type: 'ecommerce' | 'bot';
  connected: boolean;
  email?: string;
  password?: string;
  botToken?: string;
  botUsername?: string;
  lastSynced?: string;
  webhookUrl?: string;
  autoSync: boolean;
}

export interface SyncLog {
  id: string;
  timestamp: string;
  platform: 'shopee' | 'tiktok' | 'telegram' | 'system';
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export interface ProductionItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  reserved: number;
  initialStock?: number;
  stockIn?: number;
  stockOut?: number;
  status: 'optimal' | 'warning' | 'critical';
  unit: string;
  zoneId?: string;
  buyPrice?: number;
  sellPrice?: number;
  sourceSheetId?: string;
}

export interface AnalyticsSummary {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  fulfillmentRate: number;
  salesGrowth: number;
  ordersGrowth: number;
}

// ==========================================
// KEUANGAN (FINANCE & ACCOUNTING)
// ==========================================
export type TransactionType = 'income' | 'expense';

export type TransactionCategory = 
  | 'Bahan Baku Tekstil' 
  | 'Bahan Baku Produksi' 
  | 'Upah & Gaji Karyawan' 
  | 'Pemasaran & Iklan' 
  | 'Perlengkapan Logistik' 
  | 'Sewa & Operasional Fasilitas' 
  | 'Biaya Pengiriman' 
  | 'Penjualan Marketplace' 
  | 'Penjualan B2B' 
  | 'Penjualan Direct' 
  | 'Operational' 
  | 'Marketing' 
  | 'Salary' 
  | 'Inventory' 
  | 'Revenue' 
  | string;

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

export interface FinanceTransaction {
  id: string;
  description: string;
  amount: number;
  category: TransactionCategory;
  type: TransactionType;
  date: string;
  reference?: string;
  paymentMethod?: string;
  status?: 'completed' | 'pending';
}

export interface InvoiceItem {
  id: string;
  name: string;
  sku?: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  dueDate: string;
  createdAt: string;
  notes?: string;
}

export interface BudgetCategory {
  id: string;
  name: string;
  allocated: number;
  spent: number;
  period: string; // e.g. '2026-09'
  color?: string;
}

// ==========================================
// PERGUDANGAN (WAREHOUSING & STOCK)
// ==========================================
export interface WarehouseZone {
  id: string;
  code: string;
  name: string;
  description: string;
  capacity: number;
  currentLoad: number;
  category: string;
  temperature?: string;
}

export interface StockMovement {
  id: string;
  itemId?: string;
  productName: string;
  sku: string;
  date: string; // YYYY-MM-DD
  type: 'in' | 'out' | 'initial';
  qty: number;
  reference: string;
  operator: string;
  balanceAfter?: number;
  note?: string;
}

// ==========================================
// PEMBUATAN KONTEN & MEDIA
// ==========================================
export interface CalendarPost {
  id: string;
  title: string;
  platform: 'shopee' | 'tiktok' | 'instagram' | 'all';
  date: string;
  time: string;
  status: 'draft' | 'scheduled' | 'published';
  content: string;
  campaignId?: string;
  image?: string;
}

export interface Campaign {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  targetPostCount: number;
  publishedPostCount: number;
  status: 'active' | 'completed' | 'draft';
  budget?: number;
}

// ==========================================
// CHAT & KOMUNIKASI
// ==========================================
export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  isAiResponse?: boolean;
}

export interface ChatThread {
  id: string;
  customerName: string;
  platform: Platform;
  productName: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
  messages: ChatMessage[];
}
