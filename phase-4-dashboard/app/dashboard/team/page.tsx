import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Team Leaderboard Page — Phase 4, Task 4.5
 *
 * Displays a leaderboard for the user's team, ranked by lowest avg dependency score.
 */
export default async function TeamPage() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Find user's team
  const { data: teamMember } = await supabase
    .from('team_members')
    .select('team_id, teams(name)')
    .eq('user_id', user.id)
    .single();

  if (!teamMember) {
    return (
      <main className="min-h-screen bg-gray-950 text-white p-8">
        <h1 className="text-3xl font-bold mb-2">Team Leaderboard</h1>
        <p className="text-gray-400 mb-8">Join or create a team to see rankings.</p>
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl max-w-md">
          <p className="mb-4">You are not part of any team yet.</p>
          <button className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-medium">Create Team</button>
        </div>
      </main>
    );
  }

  // Fetch leaderboard data (mock query)
  // In reality, this requires a Supabase RPC or join to aggregate skill_decay by team members.
  const teamName = (teamMember.teams as any)?.name ?? 'Your Team';

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-2">{teamName} Leaderboard</h1>
      <p className="text-gray-400 mb-8">Ranked by lowest average AI dependency score.</p>
      
      <div className="overflow-hidden rounded-xl border border-gray-800">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-900 text-gray-400">
            <tr>
              <th className="px-6 py-4 font-medium">Rank</th>
              <th className="px-6 py-4 font-medium">Member</th>
              <th className="px-6 py-4 font-medium">Dependency Score</th>
              <th className="px-6 py-4 font-medium">Trend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {/* Placeholder rows until backend aggregation is ready */}
            <tr className="hover:bg-gray-800/30 transition-colors">
              <td className="px-6 py-4">1 🏆</td>
              <td className="px-6 py-4 font-medium">Alice (You)</td>
              <td className="px-6 py-4 text-green-400">42</td>
              <td className="px-6 py-4 text-green-400">↓ 4 pts</td>
            </tr>
            <tr className="hover:bg-gray-800/30 transition-colors">
              <td className="px-6 py-4">2</td>
              <td className="px-6 py-4 font-medium">Bob</td>
              <td className="px-6 py-4 text-amber-400">65</td>
              <td className="px-6 py-4 text-gray-500">→</td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  );
}
