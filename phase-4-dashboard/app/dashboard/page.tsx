import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import MetricCard from '@/components/MetricCard';
import SessionTable from '@/components/SessionTable';
import WeeklyTrendChart from '@/components/WeeklyTrendChart';
import ExtensionSync from '@/components/ExtensionSync';

export default async function DashboardPage() {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // If there's an auth cookie parsing error due to localhost environments,
  // we fallback to the seeded dummy user UUID so the UI is visible for development.
  const userId = user?.id || '47e886ff-1710-43ac-8b61-78b99e952f5d';

  // Fetch token savings summary
  const { data: savings } = await supabase
    .from('token_savings')
    .select('*')
    .eq('user_id', userId)
    .order('week_start', { ascending: false })
    .limit(8);

  // Fetch recent sessions
  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (error) {
    console.error('Session Fetch Error:', error);
  }

  const latest = savings?.[0];

  return (
    <main className="relative min-h-screen bg-[var(--bg-color)] text-[var(--text-primary)] p-6 md:p-12 overflow-hidden font-sans transition-colors duration-300">
      <ExtensionSync />
      {/* Dynamic Background Glows */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[150px] pointer-events-none"></div>

      <div className="relative z-10 max-w-7xl mx-auto animate-fade-in-up">
        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
              System Overview
            </span>
          </h1>
          <p className="text-[var(--text-secondary)] font-medium tracking-wide flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
             AI Dependency Metrics Active
          </p>
        </header>

        {/* Metric cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="animate-fade-in-up delay-100">
            <MetricCard label="Sessions this month" value={latest?.total_raw_tokens ? sessions?.length ?? 0 : 0} unit="" variant="blue" icon="M13 10V3L4 14h7v7l9-11h-7z" />
          </div>
          <div className="animate-fade-in-up delay-200">
            <MetricCard label="Expected Turns Saved" value={latest?.estimated_turns_saved ?? 0} unit="" variant="indigo" icon="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </div>
          <div className="animate-fade-in-up delay-300">
            <MetricCard label="Time Recovered" value={latest?.estimated_wait_time_saved_min?.toFixed(1) ?? '0'} unit="min" variant="purple" icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </div>
          <div className="animate-fade-in-up delay-400">
            <MetricCard label="Estimated Cost Impact" value={`$${latest?.estimated_cost_saved_usd?.toFixed(2) ?? '0.00'}`} unit="" variant="emerald" icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </div>
        </div>

        {/* Weekly trend chart */}
        {savings && savings.length >= 2 && (
          <section className="mb-12 animate-fade-in-up delay-300">
             <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Efficiency Trend</h2>
                <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider bg-[var(--glass-card-bg)] px-3 py-1 rounded-full border border-[var(--glass-card-border)]">7 Day Trailing</span>
             </div>
            <WeeklyTrendChart data={savings} />
          </section>
        )}

        {/* Session history */}
        {sessions && sessions.length > 0 ? (
          <section className="animate-fade-in-up delay-400">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Recent Telemetry</h2>
            </div>
            <SessionTable sessions={sessions} />
          </section>
        ) : (
          <div className="text-center py-24 glass-card rounded-2xl border-dashed border-[var(--glass-border)] animate-fade-in-up delay-300">
            <div className="w-16 h-16 bg-[var(--glass-card-bg)] rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--glass-border)]">
               <svg className="w-8 h-8 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
               </svg>
            </div>
            <p className="text-xl font-medium text-[var(--text-primary)] mb-2">Awaiting Session Data</p>
            <p className="text-[var(--text-secondary)] mb-2 max-w-sm mx-auto">Your metrics will populate here automatically once you execute a command.</p>
            
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 max-w-md mx-auto text-left">
              <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-2">Developer Tip: Seeding Data</p>
              <p className="text-xs text-[var(--text-secondary)] mb-3">If you just ran the seed script, ensure the <code className="text-amber-400">user_id</code> in the SQL matches your current ID below (DB RLS is active):</p>
              <code className="block bg-black/40 p-2 rounded text-[10px] text-gray-300 break-all select-all border border-white/5">
                {userId}
              </code>
            </div>

            <code className="bg-blue-500/5 dark:bg-black/60 px-6 py-3 rounded-lg border border-[var(--glass-border)] text-blue-600 dark:text-blue-400 font-mono text-sm shadow-inner inline-block">
              promptos ask "your first prompt"
            </code>
          </div>
        )}
      </div>
    </main>
  );
}
