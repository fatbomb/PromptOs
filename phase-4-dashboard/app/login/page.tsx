'use client';

import { useState, useEffect, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        // Force refresh to ensure middleware sees the cookie
        router.refresh();
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err?.message || 'A network error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[var(--bg-color)] font-sans transition-colors duration-300">
      {/* Animated Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-50 animate-blob"></div>
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-emerald-600/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>

      <div className="relative w-full max-w-md z-10 animate-fade-in-up">
        {/* Glassmorphic Container */}
        <div className="glass-panel rounded-3xl p-10">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-2">
              PromptOS
            </h1>
            <p className="text-[var(--text-secondary)] text-sm font-medium tracking-wide">
              AUTHENTICATE TO ACCESS DASHBOARD
            </p>
          </div>

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
              <label className="absolute left-4 top-4 text-[var(--text-secondary)] text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-500 peer-valid:top-2 peer-valid:text-xs">
                Email Address
              </label>
            </div>

            <div className="relative group">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full bg-[var(--glass-card-bg)] border border-[var(--glass-border)] rounded-xl px-4 pt-6 pb-2 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-[var(--text-primary)] transition-all peer"
                placeholder=" "
                required
              />
              <label className="absolute left-4 top-4 text-[var(--text-secondary)] text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-purple-500 peer-valid:top-2 peer-valid:text-xs">
                Password
              </label>
            </div>

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
              className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-900 disabled:opacity-50 transition-all overflow-hidden shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]"
            >
              {loading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                'INITIALIZE SESSION'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[var(--glass-border)] text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 dark:text-blue-400 text-xs font-semibold tracking-widest uppercase border border-blue-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              System Online
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
