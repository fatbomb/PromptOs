/**
 * Next.js Middleware — Phase 4, Task 4.1
 *
 * Redirects unauthenticated users to /login for all /dashboard/* routes.
 * Uses @supabase/ssr to refresh the session cookie on every request.
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: any[]) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { session }, error } = await supabase.auth.getSession();
  const user = session?.user;

  console.log('\n=============================================');
  console.log('>>> MIDDLEWARE HIT');
  console.log('Middleware Path:', request.nextUrl.pathname);
  console.log('Incoming Request Cookies:', request.cookies.getAll().map(c => c.name));
  console.log('Session found in middleware:', !!session);
  
  if (error) {
    console.error('Middleware Auth Error:', error.message);
  }
  console.log('=============================================\n');

  // Protect all /dashboard routes
  if (!session && request.nextUrl.pathname.startsWith('/dashboard')) {
    console.log('Redirecting to /login because no user');
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
