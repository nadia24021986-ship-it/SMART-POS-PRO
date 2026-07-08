# Smart POS Pro — Update: Beranda Baru + Modul PPOB

## 1. Urutan Setup

```
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
```

---

## 2. Struktur folder (bagian yang baru/berubah)

```
smart-pos-pro/
├── app/
│   ├── (admin)/
│   │   ├── beranda/page.tsx        ← landing baru, dark theme
│   │   └── ppob-produk/page.tsx    ← admin: atur harga produk digital
│   └── (shared)/
│       └── ppob/page.tsx           ← cashier/admin: transaksi produk digital
├── components/layout/
│   ├── SidebarShell.tsx            ← + menu "Produk Digital"
│   └── BottomNav.tsx                ← warna disesuaikan tema baru
└── supabase/migrations/
    └── supabase_ppob_schema.sql    ← tabel ppob_products, ppob_transactions
```

---

## 3. Alur halaman Beranda (landing admin)

```
Login (admin) → middleware cek role → redirect ke /beranda
                                              │
                                              ▼
                              ┌───────────────────────────────┐
                              │  Header: nama user + notif    │
                              │  Search produk                │
                              │  Kartu: Penjualan Hari Ini ────┼──▶ /dashboard
                              │  Tombol: Mulai Transaksi ──────┼──▶ /pos
                              │  Grid 9 menu ──────────────────┼──▶ masing-masing modul
                              └───────────────────────────────┘
                                              │
                                    Bottom nav (mobile):
                              Home · Transaksi · Produk · Laporan · Akun
```

Cashier tetap masuk ke `/pos` seperti biasa (Beranda ini khusus admin).

---

## 4. Alur transaksi Produk Digital (PPOB)

Ini alurnya **manual**, bukan otomatis ke PLN/operator:

```
Admin buka /ppob-produk
   └─ Input daftar produk: nama, kategori, harga modal, harga jual
        (contoh: "Token Listrik 20.000", modal Rp 20.250, jual Rp 21.500)

Cashier buka /ppob
   └─ Pilih produk → input No. HP / No. Meter pelanggan
   └─ Klik "Buat Transaksi (Pending)"
        → tersimpan di tabel ppob_transactions, status = pending
        → nomor transaksi otomatis: PPOB-20260708-0001

   └─ Muncul di panel "Menunggu Diproses"
        │
        ├─ Cashier/admin BELI token asli dari akun biller pribadi
        │  (di luar aplikasi — misal app PLN Mobile, dashboard Digiflazz, dll)
        │
        ├─ Input kode/token/serial yang didapat ke kotak "Input kode..."
        │
        └─ Klik "Selesai" → status jadi 'selesai', catat waktu selesai
           (atau klik "Gagal" kalau stok biller habis/nomor salah)
```

**Kenapa manual?** Supaya benar-benar bisa dipakai jual pulsa/token asli,
dibutuhkan akun ke penyedia biller (Digiflazz, iak.my.id, dll) yang perlu
didaftarkan sendiri (KYC + deposit saldo + API key). Modul ini menyiapkan
pencatatan & pembukuannya duluan — kalau nanti sudah punya API key dari
biller resmi, alur "beli manual di luar app" itu bisa diganti jadi otomatis
lewat API tanpa mengubah struktur data yang sudah ada.

---

## 5. Kalau nanti mau hubungkan ke biller asli

Beri tahu saya kalau sudah punya akun & API key dari salah satu biller
(Digiflazz, iak.my.id, atau lainnya) — bagian yang perlu diubah cuma fungsi
`handleCreateTransaction` di `app/(shared)/ppob/page.tsx`, supaya alih-alih
menunggu input manual, otomatis panggil API biller dan simpan kode
balasannya ke `serial_code`.

