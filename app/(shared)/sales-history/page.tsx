'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import ReceiptModal from '@/components/pos/ReceiptModal';

interface SaleRow {
  id: string;
  invoice_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  grand_total: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
  profiles?: { full_name: string };
}

const PAGE_SIZE = 15;

export default function SalesHistoryPage() {
  const supabase = createClient();

  const [sales, setSales] = useState<SaleRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      setIsAdmin(profile?.role === 'admin');
    });
  }, []);

  async function loadSales() {
    setLoading(true);
    let query = supabase
      .from('sales')
      .select('*, profiles(full_name)', { count: 'exact' });

    if (search.trim()) {
      query = query.or(
        `invoice_number.ilike.%${search}%,customer_name.ilike.%${search}%`
      );
    }
    if (dateFrom) query = query.gte('created_at', new Date(dateFrom).toISOString());
    if (dateTo) query = query.lte('created_at', new Date(dateTo + 'T23:59:59').toISOString());
    if (paymentFilter) query = query.eq('payment_method', paymentFilter);

    query = query
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    const { data, count } = await query;
    setSales(data || []);
    setTotalCount(count || 0);
    setLoading(false);
  }

  useEffect(() => {
    loadSales();
  }, [page, search, dateFrom, dateTo, paymentFilter]);

  async function openReceipt(sale: SaleRow) {
    const { data: items } = await supabase
      .from('sale_items')
      .select('product_name, qty, price')
      .eq('sale_id', sale.id);

    const { data: fullSale } = await supabase
      .from('sales')
      .select('*')
      .eq('id', sale.id)
      .single();

    setSelectedSale({ ...fullSale, items: items || [] });
  }

  const rupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 space-y-4">
      <h1 className="text-xl font-bold">Riwayat Penjualan</h1>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => {
            setPage(0);
            setSearch(e.target.value);
          }}
          placeholder="Cari invoice / nama pelanggan..."
          className="flex-1 min-w-[180px] rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setPage(0);
            setDateFrom(e.target.value);
          }}
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setPage(0);
            setDateTo(e.target.value);
          }}
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
        />
        <select
          value={paymentFilter}
          onChange={(e) => {
            setPage(0);
            setPaymentFilter(e.target.value);
          }}
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
        >
          <option value="">Semua Pembayaran</option>
          <option value="cash">Tunai</option>
          <option value="qris">QRIS</option>
          <option value="transfer">Transfer</option>
          <option value="split">Tunai + QRIS</option>
        </select>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 overflow-x-auto">
        {loading ? (
          <p className="text-sm text-slate-400 text-center py-8">Memuat...</p>
        ) : sales.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Tidak ada transaksi.</p>
        ) : (
          <table className="w-full text-sm min-w-[750px]">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100 dark:border-slate-800">
                <th className="py-2">Invoice</th>
                <th className="py-2">Tanggal</th>
                {isAdmin && <th className="py-2">Kasir</th>}
                <th className="py-2">Pelanggan</th>
                <th className="py-2">Pembayaran</th>
                <th className="py-2">Status</th>
                <th className="py-2 text-right">Total</th>
                <th className="py-2 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                  <td className="py-2 font-medium">{s.invoice_number}</td>
                  <td className="py-2 text-xs text-slate-500">
                    {new Date(s.created_at).toLocaleString('id-ID')}
                  </td>
                  {isAdmin && <td className="py-2 text-slate-500">{s.profiles?.full_name || '-'}</td>}
                  <td className="py-2 text-slate-500">{s.customer_name || '-'}</td>
                  <td className="py-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                      {s.payment_method.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        s.payment_status === 'paid'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950'
                          : s.payment_status === 'pending'
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950'
                          : 'bg-red-50 text-red-700 dark:bg-red-950'
                      }`}
                    >
                      {s.payment_status}
                    </span>
                  </td>
                  <td className="py-2 text-right font-semibold">{rupiah(s.grand_total)}</td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => openReceipt(s)}
                      className="text-blue-600 text-xs font-medium"
                    >
                      Lihat Struk
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-slate-500">
            Halaman {page + 1} dari {totalPages} ({totalCount} transaksi)
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

      {selectedSale && (
        <ReceiptModal sale={selectedSale} onClose={() => setSelectedSale(null)} />
      )}
    </div>
  );
}

