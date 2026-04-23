import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import SkillDecayChart from '@/components/SkillDecayChart';

/**
 * Skill Decay Page — Phase 4, Task 4.4
 *
 * Displays a 3-line Recharts chart:
 *   - dependency_score    (going down = good)
 *   - thinking_depth      (going up = good)
 *   - refusal_rate        (going up = good — self-solving more)
 *
 * Progressive reveal: shown after 2 weeks of data.
 */
export default async function SkillDecayPage() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: decay } = await supabase
    .from('skill_decay')
    .select('*')
    .eq('user_id', user.id)
    .order('week_start', { ascending: true });

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-2">Skill Decay</h1>
      <p className="text-gray-400 mb-8">
        Week-over-week: dependency going down means you&apos;re growing.
      </p>
      {decay && decay.length >= 2 ? (
        <SkillDecayChart data={decay} />
      ) : (
        <p className="text-gray-500 text-center py-20">
          Keep using PromptOS for 2 weeks to unlock your Skill Decay chart.
        </p>
      )}
    </main>
  );
}
