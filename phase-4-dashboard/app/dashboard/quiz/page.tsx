import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import QuizList from '@/components/QuizList';

export default async function QuizPage() {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  const userId = user?.id || '47e886ff-1710-43ac-8b61-78b99e952f5d'; // Dummy fallback

  const { data: concepts } = await supabase
    .from('concept_map')
    .select('*')
    .eq('user_id', userId)
    .order('encounter_count', { ascending: false });

  return (
    <main className="relative min-h-screen p-6 md:p-12 overflow-hidden">
      <div className="max-w-7xl mx-auto relative z-10">
        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
              Remediation Quizzes
            </span>
          </h1>
          <p className="text-[var(--text-secondary)] font-medium tracking-wide">
            Test your knowledge on key concepts and improve your AI independence.
          </p>
        </header>

        <QuizList concepts={concepts || []} userId={userId} />
      </div>
    </main>
  );
}
