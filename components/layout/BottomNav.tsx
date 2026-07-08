'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  ShoppingCart,
  Smartphone,
  Package,
  Tags,
  Boxes,
  History,
  BarChart3,
  Users,
  Settings,
  LayoutDashboard,
} from 'lucide-react';

interface BottomNavProps {
  role: 'admin' | 'cashier' | null;
}

const ADMIN_TABS = [
  { label: 'Beranda', icon: Home, href: '/beranda' },
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'POS', icon: ShoppingCart, href: '/pos' },
  { label: 'Digital', icon: Smartphone, href: '/ppob' },
  { label: 'Produk', icon: Package, href: '/products' },
  { label: 'Kategori', icon: Tags, href: '/categories' },
  { label: 'Stok', icon: Boxes, href: '/stock' },
  { label: 'Riwayat', icon: History, href: '/sales-history' },
  { label: 'Laporan', icon: BarChart3, href: '/reports' },
  { label: 'Kelola Digital', icon: Smartphone, href: '/ppob-produk' },
  { label: 'User', icon: Users, href: '/users' },
  { label: 'Pengaturan', icon: Settings, href: '/settings' },
];

const CASHIER_TABS = [
  { label: 'POS', icon: ShoppingCart, href: '/pos' },
  { label: 'Digital', icon: Smartphone, href: '/ppob' },
  { label: 'Riwayat', icon: History, href: '/sales-history' },
];

export default function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const tabs = role === 'admin' ? ADMIN_TABS : CASHIER_TABS;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-brand-darker border-t border-white/5 z-30">
      <div className="flex items-center overflow-x-auto no-scrollbar px-1 py-2 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = pathname?.startsWith(tab.href);
          return (
            <button
              key={tab.href}
              onClick={() => router.push(tab.href)}
              className="flex flex-col items-center gap-1 px-3 py-1 shrink-0 min-w-[64px]"
            >
              <Icon size={19} className={active ? 'text-brand-accent' : 'text-slate-500'} />
              <span
                className={`text-[9.5px] whitespace-nowrap ${
                  active ? 'text-brand-accent font-medium' : 'text-slate-500'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
