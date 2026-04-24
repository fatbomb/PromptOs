import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import SkillDecayChart from '@/components/SkillDecayChart';

export default async function DecayPage() {
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
  const userId = user?.id || '47e886ff-1710-43ac-8b61-78b99e952f5d';

  const { data: decayData } = await supabase
    .from('skill_decay')
    .select('*')
    .eq('user_id', userId)
    .order('week_start', { ascending: false })
    .limit(10); // get last 10 weeks

  return (
    <main className="relative min-h-screen p-6 md:p-12 overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-amber-600/10 blur-[120px] pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-red-400">
              Skill Decay Tracking
            </span>
          </h1>
          <p className="text-gray-400 font-medium tracking-wide">
            Monitor your dependency score over time. Are you learning, or leaning?
          </p>
        </header>

        {decayData && decayData.length > 0 ? (
          <div className="animate-fade-in-up">
            <SkillDecayChart data={decayData} />
            
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-card p-6 rounded-2xl border-[var(--glass-border)]">
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Refusal Engine Performance</h3>
                <div className="flex items-baseline gap-4 mt-4">
                  <span className="text-4xl font-extrabold text-red-500 dark:text-red-400">{decayData[0].refusals_triggered}</span>
                  <span className="text-[var(--text-secondary)]">AI Refusals this week</span>
                </div>
                <p className="text-sm text-[var(--text-secondary)] mt-2">Times PromptOS refused to write code for you because you already knew the answer.</p>
              </div>
              <div className="glass-card p-6 rounded-2xl border-[var(--glass-border)]">
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Self-Solve Rate</h3>
                <div className="flex items-baseline gap-4 mt-4">
                  <span className="text-4xl font-extrabold text-blue-500 dark:text-blue-400">{(decayData[0].self_solve_rate * 100).toFixed(1)}%</span>
                  <span className="text-[var(--text-secondary)]">of sessions</span>
                </div>
                <p className="text-sm text-[var(--text-secondary)] mt-2">Percentage of sessions where you successfully solved the problem before the AI could generate code.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-24 glass-card rounded-2xl border-dashed border-[var(--glass-border)]">
            <p className="text-xl font-medium text-[var(--text-primary)] mb-2">Awaiting Weekly Rollup</p>
            <p className="text-[var(--text-secondary)]">Your skill decay will be calculated at the end of the first week.</p>
          </div>
        )}
      </div>
    </main>
  );
}
