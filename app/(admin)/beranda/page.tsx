'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Bell } from 'lucide-react';
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

  const [fullName, setFullName] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
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
    </div>
  );
}
