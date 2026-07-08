'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import BottomNav from '@/components/layout/BottomNav';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tags,
  Boxes,
  History,
  BarChart3,
  Users,
  Settings,
  LogOut,
  X,
  Smartphone,
} from 'lucide-react';

const ADMIN_NAV = [
  { href: '/beranda', label: 'Beranda', icon: LayoutDashboard },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pos', label: 'POS', icon: ShoppingCart },
  { href: '/ppob', label: 'Produk Digital', icon: Smartphone },
  { href: '/products', label: 'Produk', icon: Package },
  { href: '/categories', label: 'Kategori', icon: Tags },
  { href: '/stock', label: 'Stok', icon: Boxes },
  { href: '/sales-history', label: 'Riwayat Penjualan', icon: History },
  { href: '/reports', label: 'Laporan', icon: BarChart3 },
  { href: '/ppob-produk', label: 'Kelola Produk Digital', icon: Smartphone },
  { href: '/users', label: 'User', icon: Users },
  { href: '/settings', label: 'Pengaturan', icon: Settings },
];

const CASHIER_NAV = [
  { href: '/pos', label: 'POS', icon: ShoppingCart },
  { href: '/ppob', label: 'Produk Digital', icon: Smartphone },
  { href: '/sales-history', label: 'Riwayat Penjualan', icon: History },
];

export default function SidebarShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [role, setRole] = useState<'admin' | 'cashier' | null>(null);
  const [fullName, setFullName] = useState('');

  const isLogin = pathname?.startsWith('/login');
  const isBeranda = pathname?.startsWith('/beranda');

  useEffect(() => {
    if (isLogin) return;
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single();
      if (profile) {
        setRole(profile.role);
        setFullName(profile.full_name);
      }
    });
  }, [pathname, isLogin]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  function goHome() {
    router.push(role === 'admin' ? '/beranda' : '/pos');
  }

  if (isLogin) {
    return <>{children}</>;
  }

  const navItems = role === 'admin' ? ADMIN_NAV : CASHIER_NAV;

  return (
    <div className="flex min-h-screen">
      {/* Mobile top bar — disembunyikan di halaman Beranda karena sudah punya header sendiri */}
      {!isBeranda && (
        <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-4 h-14">
          <span className="font-bold text-blue-700 dark:text-blue-400">Smart POS Pro</span>
          <button onClick={goHome} aria-label="Kembali ke Beranda">
            <X size={22} />
          </button>
        </div>
      )}

      {/* Sidebar — hanya tampil di layar desktop (md ke atas) */}
      <aside className="hidden md:flex md:static top-0 left-0 h-screen w-64 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 flex-col z-30">
        <div className="p-5">
          <h1 className="font-bold text-lg text-blue-700 dark:text-blue-400">Smart POS Pro</h1>
          {fullName && <p className="text-xs text-slate-500 mt-1">{fullName}</p>}
        </div>

        <nav className="flex-1 overflow-y-auto px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={`flex-1 min-w-0 ${isBeranda ? '' : 'pt-14 md:pt-0'} pb-16 md:pb-0`}>
        {children}
      </main>

      {/* Bottom nav — mobile only, semua halaman kecuali login */}
      <BottomNav role={role} />
    </div>
  );
}
