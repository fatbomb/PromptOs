import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export default async function TeamPage() {
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

  // 1. Find user's team
  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId)
    .single();

  let teamInfo = null;
  let members = [];

  if (membership) {
    const { data: team } = await supabase
      .from('teams')
      .select('*')
      .eq('id', membership.team_id)
      .single();
    
    teamInfo = team;

    // Get all members of the team. Since we don't have usernames in auth.users by default in this schema, 
    // we'll mock display names, but pull real user IDs
    const { data: teamMembers } = await supabase
      .from('team_members')
      .select('user_id, role')
      .eq('team_id', membership.team_id);
      
    if (teamMembers) {
      // For each member, find their latest skill decay to sort leaderboards
      for (const m of teamMembers) {
        const { data: decay } = await supabase
          .from('skill_decay')
          .select('avg_dependency_score')
          .eq('user_id', m.user_id)
          .order('week_start', { ascending: false })
          .limit(1)
          .single();
          
        members.push({
          user_id: m.user_id,
          role: m.role,
          name: m.user_id === userId ? 'You' : `Developer ${m.user_id.substring(0, 4)}`,
          score: decay?.avg_dependency_score || 0
        });
      }
      
      // Sort: Lower dependency score is better
      members.sort((a, b) => a.score - b.score);
    }
  }

  return (
    <main className="relative min-h-screen p-6 md:p-12 overflow-hidden">
      <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-cyan-600/10 blur-[120px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10 animate-fade-in-up">
        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
              Team Leaderboard
            </span>
          </h1>
          <p className="text-gray-400 font-medium tracking-wide">
            Ranked by AI independence. Lower dependency score wins.
          </p>
        </header>

        {teamInfo ? (
          <div>
            <div className="mb-8 flex items-center justify-between">
               <div>
                 <h2 className="text-2xl font-bold text-[var(--text-primary)]">{teamInfo.name}</h2>
                 <p className="text-[var(--text-secondary)] text-sm mt-1">Invite Code: <span className="text-cyan-500 dark:text-cyan-400 font-mono bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">{teamInfo.invite_code}</span></p>
               </div>
               <button className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                 Invite Member
               </button>
            </div>

            <div className="glass-card rounded-2xl border-[var(--glass-border)] overflow-hidden">
              <div className="grid grid-cols-12 gap-4 p-4 border-b border-[var(--glass-border)] bg-[var(--glass-card-bg)] text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                <div className="col-span-2 text-center">Rank</div>
                <div className="col-span-6">Developer</div>
                <div className="col-span-4 text-right pr-6">Dependency Score</div>
              </div>

              <div className="divide-y border-[var(--glass-border)]">
                {members.map((member, index) => (
                  <div key={member.user_id} className={`grid grid-cols-12 gap-4 p-4 items-center transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${member.user_id === userId ? 'bg-blue-500/5' : ''}`}>
                    <div className="col-span-2 flex justify-center">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border
                        ${index === 0 ? 'bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 
                          index === 1 ? 'bg-gray-400/20 border-gray-400 text-gray-500 dark:text-gray-300' : 
                          index === 2 ? 'bg-orange-800/20 border-orange-800 text-orange-600 dark:text-orange-400' : 
                          'bg-[var(--glass-card-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]'}`}
                      >
                        {index + 1}
                      </span>
                    </div>
                    <div className="col-span-6 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                           {member.name}
                           {member.user_id === userId && <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full uppercase tracking-wider border border-blue-500/20">You</span>}
                           {member.role === 'owner' && <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full uppercase tracking-wider border border-amber-500/20">Admin</span>}
                        </p>
                      </div>
                    </div>
                    <div className="col-span-4 text-right pr-6">
                      <span className="text-2xl font-extrabold text-[var(--text-primary)]">
                        {member.score > 0 ? member.score.toFixed(1) : 'N/A'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-24 glass-card rounded-2xl border-dashed border-[var(--glass-border)]">
            <div className="w-16 h-16 bg-cyan-900/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-cyan-500/20">
               <svg className="w-8 h-8 text-cyan-600 dark:text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <p className="text-xl font-medium text-[var(--text-primary)] mb-2">You are not in a team</p>
            <p className="text-[var(--text-secondary)] mb-6">Join a team to compete on the leaderboards.</p>
            <div className="flex justify-center gap-4">
              <button className="px-6 py-3 rounded-xl bg-cyan-600/10 hover:bg-cyan-600/20 text-cyan-600 dark:text-cyan-400 font-bold transition-all border border-cyan-500/20">Join Team</button>
              <button className="px-6 py-3 rounded-xl bg-[var(--glass-card-bg)] hover:bg-white/10 text-[var(--text-primary)] font-bold transition-all border border-[var(--glass-border)]">Create Team</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
