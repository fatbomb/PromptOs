'use client';

import { useState } from 'react';
import KnowledgeMap from '@/components/KnowledgeMap';
import QuizModal from '@/components/QuizModal';

interface Props {
  concepts: any[];
  userId: string;
}

export default function KnowledgeDashboard({ concepts, userId }: Props) {
  const [activeQuiz, setActiveQuiz] = useState<string | null>(null);

  return (
    <div className="relative z-10 w-full animate-fade-in-up">
      <header className="mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400">
            Knowledge Map
          </span>
        </h1>
        <p className="text-[var(--text-secondary)] font-medium tracking-wide">
          Visualize your conceptual gaps and remediate them systematically.
        </p>
      </header>

      {concepts && concepts.length > 0 ? (
        <KnowledgeMap data={concepts} onConceptClick={(concept) => setActiveQuiz(concept)} />
      ) : (
        <div className="text-center py-24 glass-card rounded-2xl border-dashed border-[var(--glass-border)]">
          <p className="text-xl font-medium text-[var(--text-primary)] mb-2">Map is Empty</p>
          <p className="text-[var(--text-secondary)]">Run a few AI sessions first to plot your knowledge.</p>
        </div>
      )}

      {activeQuiz && (
        <QuizModal 
          concept={activeQuiz} 
          userId={userId}
          onClose={() => setActiveQuiz(null)} 
        />
      )}
    </div>
  );
}
