'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError('Email atau password salah.');
      setLoading(false);
      return;
    }

    // Fetch role to decide where to send the user.
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', data.user.id)
      .single();

    if (!profile?.is_active) {
      setError('Akun Anda tidak aktif. Hubungi admin.');
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    router.push(profile.role === 'admin' ? '/dashboard' : '/pos');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-blue-700 dark:text-blue-400">
            Smart POS Pro
          </h1>
          <p className="text-sm text-slate-500 mt-1">Masuk ke akun Anda</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="nama@toko.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 text-sm transition-colors"
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}
