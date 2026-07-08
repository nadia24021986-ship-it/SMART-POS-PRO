'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/types';

export default function UsersPage() {
  const supabase = createClient();

  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadUsers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');
    if (error) setError(error.message);
    setUsers(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleCreateCashier(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !email.trim() || password.length < 6) {
      setError('Nama, email wajib diisi. Password minimal 6 karakter.');
      return;
    }

    setSaving(true);

    // NOTE: signUp creates the auth user; the DB trigger (handle_new_user)
    // automatically creates the matching `profiles` row with role='cashier'.
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim(), role: 'cashier' },
      },
    });

    if (signUpError || !data.user) {
      setError('Gagal membuat akun: ' + signUpError?.message);
      setSaving(false);
      return;
    }

    // Update phone separately since signUp metadata only seeds full_name/role
    if (phone.trim()) {
      await supabase.from('profiles').update({ phone: phone.trim() }).eq('id', data.user.id);
    }

    setSaving(false);
    setShowCreateForm(false);
    setFullName('');
    setEmail('');
    setPassword('');
    setPhone('');
    loadUsers();
  }

  async function toggleActive(user: Profile) {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !user.is_active })
      .eq('id', user.id);
    if (error) {
      setError('Gagal mengubah status: ' + error.message);
      return;
    }
    loadUsers();
  }

  async function handleResetPassword(user: Profile) {
    alert(
      `Untuk reset password "${user.full_name}", gunakan menu Authentication → Users di Supabase Dashboard, lalu pilih "Send password reset" atau set password baru manual. Reset password langsung dari sisi client tidak diizinkan Supabase untuk alasan keamanan.`
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Kelola User</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2"
        >
          {showCreateForm ? 'Batal' : '+ Tambah Cashier'}
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4">
          <h2 className="font-semibold text-sm mb-3">Tambah Cashier Baru</h2>
          <form onSubmit={handleCreateCashier} className="grid md:grid-cols-2 gap-3">
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nama lengkap"
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min. 6 karakter)"
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="No. HP (opsional)"
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
            />
            {error && <p className="text-xs text-red-600 md:col-span-2">{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className="md:col-span-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium py-2.5"
            >
              {saving ? 'Menyimpan...' : 'Buat Akun Cashier'}
            </button>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4">
        {loading ? (
          <p className="text-sm text-slate-400 text-center py-8">Memuat...</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Belum ada user.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100 dark:border-slate-800">
                <th className="py-2">Nama</th>
                <th className="py-2">Role</th>
                <th className="py-2">No. HP</th>
                <th className="py-2">Status</th>
                <th className="py-2 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                  <td className="py-2 font-medium">{u.full_name}</td>
                  <td className="py-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        u.role === 'admin'
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800'
                      }`}
                    >
                      {u.role === 'admin' ? 'Admin' : 'Cashier'}
                    </span>
                  </td>
                  <td className="py-2 text-slate-500">{u.phone || '-'}</td>
                  <td className="py-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        u.is_active
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950'
                          : 'bg-red-50 text-red-700 dark:bg-red-950'
                      }`}
                    >
                      {u.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="py-2 text-right space-x-3">
                    <button
                      onClick={() => handleResetPassword(u)}
                      className="text-blue-600 text-xs font-medium"
                    >
                      Reset Password
                    </button>
                    <button
                      onClick={() => toggleActive(u)}
                      className={`text-xs font-medium ${u.is_active ? 'text-red-600' : 'text-emerald-600'}`}
                    >
                      {u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

