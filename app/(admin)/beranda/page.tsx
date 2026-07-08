'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import BottomNav from '@/components/layout/BottomNav';
import {
  ShoppingCart,
  Smartphone,
  Package,
  Tags,
  Boxes,
  History,
  BarChart3,
  Users,
  Settings,
  Search,
  Bell,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';

interface MenuTile {
  label: string;
  sub: string;
  icon: React.ElementType;
  href: string;
}

// Hanya modul yang benar-benar sudah dibangun.
const MENU_TILES: MenuTile[] = [
  { label: 'Penjualan', sub: 'Transaksi POS', icon: ShoppingCart, href: '/pos' },
  { label: 'Produk Digital', sub: 'Pulsa & token', icon: Smartphone, href: '/ppob' },
  { label: 'Produk', sub: 'Kelola barang', icon: Package, href: '/products' },
  { label: 'Kategori', sub: 'Kelompok produk', icon: Tags, href: '/categories' },
  { label: 'Stok', sub: 'Masuk & keluar', icon: Boxes, href: '/stock' },
  { label: 'Riwayat', sub: 'Transaksi lalu', icon: History, href: '/sales-history' },
  { label: 'Laporan', sub: 'Analitik & export', icon: BarChart3, href: '/reports' },
  { label: 'User', sub: 'Kelola cashier', icon: Users, href: '/users' },
  { label: 'Pengaturan', sub: 'Toko & printer', icon: Settings, href: '/settings' },
];

export default function BerandaPage() {
  const router = useRouter();
  const supabase = createClient();

  const [search, setSearch] = useState('');
  const [fullName, setFullName] = useState('');
  const [todaySales, setTodaySales] = useState(0);
  const [todayTrx, setTodayTrx] = useState(0);
  const [lowStock, setLowStock] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      if (profile) setFullName(profile.full_name);
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const { data: salesData } = await supabase
      .from('sales')
      .select('grand_total')
      .eq('payment_status', 'paid')
      .gte('created_at', todayStart);

    setTodaySales((salesData || []).reduce((sum, r) => sum + r.grand_total, 0));
    setTodayTrx((salesData || []).length);

    const { data: productsData } = await supabase
      .from('products')
      .select('stock, min_stock')
      .eq('status', 'active');
    setLowStock((productsData || []).filter((p) => p.stock <= p.min_stock).length);

    setLoading(false);
  }

  function goSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/products?search=${encodeURIComponent(search.trim())}`);
    }
  }

  return (
    <div className="min-h-screen bg-brand-dark text-white pb-24">
      <div className="max-w-md mx-auto px-4 pt-5 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Selamat datang,</p>
            <h1 className="font-bold text-lg leading-tight">{fullName || 'Admin'}</h1>
          </div>
          <button className="relative w-10 h-10 rounded-xl bg-brand-card flex items-center justify-center">
            <Bell size={17} className="text-slate-300" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-brand-accent rounded-full" />
          </button>
        </div>

        {/* Search */}
        <form onSubmit={goSearch} className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari produk..."
            className="w-full bg-brand-card rounded-xl pl-10 pr-4 py-3 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-accent"
          />
        </form>

        {/* Hero stat card */}
        <button
          onClick={() => router.push('/dashboard')}
          className="w-full bg-gradient-to-br from-brand-card2 to-brand-card rounded-2xl p-5 text-left relative overflow-hidden"
        >
          <div className="flex items-center gap-1.5 text-brand-accent text-xs font-medium mb-1">
            <TrendingUp size={13} />
            Penjualan Hari Ini
          </div>
          <p className="text-2xl font-bold">
            {loading ? '...' : `Rp ${todaySales.toLocaleString('id-ID')}`}
          </p>
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
            <span>{todayTrx} transaksi</span>
            {lowStock > 0 && (
              <span className="text-amber-400">⚠ {lowStock} produk stok menipis</span>
            )}
          </div>
          <ChevronRight size={16} className="absolute right-4 top-5 text-slate-500" />
        </button>

        {/* Quick action */}
        <button
          onClick={() => router.push('/pos')}
          className="w-full bg-brand-accent hover:bg-brand-accent/90 rounded-2xl py-3.5 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <ShoppingCart size={16} />
          Mulai Transaksi Baru
        </button>

        {/* Menu grid */}
        <div>
          <p className="text-xs font-medium text-slate-400 mb-2.5 uppercase tracking-wide">Menu</p>
          <div className="grid grid-cols-3 gap-3">
            {MENU_TILES.map((tile) => {
              const Icon = tile.icon;
              return (
                <button
                  key={tile.href}
                  onClick={() => router.push(tile.href)}
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl py-4 px-2 text-center bg-brand-card hover:bg-brand-card2 active:scale-95 transition-all"
                >
                  <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center">
                    <Icon size={19} className="text-brand-accent" />
                  </div>
                  <div>
                    <p className="text-xs font-medium leading-tight">{tile.label}</p>
                    <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{tile.sub}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
