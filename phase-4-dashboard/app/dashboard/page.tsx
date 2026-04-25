import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import MetricCard from '@/components/MetricCard';
import AISelfAwarenessCard from '@/components/AISelfAwarenessCard';
import SessionTable from '@/components/SessionTable';
import WeeklyTrendChart from '@/components/WeeklyTrendChart';
import ExtensionSync from '@/components/ExtensionSync';
import CLILoginToast from '@/components/CLILoginToast';
import KnowledgeDashboard from '@/components/KnowledgeDashboard';
import SkillDecayChart from '@/components/SkillDecayChart';

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

  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  // Use getUser() as fallback — validates token server-side even if cookie parsing fails
  let userId = user?.id;
  if (!userId) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    userId = authUser?.id;
  }
  // Last resort fallback for seeded demo data
  userId = userId || '47e886ff-1710-43ac-8b61-78b99e952f5d';

  // Fetch token savings summary
  const { data: savings } = await supabase
    .from('token_savings')
    .select('*')
    .eq('user_id', userId)
    .order('week_start', { ascending: false })
    .limit(8);

  // Fetch recent sessions
  const { data: sessions } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  // Fetch concepts for Knowledge Map
  const { data: concepts } = await supabase
    .from('concept_map')
    .select('*')
    .eq('user_id', userId)
    .order('encounter_count', { ascending: false });

  // Fetch skill decay data
  const { data: skillDecay } = await supabase
    .from('skill_decay')
    .select('*')
    .eq('user_id', userId)
    .order('week_start', { ascending: false })
    .limit(12);
    
  const latestSavings = savings?.[0];
  const totalSessions = sessions?.length ?? 0;

  return (
    <main className="relative min-h-screen p-6 md:p-12 overflow-hidden font-sans transition-colors duration-300">
      <CLILoginToast />
      <ExtensionSync />
      
      <div className="relative z-10 max-w-7xl mx-auto">
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
            <AISelfAwarenessCard 
              score={sessions?.[0]?.ai_self_awareness_score ?? 0} 
              sessionId={sessions?.[0]?.id} 
            />
          </div>
          <div className="animate-fade-in-up delay-200">
            <MetricCard label="Expected Turns Saved" value={latestSavings?.estimated_turns_saved ?? 0} unit="" variant="indigo" icon="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </div>
          <div className="animate-fade-in-up delay-300">
            <MetricCard label="Time Recovered" value={latestSavings?.estimated_wait_time_saved_min?.toFixed(1) ?? '0'} unit="min" variant="purple" icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </div>
          <div className="animate-fade-in-up delay-400">
            <MetricCard label="Estimated Cost Impact" value={`$${latestSavings?.estimated_cost_saved_usd?.toFixed(2) ?? '0.00'}`} unit="" variant="emerald" icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Weekly efficiency trend */}
          <section className="lg:col-span-2 animate-fade-in-up delay-300">
             <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Efficiency Trend</h2>
                <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider bg-[var(--glass-card-bg)] px-3 py-1 rounded-full border border-[var(--glass-card-border)]">7 Day Trailing</span>
             </div>
            {savings && savings.length > 0 ? (
              <WeeklyTrendChart data={savings} />
            ) : (
              <div className="h-[360px] glass-card rounded-2xl flex items-center justify-center text-[var(--text-secondary)]">No data yet</div>
            )}
          </section>

          {/* Skill decay line chart */}
          <section className="animate-fade-in-up delay-400">
             <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Skill Baseline</h2>
             </div>
            {skillDecay && skillDecay.length > 0 ? (
              <SkillDecayChart data={skillDecay} />
            ) : (
              <div className="h-[360px] glass-card rounded-2xl flex items-center justify-center text-[var(--text-secondary)]">Awaiting data...</div>
            )}
          </section>
        </div>

        {/* Knowledge Map Section */}
        <section className="mb-12 animate-fade-in-up delay-500">
          <KnowledgeDashboard concepts={concepts || []} userId={userId} />
        </section>

        {/* Session history */}
        <section className="animate-fade-in-up delay-600">
          <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Recent Telemetry</h2>
          </div>
          {sessions && sessions.length > 0 ? (
            <SessionTable sessions={sessions} />
          ) : (
            <div className="text-center py-24 glass-card rounded-2xl border-dashed border-[var(--glass-border)]">
              <p className="text-xl font-medium text-[var(--text-primary)] mb-2">Awaiting Session Data</p>
              <p className="text-[var(--text-secondary)] mb-6 max-w-sm mx-auto">Your metrics will populate here automatically once you execute a command.</p>
              <code className="bg-blue-500/5 dark:bg-black/60 px-6 py-3 rounded-lg border border-[var(--glass-border)] text-blue-600 dark:text-blue-400 font-mono text-sm shadow-inner inline-block">
                promptos ask "your first prompt"
              </code>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
