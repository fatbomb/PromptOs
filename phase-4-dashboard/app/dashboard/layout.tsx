'use client';

import { useTheme } from '@/components/ThemeProvider';
import { createBrowserClient } from '@supabase/ssr';
import Lottie from 'lottie-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import GlowScrollbar from '@/components/GlowScrollbar';
import DashboardIntro from '@/components/DashboardIntro';
import { useEffect, useRef, useState } from 'react';
import foxAnimation from '@/components/happy-fox.json';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email ?? null);
        setDisplayName(user.user_metadata?.display_name ?? user.email?.split('@')[0] ?? 'User');
      }
    });
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setDropdownOpen(false);
    // Navigate immediately for instant feedback, sign out in background
    router.push('/login');
    supabase.auth.signOut();
  };

  const initials = displayName ? displayName.slice(0, 2).toUpperCase() : 'U';

  const navItems = [
    { name: 'Overview', href: '/dashboard' },
    { name: 'Knowledge Map', href: '/dashboard/knowledge' },
    { name: 'Skill Decay', href: '/dashboard/decay' },
    { name: 'Team', href: '/dashboard/team' },
    { name: 'Quiz', href: '/dashboard/quiz' },
  ];

  const [contentVisible, setContentVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('promptos-intro-played')) {
      setContentVisible(true);
    } else {
      // Overlay starts fading at 72% of 2s = 1.44s
      const t = setTimeout(() => setContentVisible(true), 1440);
      return () => clearTimeout(t);
    }
  }, []);

  const getPyramidGradient = () => {
    if (pathname === '/dashboard/knowledge') return 'from-emerald-500 via-teal-500 to-cyan-500';
    if (pathname === '/dashboard/decay') return 'from-amber-500 via-orange-500 to-red-500';
    if (pathname === '/dashboard/team') return 'from-cyan-500 via-blue-500 to-indigo-500';
    return 'from-blue-500 via-indigo-500 to-purple-500';
  };

  return (
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-300 bg-[var(--bg-color)] text-[var(--text-primary)]">
      <DashboardIntro />
      {/* Top Navigation */}
      <nav
        className="sticky top-0 z-50 bg-white/30 dark:bg-[#0f172a]/30 backdrop-blur-2xl"
        style={{
          opacity: contentVisible ? 1 : 0,
          transition: 'opacity 600ms ease-in-out',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-12">
              <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                PromptOS
              </span>
              <div className="hidden md:flex space-x-1 pl-4">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${isActive
                          ? 'bg-white/10 text-[var(--text-primary)] shadow-inner'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'
                        }`}
                    >
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-6">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-white/10 transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 5a7 7 0 100 14 7 7 0 000-14z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {/* Profile dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-9 h-9 rounded-full bg-[var(--glass-card-bg)] border border-[var(--glass-border)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-blue-500/50 hover:scale-105 transition-all shadow-lg"
                  title="Profile"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-full pt-3 z-50">
                  <div className="w-80 rounded-2xl border border-[var(--glass-border)] bg-white/90 dark:bg-[#0f172a]/95 backdrop-blur-xl shadow-md overflow-hidden animate-fade-in-up">
                    {/* Profile + Sign Out in one row */}
                    <div className="px-5 py-5 flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full overflow-hidden bg-transparent shrink-0 flex items-center justify-center">
                        <Lottie animationData={foxAnimation} loop autoplay style={{ width: 64, height: 64 }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-[var(--text-secondary)] mb-0.5">Hi, <span className="text-[var(--text-primary)] font-bold">{displayName}</span> 👋</p>
                        <p className="text-xs text-[var(--text-secondary)] truncate">{userEmail}</p>
                      </div>
                      {/* Sign out icon button */}
                      <button
                        onClick={handleSignOut}
                        disabled={signingOut}
                        title="Sign Out"
                        className="shrink-0 p-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {signingOut ? (
                          <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Floating Gradient Pyramid */}
      <div className="fixed bottom-[-15%] right-[-8%] w-[600px] h-[600px] pointer-events-none z-0 animate-float-pyramid filter blur-[70px] opacity-25 mix-blend-multiply dark:mix-blend-screen">
        <div
          className={`w-full h-full bg-gradient-to-tr ${getPyramidGradient()} transition-all duration-1000`}
          style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}
        ></div>
      </div>

      {/* Glow Scrollbar — page-color-matched */}
      <GlowScrollbar />

      {/* Main Content Area */}
      <div
        className="flex-1 overflow-auto relative z-10"
        style={{
          opacity: contentVisible ? 1 : 0,
          transition: 'opacity 600ms ease-in-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}
