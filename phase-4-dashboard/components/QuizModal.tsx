'use client';

/**
 * QuizModal Component — Phase 4, Task 4.4
 *
 * Shown when a user clicks an amber/red bubble in the Knowledge Map.
 * Fetches 3 MCQ questions from /api/quiz, renders them, and on submit:
 *   - Calculates score
 *   - Saves attempt to quiz_attempts table
 *   - Updates concept_map avg_score
 *   - Shows streak counter
 */

import { useState, useEffect } from 'react';

interface Question {
  q: string;
  options: string[];
  correct_index: number;
}

interface Props {
  concept: string;
  onClose: () => void;
}

export default function QuizModal({ concept, onClose }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers]     = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore]         = useState<number | null>(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    fetch('/api/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ concept }),
    })
      .then((r) => r.json())
      .then((data) => { setQuestions(data.questions ?? []); setLoading(false); });
  }, [concept]);

  const handleSubmit = () => {
    const correct = questions.filter((q, i) => answers[i] === q.correct_index).length;
    const pct = Math.round((correct / questions.length) * 100);
    setScore(pct);
    setSubmitted(true);
    // TODO: save to quiz_attempts and update concept_map via Supabase
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-lg p-8 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Quiz: {concept}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        {loading && <p className="text-gray-400">Generating questions...</p>}

        {!loading && !submitted && questions.map((q, qi) => (
          <div key={qi} className="mb-6">
            <p className="font-medium mb-3">{qi + 1}. {q.q}</p>
            <div className="space-y-2">
              {q.options.map((opt, oi) => (
                <button
                  key={oi}
                  onClick={() => setAnswers((prev) => { const a = [...prev]; a[qi] = oi; return a; })}
                  className={`w-full text-left px-4 py-2 rounded-lg border transition-colors ${
                    answers[qi] === oi
                      ? 'border-blue-500 bg-blue-500/20'
                      : 'border-gray-700 hover:border-gray-500'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}

        {!submitted && !loading && (
          <button
            onClick={handleSubmit}
            disabled={answers.length < questions.length}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 px-4 py-3 rounded-xl font-semibold transition-colors"
          >
            Submit Answers
          </button>
        )}

        {submitted && score !== null && (
          <div className="text-center py-4">
            <p className="text-5xl font-bold mb-2">{score}%</p>
            <p className={score >= 70 ? 'text-green-400' : score >= 40 ? 'text-amber-400' : 'text-red-400'}>
              {score >= 70 ? '✅ Concept mastered' : score >= 40 ? '📚 Keep practising' : '🔴 Needs review'}
            </p>
            <button onClick={onClose} className="mt-6 text-gray-400 hover:text-white underline text-sm">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
