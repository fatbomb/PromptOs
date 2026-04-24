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
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in-up">
        <div className="glass-panel w-full max-w-lg rounded-3xl p-8 relative shadow-2xl border border-white/10 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-[var(--text-secondary)]">Generating AI Remediation Quiz...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in-up">
        <div className="glass-panel w-full max-w-lg rounded-3xl p-8 relative shadow-2xl border border-white/10 text-center">
          <p className="text-red-500 mb-4">Failed to generate quiz for this concept.</p>
          <button onClick={onClose} className="px-6 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in-up">
      <div className="glass-panel w-full max-w-lg rounded-3xl p-8 relative shadow-2xl border border-white/10">
        
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {!finished ? (
          <div>
            <div className="mb-6">
              <span className="text-xs font-bold text-amber-500 uppercase tracking-widest border border-amber-500/30 bg-amber-500/10 px-3 py-1 rounded-full mb-4 inline-block">Remediation Module Active</span>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mt-2">Knowledge Quiz: {concept}</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">Question {currentIdx + 1} of {questions.length}</p>
            </div>

            <div className="mb-8">
              <p className="text-lg font-medium text-[var(--text-primary)] mb-6">{questions[currentIdx].q}</p>
              
              <div className="space-y-3">
                {questions[currentIdx].options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => setSelected(i)}
                    className={`w-full text-left px-5 py-4 rounded-xl border transition-all ${
                      selected === i 
                        ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
                        : 'border-[var(--glass-border)] hover:border-gray-400 bg-[var(--glass-card-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleNext}
              disabled={selected === null || submitting}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving Results...' : (currentIdx === questions.length - 1 ? 'Submit Answers' : 'Next Question')}
            </button>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-emerald-500/20 border border-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
               <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-3xl font-extrabold text-white mb-2">Module Complete</h2>
            <p className="text-gray-400 mb-8">You scored {score}/{questions.length} on the {concept} concept test.</p>
            <button onClick={onClose} className="px-8 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all border border-white/10">Return to Dashboard</button>
          </div>
        )}
      </div>
    </div>
  );
}
