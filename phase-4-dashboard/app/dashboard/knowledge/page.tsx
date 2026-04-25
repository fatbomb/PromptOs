import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import KnowledgeDashboard from '@/components/KnowledgeDashboard';

export default async function KnowledgePage() {
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

  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || '47e886ff-1710-43ac-8b61-78b99e952f5d'; // Dummy fallback

  const { data: concepts } = await supabase
    .from('concept_map')
    .select('*')
    .eq('user_id', userId)
    .order('encounter_count', { ascending: false });

  return (
    <main className="relative min-h-screen pt-12 pb-6 md:pt-24 md:pb-12 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <KnowledgeDashboard concepts={concepts || []} userId={userId} />
      </div>
    </main>
  );
}
