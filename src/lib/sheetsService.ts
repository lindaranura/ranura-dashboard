import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { ProductionItem } from '../types';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive');
provider.addScope('https://mail.google.com/');
provider.setCustomParameters({ prompt: 'select_account' });

let isSigningIn = false;
let cachedAccessToken: string | null = localStorage.getItem('google_access_token');

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const token = cachedAccessToken || localStorage.getItem('google_access_token');
      if (token) {
        cachedAccessToken = token;
        localStorage.setItem('google_access_token', token);
        if (onAuthSuccess) onAuthSuccess(user, token);
      } else {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      localStorage.removeItem('google_access_token');
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google Auth');
    }

    cachedAccessToken = credential.accessToken;
    localStorage.setItem('google_access_token', cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  localStorage.removeItem('google_access_token');
};

export const getCachedToken = () => cachedAccessToken || localStorage.getItem('google_access_token');

// ------------------- SHEETS API OPERATIONS -------------------

export interface SpreadsheetInfo {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
}

// 1. Create a brand new Google Sheet
export const createNewSpreadsheet = async (token: string, title: string): Promise<SpreadsheetInfo> => {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: title || 'Ranura Berkah Abadi - Sinkronisasi Stok & Produksi',
      },
      sheets: [
        {
          properties: {
            title: 'Stok & Inventaris',
            gridProperties: {
              frozenRowCount: 1,
            }
          }
        },
        {
          properties: {
            title: 'Data Order',
            gridProperties: {
              frozenRowCount: 1,
            }
          }
        }
      ]
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gagal membuat Spreadsheet: ${errText}`);
  }

  const data = await response.json();
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
    title: data.properties.title,
  };
};

// 2. Export inventory items to the Sheet
export const exportInventoryToSheets = async (
  token: string,
  spreadsheetId: string,
  inventory: ProductionItem[]
): Promise<void> => {
  const range = "'Stok & Inventaris'!A1:H100";
  
  // Format rows beautifully
  const headers = ['ID Produk', 'Nama Produk', 'SKU', 'Kategori', 'Stok Masuk', 'Stok Keluar', 'Stok Akhir', 'Satuan'];
  const rows = inventory.map(item => [
    item.id,
    item.name,
    item.sku,
    item.category,
    item.stockIn ?? (item.stock + item.reserved),
    item.stockOut ?? item.reserved,
    item.stock,
    item.unit
  ]);

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: [headers, ...rows],
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gagal mengekspor data ke Google Sheets: ${errText}`);
  }
};

// 3. Import inventory items (full item data) from the Sheet
export const importInventoryFromSheets = async (
  token: string,
  spreadsheetId: string
): Promise<ProductionItem[]> => {
  const range = "'Stok & Inventaris'!A2:H100"; // skip headers
  
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gagal membaca data dari Google Sheets: ${errText}`);
  }

  const data = await response.json();
  const values: any[][] = data.values || [];

  const items: ProductionItem[] = [];
  for (const row of values) {
    if (row && row.length >= 7) {
      const id = row[0];
      const name = row[1] || 'Produk Tanpa Nama';
      const sku = row[2] || '';
      const category = row[3] || 'Lain-lain';
      const stockInVal = parseInt(row[4], 10) || 0;
      const stockOutVal = parseInt(row[5], 10) || 0;
      const stockVal = parseInt(row[6], 10) || 0;
      const unit = row[7] || 'pcs';

      if (id) {
        // Determine status based on stock level
        let status: 'optimal' | 'warning' | 'critical' = 'optimal';
        if (stockVal <= 5) {
          status = 'critical';
        } else if (stockVal <= 15) {
          status = 'warning';
        }

        items.push({
          id,
          name,
          sku,
          category,
          stock: stockVal,
          reserved: 0, // Will preserve existing reservations during merger
          stockIn: stockInVal,
          stockOut: stockOutVal,
          status,
          unit
        });
      }
    }
  }

  return items;
};

// 4. Export stock transaction/movement logs to a separate sheet "Log Mutasi Stok"
export const exportMovementsToSheets = async (
  token: string,
  spreadsheetId: string,
  movements: any[]
): Promise<void> => {
  // Try to create the sheet "Log Mutasi Stok" first (ignore error if it already exists)
  try {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: {
                  title: 'Log Mutasi Stok',
                  gridProperties: {
                    frozenRowCount: 1,
                  }
                }
              }
            }
          ]
        }),
      }
    );
  } catch (e) {
    // Already exists or other non-blocking issue
    console.log('Sheet creation skipped or already exists', e);
  }

  // Now, update values in 'Log Mutasi Stok'
  const range = "'Log Mutasi Stok'!A1:H1500";
  const headers = ['ID Mutasi', 'SKU', 'Nama Produk', 'Tanggal', 'Tipe', 'Jumlah', 'Referensi', 'Operator'];
  const rows = movements.map(m => [
    m.id,
    m.sku,
    m.productName,
    m.date,
    m.type === 'in' ? 'Stok Masuk' : 'Stok Keluar',
    m.qty,
    m.reference,
    m.operator || 'Sistem'
  ]);

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: [headers, ...rows],
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gagal mengekspor Log Mutasi ke Google Sheets: ${errText}`);
  }
};

// 5. Export orders to 'Data Order' sheet
export const exportOrdersToSheets = async (
  token: string,
  spreadsheetId: string,
  orders: any[]
): Promise<void> => {
  try {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: {
                  title: 'Data Order',
                  gridProperties: {
                    frozenRowCount: 1,
                  }
                }
              }
            }
          ]
        }),
      }
    );
  } catch (e) {
    console.log('Order Sheet creation skipped or already exists', e);
  }

  const range = "'Data Order'!A1:K1000";
  const headers = ['ID Order', 'No. Order', 'Platform', 'Customer', 'Nama Barang', 'SKU', 'Qty', 'Total Harga', 'Status', 'Tanggal Order', 'Tanggal Kirim'];
  const rows = orders.map(o => [
    o.id,
    o.orderNumber,
    o.platform,
    o.customerName,
    o.productName,
    o.sku,
    o.qty,
    o.totalPrice,
    o.status,
    o.orderDate,
    o.shippingDate
  ]);

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: [headers, ...rows],
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gagal mengekspor Data Order ke Google Sheets: ${errText}`);
  }
};

// 6. Import orders from 'Data Order' sheet
export const importOrdersFromSheets = async (
  token: string,
  spreadsheetId: string
): Promise<any[]> => {
  const range = "'Data Order'!A2:K1000";
  
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gagal membaca Data Order dari Google Sheets: ${errText}`);
  }

  const data = await response.json();
  const values: any[][] = data.values || [];

  const orders: any[] = [];
  for (const row of values) {
    if (row && row.length >= 7) {
      const id = row[0] || `ord-sheet-${Date.now()}-${Math.random()}`;
      const orderNumber = row[1] || '';
      const platform = row[2] || 'direct';
      const customerName = row[3] || 'Anonim';
      const productName = row[4] || '';
      const sku = row[5] || '';
      const qty = parseInt(row[6], 10) || 1;
      const totalPrice = parseInt(row[7], 10) || 0;
      const status = row[8] || 'Pending';
      const orderDate = row[9] || new Date().toISOString();
      const shippingDate = row[10] || new Date().toISOString();

      if (orderNumber) {
        orders.push({
          id,
          orderNumber,
          platform,
          customerName,
          productName,
          sku,
          qty,
          totalPrice,
          status,
          orderDate,
          shippingDate,
          shippingAddress: 'Kawasan Industri MM2100 Blok C-3, Cikarang Barat, Jawa Barat'
        });
      }
    }
  }

  return orders;
};

// 7. Append structured Telegram order data directly to target tab sheet ('DATA ORDER 2026' or 'Ranura Swimwear')
export const appendTelegramOrderToSheetTab = async (
  token: string,
  spreadsheetId: string,
  targetTab: 'DATA ORDER 2026' | 'Ranura Swimwear',
  data: {
    tanggal: string;
    namaPembeli: string;
    alamatPembeli: string;
    nomorTelepon: string;
    namaProduk: string;
    pengiriman: string;
  }
): Promise<void> => {
  // Ensure tab sheet exists first
  try {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: {
                  title: targetTab,
                  gridProperties: {
                    frozenRowCount: 1,
                  }
                }
              }
            }
          ]
        }),
      }
    );
  } catch (e) {
    // Sheet tab already exists, non-blocking
  }

  const range = `'${targetTab}'!A:F`;
  const rowValues = [
    data.tanggal,
    data.namaPembeli,
    data.alamatPembeli,
    data.nomorTelepon,
    data.namaProduk,
    data.pengiriman
  ];

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: [rowValues],
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gagal menambahkan data ke tab '${targetTab}': ${errText}`);
  }
};

