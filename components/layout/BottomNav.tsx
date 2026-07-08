'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Home, ShoppingCart, Package, BarChart3, User } from 'lucide-react';

const TABS = [
  { label: 'Home', icon: Home, href: '/beranda' },
  { label: 'Transaksi', icon: ShoppingCart, href: '/pos' },
  { label: 'Produk', icon: Package, href: '/products' },
  { label: 'Laporan', icon: BarChart3, href: '/reports' },
  { label: 'Akun', icon: User, href: '/settings' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-brand-darker border-t border-white/5 flex items-center justify-around py-2.5 z-30">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = pathname?.startsWith(tab.href);
        return (
          <button
            key={tab.href}
            onClick={() => router.push(tab.href)}
            className="flex flex-col items-center gap-1 px-3 py-1"
          >
            <Icon size={19} className={active ? 'text-brand-accent' : 'text-slate-500'} />
            <span className={`text-[10px] ${active ? 'text-brand-accent font-medium' : 'text-slate-500'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
