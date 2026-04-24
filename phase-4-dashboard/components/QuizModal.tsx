'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Question {
  q: string;
  options: string[];
  correct_index: number;
}

interface Props {
  concept: string;
  userId: string;
  onClose: () => void;
}

export default function QuizModal({ concept, userId, onClose }: Props) {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    async function loadQuiz() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/quiz/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ concept }),
        });
        const data = await res.json();
        if (data.questions) {
          setQuestions(data.questions);
        }
      } catch (err) {
        console.error('Failed to load quiz:', err);
      } finally {
        setLoading(false);
      }
    }
    loadQuiz();
  }, [concept]);

  const submitResult = async (finalScore: number) => {
    setSubmitting(true);
    try {
      const percentage = (finalScore / questions.length) * 100;
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/quiz/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          concept: concept,
          score: percentage
        }),
      });
      router.refresh();
    } catch (err) {
      console.error('Failed to submit quiz:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    const isCorrect = selected === questions[currentIdx].correct_index;
    const newScore = isCorrect ? score + 1 : score;
    
    if (isCorrect) {
      setScore(newScore);
    }
    
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setSelected(null);
    } else {
      setFinished(true);
      submitResult(newScore);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-md p-4 animate-fade-in-up">
        <div className="w-full max-w-sm bg-white dark:bg-[#0f172a] border border-black/5 dark:border-white/5 rounded-3xl p-10 relative shadow-sm dark:shadow-none overflow-hidden text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
             <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping delay-150"></div>
             <div className="absolute inset-0 bg-purple-500/20 rounded-full animate-ping delay-300"></div>
             <div className="h-16 w-16 rounded-full border-4 border-black/5 dark:border-white/5 border-t-blue-500 animate-spin relative z-10"></div>
          </div>
          <h3 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight mb-2">Generating Quiz...</h3>
          <p className="text-sm text-[var(--text-secondary)] font-medium">Synthesizing personalized AI remediation module for <span className="font-bold text-[var(--text-primary)]">{concept}</span>.</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-md p-4 animate-fade-in-up">
        <div className="w-full max-w-sm bg-white dark:bg-[#0f172a] border border-red-500/20 rounded-3xl p-10 relative shadow-sm dark:shadow-none overflow-hidden text-center">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </div>
          <h3 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight mb-2">Generation Failed</h3>
          <p className="text-sm text-[var(--text-secondary)] font-medium mb-8">Unable to synthesize a quiz for this concept.</p>
          <button onClick={onClose} className="w-full py-3.5 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-[var(--text-primary)] font-bold transition-all text-sm uppercase tracking-wide">
            Close Module
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-md p-4 animate-fade-in-up">
      <div className="w-full max-w-2xl bg-white dark:bg-[#0f172a] border border-black/5 dark:border-white/5 rounded-3xl p-8 md:p-10 relative shadow-sm dark:shadow-none overflow-hidden">
        
        <button onClick={onClose} className="absolute top-6 right-6 text-[var(--text-secondary)] hover:text-red-500 transition-colors p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {!finished ? (
          <div className="relative z-10">
            <div className="mb-8 text-center md:text-left">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/5 text-amber-600 dark:text-amber-400 border border-amber-500/10 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                Remediation Module
              </span>
              <h2 className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight mb-2">
                {concept} Base
              </h2>
              <div className="flex items-center justify-center md:justify-start gap-3 mt-3">
                <div className="flex-1 max-w-[200px] h-1.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                    style={{ width: `${((currentIdx) / questions.length) * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs font-bold text-[var(--text-secondary)] tracking-widest uppercase">
                  Q{currentIdx + 1} <span className="opacity-50">/ {questions.length}</span>
                </p>
              </div>
            </div>

            <div className="mb-10">
              <p className="text-xl md:text-2xl font-medium text-[var(--text-primary)] leading-relaxed mb-8">
                {questions[currentIdx].q}
              </p>
              
              <div className="space-y-4">
                {questions[currentIdx].options.map((opt, i) => {
                  const letter = String.fromCharCode(65 + i); // A, B, C, D
                  return (
                    <button
                      key={i}
                      onClick={() => setSelected(i)}
                      className={`group w-full flex items-center text-left p-4 rounded-2xl border transition-all duration-300 ${
                        selected === i 
                          ? 'border-blue-500/50 bg-blue-50/50 dark:bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/20' 
                          : 'border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 hover:border-gray-300 dark:hover:bg-white/10 dark:hover:border-white/20'
                      }`}
                    >
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mr-4 transition-colors ${
                        selected === i 
                          ? 'bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-md' 
                          : 'bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] group-hover:bg-black/10 dark:group-hover:bg-white/10'
                      }`}>
                        {letter}
                      </div>
                      <span className={`text-sm md:text-base font-medium transition-colors ${
                        selected === i ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
                      }`}>
                        {opt}
                      </span>
                      
                      {selected === i && (
                        <svg className="w-5 h-5 ml-auto text-blue-500 drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleNext}
              disabled={selected === null || submitting}
              className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-sm font-bold tracking-[0.1em] uppercase rounded-2xl text-white bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 animate-gradient-x focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-900 disabled:opacity-50 transition-all overflow-hidden shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_35px_rgba(168,85,247,0.4)]"
            >
              <span className="relative z-10 transition-transform group-hover:scale-[1.02]">
                {submitting ? 'SYNCING DATA...' : (currentIdx === questions.length - 1 ? 'FINALIZE & SUBMIT' : 'PROCEED TO NEXT')}
              </span>
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>
          </div>
        ) : (
          <div className="text-center py-10">
            <div className="relative w-24 h-24 mx-auto mb-8">
              <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping"></div>
              <div className="relative w-full h-full bg-[var(--glass-card-bg)] border border-emerald-500/50 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                 <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
            </div>
            <h2 className="text-4xl font-extrabold text-[var(--text-primary)] mb-4 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
              Module Complete
            </h2>
            <p className="text-[var(--text-secondary)] text-lg mb-10 font-medium">
              You scored <span className="text-[var(--text-primary)] font-bold">{score}/{questions.length}</span> on the <span className="font-bold">{concept}</span> evaluation.
            </p>
            <button onClick={onClose} className="group relative w-full max-w-xs mx-auto flex justify-center py-4 px-4 border border-white/10 dark:border-white/5 text-sm font-bold tracking-[0.1em] uppercase rounded-2xl text-[var(--text-primary)] bg-[var(--glass-bg)] hover:bg-[var(--glass-card-bg)] transition-all overflow-hidden shadow-sm hover:shadow-md">
              <span className="relative z-10">Return to Nexus</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
