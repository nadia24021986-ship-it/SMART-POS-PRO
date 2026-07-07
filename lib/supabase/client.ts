// lib/supabase/client.ts
// Supabase client for use in Client Components ('use client').
// Requires: npm install @supabase/ssr @supabase/supabase-js

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

