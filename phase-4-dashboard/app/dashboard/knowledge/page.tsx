import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import KnowledgeMap from '@/components/KnowledgeMap';

/**
 * Knowledge Map Page — Phase 4, Task 4.3
 *
 * Renders the concept bubble chart.
 * Each bubble = one concept. Size = encounter_count. Color = color_band.
 * Click bubble → opens quiz modal.
 *
 * Progressive reveal: only shown after 5+ sessions.
 */
export default async function KnowledgePage() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: concepts } = await supabase
    .from('concept_map')
    .select('*')
    .eq('user_id', user.id)
    .order('encounter_count', { ascending: false });

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-2">Knowledge Map</h1>
      <p className="text-gray-400 mb-8">
        Concepts you keep asking about. Bigger = more frequent. Click to quiz yourself.
      </p>
      {concepts && concepts.length > 0 ? (
        <KnowledgeMap concepts={concepts} />
      ) : (
        <p className="text-gray-500 text-center py-20">
          Run 5+ sessions to unlock your Knowledge Map.
        </p>
      )}
    </main>
  );
}
