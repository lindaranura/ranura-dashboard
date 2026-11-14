import React, { useState, useEffect } from 'react';

export default function MasterDataOrder() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Fungsi untuk menarik data dari Bot (Port 3001)
  const fetchOrders = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/orders');
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (error) {
      console.error("Gagal terhubung ke Mesin Bot:", error);
    } finally {
      setLoading(false);
    }
  };

  // Jalankan fungsi penarik data, dan atur agar mengecek setiap 5 detik
  useEffect(() => {
    fetchOrders(); // Tarik data pertama kali saat halaman dibuka
    const interval = setInterval(() => {
      fetchOrders(); // Cek data baru setiap 5 detik secara diam-diam
    }, 5000); 

    // Bersihkan interval jika pengguna berpindah halaman
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            📦 Master Data Order (Real-Time)
          </h2>
          <div className="flex items-center space-x-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-sm text-green-600 font-semibold">Terkoneksi ke Telegram Bot</span>
          </div>
        </div>

        {/* Tabel Data */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-100">
              <tr>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Sumber / Tab</th>
                <th className="px-4 py-3">Nama Pembeli</th>
                <th className="px-4 py-3">No WA</th>
                <th className="px-4 py-3">Produk</th>
                <th className="px-4 py-3 text-center">Qty</th>
                <th className="px-4 py-3">Batas Kirim</th>
                <th className="px-4 py-3">Pengiriman</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Mencari data pesanan...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Belum ada orderan baru yang masuk sejak sistem dinyalakan.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{order.tanggal}</td>
                    <td className="px-4 py-3">
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                        {order.sumber}
                      </span>
                      <div className="text-xs text-gray-400 mt-1">{order.kategori}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{order.nama}</td>
                    <td className="px-4 py-3">{order.telp}</td>
                    <td className="px-4 py-3 whitespace-pre-wrap">{order.produk}</td>
                    <td className="px-4 py-3 text-center font-bold">{order.jumlah}</td>
                    <td className="px-4 py-3 text-red-600 font-medium">{order.batasKirim}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded border ${
                        order.pengiriman.includes('COD') ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-green-50 text-green-700 border-green-200'
                      }`}>
                        {order.pengiriman}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}