'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import TeamActions from './TeamActions';

interface Team {
  id: string;
  name: string;
}

interface Props {
  teams: Team[];
  activeTeamId: string;
  userId: string;
}

export default function TeamSelector({ teams, activeTeamId, userId }: Props) {
  const router = useRouter();
  const [showActions, setShowActions] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Switch Team</label>
      <div className="flex gap-2">
        <select 
          value={activeTeamId}
          onChange={(e) => {
            router.push(`/dashboard/team?teamId=${e.target.value}`);
          }}
          className="bg-[var(--glass-bg)] border border-black/10 dark:border-white/10 rounded-xl px-4 py-2 text-[var(--text-primary)] font-bold text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none min-w-[200px] appearance-none cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-all shadow-inner"
          style={{ 
            backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'currentColor\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', 
            backgroundRepeat: 'no-repeat', 
            backgroundPosition: 'right 0.75rem center', 
            backgroundSize: '1rem' 
          }}
        >
          {teams.map(t => (
            <option key={t.id} value={t.id} className="bg-white dark:bg-slate-900 text-black dark:text-white">
              {t.name}
            </option>
          ))}
        </select>
        
        <button 
          onClick={() => setShowActions(true)}
          className="w-10 h-10 rounded-xl bg-[var(--glass-bg)] border border-black/10 dark:border-white/10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 transition-all text-[var(--text-secondary)] hover:text-cyan-500"
          title="Add Team"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
      </div>

      {/* Action Modal */}
      {showActions && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in-up bg-black/50 backdrop-blur-md">
          <div 
            className="absolute inset-0" 
            onClick={() => setShowActions(false)}
          ></div>
          
          <div className="w-full max-w-lg bg-white dark:bg-[#0f172a] border border-black/5 dark:border-white/5 rounded-3xl p-10 relative shadow-2xl overflow-hidden text-center animate-scale-up">
            <button 
              onClick={() => setShowActions(false)}
              className="absolute top-6 right-6 text-[var(--text-secondary)] hover:text-red-500 transition-colors p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-10">
              <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-extrabold text-[var(--text-primary)] mb-2 tracking-tight">Add Team</h2>
              <p className="text-sm text-[var(--text-secondary)] font-medium max-w-sm mx-auto">
                Join a new team via invite code or create a brand new leaderboard for your group.
              </p>
            </div>

            <TeamActions userId={userId} />
          </div>
        </div>
      )}
    </div>
  );
}

