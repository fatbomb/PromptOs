import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import TeamActions from '@/components/TeamActions';
import CopyInviteButton from '@/components/CopyInviteButton';
import TeamSelector from '@/components/TeamSelector';
export default async function TeamPage({ searchParams }: { searchParams: { teamId?: string } }) {
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
  if (!user) {
    redirect('/login');
  }
  
  const userId = user.id;

  // 1. Find ALL user's teams
  const { data: memberships } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId);

  let teamInfo = null;
  let members: { user_id: string; role: string; name: string; score: number }[] = [];
  let otherTeams: { id: string; name: string }[] = [];

  if (memberships && memberships.length > 0) {
    // Determine active team ID
    const activeTeamId = searchParams.teamId || memberships[0].team_id;

    // Fetch details for all teams to show in selector
    const teamIds = memberships.map(m => m.team_id);
    const { data: allTeams } = await supabase
      .from('teams')
      .select('id, name')
      .in('id', teamIds);
    
    otherTeams = allTeams || [];
    
    // Fetch active team details
    const { data: team } = await supabase
      .from('teams')
      .select('*')
      .eq('id', activeTeamId)
      .maybeSingle();
    
    if (team) {
      teamInfo = team;

      const { data: teamMembers } = await supabase
        .from('team_members')
        .select('user_id, role')
        .eq('team_id', activeTeamId);
        
      if (teamMembers) {
        for (const m of teamMembers) {
          const { data: decay } = await supabase
            .from('skill_decay')
            .select('avg_dependency_score')
            .eq('user_id', m.user_id)
            .order('week_start', { ascending: false })
            .limit(1)
            .maybeSingle();
            
          members.push({
            user_id: m.user_id,
            role: m.role,
            name: m.user_id === userId ? 'You' : `Dev_${m.user_id.substring(0, 5)}`,
            score: decay?.avg_dependency_score || 0
          });
        }
        
        members.sort((a, b) => {
          if (a.score === 0) return 1;
          if (b.score === 0) return -1;
          return a.score - b.score;
        });
      }
    }
  }

  return (
    <main className="relative min-h-screen p-6 md:p-12 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-cyan-600/10 blur-[120px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
                Team Leaderboard
              </span>
            </h1>
            <p className="text-[var(--text-secondary)] font-medium tracking-wide max-w-2xl">
              AI Independence Ranking. Lower scores indicate higher self-sufficiency.
            </p>
          </div>
          
          {otherTeams.length > 0 && (
            <TeamSelector 
                teams={otherTeams} 
                activeTeamId={teamInfo?.id || ''} 
                userId={userId} 
            />
          )}
        </header>

        {teamInfo ? (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 glass-card p-6 rounded-3xl border border-[var(--glass-border)] transition-all">
               <div>
                 <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">{teamInfo.name}</h2>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20">Active</span>
                 </div>
                 <p className="text-[var(--text-secondary)] text-sm mt-1 font-medium">
                   Invite Code: <span className="text-cyan-500 font-mono bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 tracking-wider ml-1">{teamInfo.invite_code}</span>
                 </p>
               </div>
               <div className="flex gap-3">
                  <button className="px-5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-[var(--text-primary)] font-bold text-sm transition-colors border border-black/5 dark:border-white/5 shadow-sm">
                    Team Settings
                  </button>
                  <CopyInviteButton inviteCode={teamInfo.invite_code} />
               </div>
            </div>

            <div className="glass-card rounded-3xl border border-[var(--glass-border)] overflow-hidden">
              <div className="grid grid-cols-12 gap-4 p-5 border-b border-black/5 dark:border-white/5 bg-gray-50 dark:bg-white/5 text-[10px] font-extrabold text-[var(--text-secondary)] uppercase tracking-widest">
                <div className="col-span-2 text-center">Rank</div>
                <div className="col-span-6">Developer</div>
                <div className="col-span-4 text-right pr-6">Dependency Score</div>
              </div>

              <div className="divide-y divide-black/5 dark:divide-white/5">
                {members.map((member, index) => (
                  <div key={member.user_id} className={`grid grid-cols-12 gap-4 p-5 items-center transition-all hover:bg-gray-50/50 dark:hover:bg-white/5 ${member.user_id === userId ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                    <div className="col-span-2 flex justify-center">
                      <span className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border
                        ${index === 0 ? 'bg-amber-100/50 dark:bg-amber-500/20 border-amber-300 dark:border-amber-500/50 text-amber-600 dark:text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 
                          index === 1 ? 'bg-slate-100 dark:bg-slate-400/20 border-slate-300 dark:border-slate-400/50 text-slate-600 dark:text-slate-300' : 
                          index === 2 ? 'bg-orange-100 dark:bg-orange-800/20 border-orange-300 dark:border-orange-800/50 text-orange-600 dark:text-orange-400' : 
                          'bg-gray-50 dark:bg-white/5 border-black/5 dark:border-white/10 text-gray-400'}`}
                      >
                        {index + 1}
                      </span>
                    </div>
                    <div className="col-span-6 flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-900 border border-black/5 dark:border-white/10 flex items-center justify-center text-gray-700 dark:text-white font-bold text-lg shadow-sm">
                        {member.name.charAt(0)}
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-bold text-[var(--text-primary)] flex items-center gap-2 truncate">
                           {member.name}
                           {member.user_id === userId && <span className="text-[9px] bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full uppercase tracking-wider border border-blue-200 dark:border-blue-500/30">You</span>}
                           {member.role === 'owner' && <span className="text-[9px] bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full uppercase tracking-wider border border-amber-200 dark:border-amber-500/30">Lead</span>}
                        </p>
                        <p className="text-[10px] text-[var(--text-secondary)] font-mono mt-0.5 truncate opacity-70 dark:opacity-50">{member.user_id}</p>
                      </div>
                    </div>
                    <div className="col-span-4 text-right pr-6">
                      <div className="flex flex-col items-end">
                        <span className={`text-2xl font-black tracking-tighter ${member.score > 70 ? 'text-red-500 dark:text-red-400' : member.score > 40 ? 'text-amber-500 dark:text-amber-400' : member.score > 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-600'}`}>
                          {member.score > 0 ? member.score.toFixed(1) : '—'}
                        </span>
                        {member.score > 0 && <span className="text-[9px] text-gray-400 dark:text-gray-500 uppercase tracking-tighter font-bold">Points</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card p-6 rounded-3xl border border-[var(--glass-border)] bg-gradient-to-br from-white/5 to-transparent">
                    <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-4">Most Improved</p>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">?</div>
                        <div>
                            <p className="font-bold text-[var(--text-primary)]">Calculated Weekly</p>
                            <p className="text-xs text-[var(--text-secondary)]">Greatest score drop</p>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-6 rounded-3xl border border-[var(--glass-border)] bg-gradient-to-br from-white/5 to-transparent">
                    <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-4">Team Average</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-cyan-600 dark:text-cyan-400">
                            {members.filter(m => m.score > 0).length > 0 
                                ? (members.reduce((acc, m) => acc + m.score, 0) / members.filter(m => m.score > 0).length).toFixed(1) 
                                : '0.0'}
                        </span>
                        <span className="text-xs text-gray-500 font-bold">Dependency</span>
                    </div>
                </div>
                <div className="glass-card p-6 rounded-3xl border border-[var(--glass-border)] bg-gradient-to-br from-white/5 to-transparent">
                    <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-4">Refusal Rate</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-purple-600 dark:text-purple-400">12%</span>
                        <span className="text-xs text-gray-500 font-bold">Global Avg</span>
                    </div>
                </div>
            </div>
          </div>
        ) : (
          <div className="text-center p-12 glass-card rounded-3xl border border-[var(--glass-border)] max-w-2xl mx-auto">
            <div className="w-20 h-20 bg-cyan-100 dark:bg-cyan-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-cyan-200 dark:border-cyan-500/20 shadow-sm dark:shadow-[0_0_30px_rgba(6,182,212,0.1)]">
               <svg className="w-10 h-10 text-cyan-600 dark:text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <p className="text-xl font-medium text-[var(--text-primary)] mb-2">Solo Mode Active</p>
            <p className="text-[var(--text-secondary)]">You haven't joined a team yet. Create your own team or join an existing one to compete on AI dependency rankings.</p>
            <div className="mt-8">
              <TeamActions userId={userId} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

