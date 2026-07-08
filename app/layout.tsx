// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import SidebarShell from '@/components/layout/SidebarShell';

export const metadata: Metadata = {
  title: 'Smart POS Pro',
  description: 'Cloud-based Point of Sale untuk bisnis Anda',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <SidebarShell>{children}</SidebarShell>
      </body>
    </html>
  );
}

