/**
 * Dashboard Home — Phase 4, Task 4.2
 *
 * Displays:
 *   - 4 metric cards (sessions, turns saved, time recovered, cost saved)
 *   - Week-over-week line chart (Recharts)
 *   - Session history table
 *
 * Progressive reveal: cards visible after 1st session,
 * chart visible after 2 weeks of data.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import MetricCard from '@/components/MetricCard';
import SessionTable from '@/components/SessionTable';
import WeeklyTrendChart from '@/components/WeeklyTrendChart';

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

  // Fetch token savings summary
  const { data: savings } = await supabase
    .from('token_savings')
    .select('*')
    .eq('user_id', user!.id)
    .order('week_start', { ascending: false })
    .limit(8);

  // Fetch recent sessions
  const { data: sessions } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(10);

  const latest = savings?.[0];

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-2">PromptOS Dashboard</h1>
      <p className="text-gray-400 mb-8">Your AI dependency at a glance</p>

      {/* Metric cards — Task 4.2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <MetricCard label="Sessions this month" value={latest?.total_raw_tokens ? sessions?.length ?? 0 : 0} unit="" />
        <MetricCard label="Turns saved"          value={latest?.estimated_turns_saved ?? 0} unit="" />
        <MetricCard label="Time recovered"       value={latest?.estimated_wait_time_saved_min?.toFixed(1) ?? '0'} unit="min" />
        <MetricCard label="Cost saved"           value={`$${latest?.estimated_cost_saved_usd?.toFixed(2) ?? '0.00'}`} unit="" />
      </div>

      {/* Weekly trend chart */}
      {savings && savings.length >= 2 && (
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Week-over-Week Trend</h2>
          <WeeklyTrendChart data={savings} />
        </section>
      )}

      {/* Session history */}
      {sessions && sessions.length > 0 ? (
        <section>
          <h2 className="text-xl font-semibold mb-4">Recent Sessions</h2>
          <SessionTable sessions={sessions} />
        </section>
      ) : (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg">No sessions yet.</p>
          <code className="block mt-3 text-sm bg-gray-900 px-4 py-2 rounded inline-block">
            promptos ask &quot;your first prompt&quot;
          </code>
        </div>
      )}
    </main>
  );
}
