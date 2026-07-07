'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Product, Category } from '@/lib/types';

interface ProductFormModalProps {
  product: Product | null; // null = tambah baru
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}

function generateBarcode() {
  // Simple unique-enough barcode: timestamp + random digits
  return `${Date.now()}${Math.floor(Math.random() * 900 + 100)}`;
}

export default function ProductFormModal({
  product,
  categories,
  onClose,
  onSaved,
}: ProductFormModalProps) {
  const supabase = createClient();

  const [barcode, setBarcode] = useState(product?.barcode || generateBarcode());
  const [productCode, setProductCode] = useState(product?.product_code || '');
  const [name, setName] = useState(product?.name || '');
  const [categoryId, setCategoryId] = useState(product?.category_id || '');
  const [purchasePrice, setPurchasePrice] = useState(product?.purchase_price || 0);
  const [sellingPrice, setSellingPrice] = useState(product?.selling_price || 0);
  const [stock, setStock] = useState(product?.stock || 0);
  const [minStock, setMinStock] = useState(product?.min_stock || 5);
  const [status, setStatus] = useState<'active' | 'inactive'>(product?.status || 'active');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(product?.photo_url || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !productCode.trim() || !barcode.trim()) {
      setError('Nama, kode produk, dan barcode wajib diisi.');
      return;
    }
    if (sellingPrice < purchasePrice) {
      setError('Peringatan: harga jual lebih rendah dari harga beli. Lanjutkan hanya jika disengaja.');
    }

    setSaving(true);

    let photoUrl = product?.photo_url || null;

    if (photoFile) {
      const fileExt = photoFile.name.split('.').pop();
      const filePath = `products/${barcode}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('product-photos')
        .upload(filePath, photoFile, { upsert: true });

      if (uploadError) {
        setError('Gagal upload foto: ' + uploadError.message);
        setSaving(false);
        return;
      }
      const { data: publicUrlData } = supabase.storage
        .from('product-photos')
        .getPublicUrl(filePath);
      photoUrl = publicUrlData.publicUrl;
    }

    const payload = {
      barcode: barcode.trim(),
      product_code: productCode.trim(),
      name: name.trim(),
      category_id: categoryId || null,
      purchase_price: purchasePrice,
      selling_price: sellingPrice,
      stock,
      min_stock: minStock,
      status,
      photo_url: photoUrl,
    };

    const { error: dbError } = product
      ? await supabase.from('products').update(payload).eq('id', product.id)
      : await supabase.from('products').insert(payload);

    setSaving(false);

    if (dbError) {
      setError(
        dbError.code === '23505'
          ? 'Barcode atau kode produk sudah digunakan produk lain.'
          : 'Gagal menyimpan: ' + dbError.message
      );
      return;
    }

    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <h2 className="font-bold text-lg mb-4">
          {product ? 'Edit Produk' : 'Tambah Produk'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-center gap-3">
            {photoPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoPreview}
                alt="preview"
                className="w-16 h-16 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
              />
            )}
            <input type="file" accept="image/*" onChange={handlePhotoChange} className="text-xs" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500">Barcode</label>
              <div className="flex gap-1">
                <input
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setBarcode(generateBarcode())}
                  className="text-xs px-2 rounded-lg border border-slate-300 dark:border-slate-700"
                >
                  Acak
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500">Kode Produk</label>
              <input
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500">Nama Produk</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-slate-500">Kategori</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
            >
              <option value="">Tanpa kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500">Harga Beli</label>
              <input
                type="number"
                min={0}
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(Number(e.target.value) || 0)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Harga Jual</label>
              <input
                type="number"
                min={0}
                value={sellingPrice}
                onChange={(e) => setSellingPrice(Number(e.target.value) || 0)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500">Stok</label>
              <input
                type="number"
                min={0}
                value={stock}
                onChange={(e) => setStock(Number(e.target.value) || 0)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Stok Minimum</label>
              <input
                type="number"
                min={0}
                value={minStock}
                onChange={(e) => setMinStock(Number(e.target.value) || 0)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
            >
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium py-2.5"
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 dark:border-slate-700 text-sm px-4"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

