'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Category } from '@/lib/types';

export default function CategoriesPage() {
  const supabase = createClient();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  async function loadCategories() {
    setLoading(true);
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    if (error) setError(error.message);
    setCategories(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadCategories();
  }, []);

  function resetForm() {
    setName('');
    setDescription('');
    setEditingId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Nama kategori wajib diisi.');
      return;
    }

    if (editingId) {
      const { error } = await supabase
        .from('categories')
        .update({ name: name.trim(), description: description.trim() || null })
        .eq('id', editingId);
      if (error) {
        setError('Gagal menyimpan: ' + error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from('categories')
        .insert({ name: name.trim(), description: description.trim() || null });
      if (error) {
        setError(
          error.code === '23505'
            ? 'Nama kategori sudah ada.'
            : 'Gagal menyimpan: ' + error.message
        );
        return;
      }
    }

    resetForm();
    loadCategories();
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setName(cat.name);
    setDescription(cat.description || '');
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus kategori ini? Produk terkait tidak akan terhapus.')) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      setError('Gagal menghapus: ' + error.message);
      return;
    }
    loadCategories();
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6">
      <h1 className="text-xl font-bold mb-4">Kategori Produk</h1>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 h-fit">
          <h2 className="font-semibold mb-3 text-sm">
            {editingId ? 'Edit Kategori' : 'Tambah Kategori'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama kategori"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi (opsional)"
              rows={3}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2"
              >
                {editingId ? 'Simpan Perubahan' : 'Tambah'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 text-sm px-3"
                >
                  Batal
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4">
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-8">Memuat...</p>
          ) : categories.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">
              Belum ada kategori.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100 dark:border-slate-800">
                  <th className="py-2">Nama</th>
                  <th className="py-2">Deskripsi</th>
                  <th className="py-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr
                    key={cat.id}
                    className="border-b border-slate-50 dark:border-slate-800/50 last:border-0"
                  >
                    <td className="py-2 font-medium">{cat.name}</td>
                    <td className="py-2 text-slate-500">{cat.description || '-'}</td>
                    <td className="py-2 text-right space-x-3">
                      <button
                        onClick={() => startEdit(cat)}
                        className="text-blue-600 text-xs font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id)}
                        className="text-red-600 text-xs font-medium"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

