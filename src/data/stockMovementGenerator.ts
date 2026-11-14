import { ProductionItem, StockMovement } from '../types';

export type { StockMovement };

// Generate deterministic historical movements for the last 24 months with apparel terminology & running balance
export const generateHistoricalMovements = (inventory: ProductionItem[]): StockMovement[] => {
  const movements: StockMovement[] = [];
  const now = new Date(); // Dynamic current date
  
  // Starting date is 2 years ago
  const startDate = new Date(now.getFullYear() - 2, now.getMonth(), 1);
  
  // Deterministic random generator based on a seed string to keep it stable
  const seedRandom = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(Math.sin(hash)) * 1000 % 1;
  };

  const operators = [
    'Ahmad (Kepala Gudang)', 
    'Fachrie (Staff Gudang)', 
    'Siti (Logistik & Packaging)', 
    'Hendra (QC & Finishing)', 
    'Dewi (Admin Operasional)'
  ];
  
  const refIn = [
    'Produksi Batch Garmen (Jahit)', 
    'Penyelesaian Bordir & Busa', 
    'Penerimaan Bahan & Finishing', 
    'Restock Batch Mayudee',
    'Penyesuaian Sheet Sync'
  ];
  
  const refOut = [
    'Pengiriman Pesanan Shopee', 
    'Pengiriman Pesanan TikTok', 
    'Keluaran Logistik Reseller', 
    'Ekspor Manual (Direct Order)',
    'Sample Produk & Promosi'
  ];

  inventory.forEach((item, itemIdx) => {
    let currentDay = new Date(startDate);
    let movementIdCounter = 1;
    let runningBalance = item.initialStock || Math.max(20, item.stock - 50);

    while (currentDay <= now) {
      const dateStr = currentDay.toISOString().split('T')[0];
      const daySeed = `${item.sku}-${dateStr}`;

      const r1 = seedRandom(daySeed + '-1');
      const r2 = seedRandom(daySeed + '-2');

      // Weekly / Bi-weekly Stock In (Produksi Garmen)
      const isProductionDay = itemIdx % 2 === 0 
        ? currentDay.getDate() % 14 === 0 
        : currentDay.getDate() % 10 === 0;

      if (isProductionDay) {
        const prodQty = Math.floor(25 + r1 * 40);
        runningBalance += prodQty;
        movements.push({
          id: `mvt-${item.id}-${dateStr}-${movementIdCounter++}`,
          itemId: item.id,
          productName: item.name,
          sku: item.sku,
          date: dateStr,
          type: 'in',
          qty: prodQty,
          reference: refIn[Math.floor(r1 * refIn.length)] + ` #${currentDay.getFullYear()}${(currentDay.getMonth() + 1).toString().padStart(2, '0')}-${currentDay.getDate()}`,
          operator: operators[Math.floor(r2 * operators.length)],
          balanceAfter: runningBalance
        });
      }

      // Frequent smaller Stock Out (Sales Orders / Shipping)
      const hasSales = r2 > 0.45; // ~55% probability daily
      if (hasSales) {
        const saleQty = Math.min(runningBalance, Math.floor(4 + r1 * 12));
        if (saleQty > 0) {
          runningBalance -= saleQty;
          movements.push({
            id: `mvt-${item.id}-${dateStr}-${movementIdCounter++}`,
            itemId: item.id,
            productName: item.name,
            sku: item.sku,
            date: dateStr,
            type: 'out',
            qty: saleQty,
            reference: refOut[Math.floor(r2 * refOut.length)] + ` #${currentDay.getFullYear()}${(currentDay.getMonth() + 1).toString().padStart(2, '0')}-${currentDay.getDate()}`,
            operator: operators[Math.floor(r1 * operators.length)],
            balanceAfter: runningBalance
          });
        }
      }

      // Move to next day
      currentDay.setDate(currentDay.getDate() + 1);
    }
  });

  return movements;
};

