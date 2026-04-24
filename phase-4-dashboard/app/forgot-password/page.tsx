'use client';

import { useState, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import BackgroundSnake from '@/components/BackgroundSnake';
import { useTheme } from '@/components/ThemeProvider';

export default function ForgotPasswordPage() {
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage('Password reset link sent! Check your email.');
    }
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[var(--bg-color)] font-sans transition-colors duration-300">
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className={`fixed top-8 right-8 p-4 rounded-2xl transition-all duration-500 z-50 border border-black/[0.02] dark:border-white/[0.02] active:scale-95 ${theme === 'light'
          ? 'bg-[#f8fafc] text-[#0f172a] [box-shadow:4px_4px_8px_rgba(0,0,0,0.03),-4px_-4px_8px_rgba(255,255,255,0.6)]'
          : 'bg-[#0f172a] text-[#f8fafc] [box-shadow:4px_4px_8px_rgba(0,0,0,0.2),-4px_-4px_8px_rgba(255,255,255,0.02)]'
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

      <BackgroundSnake />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full filter blur-3xl opacity-50 animate-blob pointer-events-none"></div>
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full filter blur-3xl opacity-50 animate-blob animation-delay-2000 pointer-events-none"></div>

      <div className="relative w-full max-w-md z-10 animate-fade-in-up p-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-2">
            PromptOS
          </h1>
          <p className="text-[var(--text-secondary)] text-sm font-medium tracking-wide">
            RESET YOUR PASSWORD
          </p>
        </div>

        {message ? (
          <div className="text-center space-y-6">
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-4 rounded-xl text-sm">
              ✅ {message}
            </div>
            <Link href="/login" className="block text-blue-500 hover:text-blue-400 font-semibold transition-colors text-sm">
              ← Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-6">
            <p className="text-[var(--text-secondary)] text-sm text-center">
              Enter your email and we'll send you a reset link.
            </p>

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

            {error && (
              <div className="bg-red-900/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : 'SEND RESET LINK'}
            </button>

            <div className="text-center">
              <Link href="/login" className="text-blue-500 hover:text-blue-400 font-semibold transition-colors text-sm">
                ← Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
