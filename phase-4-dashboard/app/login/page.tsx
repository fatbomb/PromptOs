'use client';

import BackgroundSnake from '@/components/BackgroundSnake';
import { useTheme } from '@/components/ThemeProvider';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const state = searchParams.get('state');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      console.log('>>> CLIENT CHECK SESSION HIT');
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Client getSession returned session:', !!session);

      if (session) {
        if (state) {
          // Hand off token to CLI
          const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
          await fetch(`${apiBase}/auth/cli-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state, token: session.access_token }),
          }).catch(() => { });

          router.push('/dashboard?cli_login=success');
        } else {
          router.push('/dashboard');
        }
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, router, state]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) {
          setError(error.message);
          setLoading(false);
        } else {
          setError('Success! Please check your email for the confirmation link.');
          setLoading(false);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setError(error.message);
          setLoading(false);
        } else {
          // CLI token handoff for email login
          if (state && data.session) {
            const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
            await fetch(`${apiBase}/auth/cli-token`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ state, token: data.session.access_token }),
            }).catch(() => { });

            // Clear intro flag so animation plays after login
            sessionStorage.removeItem('promptos-intro-played');
            router.push('/dashboard?cli_login=success');
          } else {
            // Clear intro flag so animation plays after login
            sessionStorage.removeItem('promptos-intro-played');
            router.push('/dashboard');
          }
        }
      }
    } catch (err: any) {
      setError(err?.message || 'A network error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback${state ? `?state=${state}` : ''}`,
      },
    });
  };

  return (
    <form onSubmit={handleLogin} autoComplete="off" className="space-y-6">
      <div className="relative group">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="off"
          className="w-full bg-[var(--glass-card-bg)] border border-[var(--glass-border)] rounded-xl px-4 pt-6 pb-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[var(--text-primary)] transition-all peer"
          placeholder=" "
          required
        />
        <label className="absolute left-4 top-4 text-[var(--text-secondary)] text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-500 peer-valid:top-2 peer-valid:text-xs pointer-events-none">
          Email Address
        </label>
      </div>

      {isSignUp && (
        <div className="relative group animate-fade-in-up">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="off"
            className="w-full bg-[var(--glass-card-bg)] border border-[var(--glass-border)] rounded-xl px-4 pt-6 pb-2 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-[var(--text-primary)] transition-all peer"
            placeholder=" "
            required={isSignUp}
          />
          <label className="absolute left-4 top-4 text-[var(--text-secondary)] text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-emerald-500 peer-valid:top-2 peer-valid:text-xs pointer-events-none">
            Display Name
          </label>
        </div>
      )}

      <div className="relative group">
        <input
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          className="w-full bg-[var(--glass-card-bg)] border border-[var(--glass-border)] rounded-xl px-4 pt-6 pb-2 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-[var(--text-primary)] transition-all peer pr-12"
          placeholder=" "
          required
        />
        <label className="absolute left-4 top-4 text-[var(--text-secondary)] text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-purple-500 peer-valid:top-2 peer-valid:text-xs pointer-events-none">
          Password
        </label>
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-4 text-[var(--text-secondary)] hover:text-white transition-colors"
          tabIndex={-1}
        >
          {showPassword ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </button>
      </div>

      {!isSignUp && (
        <div className="text-right -mt-2">
          <a href="/forgot-password" className="text-xs text-blue-500 hover:text-blue-400 transition-colors font-medium">
            Forgot password?
          </a>
        </div>
      )}

      {isSignUp && (
        <div className="relative group animate-fade-in-up">
          <input
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            className="w-full bg-[var(--glass-card-bg)] border border-[var(--glass-border)] rounded-xl px-4 pt-6 pb-2 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 text-[var(--text-primary)] transition-all peer pr-12"
            placeholder=" "
            required={isSignUp}
          />
          <label className="absolute left-4 top-4 text-[var(--text-secondary)] text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-pink-500 peer-valid:top-2 peer-valid:text-xs pointer-events-none">
            Confirm Password
          </label>
        </div>
      )}

      {error && (
        <div className="bg-red-900/10 border border-red-500/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="group relative w-full flex justify-center py-3.5 px-4 rounded-xl text-[var(--text-primary)] hover:text-white bg-[var(--glass-card-bg)] hover:bg-gradient-to-r hover:from-indigo-500 hover:via-purple-500 hover:to-blue-500 font-bold tracking-widest uppercase text-sm border border-[var(--glass-border)] hover:border-transparent transition-all duration-200 ease-out overflow-hidden shadow-sm hover:shadow-[0_8px_30px_rgba(99,102,241,0.4)] hover:animate-gradient-x active:scale-[0.97] active:shadow-inner disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-[var(--bg-color)]"
      >
        {loading ? (
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          isSignUp ? 'CREATE ACCOUNT' : 'INITIALIZE SESSION'
        )}
      </button>

      <div className="text-center mt-4 text-sm">
        <span className="text-[var(--text-secondary)]">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}
        </span>
        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="ml-2 text-blue-500 hover:text-blue-400 font-semibold transition-colors"
        >
          {isSignUp ? 'Sign In' : 'Sign Up'}
        </button>
      </div>

      <div className="flex items-center gap-4 my-8">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[var(--glass-border)]"></div>
        <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[var(--text-secondary)] whitespace-nowrap">
          Or continue with
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[var(--glass-border)]"></div>
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        className="w-full flex justify-center items-center gap-3 py-3.5 px-4 border border-[var(--glass-border)] rounded-xl text-[var(--text-primary)] bg-[var(--glass-card-bg)] hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 focus:ring-offset-gray-900 transition-all shadow-sm"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          <path d="M0 0h24v24H0z" fill="none" />
        </svg>
        Google
      </button>
    </form>
  );
}

export default function LoginPage() {
  const { theme, toggleTheme } = useTheme();
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
        const resp = await fetch(`${apiBase}/health`, { cache: 'no-store' });
        setIsOnline(resp.ok);
      } catch (err) {
        setIsOnline(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[var(--bg-color)] font-sans transition-colors duration-300">
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className={`fixed top-8 right-8 p-4 rounded-2xl transition-all duration-500 z-50 border border-black/[0.02] dark:border-white/[0.02] active:scale-95 will-change-[box-shadow,background-color] ${theme === 'light'
            ? 'bg-[#f8fafc] text-[#0f172a] [box-shadow:4px_4px_8px_rgba(0,0,0,0.03),-4px_-4px_8px_rgba(255,255,255,0.6)] hover:[box-shadow:6px_6px_12px_rgba(0,0,0,0.04),-6px_-6px_12px_rgba(255,255,255,0.8)] active:[box-shadow:inset_3px_3px_6px_rgba(0,0,0,0.02),inset_-3px_-3px_6px_rgba(255,255,255,0.4)]'
            : 'bg-[#0f172a] text-[#f8fafc] [box-shadow:4px_4px_8px_rgba(0,0,0,0.2),-4px_-4px_8px_rgba(255,255,255,0.02)] hover:[box-shadow:6px_6px_12px_rgba(0,0,0,0.3),-6px_-6px_12px_rgba(255,255,255,0.03)] active:[box-shadow:inset_3px_3px_6px_rgba(0,0,0,0.3),inset_-3px_-3px_6px_rgba(255,255,255,0.01)]'
          }`}
        aria-label="Toggle Theme"
      >
        {theme === 'dark' ? (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
          </svg>
        )}
      </button>

      {/* Animated Background Orbs & Snake */}
      <BackgroundSnake />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-50 animate-blob pointer-events-none"></div>
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-50 animate-blob animation-delay-2000 pointer-events-none"></div>
      <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-emerald-600/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-50 animate-blob animation-delay-4000 pointer-events-none"></div>

      <div className="relative w-full max-w-md z-10 animate-fade-in-up">
        {/* Transparent Container */}
        <div className="p-10">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-2">
              PromptOS
            </h1>
            <p className="text-[var(--text-secondary)] text-sm font-medium tracking-wide leading-relaxed">
              AUTHENTICATE TO ACCESS DASHBOARD
            </p>
          </div>

          <Suspense fallback={<div className="text-center py-10 text-[var(--text-secondary)]">Loading...</div>}>
            <LoginForm />
          </Suspense>

          <div className="mt-12 text-center">
            <span className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-full transition-all duration-500 border ${isOnline
                ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/10'
                : isOnline === false
                  ? 'bg-red-500/5 text-red-500 border-red-500/10'
                  : 'bg-blue-500/5 text-blue-500 border-blue-500/10'
              }`}>
              <span className={`w-2 h-2 rounded-full transition-all duration-500 ${isOnline
                  ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                  : isOnline === false
                    ? 'bg-red-500'
                    : 'bg-blue-500 animate-pulse'
                }`}></span>
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase">
                {isOnline ? 'System Online' : isOnline === false ? 'System Offline' : 'Checking...'}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
