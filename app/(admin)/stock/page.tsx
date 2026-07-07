'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Product } from '@/lib/types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface StockLog {
  id: string;
  product_id: string;
  type: 'in' | 'out' | 'adjustment' | 'sale';
  quantity: number;
  reason: string | null;
  created_at: string;
  products?: { name: string };
}

interface StockEstimate {
  product_id: string;
  name: string;
  stock: number;
  avg_daily_sold: number;
  days_left: number | null;
}

export default function StockPage() {
  const supabase = createClient();

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [movementType, setMovementType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [quantity, setQuantity] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [logs, setLogs] = useState<StockLog[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loadingLogs, setLoadingLogs] = useState(true);

  const [estimates, setEstimates] = useState<StockEstimate[]>([]);

  useEffect(() => {
    supabase
      .from('products')
      .select('*')
      .eq('status', 'active')
      .order('name')
      .then(({ data }) => setProducts(data || []));
    loadEstimates();
  }, []);

  useEffect(() => {
    loadLogs();
  }, [dateFrom, dateTo]);

  async function loadLogs() {
    setLoadingLogs(true);
    let query = supabase
      .from('stock_logs')
      .select('*, products(name)')
      .order('created_at', { ascending: false })
      .limit(200);

    if (dateFrom) query = query.gte('created_at', new Date(dateFrom).toISOString());
    if (dateTo) query = query.lte('created_at', new Date(dateTo + 'T23:59:59').toISOString());

    const { data } = await query;
    setLogs(data || []);
    setLoadingLogs(false);
  }

  async function loadEstimates() {
    const { data: productsData } = await supabase
      .from('products')
      .select('id, name, stock')
      .eq('status', 'active');

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: salesData } = await supabase
      .from('sale_items')
      .select('product_id, qty, sales!inner(created_at, payment_status)')
      .gte('sales.created_at', thirtyDaysAgo)
      .eq('sales.payment_status', 'paid');

    const soldMap = new Map<string, number>();
    (salesData || []).forEach((i: any) => {
      soldMap.set(i.product_id, (soldMap.get(i.product_id) || 0) + i.qty);
    });

    const result: StockEstimate[] = (productsData || [])
      .map((p) => {
        const totalSold = soldMap.get(p.id) || 0;
        const avgDaily = totalSold / 30;
        return {
          product_id: p.id,
          name: p.name,
          stock: p.stock,
          avg_daily_sold: avgDaily,
          days_left: avgDaily > 0 ? Math.floor(p.stock / avgDaily) : null,
        };
      })
      .filter((e) => e.days_left !== null && e.days_left <= 14)
      .sort((a, b) => (a.days_left ?? 999) - (b.days_left ?? 999));

    setEstimates(result);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedProduct || quantity <= 0) {
      setError('Pilih produk dan isi jumlah lebih dari 0.');
      return;
    }

    setSaving(true);

    const product = products.find((p) => p.id === selectedProduct);
    if (!product) {
      setError('Produk tidak ditemukan.');
      setSaving(false);
      return;
    }

    // Determine stock delta based on movement type
    let delta = 0;
    if (movementType === 'in') delta = quantity;
    else if (movementType === 'out') delta = -quantity;
    else delta = quantity; // adjustment: quantity can represent the signed change

    const newStock = product.stock + delta;
    if (newStock < 0) {
      setError(`Stok tidak cukup. Stok saat ini: ${product.stock}.`);
      setSaving(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: updateError } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', selectedProduct);

    if (updateError) {
      setError('Gagal update stok: ' + updateError.message);
      setSaving(false);
      return;
    }

    const { error: logError } = await supabase.from('stock_logs').insert({
      product_id: selectedProduct,
      type: movementType,
      quantity: delta,
      reason: reason || null,
      created_by: user?.id,
    });

    if (logError) {
      setError('Stok terupdate, tapi gagal mencatat riwayat: ' + logError.message);
    }

    setSaving(false);
    setSelectedProduct('');
    setQuantity(0);
    setReason('');

    // refresh local product list + logs + estimates
    supabase
      .from('products')
      .select('*')
      .eq('status', 'active')
      .order('name')
      .then(({ data }) => setProducts(data || []));
    loadLogs();
    loadEstimates();
  }

  function exportExcel() {
    const rows = logs.map((l) => ({
      Tanggal: new Date(l.created_at).toLocaleString('id-ID'),
      Produk: l.products?.name || '-',
      Tipe: l.type,
      Jumlah: l.quantity,
      Keterangan: l.reason || '-',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Riwayat Stok');
    XLSX.writeFile(wb, `riwayat-stok-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function exportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Riwayat Stok - Smart POS Pro', 14, 15);
    autoTable(doc, {
      startY: 22,
      head: [['Tanggal', 'Produk', 'Tipe', 'Jumlah', 'Keterangan']],
      body: logs.map((l) => [
        new Date(l.created_at).toLocaleString('id-ID'),
        l.products?.name || '-',
        l.type,
        l.quantity.toString(),
        l.reason || '-',
      ]),
      styles: { fontSize: 8 },
    });
    doc.save(`riwayat-stok-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  const typeLabel: Record<string, string> = {
    in: 'Stok Masuk',
    out: 'Stok Keluar',
    adjustment: 'Penyesuaian',
    sale: 'Penjualan',
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 space-y-4">
      <h1 className="text-xl font-bold">Manajemen Stok</h1>

      {estimates.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 rounded-2xl p-4">
          <h2 className="font-semibold text-sm mb-2 text-amber-800 dark:text-amber-300">
            ⚠️ Perkiraan Stok Akan Habis (≤14 hari)
          </h2>
          <div className="grid md:grid-cols-2 gap-2 text-sm">
            {estimates.map((e) => (
              <div key={e.product_id} className="flex justify-between bg-white/50 dark:bg-black/20 rounded-lg px-3 py-2">
                <span>{e.name}</span>
                <span className="font-medium">
                  Stok: {e.stock} · ~{e.days_left} hari lagi
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 h-fit">
          <h2 className="font-semibold text-sm mb-3">Catat Pergerakan Stok</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
            >
              <option value="">Pilih produk...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (stok: {p.stock})
                </option>
              ))}
            </select>

            <div className="grid grid-cols-3 gap-2">
              {(['in', 'out', 'adjustment'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setMovementType(t)}
                  className={`rounded-lg py-2 text-xs font-medium border ${
                    movementType === t
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-slate-300 dark:border-slate-700'
                  }`}
                >
                  {typeLabel[t]}
                </button>
              ))}
            </div>

            <input
              type="number"
              min={0}
              value={quantity || ''}
              onChange={(e) => setQuantity(Number(e.target.value) || 0)}
              placeholder={movementType === 'adjustment' ? 'Jumlah penyesuaian' : 'Jumlah'}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
            />
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Keterangan (opsional)"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
            />

            {error && <p className="text-xs text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium py-2.5"
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </form>
        </div>

        <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="font-semibold text-sm">Riwayat Stok</h2>
            <div className="flex flex-wrap gap-2 items-center">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-2 py-1 text-xs"
              />
              <span className="text-xs text-slate-400">s/d</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-2 py-1 text-xs"
              />
              <button
                onClick={exportExcel}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700"
              >
                Export Excel
              </button>
              <button
                onClick={exportPDF}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700"
              >
                Export PDF
              </button>
            </div>
          </div>

          {loadingLogs ? (
            <p className="text-sm text-slate-400 text-center py-8">Memuat...</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Belum ada riwayat.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100 dark:border-slate-800">
                    <th className="py-2">Tanggal</th>
                    <th className="py-2">Produk</th>
                    <th className="py-2">Tipe</th>
                    <th className="py-2">Jumlah</th>
                    <th className="py-2">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                      <td className="py-2 text-xs text-slate-500">
                        {new Date(l.created_at).toLocaleString('id-ID')}
                      </td>
                      <td className="py-2">{l.products?.name || '-'}</td>
                      <td className="py-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                          {typeLabel[l.type]}
                        </span>
                      </td>
                      <td className={`py-2 font-medium ${l.quantity < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {l.quantity > 0 ? '+' : ''}
                        {l.quantity}
                      </td>
                      <td className="py-2 text-slate-500">{l.reason || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

