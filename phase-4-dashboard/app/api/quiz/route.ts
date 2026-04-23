import { NextRequest, NextResponse } from 'next/server';
import { generateQuizQuestions } from '@/lib/gemini';

/**
 * Quiz API Route — Phase 4, Task 4.4
 *
 * POST /api/quiz
 * Body: { concept: string }
 * Returns: { questions: [{q, options, correct_index}] }
 *
 * Generates 3 MCQ questions via Gemini Flash for the given concept.
 */
export async function POST(request: NextRequest) {
  const { concept } = await request.json();

  if (!concept) {
    return NextResponse.json({ error: 'concept is required' }, { status: 400 });
  }

  try {
    const questions = await generateQuizQuestions(concept);
    return NextResponse.json({ questions });
  } catch (err) {
    console.error('[quiz] Gemini error:', err);
    return NextResponse.json({ error: 'Failed to generate quiz' }, { status: 500 });
  }
}
