'use client';

import { useState } from 'react';
import QuizModal from '@/components/QuizModal';

interface Concept {
  id: string;
  concept: string;
  encounter_count: number;
  avg_score: number;
  color_band: string;
}

interface Props {
  concepts: Concept[];
}

export default function QuizList({ concepts }: Props) {
  const [activeQuiz, setActiveQuiz] = useState<string | null>(null);

  const getStatusColor = (band: string) => {
    switch (band) {
      case 'green': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'amber': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'red': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  return (
    <div className="w-full animate-fade-in-up">
      {concepts.length === 0 ? (
        <div className="text-center py-24 glass-card rounded-2xl border-dashed border-[var(--glass-border)]">
          <p className="text-xl font-medium text-[var(--text-primary)] mb-2">No Concepts Found</p>
          <p className="text-[var(--text-secondary)]">Interact with AI to build your knowledge map first.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {concepts.map((c) => (
            <div key={c.id} className="glass-card p-6 rounded-2xl hover:shadow-2xl transition-all border-[var(--glass-border)] group">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-[var(--text-primary)] group-hover:text-blue-400 transition-colors">
                  {c.concept}
                </h3>
                <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full border ${getStatusColor(c.color_band)}`}>
                  {c.color_band}
                </span>
              </div>
              
              <div className="flex items-center gap-4 mb-6">
                <div>
                  <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-bold">Encounters</p>
                  <p className="text-lg font-mono text-[var(--text-primary)]">{c.encounter_count}</p>
                </div>
                <div className="w-[1px] h-8 bg-[var(--glass-border)]"></div>
                <div>
                  <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-bold">Avg Score</p>
                  <p className="text-lg font-mono text-[var(--text-primary)]">{c.avg_score.toFixed(1)}%</p>
                </div>
              </div>

              <button 
                onClick={() => setActiveQuiz(c.concept)}
                className="w-full py-3 rounded-xl bg-white/5 hover:bg-blue-600 hover:text-white text-[var(--text-primary)] font-bold border border-white/10 transition-all"
              >
                Start Quiz
              </button>
            </div>
          ))}
        </div>
      )}

      {activeQuiz && (
        <QuizModal concept={activeQuiz} onClose={() => setActiveQuiz(null)} />
      )}
    </div>
  );
}
