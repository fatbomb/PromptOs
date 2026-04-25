/**
 * SessionTable Component — Phase 4, Task 4.2
 *
 * Renders the session history list utilizing a modern row layout.
 */

interface Session {
  id: string;
  created_at: string;
  raw_prompt: string;
  raw_token_count: number;
  assembled_token_count: number;
  token_efficiency_score: number;
  thinking_depth_score: number;
  dependency_score: number;
  source: string;
  was_refused: boolean;
  raw_specificity_score?: number;
  quality_delta?: number;
}

interface Props {
  sessions: Session[];
}

const sourceIcon: Record<string, JSX.Element> = {
  cli: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  vscode: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
  browser_extension: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export default function SessionTable({ sessions }: Props) {
  const getScoreColor = (score: number, inverse: boolean = false) => {
    // For dependency score, lower is better (inverse = true)
    // For depth score, higher is better (inverse = false)
    if (inverse) {
      if (score <= 40) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      if (score <= 70) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    } else {
      if (score >= 70) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      if (score >= 40) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {sessions.map((s, idx) => (
        <div 
          key={s.id} 
          className="glass-card rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[var(--glass-border)] hover:border-blue-500/30 hover:bg-[var(--glass-card-bg)] transition-all cursor-default"
        >
          {/* Left section: Prompt and Metadata */}
          <div className="flex-1 min-w-0 flex items-start gap-3">
             <div className="hidden sm:flex mt-1 p-2 rounded-lg bg-[var(--glass-card-bg)] text-[var(--text-secondary)] border border-[var(--glass-border)]">
               {sourceIcon[s.source] || sourceIcon.cli}
             </div>
             <div className="flex-1 min-w-0">
               <div className="flex items-center gap-2 mb-1">
                 {s.was_refused && (
                   <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-amber-500/20 text-amber-600 dark:text-amber-500 border border-amber-500/20">Refused</span>
                 )}
                 <p className="text-[var(--text-primary)] font-medium truncate text-base">{s.raw_prompt}</p>
               </div>
               <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] font-medium">
                  <span className="capitalize">{s.source.replace('_', ' ')}</span>
                  <span>•</span>
                  <span>{new Date(s.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
               </div>
             </div>
          </div>

          {/* Right section: Metrics */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            
            <div className="flex flex-col items-end px-3 py-1.5 rounded-lg bg-[var(--glass-card-bg)] border border-[var(--glass-border)]">
               <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-secondary)] mb-0.5">Tokens</span>
               <div className="flex items-center gap-2 text-sm">
                  <span className="text-[var(--text-secondary)]">{s.raw_token_count}</span>
                  <svg className="w-3 h-3 text-gray-400 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{s.assembled_token_count}</span>
               </div>
            </div>

            {s.quality_delta !== undefined && (
              <div className={`px-3 py-1.5 rounded-lg border flex flex-col items-center justify-center min-w-[70px] ${s.quality_delta > 0 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : s.quality_delta < 0 ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-gray-400 bg-gray-500/10 border-gray-500/20'}`}>
                <span className="text-[10px] uppercase font-bold opacity-80">Delta</span>
                <span className="text-lg font-bold">{s.quality_delta > 0 ? `+${s.quality_delta}` : s.quality_delta} ✦</span>
              </div>
            )}

            <div className={`px-3 py-1.5 rounded-lg border flex flex-col items-center justify-center min-w-[70px] ${getScoreColor(s.thinking_depth_score, false)}`}>
              <span className="text-[10px] uppercase font-bold opacity-80">Depth</span>
              <span className="text-lg font-bold">{s.thinking_depth_score}</span>
            </div>

            <div className={`px-3 py-1.5 rounded-lg border flex flex-col items-center justify-center min-w-[70px] ${getScoreColor(s.dependency_score, true)}`}>
              <span className="text-[10px] uppercase font-bold opacity-80">Dep.</span>
              <span className="text-lg font-bold">{s.dependency_score}</span>
            </div>

          </div>
        </div>
      ))}
    </div>
  );
}
