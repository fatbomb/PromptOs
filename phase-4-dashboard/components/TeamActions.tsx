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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-panel w-full max-w-md rounded-3xl p-8 relative shadow-2xl border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-4">Join a Team</h2>
            <p className="text-gray-400 mb-6">Enter the 6-digit invite code shared by your team lead.</p>
            
            <input 
              type="text"
              placeholder="INVITE CODE"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-center text-2xl tracking-widest focus:border-cyan-500 focus:outline-none mb-4"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            />

            {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

            <div className="flex gap-3">
              <button 
                onClick={() => setIsJoining(false)}
                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleJoin}
                disabled={loading || inviteCode.length < 6}
                className="flex-1 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all disabled:opacity-50"
              >
                {loading ? 'Joining...' : 'Join Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-panel w-full max-w-md rounded-3xl p-8 relative shadow-2xl border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-4">Create New Team</h2>
            <p className="text-gray-400 mb-6">Give your team a name to start the leaderboard.</p>
            
            <input 
              type="text"
              placeholder="Team Name (e.g. Engineering Alpha)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:outline-none mb-4"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />

            {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

            <div className="flex gap-3">
              <button 
                onClick={() => setIsCreating(false)}
                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreate}
                disabled={loading || teamName.length < 3}
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Team'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
