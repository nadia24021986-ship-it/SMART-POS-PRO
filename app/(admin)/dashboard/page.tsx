'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DashboardStats {
  todaySales: number;
  todayTransactions: number;
  monthlySales: number;
  totalProducts: number;
  lowStockCount: number;
}

interface DailyPoint {
  date: string;
  total: number;
}

interface TopProduct {
  name: string;
  qty: number;
}

interface RecentSale {
  invoice_number: string;
  grand_total: number;
  payment_method: string;
  created_at: string;
}

export default function DashboardPage() {
  const supabase = createClient();

  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    todayTransactions: 0,
    monthlySales: 0,
    totalProducts: 0,
    lowStockCount: 0,
  });
  const [dailySales, setDailySales] = useState<DailyPoint[]>([]);
  const [monthlySales, setMonthlySales] = useState<DailyPoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const last30Start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Today's sales + transaction count
    const { data: todaySalesData } = await supabase
      .from('sales')
      .select('grand_total')
      .eq('payment_status', 'paid')
      .gte('created_at', todayStart);

    // Monthly sales
    const { data: monthlySalesData } = await supabase
      .from('sales')
      .select('grand_total, created_at')
      .eq('payment_status', 'paid')
      .gte('created_at', monthStart);

    // Total products + low stock
    const { count: totalProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    const { data: lowStockData } = await supabase
      .from('products')
      .select('id, stock, min_stock')
      .eq('status', 'active');
    const lowStockCount = (lowStockData || []).filter((p) => p.stock <= p.min_stock).length;

    // Last 30 days daily sales (for line chart)
    const { data: last30Data } = await supabase
      .from('sales')
      .select('grand_total, created_at')
      .eq('payment_status', 'paid')
      .gte('created_at', last30Start)
      .order('created_at');

    // Top products (last 30 days) via sale_items joined to sales
    const { data: itemsData } = await supabase
      .from('sale_items')
      .select('product_name, qty, sale_id, sales!inner(created_at, payment_status)')
      .gte('sales.created_at', last30Start)
      .eq('sales.payment_status', 'paid');

    // Recent transactions
    const { data: recentData } = await supabase
      .from('sales')
      .select('invoice_number, grand_total, payment_method, created_at')
      .order('created_at', { ascending: false })
      .limit(8);

    // ---- Aggregate stats ----
    const todaySalesTotal = (todaySalesData || []).reduce((s, r) => s + r.grand_total, 0);
    const monthlySalesTotal = (monthlySalesData || []).reduce((s, r) => s + r.grand_total, 0);

    setStats({
      todaySales: todaySalesTotal,
      todayTransactions: (todaySalesData || []).length,
      monthlySales: monthlySalesTotal,
      totalProducts: totalProducts || 0,
      lowStockCount,
    });

    // ---- Daily sales chart (last 30 days) ----
    const dailyMap = new Map<string, number>();
    (last30Data || []).forEach((s) => {
      const day = new Date(s.created_at).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
      });
      dailyMap.set(day, (dailyMap.get(day) || 0) + s.grand_total);
    });
    setDailySales(Array.from(dailyMap, ([date, total]) => ({ date, total })));

    // ---- Monthly sales chart (this month, grouped by day is same as above;
    //      here we group last 6 months for a longer-range view) ----
    const { data: last6MonthsData } = await supabase
      .from('sales')
      .select('grand_total, created_at')
      .eq('payment_status', 'paid')
      .gte(
        'created_at',
        new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString()
      );
    const monthMap = new Map<string, number>();
    (last6MonthsData || []).forEach((s) => {
      const month = new Date(s.created_at).toLocaleDateString('id-ID', {
        month: 'short',
        year: '2-digit',
      });
      monthMap.set(month, (monthMap.get(month) || 0) + s.grand_total);
    });
    setMonthlySales(Array.from(monthMap, ([date, total]) => ({ date, total })));

    // ---- Top products ----
    const productQtyMap = new Map<string, number>();
    (itemsData || []).forEach((i: any) => {
      productQtyMap.set(i.product_name, (productQtyMap.get(i.product_name) || 0) + i.qty);
    });
    const top = Array.from(productQtyMap, ([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
    setTopProducts(top);

    setRecentSales(recentData || []);
    setLoading(false);
  }

  const rupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  const cards = [
    { label: "Penjualan Hari Ini", value: rupiah(stats.todaySales), color: 'text-blue-700' },
    { label: 'Transaksi Hari Ini', value: stats.todayTransactions.toString(), color: 'text-emerald-700' },
    { label: 'Penjualan Bulan Ini', value: rupiah(stats.monthlySales), color: 'text-blue-700' },
    { label: 'Total Produk', value: stats.totalProducts.toString(), color: 'text-slate-700' },
    { label: 'Stok Menipis', value: stats.lowStockCount.toString(), color: 'text-amber-600' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <p className="text-sm text-slate-400">Memuat dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 space-y-6">
      <h1 className="text-xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4">
            <p className="text-xs text-slate-500 mb-1">{c.label}</p>
            <p className={`text-lg font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4">
          <h2 className="font-semibold text-sm mb-3">Penjualan Harian (30 hari)</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dailySales}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip formatter={(v: number) => rupiah(v)} />
              <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4">
          <h2 className="font-semibold text-sm mb-3">Penjualan Bulanan (6 bulan)</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlySales}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip formatter={(v: number) => rupiah(v)} />
              <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4">
          <h2 className="font-semibold text-sm mb-3">Produk Terlaris (30 hari)</h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Belum ada data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" fontSize={11} />
                <YAxis type="category" dataKey="name" width={100} fontSize={11} />
                <Tooltip />
                <Bar dataKey="qty" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4">
          <h2 className="font-semibold text-sm mb-3">Transaksi Terbaru</h2>
          {recentSales.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Belum ada transaksi.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentSales.map((s) => (
                <div key={s.invoice_number} className="flex justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium">{s.invoice_number}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(s.created_at).toLocaleString('id-ID')} · {s.payment_method.toUpperCase()}
                    </p>
                  </div>
                  <p className="font-semibold text-emerald-600">{rupiah(s.grand_total)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

