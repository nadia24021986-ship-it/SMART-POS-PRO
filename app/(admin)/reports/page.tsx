'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

type RangeOption = 'today' | 'week' | 'month' | 'custom';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function ReportsPage() {
  const supabase = createClient();

  const [range, setRange] = useState<RangeOption>('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [loading, setLoading] = useState(true);

  const [grossRevenue, setGrossRevenue] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [avgTransaction, setAvgTransaction] = useState(0);
  const [bestProducts, setBestProducts] = useState<{ name: string; qty: number }[]>([]);
  const [leastProducts, setLeastProducts] = useState<{ name: string; qty: number }[]>([]);
  const [salesPerCashier, setSalesPerCashier] = useState<{ name: string; total: number }[]>([]);
  const [dailyTrend, setDailyTrend] = useState<{ date: string; total: number }[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<
    { name: string; stock: number; min_stock: number }[]
  >([]);
  const [rawSales, setRawSales] = useState<any[]>([]);

  function getDateRange(): { from: Date; to: Date } {
    const now = new Date();
    if (range === 'today') {
      return {
        from: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        to: now,
      };
    }
    if (range === 'week') {
      return { from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), to: now };
    }
    if (range === 'month') {
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
    }
    return {
      from: customFrom ? new Date(customFrom) : new Date(now.getFullYear(), now.getMonth(), 1),
      to: customTo ? new Date(customTo + 'T23:59:59') : now,
    };
  }

  async function loadReport() {
    setLoading(true);
    const { from, to } = getDateRange();

    const { data: salesData } = await supabase
      .from('sales')
      .select('*, profiles(full_name)')
      .eq('payment_status', 'paid')
      .gte('created_at', from.toISOString())
      .lte('created_at', to.toISOString())
      .order('created_at');

    const sales = salesData || [];
    setRawSales(sales);

    const revenue = sales.reduce((s, r) => s + r.grand_total, 0);
    setGrossRevenue(revenue);
    setTotalTransactions(sales.length);
    setAvgTransaction(sales.length > 0 ? revenue / sales.length : 0);

    // Sales per cashier
    const cashierMap = new Map<string, number>();
    sales.forEach((s: any) => {
      const name = s.profiles?.full_name || 'Unknown';
      cashierMap.set(name, (cashierMap.get(name) || 0) + s.grand_total);
    });
    setSalesPerCashier(Array.from(cashierMap, ([name, total]) => ({ name, total })));

    // Daily trend
    const dailyMap = new Map<string, number>();
    sales.forEach((s: any) => {
      const day = new Date(s.created_at).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
      });
      dailyMap.set(day, (dailyMap.get(day) || 0) + s.grand_total);
    });
    setDailyTrend(Array.from(dailyMap, ([date, total]) => ({ date, total })));

    // Best/least selling products via sale_items in range
    const saleIds = sales.map((s: any) => s.id);
    let bestList: { name: string; qty: number }[] = [];
    let leastList: { name: string; qty: number }[] = [];
    if (saleIds.length > 0) {
      const { data: itemsData } = await supabase
        .from('sale_items')
        .select('product_name, qty')
        .in('sale_id', saleIds);

      const qtyMap = new Map<string, number>();
      (itemsData || []).forEach((i) => {
        qtyMap.set(i.product_name, (qtyMap.get(i.product_name) || 0) + i.qty);
      });
      const sorted = Array.from(qtyMap, ([name, qty]) => ({ name, qty })).sort(
        (a, b) => b.qty - a.qty
      );
      bestList = sorted.slice(0, 5);
      leastList = sorted.slice(-5).reverse();
    }
    setBestProducts(bestList);
    setLeastProducts(leastList);

    // Low stock report (not date-dependent)
    const { data: lowStockData } = await supabase
      .from('products')
      .select('name, stock, min_stock')
      .eq('status', 'active');
    setLowStockProducts((lowStockData || []).filter((p) => p.stock <= p.min_stock));

    setLoading(false);
  }

  useEffect(() => {
    loadReport();
  }, [range, customFrom, customTo]);

  const rupiah = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;

  function exportExcel() {
    const wb = XLSX.utils.book_new();

    const summarySheet = XLSX.utils.json_to_sheet([
      { Metrik: 'Gross Revenue', Nilai: grossRevenue },
      { Metrik: 'Total Transaksi', Nilai: totalTransactions },
      { Metrik: 'Rata-rata Transaksi', Nilai: Math.round(avgTransaction) },
    ]);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Ringkasan');

    const salesSheet = XLSX.utils.json_to_sheet(
      rawSales.map((s) => ({
        Invoice: s.invoice_number,
        Tanggal: new Date(s.created_at).toLocaleString('id-ID'),
        Kasir: s.profiles?.full_name || '-',
        Total: s.grand_total,
        Pembayaran: s.payment_method,
      }))
    );
    XLSX.utils.book_append_sheet(wb, salesSheet, 'Detail Transaksi');

    const bestSheet = XLSX.utils.json_to_sheet(bestProducts);
    XLSX.utils.book_append_sheet(wb, bestSheet, 'Produk Terlaris');

    const lowStockSheet = XLSX.utils.json_to_sheet(lowStockProducts);
    XLSX.utils.book_append_sheet(wb, lowStockSheet, 'Stok Menipis');

    XLSX.writeFile(wb, `laporan-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function exportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Laporan Penjualan - Smart POS Pro', 14, 15);
    doc.setFontSize(10);
    doc.text(`Gross Revenue: ${rupiah(grossRevenue)}`, 14, 24);
    doc.text(`Total Transaksi: ${totalTransactions}`, 14, 30);
    doc.text(`Rata-rata Transaksi: ${rupiah(avgTransaction)}`, 14, 36);

    autoTable(doc, {
      startY: 44,
      head: [['Invoice', 'Tanggal', 'Kasir', 'Total', 'Pembayaran']],
      body: rawSales.map((s) => [
        s.invoice_number,
        new Date(s.created_at).toLocaleString('id-ID'),
        s.profiles?.full_name || '-',
        rupiah(s.grand_total),
        s.payment_method,
      ]),
      styles: { fontSize: 8 },
    });

    doc.save(`laporan-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Laporan</h1>
        <div className="flex gap-2">
          <button onClick={exportExcel} className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700">
            Export Excel
          </button>
          <button onClick={exportPDF} className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700">
            Export PDF
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 flex flex-wrap gap-2 items-center">
        {(['today', 'week', 'month', 'custom'] as RangeOption[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`text-xs px-3 py-1.5 rounded-lg border ${
              range === r ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-300 dark:border-slate-700'
            }`}
          >
            {r === 'today' ? 'Hari Ini' : r === 'week' ? 'Mingguan' : r === 'month' ? 'Bulanan' : 'Custom'}
          </button>
        ))}
        {range === 'custom' && (
          <>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-2 py-1 text-xs"
            />
            <span className="text-xs text-slate-400">s/d</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-2 py-1 text-xs"
            />
          </>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400 text-center py-8">Memuat laporan...</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4">
              <p className="text-xs text-slate-500 mb-1">Gross Revenue</p>
              <p className="text-lg font-bold text-blue-700">{rupiah(grossRevenue)}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4">
              <p className="text-xs text-slate-500 mb-1">Total Transaksi</p>
              <p className="text-lg font-bold text-emerald-700">{totalTransactions}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4">
              <p className="text-xs text-slate-500 mb-1">Rata-rata Transaksi</p>
              <p className="text-lg font-bold text-slate-700">{rupiah(avgTransaction)}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4">
              <h2 className="font-semibold text-sm mb-3">Tren Penjualan</h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(v: number) => rupiah(v)} />
                  <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4">
              <h2 className="font-semibold text-sm mb-3">Penjualan per Kasir</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={salesPerCashier}
                    dataKey="total"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {salesPerCashier.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => rupiah(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4">
              <h2 className="font-semibold text-sm mb-3">Produk Terlaris</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={bestProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis type="number" fontSize={11} />
                  <YAxis type="category" dataKey="name" width={100} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="qty" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4">
              <h2 className="font-semibold text-sm mb-3">Produk Kurang Laku</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={leastProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis type="number" fontSize={11} />
                  <YAxis type="category" dataKey="name" width={100} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="qty" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4">
            <h2 className="font-semibold text-sm mb-3">Laporan Stok Menipis</h2>
            {lowStockProducts.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">
                Tidak ada produk dengan stok menipis.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100 dark:border-slate-800">
                    <th className="py-2">Produk</th>
                    <th className="py-2">Stok Saat Ini</th>
                    <th className="py-2">Stok Minimum</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockProducts.map((p, idx) => (
                    <tr key={idx} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                      <td className="py-2 font-medium">{p.name}</td>
                      <td className="py-2 text-amber-600">{p.stock}</td>
                      <td className="py-2 text-slate-500">{p.min_stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

