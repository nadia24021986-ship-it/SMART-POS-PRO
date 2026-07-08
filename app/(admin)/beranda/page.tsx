'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { PpobProduct, PpobCategory, PpobTransaction } from '@/lib/types';

const CATEGORY_LABEL: Record<PpobCategory, string> = {
  pulsa: 'Pulsa',
  token_listrik: 'Token Listrik',
  paket_data: 'Paket Data',
  e_wallet: 'E-Wallet',
  lainnya: 'Lainnya',
};

export default function PpobPage() {
  const supabase = createClient();

  const [products, setProducts] = useState<PpobProduct[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<PpobCategory | 'semua'>('semua');
  const [selectedProduct, setSelectedProduct] = useState<PpobProduct | null>(null);
  const [customerNumber, setCustomerNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pendingTx, setPendingTx] = useState<PpobTransaction[]>([]);
  const [serialInputs, setSerialInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    loadProducts();
    loadPending();
  }, []);

  async function loadProducts() {
    const { data } = await supabase
      .from('ppob_products')
      .select('*')
      .eq('is_active', true)
      .order('category');
    setProducts(data || []);
  }

  async function loadPending() {
    const { data } = await supabase
      .from('ppob_transactions')
      .select('*')
      .in('status', ['pending', 'diproses'])
      .order('created_at', { ascending: false });
    setPendingTx(data || []);
  }

  async function handleCreateTransaction() {
    setError(null);
    if (!selectedProduct || !customerNumber.trim()) {
      setError('Pilih produk dan isi nomor pelanggan/HP.');
      return;
    }
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: insertError } = await supabase.from('ppob_transactions').insert({
      ppob_product_id: selectedProduct.id,
      customer_number: customerNumber.trim(),
      selling_price: selectedProduct.selling_price,
      cost_price: selectedProduct.cost_price,
      status: 'pending',
      cashier_id: user?.id,
    });

    setSaving(false);

    if (insertError) {
      setError('Gagal menyimpan: ' + insertError.message);
      return;
    }

    setSelectedProduct(null);
    setCustomerNumber('');
    loadPending();
  }

  async function handleCompleteTransaction(tx: PpobTransaction) {
    const code = serialInputs[tx.id]?.trim();
    if (!code) {
      alert('Isi kode/token/serial dulu sebelum menyelesaikan transaksi.');
      return;
    }
    const { error } = await supabase
      .from('ppob_transactions')
      .update({ status: 'selesai', serial_code: code, completed_at: new Date().toISOString() })
      .eq('id', tx.id);

    if (error) {
      alert('Gagal menyelesaikan: ' + error.message);
      return;
    }
    loadPending();
  }

  async function handleFailTransaction(tx: PpobTransaction) {
    if (!confirm('Tandai transaksi ini gagal? (misal stok biller habis / nomor salah)')) return;
    await supabase.from('ppob_transactions').update({ status: 'gagal' }).eq('id', tx.id);
    loadPending();
  }

  const filteredProducts =
    selectedCategory === 'semua' ? products : products.filter((p) => p.category === selectedCategory);

  const groupedByCategory = filteredProducts.reduce<Record<string, PpobProduct[]>>((acc, p) => {
    acc[p.category] = acc[p.category] || [];
    acc[p.category].push(p);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold">Produk Digital (PPOB)</h1>
        <p className="text-xs text-slate-500 mt-1">
          Pencatatan manual — kode/token diinput setelah kamu beli dari akun biller pribadi.
          Belum terhubung ke sistem PLN/operator otomatis.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Buat transaksi baru */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 space-y-3 h-fit">
          <h2 className="font-semibold text-sm">Transaksi Baru</h2>

          <div className="flex flex-wrap gap-2">
            {(['semua', 'pulsa', 'token_listrik', 'paket_data', 'e_wallet', 'lainnya'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`text-xs px-3 py-1.5 rounded-lg border ${
                  selectedCategory === c
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-slate-300 dark:border-slate-700'
                }`}
              >
                {c === 'semua' ? 'Semua' : CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1">
            {filteredProducts.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                Belum ada produk. Tambahkan dulu di halaman "Kelola Produk Digital".
              </p>
            ) : (
              filteredProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProduct(p)}
                  className={`w-full flex justify-between items-center px-3 py-2 rounded-lg text-left text-sm border ${
                    selectedProduct?.id === p.id
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950'
                      : 'border-slate-100 dark:border-slate-800'
                  }`}
                >
                  <span>{p.name}</span>
                  <span className="font-semibold">Rp {p.selling_price.toLocaleString('id-ID')}</span>
                </button>
              ))
            )}
          </div>

          <input
            value={customerNumber}
            onChange={(e) => setCustomerNumber(e.target.value)}
            placeholder="No. HP / No. Meter Pelanggan"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
          />

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            onClick={handleCreateTransaction}
            disabled={saving || !selectedProduct}
            className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2.5"
          >
            {saving ? 'Memproses...' : 'Buat Transaksi (Pending)'}
          </button>
        </div>

        {/* Transaksi pending yang perlu diproses */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4">
          <h2 className="font-semibold text-sm mb-3">Menunggu Diproses ({pendingTx.length})</h2>
          {pendingTx.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Tidak ada transaksi pending.</p>
          ) : (
            <div className="space-y-3">
              {pendingTx.map((tx) => (
                <div key={tx.id} className="border border-slate-100 dark:border-slate-800 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{tx.transaction_number}</span>
                    <span className="text-emerald-600 font-semibold">
                      Rp {tx.selling_price.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">No: {tx.customer_number}</p>
                  <input
                    value={serialInputs[tx.id] || ''}
                    onChange={(e) => setSerialInputs({ ...serialInputs, [tx.id]: e.target.value })}
                    placeholder="Input kode/token/serial hasil beli..."
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-1.5 text-xs"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCompleteTransaction(tx)}
                      className="flex-1 rounded-lg bg-emerald-600 text-white text-xs font-medium py-1.5"
                    >
                      Selesai
                    </button>
                    <button
                      onClick={() => handleFailTransaction(tx)}
                      className="flex-1 rounded-lg border border-red-300 text-red-600 text-xs font-medium py-1.5"
                    >
                      Gagal
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
