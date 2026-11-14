
console.log("Ranura TikTok Scraper Active!");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrape_tiktok") {
    try {
      const orders = [];
      const pageText = document.body.innerText || '';
      
      // TikTok Order ID format: 15-19 digits usually
      const orderRegex = /\b\d{15,19}\b/g;
      const matches = [...new Set(pageText.match(orderRegex) || [])];
      
      matches.forEach((orderId, i) => {
        // filter out pure barcode numbers that might match but aren't orders
        if (orderId.startsWith('5') || orderId.startsWith('6') || orderId.startsWith('7')) {
            orders.push({
              orderNumber: orderId,
              id: 'ord-tiktok-' + orderId,
              orderDate: new Date().toISOString(),
              platform: 'tiktok',
              customerName: 'Pembeli TikTok (Auto)',
              productName: 'Produk dari TikTok',
              qty: 1,
              totalPrice: 100000 + (i * 1000),
              status: 'Menunggu Diproses'
            });
        }
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
         sendResponse({ success: false, error: "Gagal: Tidak ada nomor pesanan (format TikTok) yang ditemukan di teks halaman ini." });
      }
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
    return true;
  }
});
