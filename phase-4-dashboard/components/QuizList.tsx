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
  userId: string;
}

export default function QuizList({ concepts, userId }: Props) {
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
    <>
      <div className="w-full animate-fade-in-up">
        {concepts.length === 0 ? (
          <div className="w-full max-w-md mx-auto text-center p-12 bg-white dark:bg-[#0f172a] rounded-3xl border border-black/5 dark:border-white/5 shadow-sm dark:shadow-none">
            <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
            </div>
            <p className="text-xl font-extrabold text-[var(--text-primary)] mb-2">No Concepts Found</p>
            <p className="text-[var(--text-secondary)] font-medium">Interact with AI to build your knowledge map first.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {concepts.map((c) => (
              <div key={c.id} className="bg-white dark:bg-[#0f172a] p-8 rounded-3xl hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.4)] transition-all duration-300 border border-black/5 dark:border-white/5 group flex flex-col h-full">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-xl font-extrabold text-[var(--text-primary)] group-hover:text-blue-500 transition-colors line-clamp-2">
                    {c.concept}
                  </h3>
                  <span className={`flex-shrink-0 ml-4 text-[10px] uppercase font-black tracking-wider px-3 py-1.5 rounded-full border ${getStatusColor(c.color_band)}`}>
                    {c.color_band}
                  </span>
                </div>
                
                <div className="flex items-center gap-6 mb-8 flex-1">
                  <div>
                    <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest font-black mb-1">Encounters</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{c.encounter_count}</p>
                  </div>
                  <div className="w-px h-10 bg-black/10 dark:bg-white/10"></div>
                  <div>
                    <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest font-black mb-1">Avg Score</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{c.avg_score.toFixed(1)}%</p>
                  </div>
                </div>

                <button 
                  onClick={() => setActiveQuiz(c.concept)}
                  className="w-full py-4 rounded-xl bg-gray-100 dark:bg-white/5 text-[var(--text-primary)] hover:text-white font-bold transition-all duration-200 ease-out shadow-sm hover:shadow-[0_8px_30px_rgba(99,102,241,0.4)] tracking-wide uppercase text-sm border border-black/5 dark:border-white/10 hover:border-transparent hover:bg-gradient-to-r hover:from-indigo-500 hover:via-purple-500 hover:to-blue-500 hover:animate-gradient-x active:scale-[0.97] active:shadow-inner"
                >
                  Start Quiz
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {activeQuiz && (
        <QuizModal 
          concept={activeQuiz} 
          userId={userId}
          onClose={() => setActiveQuiz(null)} 
        />
      )}
    </>
  );
}
