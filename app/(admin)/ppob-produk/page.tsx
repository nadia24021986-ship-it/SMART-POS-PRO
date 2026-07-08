'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { PpobProduct, PpobCategory } from '@/lib/types';

const CATEGORY_LABEL: Record<PpobCategory, string> = {
  pulsa: 'Pulsa',
  token_listrik: 'Token Listrik',
  paket_data: 'Paket Data',
  e_wallet: 'E-Wallet',
  lainnya: 'Lainnya',
};

export default function PpobProdukPage() {
  const supabase = createClient();

  const [products, setProducts] = useState<PpobProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [category, setCategory] = useState<PpobCategory>('pulsa');
  const [name, setName] = useState('');
  const [denomination, setDenomination] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [costPrice, setCostPrice] = useState(0);

  async function loadProducts() {
    setLoading(true);
    const { data } = await supabase.from('ppob_products').select('*').order('category');
    setProducts(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function resetForm() {
    setEditingId(null);
    setCategory('pulsa');
    setName('');
    setDenomination(0);
    setSellingPrice(0);
    setCostPrice(0);
  }

  function startEdit(p: PpobProduct) {
    setEditingId(p.id);
    setCategory(p.category);
    setName(p.name);
    setDenomination(p.denomination);
    setSellingPrice(p.selling_price);
    setCostPrice(p.cost_price);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Nama produk wajib diisi.');
      return;
    }

    const payload = {
      category,
      name: name.trim(),
      denomination,
      selling_price: sellingPrice,
      cost_price: costPrice,
    };

    const { error: dbError } = editingId
      ? await supabase.from('ppob_products').update(payload).eq('id', editingId)
      : await supabase.from('ppob_products').insert(payload);

    if (dbError) {
      setError('Gagal menyimpan: ' + dbError.message);
      return;
    }

    resetForm();
    loadProducts();
  }

  async function toggleActive(p: PpobProduct) {
    await supabase.from('ppob_products').update({ is_active: !p.is_active }).eq('id', p.id);
    loadProducts();
  }

  async function handleDelete(p: PpobProduct) {
    if (!confirm(`Hapus produk "${p.name}"?`)) return;
    const { error } = await supabase.from('ppob_products').delete().eq('id', p.id);
    if (error) {
      alert('Gagal menghapus (mungkin sudah pernah dipakai transaksi): ' + error.message);
      return;
    }
    loadProducts();
  }

  const margin = sellingPrice - costPrice;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 space-y-4">
      <h1 className="text-xl font-bold">Kelola Produk Digital</h1>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 h-fit">
          <h2 className="font-semibold text-sm mb-3">
            {editingId ? 'Edit Produk' : 'Tambah Produk'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as PpobCategory)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
            >
              {Object.entries(CATEGORY_LABEL).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama (e.g. Token Listrik 20.000)"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
            />
            <div>
              <label className="text-xs text-slate-500">Nominal (opsional, untuk info)</label>
              <input
                type="number"
                min={0}
                value={denomination || ''}
                onChange={(e) => setDenomination(Number(e.target.value) || 0)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-500">Harga Modal</label>
                <input
                  type="number"
                  min={0}
                  value={costPrice || ''}
                  onChange={(e) => setCostPrice(Number(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Harga Jual</label>
                <input
                  type="number"
                  min={0}
                  value={sellingPrice || ''}
                  onChange={(e) => setSellingPrice(Number(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
                />
              </div>
            </div>
            {sellingPrice > 0 && costPrice > 0 && (
              <p className="text-xs text-slate-500">
                Margin: <span className={margin >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                  Rp {margin.toLocaleString('id-ID')}
                </span>
              </p>
            )}
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2"
              >
                {editingId ? 'Simpan' : 'Tambah'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 text-sm px-3"
                >
                  Batal
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 overflow-x-auto">
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-8">Memuat...</p>
          ) : products.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Belum ada produk digital.</p>
          ) : (
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100 dark:border-slate-800">
                  <th className="py-2">Nama</th>
                  <th className="py-2">Kategori</th>
                  <th className="py-2">Modal</th>
                  <th className="py-2">Jual</th>
                  <th className="py-2">Status</th>
                  <th className="py-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                    <td className="py-2 font-medium">{p.name}</td>
                    <td className="py-2 text-slate-500">{CATEGORY_LABEL[p.category]}</td>
                    <td className="py-2">Rp {p.cost_price.toLocaleString('id-ID')}</td>
                    <td className="py-2">Rp {p.selling_price.toLocaleString('id-ID')}</td>
                    <td className="py-2">
                      <button
                        onClick={() => toggleActive(p)}
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          p.is_active
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                        }`}
                      >
                        {p.is_active ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                    <td className="py-2 text-right space-x-3">
                      <button onClick={() => startEdit(p)} className="text-blue-600 text-xs font-medium">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(p)} className="text-red-600 text-xs font-medium">
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
