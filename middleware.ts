// middleware.ts (place at project root, next to package.json)
//
// Responsibilities:
// 1. Refresh the Supabase auth session on every request.
// 2. Redirect unauthenticated users to /login.
// 3. Enforce role-based access:
//      - /dashboard, /products, /categories, /stock, /reports, /users, /settings -> admin only
//      - /pos, /sales-history -> admin + cashier
// 4. Send cashiers straight to /pos and admins to /dashboard after login.

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const ADMIN_ONLY_PREFIXES = [
  '/beranda',
  '/dashboard',
  '/products',
  '/categories',
  '/stock',
  '/reports',
  '/users',
  '/settings',
  '/ppob-produk',
];

const SHARED_PREFIXES = ['/pos', '/sales-history', '/ppob'];

const PUBLIC_PATHS = ['/login'];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.some((p) => path.startsWith(p));

  // Not logged in -> force to /login (except on already-public paths)
  if (!user && !isPublicPath) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Logged in but visiting /login -> send to their home page
  if (user && isPublicPath) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (!profile?.is_active) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL('/login?error=inactive', request.url));
    }

    const home = profile.role === 'admin' ? '/dashboard' : '/pos';
    return NextResponse.redirect(new URL(home, request.url));
  }

  // Logged in -> check role-based access for protected routes
  if (user && !isPublicPath) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (!profile?.is_active) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL('/login?error=inactive', request.url));
    }

    const isAdminRoute = ADMIN_ONLY_PREFIXES.some((p) => path.startsWith(p));
    const isSharedRoute = SHARED_PREFIXES.some((p) => path.startsWith(p));

    if (isAdminRoute && profile.role !== 'admin') {
      // Cashier trying to hit an admin-only page -> bounce to POS
      return NextResponse.redirect(new URL('/pos', request.url));
    }

    if (!isAdminRoute && !isSharedRoute && path !== '/') {
      // Unknown/unlisted route: let it through (e.g. static assets, api)
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico
     * - public files (images, fonts, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
