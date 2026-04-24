'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

interface Props {
  userId: string;
}

export default function TeamActions({ userId }: Props) {
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleJoin = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Find team by invite code
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('id')
        .eq('invite_code', inviteCode)
        .single();

      if (teamError || !team) {
        throw new Error('Invalid invite code');
      }

      // 2. Join team
      const { error: joinError } = await supabase
        .from('team_members')
        .insert({
          team_id: team.id,
          user_id: userId,
          role: 'member'
        });

      if (joinError) throw joinError;

      router.refresh();
      setIsJoining(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Create team
      const invite_code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { data: team, error: createError } = await supabase
        .from('teams')
        .insert({
          name: teamName,
          invite_code: invite_code
        })
        .select()
        .single();

      if (createError) throw createError;

      // 2. Add as owner
      const { error: joinError } = await supabase
        .from('team_members')
        .insert({
          team_id: team.id,
          user_id: userId,
          role: 'owner'
        });

      if (joinError) throw joinError;

      router.refresh();
      setIsCreating(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex justify-center gap-4">
        <button 
          onClick={() => setIsJoining(true)}
          className="px-6 py-3 rounded-xl bg-cyan-600/10 hover:bg-cyan-600/20 text-cyan-600 dark:text-cyan-400 font-bold transition-all border border-cyan-500/20"
        >
          Join Team
        </button>
        <button 
          onClick={() => setIsCreating(true)}
          className="px-6 py-3 rounded-xl bg-[var(--glass-card-bg)] hover:bg-white/10 text-[var(--text-primary)] font-bold transition-all border border-[var(--glass-border)]"
        >
          Create Team
        </button>
      </div>

      {/* Join Modal */}
      {isJoining && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-md p-4 animate-fade-in-up">
          <div className="w-full max-w-md bg-white dark:bg-[#0f172a] border border-black/5 dark:border-white/5 rounded-3xl p-8 md:p-10 relative shadow-sm dark:shadow-none overflow-hidden text-center">
            
            <button onClick={() => setIsJoining(false)} className="absolute top-6 right-6 text-[var(--text-secondary)] hover:text-red-500 transition-colors p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
               <svg className="w-8 h-8 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>

            <h2 className="text-2xl font-extrabold text-[var(--text-primary)] mb-2 tracking-tight">Join a Team</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-8 font-medium">Enter the 6-digit invite code shared by your team lead.</p>
            
            <input 
              type="text"
              placeholder="INVITE CODE"
              className="w-full bg-[var(--glass-bg)] border border-black/10 dark:border-white/10 rounded-2xl px-4 py-4 text-[var(--text-primary)] font-mono text-center text-2xl tracking-widest focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none mb-4 uppercase transition-all shadow-inner"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            />

            {error && <p className="text-red-500 text-sm mb-4 bg-red-500/5 py-2 rounded-lg border border-red-500/10 font-bold">{error}</p>}

            <button 
              onClick={handleJoin}
              disabled={loading || inviteCode.length < 6}
              className="w-full py-4 rounded-xl bg-gray-100 dark:bg-white/5 text-[var(--text-primary)] hover:text-white font-bold transition-all duration-200 ease-out shadow-sm hover:shadow-[0_8px_30px_rgba(99,102,241,0.4)] tracking-widest uppercase text-sm mt-4 border border-black/5 dark:border-white/10 hover:border-transparent hover:bg-gradient-to-r hover:from-indigo-500 hover:via-purple-500 hover:to-blue-500 hover:animate-gradient-x active:scale-[0.97] active:shadow-inner disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {loading ? 'Joining Nexus...' : 'Join Now'}
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-md p-4 animate-fade-in-up">
          <div className="w-full max-w-md bg-white dark:bg-[#0f172a] border border-black/5 dark:border-white/5 rounded-3xl p-8 md:p-10 relative shadow-sm dark:shadow-none overflow-hidden text-center">
            
            <button onClick={() => setIsCreating(false)} className="absolute top-6 right-6 text-[var(--text-secondary)] hover:text-red-500 transition-colors p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
               <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            </div>

            <h2 className="text-2xl font-extrabold text-[var(--text-primary)] mb-2 tracking-tight">Create New Team</h2>
            <p className="text-[var(--text-secondary)] text-sm mb-8 font-medium">Give your team a name to start the automated leaderboard.</p>
            
            <input 
              type="text"
              placeholder="Team Name (e.g. Engineering Alpha)"
              className="w-full bg-[var(--glass-bg)] border border-black/10 dark:border-white/10 rounded-2xl px-6 py-4 text-[var(--text-primary)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none mb-4 transition-all shadow-inner font-medium text-center"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />

            {error && <p className="text-red-500 text-sm mb-4 bg-red-500/5 py-2 rounded-lg border border-red-500/10 font-bold">{error}</p>}

            <button 
              onClick={handleCreate}
              disabled={loading || teamName.length < 3}
              className="w-full py-4 rounded-xl bg-gray-100 dark:bg-white/5 text-[var(--text-primary)] hover:text-white font-bold transition-all duration-200 ease-out shadow-sm hover:shadow-[0_8px_30px_rgba(99,102,241,0.4)] tracking-widest uppercase text-sm mt-4 border border-black/5 dark:border-white/10 hover:border-transparent hover:bg-gradient-to-r hover:from-indigo-500 hover:via-purple-500 hover:to-blue-500 hover:animate-gradient-x active:scale-[0.97] active:shadow-inner disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {loading ? 'Initializing...' : 'Create Team'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
