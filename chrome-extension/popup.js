function syncData(platform, urlKeyword, actionName) {
  const statusEl = document.getElementById('status');
  statusEl.innerText = "Menyinkronkan...";
  statusEl.style.color = "orange";

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab.url.includes(urlKeyword)) {
      chrome.tabs.sendMessage(tab.id, { action: actionName }, (response) => {
        if (response && response.success) {
          statusEl.innerText = `Berhasil menarik ${response.count} pesanan!`;
          statusEl.style.color = "green";
        } else {
          statusEl.innerText = "Gagal: " + (response ? response.error : "Halaman belum selesai dimuat atau ekstensi perlu direload.");
          statusEl.style.color = "red";
        }
      });
    } else {
      statusEl.innerText = `Harap buka halaman ${platform} Seller Center terlebih dahulu.`;
      statusEl.style.color = "red";
    }
  });
}

document.getElementById('btnShopee').addEventListener('click', () => {
  syncData("Shopee", "seller.shopee.co.id", "scrape_shopee");
});

document.getElementById('btnTiktok').addEventListener('click', () => {
  syncData("TikTok", "tiktok.com", "scrape_tiktok");
});
