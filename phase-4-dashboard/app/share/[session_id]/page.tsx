import { Metadata, ResolvingMetadata } from 'next';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import AISelfAwarenessCard from '@/components/AISelfAwarenessCard';

type Props = {
  params: { session_id: string }
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const session_id = params.session_id;
  
  // Base URL for absolute OG image paths
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://prompt-os-dashboard.vercel.app';
  const imageUrl = `${baseUrl}/api/share/${session_id}`;

  return {
    title: 'My AI Self-Awareness Score | PromptOS',
    description: 'Check out my PromptOS AI Self-Awareness score. Are you writing good prompts or just getting lucky?',
    openGraph: {
      title: 'My AI Self-Awareness Score | PromptOS',
      description: 'Are you writing good prompts or just getting lucky?',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: 'AI Self-Awareness Score',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'My AI Self-Awareness Score | PromptOS',
      description: 'Are you writing good prompts or just getting lucky?',
      images: [imageUrl],
    },
  };
}

export default async function SharePage({ params }: Props) {
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

  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', params.session_id)
    .single();

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030712] text-white">
        <h1 className="text-2xl font-bold">Session not found</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-[#030712] to-[#030712]">
      <div className="w-full max-w-md text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-8 h-8 rounded bg-blue-500"></div>
          <h1 className="text-2xl font-bold text-white tracking-tight">PromptOS</h1>
        </div>
        <h2 className="text-3xl font-extrabold text-white mb-2">Here is my score.</h2>
        <p className="text-gray-400">Can you beat it?</p>
      </div>

      <div className="w-full max-w-md transform scale-110">
        <AISelfAwarenessCard score={session.ai_self_awareness_score || 0} />
      </div>

      <div className="mt-16 text-center">
        <a 
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-black font-bold hover:bg-gray-200 transition-colors"
        >
          Get Your Score
        </a>
      </div>
    </div>
  );
}
