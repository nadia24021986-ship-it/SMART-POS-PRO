'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Settings {
  id: string;
  store_name: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  tax_percentage: number;
  receipt_footer: string | null;
  currency: string;
  qris_image_url: string | null;
}

export default function SettingsPage() {
  const supabase = createClient();
  const backupInputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [qrisFile, setQrisFile] = useState<File | null>(null);

  useEffect(() => {
    supabase
      .from('settings')
      .select('*')
      .single()
      .then(({ data }) => {
        setSettings(data);
        setLoading(false);
      });
  }, []);

  async function uploadImage(file: File, prefix: string): Promise<string | null> {
    const fileExt = file.name.split('.').pop();
    const filePath = `${prefix}/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('product-photos') // reuse same public bucket created earlier
      .upload(filePath, file, { upsert: true });
    if (uploadError) {
      setError('Gagal upload gambar: ' + uploadError.message);
      return null;
    }
    const { data } = supabase.storage.from('product-photos').getPublicUrl(filePath);
    return data.publicUrl;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    let logoUrl = settings.logo_url;
    let qrisUrl = settings.qris_image_url;

    if (logoFile) {
      const uploaded = await uploadImage(logoFile, 'logos');
      if (uploaded) logoUrl = uploaded;
    }
    if (qrisFile) {
      const uploaded = await uploadImage(qrisFile, 'qris');
      if (uploaded) qrisUrl = uploaded;
    }

    const { error: updateError } = await supabase
      .from('settings')
      .update({
        store_name: settings.store_name,
        address: settings.address,
        phone: settings.phone,
        tax_percentage: settings.tax_percentage,
        receipt_footer: settings.receipt_footer,
        currency: settings.currency,
        logo_url: logoUrl,
        qris_image_url: qrisUrl,
      })
      .eq('id', settings.id);

    setSaving(false);

    if (updateError) {
      setError('Gagal menyimpan: ' + updateError.message);
      return;
    }

    setSettings({ ...settings, logo_url: logoUrl, qris_image_url: qrisUrl });
    setLogoFile(null);
    setQrisFile(null);
    setSuccess('Pengaturan berhasil disimpan.');
  }

  async function handleBackup() {
    const tables = ['categories', 'products', 'settings', 'payment_methods'];
    const backup: Record<string, any> = {};

    for (const table of tables) {
      const { data } = await supabase.from(table).select('*');
      backup[table] = data || [];
    }

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart-pos-pro-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleRestoreFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmed = confirm(
      'PERINGATAN: Restore akan menimpa data categories, products, settings, dan payment_methods yang ada dengan isi file backup. Transaksi penjualan TIDAK terpengaruh. Lanjutkan?'
    );
    if (!confirmed) {
      e.target.value = '';
      return;
    }

    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      for (const table of ['categories', 'products', 'settings', 'payment_methods']) {
        if (Array.isArray(backup[table]) && backup[table].length > 0) {
          const { error } = await supabase.from(table).upsert(backup[table]);
          if (error) {
            setError(`Gagal restore tabel ${table}: ${error.message}`);
            return;
          }
        }
      }
      setSuccess('Restore berhasil. Muat ulang halaman untuk melihat perubahan.');
    } catch {
      setError('File backup tidak valid.');
    } finally {
      e.target.value = '';
    }
  }

  if (loading || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <p className="text-sm text-slate-400">Memuat pengaturan...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 space-y-4 max-w-2xl">
      <h1 className="text-xl font-bold">Pengaturan Toko</h1>

      <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 space-y-4">
        <div>
          <label className="text-xs text-slate-500">Nama Toko</label>
          <input
            value={settings.store_name}
            onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-slate-500">Logo Toko</label>
          <div className="flex items-center gap-3 mt-1">
            {settings.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logo_url} alt="logo" className="w-12 h-12 rounded-lg object-cover border border-slate-200" />
            )}
            <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} className="text-xs" />
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-500">Alamat</label>
          <textarea
            value={settings.address || ''}
            onChange={(e) => setSettings({ ...settings, address: e.target.value })}
            rows={2}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500">No. Telepon</label>
            <input
              value={settings.phone || ''}
              onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Mata Uang</label>
            <input
              value={settings.currency}
              onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-500">Persentase Pajak (%)</label>
          <input
            type="number"
            min={0}
            step={0.1}
            value={settings.tax_percentage}
            onChange={(e) => setSettings({ ...settings, tax_percentage: Number(e.target.value) || 0 })}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-slate-500">Footer Struk</label>
          <textarea
            value={settings.receipt_footer || ''}
            onChange={(e) => setSettings({ ...settings, receipt_footer: e.target.value })}
            rows={2}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-slate-500">Gambar QRIS</label>
          <div className="flex items-center gap-3 mt-1">
            {settings.qris_image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.qris_image_url} alt="qris" className="w-16 h-16 rounded-lg object-cover border border-slate-200" />
            )}
            <input type="file" accept="image/*" onChange={(e) => setQrisFile(e.target.files?.[0] || null)} className="text-xs" />
          </div>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}
        {success && <p className="text-xs text-emerald-600">{success}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium py-2.5"
        >
          {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </button>
      </form>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 space-y-3">
        <h2 className="font-semibold text-sm">Backup & Restore Database</h2>
        <p className="text-xs text-slate-500">
          Backup menyimpan data kategori, produk, pengaturan, dan metode pembayaran ke file JSON.
          Data transaksi penjualan tidak termasuk (untuk itu gunakan export di halaman Laporan).
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleBackup}
            className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium py-2"
          >
            Download Backup
          </button>
          <button
            onClick={() => backupInputRef.current?.click()}
            className="flex-1 rounded-lg border border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400 text-sm font-medium py-2"
          >
            Restore dari Backup
          </button>
          <input
            ref={backupInputRef}
            type="file"
            accept="application/json"
            onChange={handleRestoreFile}
            className="hidden"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 space-y-2">
        <h2 className="font-semibold text-sm">Pengaturan Printer</h2>
        <p className="text-xs text-slate-500">
          Smart POS Pro menggunakan dialog cetak bawaan browser (window.print) di halaman struk.
          Untuk printer thermal USB/Bluetooth, hubungkan printer sebagai default printer di OS
          perangkat kamu (Android/Windows), lalu pilih printer tersebut saat dialog cetak muncul.
        </p>
      </div>
    </div>
  );
}

