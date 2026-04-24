'use client';

import { useState } from 'react';

interface Props {
  score: number;
  sessionId?: string;
}

export default function AISelfAwarenessCard({ score, sessionId }: Props) {
  const [isCopied, setIsCopied] = useState(false);

  // Color logic
  let color = 'text-gray-400';
  let strokeColor = '#9CA3AF'; // gray-400
  let label = 'Awaiting Data';
  
  if (score > 0) {
    if (score < 40) {
      color = 'text-red-500';
      strokeColor = '#EF4444';
      label = 'Low';
    } else if (score <= 70) {
      color = 'text-amber-500';
      strokeColor = '#F59E0B';
      label = 'Average';
    } else {
      color = 'text-green-500';
      strokeColor = '#10B981';
      label = 'Exceptional';
    }
  }

  const handleShare = async () => {
    if (!sessionId) return;
    const shareUrl = `${window.location.origin}/share/${sessionId}`;
    await navigator.clipboard.writeText(shareUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Calculate SVG arc
  const radius = 60;
  const circumference = Math.PI * radius; // Half circle
  const fillPercentage = score > 0 ? score : 0;
  const strokeDashoffset = circumference - (fillPercentage / 100) * circumference;

  return (
    <div className="glass-card p-6 rounded-2xl border-[var(--glass-border)] flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-b from-white/5 to-transparent">
      {/* Background glow based on score */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[150px] h-[150px] blur-[60px] opacity-20 pointer-events-none rounded-full"
        style={{ backgroundColor: strokeColor }}
      ></div>

      <div className="flex w-full justify-between items-start mb-2 relative z-10">
        <div>
          <h3 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">AI Self-Awareness</h3>
          <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest font-bold">Latest Session</p>
        </div>
        {sessionId && (
          <button 
            onClick={handleShare}
            className="px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-bold transition-colors border border-blue-500/20 flex items-center gap-1.5"
          >
            {isCopied ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Copied Link
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                Share
              </>
            )}
          </button>
        )}
      </div>

      {/* Radial Gauge */}
      <div className="relative w-40 h-24 mt-6 flex flex-col items-center justify-end z-10">
        <svg className="absolute top-0 left-0 w-full h-full overflow-visible" viewBox="0 0 140 70">
          {/* Background Arc */}
          <path
            d="M 10 70 A 60 60 0 0 1 130 70"
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Foreground Arc */}
          <path
            d="M 10 70 A 60 60 0 0 1 130 70"
            fill="none"
            stroke={strokeColor}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute bottom-[-5px] flex flex-col items-center">
          <span className={`text-4xl font-black tracking-tighter ${color}`}>
            {score > 0 ? score : '--'}
          </span>
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</span>
        </div>
      </div>
    </div>
  );
}
