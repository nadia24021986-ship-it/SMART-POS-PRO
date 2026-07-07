'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Product, Category } from '@/lib/types';
import ProductFormModal from '@/components/products/ProductFormModal';

const PAGE_SIZE = 10;

export default function ProductsPage() {
  const supabase = createClient();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'selling_price'>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [loading, setLoading] = useState(true);
  const [modalProduct, setModalProduct] = useState<Product | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .order('name')
      .then(({ data }) => setCategories(data || []));
  }, []);

  async function loadProducts() {
    setLoading(true);
    let query = supabase.from('products').select('*', { count: 'exact' });

    if (search.trim()) {
      query = query.or(
        `name.ilike.%${search}%,barcode.eq.${search},product_code.ilike.%${search}%`
      );
    }
    if (categoryFilter) query = query.eq('category_id', categoryFilter);
    if (statusFilter) query = query.eq('status', statusFilter);

    query = query
      .order(sortBy, { ascending: sortAsc })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    const { data, count, error } = await query;
    if (error) setError(error.message);
    setProducts(data || []);
    setTotalCount(count || 0);
    setLoading(false);
  }

  useEffect(() => {
    loadProducts();
  }, [page, search, categoryFilter, statusFilter, sortBy, sortAsc]);

  async function handleDelete(product: Product) {
    if (!confirm(`Hapus produk "${product.name}"?`)) return;
    const { error } = await supabase.from('products').delete().eq('id', product.id);
    if (error) {
      alert(
        error.message.includes('sales history')
          ? 'Produk ini tidak bisa dihapus karena sudah pernah terjual. Nonaktifkan saja statusnya.'
          : 'Gagal menghapus: ' + error.message
      );
      return;
    }
    loadProducts();
  }

  function toggleSort(field: 'name' | 'stock' | 'selling_price') {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(true);
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Produk</h1>
        <button
          onClick={() => setModalProduct(null)}
          className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2"
        >
          + Tambah Produk
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 mb-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => {
            setPage(0);
            setSearch(e.target.value);
          }}
          placeholder="Cari nama / barcode / kode..."
          className="flex-1 min-w-[180px] rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
        />
        <select
          value={categoryFilter}
          onChange={(e) => {
            setPage(0);
            setCategoryFilter(e.target.value);
          }}
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
        >
          <option value="">Semua Kategori</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setPage(0);
            setStatusFilter(e.target.value);
          }}
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
        >
          <option value="">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 overflow-x-auto">
        {loading ? (
          <p className="text-sm text-slate-400 text-center py-8">Memuat...</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Tidak ada produk.</p>
        ) : (
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100 dark:border-slate-800">
                <th className="py-2">Barcode</th>
                <th className="py-2 cursor-pointer" onClick={() => toggleSort('name')}>
                  Nama {sortBy === 'name' && (sortAsc ? '↑' : '↓')}
                </th>
                <th className="py-2 cursor-pointer" onClick={() => toggleSort('selling_price')}>
                  Harga Jual {sortBy === 'selling_price' && (sortAsc ? '↑' : '↓')}
                </th>
                <th className="py-2 cursor-pointer" onClick={() => toggleSort('stock')}>
                  Stok {sortBy === 'stock' && (sortAsc ? '↑' : '↓')}
                </th>
                <th className="py-2">Status</th>
                <th className="py-2 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-slate-50 dark:border-slate-800/50 last:border-0"
                >
                  <td className="py-2 text-slate-500">{p.barcode}</td>
                  <td className="py-2 font-medium">
                    {p.name}
                    {p.stock <= p.min_stock && (
                      <span className="ml-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950 px-1.5 py-0.5 rounded">
                        Stok Menipis
                      </span>
                    )}
                  </td>
                  <td className="py-2">Rp {p.selling_price.toLocaleString('id-ID')}</td>
                  <td className="py-2">{p.stock}</td>
                  <td className="py-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        p.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                      }`}
                    >
                      {p.status === 'active' ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="py-2 text-right space-x-3">
                    <button
                      onClick={() => setModalProduct(p)}
                      className="text-blue-600 text-xs font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(p)}
                      className="text-red-600 text-xs font-medium"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-slate-500">
            Halaman {page + 1} dari {totalPages} ({totalCount} produk)
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40"
            >
              Sebelumnya
            </button>
            <button
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </div>

      {modalProduct !== undefined && (
        <ProductFormModal
          product={modalProduct}
          categories={categories}
          onClose={() => setModalProduct(undefined)}
          onSaved={loadProducts}
        />
      )}
    </div>
  );
}

