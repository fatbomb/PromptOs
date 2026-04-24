import { ImageResponse } from '@vercel/og';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: { session_id: string } }
) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookies().getAll(),
          setAll: () => {},
        },
      }
    );

    const { data: session } = await supabase
      .from('sessions')
      .select('ai_self_awareness_score, raw_token_count, assembled_token_count')
      .eq('id', params.session_id)
      .single();

    if (!session) {
      return new Response('Not found', { status: 404 });
    }

    const score = session.ai_self_awareness_score || 0;
    
    // Determine color based on score
    let color = '#9CA3AF'; // gray
    let label = 'Awaiting Data';
    if (score > 0) {
      if (score < 40) { color = '#EF4444'; label = 'Low'; } // red
      else if (score <= 70) { color = '#F59E0B'; label = 'Average'; } // amber
      else { color = '#10B981'; label = 'Exceptional'; } // green
    }

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#030712', // gray-950
            backgroundImage: 'radial-gradient(circle at 50% -20%, #1e1b4b 0%, #030712 60%)',
            color: 'white',
            fontFamily: 'sans-serif',
            padding: '40px',
          }}
        >
          {/* Logo / Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'absolute', top: '40px', left: '40px' }}>
            <div style={{ background: '#3b82f6', width: '32px', height: '32px', borderRadius: '8px' }}></div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#e5e7eb' }}>PromptOS</div>
          </div>

          {/* Main Content */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '40px' }}>
            <div style={{ fontSize: '24px', textTransform: 'uppercase', letterSpacing: '4px', color: '#9ca3af', marginBottom: '20px' }}>
              AI Self-Awareness
            </div>
            
            {/* Score */}
            <div style={{ 
              fontSize: '160px', 
              fontWeight: 900, 
              color: color,
              lineHeight: 1,
              textShadow: `0 0 80px ${color}40`
            }}>
              {score}
              <span style={{ fontSize: '60px', color: '#6b7280' }}>/100</span>
            </div>
            
            <div style={{ fontSize: '36px', fontWeight: 600, color: color, marginTop: '10px' }}>
              {label}
            </div>
          </div>

          {/* Footer Stats */}
          <div style={{ 
            display: 'flex', 
            gap: '80px', 
            position: 'absolute', 
            bottom: '60px',
            backgroundColor: 'rgba(255,255,255,0.05)',
            padding: '24px 48px',
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '18px', color: '#9ca3af', marginBottom: '8px' }}>Raw Prompt</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{session.raw_token_count} <span style={{fontSize: '20px', color: '#6b7280'}}>tokens</span></div>
            </div>
            <div style={{ width: '2px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '18px', color: '#9ca3af', marginBottom: '8px' }}>Assembled Prompt</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{session.assembled_token_count} <span style={{fontSize: '20px', color: '#6b7280'}}>tokens</span></div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    return new Response(`Failed to generate image`, { status: 500 });
  }
}
