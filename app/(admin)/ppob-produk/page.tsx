1. Supabase SQL Editor
   └─ Jalankan supabase_ppob_schema.sql
      (bikin tabel ppob_products, ppob_transactions + 5 contoh produk)

2. GitHub — upload/timpa file berikut:
   ├─ lib/types.ts                          (ganti total)
   ├─ middleware.ts                         (ganti total)
   ├─ tailwind.config.ts                    (ganti total)
   ├─ components/layout/SidebarShell.tsx    (ganti total)
   ├─ components/layout/BottomNav.tsx       (ganti total)
   ├─ app/(admin)/beranda/page.tsx          (ganti total — redesign)
   ├─ app/(shared)/ppob/page.tsx            (BARU)
   └─ app/(admin)/ppob-produk/page.tsx      (BARU)

3. Vercel akan auto-redeploy setelah commit
