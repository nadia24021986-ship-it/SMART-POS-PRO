'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
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
  Menu,
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
  const [mobileOpen, setMobileOpen] = useState(false);

  const hideSidebar = pathname?.startsWith('/login') || pathname?.startsWith('/beranda');

  useEffect(() => {
    if (hideSidebar) return;
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
  }, [pathname, hideSidebar]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (hideSidebar) {
    return <>{children}</>;
  }

  const navItems = role === 'admin' ? ADMIN_NAV : CASHIER_NAV;

  return (
    <div className="flex min-h-screen">
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-4 h-14">
        <span className="font-bold text-blue-700 dark:text-blue-400">Smart POS Pro</span>
        <button onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed md:static top-14 md:top-0 left-0 h-[calc(100vh-3.5rem)] md:h-screen w-64 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 flex flex-col z-30 transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="hidden md:block p-5">
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
                onClick={() => setMobileOpen(false)}
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

      {/* Overlay for mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 pt-14 md:pt-0 min-w-0">{children}</main>
    </div>
  );
}
 
