
console.log("Ranura Shopee Scraper Active!");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrape_shopee") {
    try {
      const orders = [];
      const pageText = document.body.innerText || '';
      
      // Shopee Order SN format: Starts with year-month-day (e.g. 230930, 241230), 14-15 chars total
      const orderRegex = /\b2[3-9][0-1][0-9][0-3][0-9][A-Z0-9]{8,10}\b/g;
      
      const matches = [...new Set(pageText.match(orderRegex) || [])];
      
      matches.forEach((orderId, i) => {
        orders.push({
          orderNumber: orderId,
          id: 'ord-shopee-' + orderId,
          orderDate: new Date().toISOString(),
          platform: 'shopee',
          customerName: 'Pembeli Shopee (Auto)',
          productName: 'Produk dari Shopee',
          qty: 1,
          totalPrice: 100000 + (i * 1000),
          status: 'Menunggu Diproses'
        });
      });

      if (orders.length > 0) {
        fetch('http://localhost:3001/api/orders/insert-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orders })
        }).then(() => {
          sendResponse({ success: true, count: orders.length });
        }).catch(e => {
          sendResponse({ success: false, error: "Gagal terhubung ke Dasbor (Localhost). Pastikan terminal Dasbor sedang berjalan." });
        });
      } else {
         sendResponse({ success: false, error: "Gagal: Tidak ada nomor pesanan (format Shopee) yang ditemukan di teks halaman ini." });
      }
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
    return true; 
  }
});
