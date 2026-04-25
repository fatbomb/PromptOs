import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * OAuth Callback Route — Phase 4, Task 4.1
 *
 * Handles the redirect from Supabase after Google OAuth.
 * Exchanges the code for a session, then:
 *   - If `state` param present (URL or cookie) → store JWT for CLI token handoff
 *   - Redirect to /dashboard
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code  = url.searchParams.get('code');

  // Supabase can strip query params from redirectTo in production,
  // so we use a cookie as a reliable fallback for the CLI state.
  const stateFromUrl    = url.searchParams.get('state');
  const cookieStore     = cookies();
  const stateFromCookie = cookieStore.get('promptos_cli_state')?.value ?? null;
  const state           = stateFromUrl || stateFromCookie;

  console.log('\n=============================================');
  console.log('>>> AUTH CALLBACK ROUTE HIT');
  console.log('URL:', request.url);
  console.log('Has Code:', !!code);
  console.log('State from URL:', stateFromUrl);
  console.log('State from Cookie:', stateFromCookie);
  console.log('Effective State:', state);

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', request.url));
  }

  console.log('Incoming Callback Cookies:', cookieStore.getAll().map(c => c.name));
  
  const redirectUrl = state 
    ? new URL('/dashboard?cli_login=success', request.url)
    : new URL('/dashboard', request.url);

  const response = NextResponse.redirect(redirectUrl);

  // Clear the CLI state cookie now that we've read it
  if (stateFromCookie) {
    response.cookies.set('promptos_cli_state', '', { path: '/', maxAge: 0 });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: any[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set({ name, value, ...options });
              response.cookies.set({ name, value, ...options });
            } catch (error) {}
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  console.log('Exchange Result Error:', error?.message || 'None');
  console.log('Exchange Result Session:', !!data.session);
  console.log('Response Cookies Set:', response.cookies.getAll().map(c => c.name));
  console.log('=============================================\n');

  if (error || !data.session) {
    console.error('Supabase exchangeCodeForSession error:', error);
    return NextResponse.redirect(new URL('/login?error=auth_failed', request.url));
  }

  // CLI token handoff — store JWT so CLI can pick it up
  if (state) {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://prompt-os-dusky.vercel.app';
    try {
      const handoffRes = await fetch(`${apiBase}/auth/cli-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, token: data.session.access_token }),
      });
      console.log('CLI token handoff status:', handoffRes.status);
    } catch (err) {
      console.error('CLI token handoff failed:', err);
    }
  }

  return response;
}

