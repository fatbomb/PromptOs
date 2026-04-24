/**
 * VS Code Webview React App — PromptOS Copilot
 *
 * State machine:
 *   login → loginPolling → idle → loading → asking → complete → sent | refused
 *
 * Auth: sends 'ready' on mount, receives 'authState' from host.
 * If not logged in → shows login screen.
 */

import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const vscode = (window as any).acquireVsCodeApi?.();

type Phase = 'login' | 'loginPolling' | 'loginTimeout' | 'idle' | 'loading' | 'asking' | 'refused' | 'complete' | 'sent';

interface Scores {
  token_efficiency_score: number;
  thinking_depth_score: number;
  dependency_score: number;
  estimated_turns_saved: number;
}

// ── Design tokens ──────────────────────────────────────────────────────────
const C = {
  primary:   'var(--vscode-button-background)',
  primaryHover: 'var(--vscode-button-hoverBackground)',
  secondary: 'var(--vscode-textLink-foreground, #4EA1FF)',
  accent:    'var(--vscode-testing-iconPassed, #4CAF50)',
  warning:   '#F59E0B',
  danger:    '#EF4444',
  muted:     'var(--vscode-descriptionForeground, #9AA0A6)',
  surface:   'var(--vscode-input-background)',
  panel:     'var(--vscode-editorWidget-background, var(--vscode-sideBar-background))',
  border:    'var(--vscode-input-border, #313244)',
  text:      'var(--vscode-editor-foreground)',
  btnText:   'var(--vscode-button-foreground)',
  font:      'var(--vscode-font-family)',
};

const S: Record<string, React.CSSProperties> = {
  root: {
    padding: '12px',
    fontFamily: C.font,
    color: C.text,
    fontSize: 13,
    minHeight: '100vh',
    boxSizing: 'border-box',
    background: 'var(--vscode-sideBar-background)',
  },
  shell: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    maxWidth: 360,
    margin: '0 auto',
    background: C.panel,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: 12,
  },
  logo: {
    fontSize: 16,
    fontWeight: 700,
    color: C.text,
    letterSpacing: '-0.02em',
  },
  divider: {
    height: 1,
    background: 'var(--vscode-panel-border, var(--vscode-input-border, #313244))',
  },
  sectionTitle: {
    fontSize: 10,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontWeight: 600,
    marginBottom: 6,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 999,
    background: 'var(--vscode-scrollbarSlider-background, rgba(122,122,122,0.2))',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    background: C.primary,
    transition: 'width 160ms ease',
  },
  textarea: {
    width: '100%',
    boxSizing: 'border-box',
    background: C.surface,
    color: C.text,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 13,
    fontFamily: C.font,
    resize: 'vertical' as const,
    outline: 'none',
    lineHeight: 1.5,
    minHeight: 80,
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    background: C.surface,
    color: C.text,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 13,
    fontFamily: C.font,
    outline: 'none',
  },
  btnPrimary: {
    width: '100%',
    padding: '10px 12px',
    background: C.primary,
    color: C.btnText,
    border: 'none',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center',
  },
  btnSecondary: {
    width: '100%',
    padding: '9px 12px',
    background: 'transparent',
    color: C.text,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    fontSize: 12,
    cursor: 'pointer',
  },
  btnAccent: {
    width: '100%',
    padding: '9px 0',
    background: C.primary,
    color: C.btnText,
    border: 'none',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  card: {
    background: 'var(--vscode-editor-background)',
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: '12px',
  },
  pre: {
    fontSize: 12,
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: '12px',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
    maxHeight: 220,
    overflow: 'auto',
    color: C.text,
    fontFamily: "'Fira Code', 'Cascadia Code', monospace",
    lineHeight: 1.5,
    margin: 0,
  },
  label: {
    fontSize: 10,
    color: C.muted,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    fontWeight: 600,
  },
  resultBadge: {
    fontSize: 9,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 999,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
    border: `1px solid ${C.border}`,
    color: C.muted,
  },
  optionPill: {
    padding: '6px 12px',
    background: 'var(--vscode-editor-background)',
    color: C.text,
    border: `1px solid ${C.border}`,
    borderRadius: 999,
    fontSize: 12,
    cursor: 'pointer',
    transition: 'border-color 0.15s',
  },
};

function ScoreRow({ label, value }: { label: string; value: number }) {
  const color = value >= 75 ? C.accent : value >= 40 ? C.warning : C.danger;
  const filled = Math.round((value / 100) * 16);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
      <span style={{ color: C.muted, width: 110, flexShrink: 0 }}>{label}</span>
      <span style={{ color, fontWeight: 700, width: 28 }}>{value}</span>
      <span style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: -1 }}>
        <span style={{ color }}>{'█'.repeat(filled)}</span>
        <span style={{ color: C.muted }}>{'░'.repeat(16 - filled)}</span>
      </span>
    </div>
  );
}

function Spinner({ text = 'Thinking...' }: { text?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted, fontSize: 12 }}>
      <span style={{
        width: 14, height: 14,
        border: `2px solid ${C.border}`,
        borderTopColor: C.primary,
        borderRadius: '50%',
        display: 'inline-block',
        animation: 'spin 0.7s linear infinite',
      }} />
      <span>{text}</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function isLikelyFeatureBuildPrompt(prompt: string): boolean {
  const p = prompt.toLowerCase();
  const intentVerb = /(build|create|develop|make|implement)/.test(p);
  const targetNoun = /(app|application|website|platform|tool|dashboard|tracker|system|project)/.test(p);
  return intentVerb && targetNoun;
}

function buildSessionContext(prompt: string): Record<string, unknown> {
  const featureBuild = isLikelyFeatureBuildPrompt(prompt);

  return {
    refinement_preferences: {
      ask_one_question_per_turn: true,
      prefer_relevant_questions: true,
      question_priority_for_feature_requests: [
        'what should it do',
        'which stack should be used',
        'must-have features',
        'constraints and scope',
      ],
      avoid_for_feature_requests: ['error message', 'stack trace'],
    },
    inferred_intent: featureBuild ? 'feature_build' : 'unspecified',
  };
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [phase, setPhase]         = useState<Phase>('login');
  const [rawPrompt, setRawPrompt] = useState('');
  const [question, setQuestion]   = useState('');
  const [options, setOptions]     = useState<string[]>([]);
  const [turnNum, setTurnNum]     = useState(1);
  const [answer, setAnswer]       = useState('');
  const [assembled, setAssembled] = useState('');
  const [scores, setScores]       = useState<Scores | null>(null);
  const [refuseMsg, setRefuseMsg] = useState('');
  const [copied, setCopied]       = useState(false);
  const [error, setError]         = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRef   = useRef<HTMLInputElement>(null);
  const sessionRef = useRef<string | null>(null);
  const lastQuestionRef = useRef('');
  const autoClassifiedFirstQuestionRef = useRef(false);

  // Stable message handler
  useEffect(() => {
    vscode?.postMessage({ type: 'ready' });

    const handler = (event: MessageEvent) => {
      const msg = event.data;
      switch (msg.type) {

        case 'authState':
          if (msg.loggedIn) {
            setPhase((p) => (p === 'login' || p === 'loginPolling' || p === 'loginTimeout') ? 'idle' : p);
          } else {
            setPhase('login');
          }
          break;

        case 'loginPolling':
          setPhase('loginPolling');
          break;

        case 'loginTimeout':
          setPhase('loginTimeout');
          break;

        case 'sessionStarted':
          sessionRef.current = msg.sessionId;
          setIsSubmitting(false);
          setPhase('loading');
          vscode?.postMessage({ type: 'sendMessage', sessionId: msg.sessionId, userMessage: '_init_' });
          break;

        case 'messageResponse':
          setIsSubmitting(false);
          if (msg.done) {
            if (msg.should_refuse) {
              setRefuseMsg(msg.message ?? 'You already know the answer. Try implementing it.');
              setPhase('refused');
            } else {
              setAssembled(msg.assembled_prompt);
              setScores(msg.scores);
              setPhase('complete');
              vscode?.postMessage({ type: 'completeSession', sessionId: sessionRef.current });
            }
          } else {
            const nextQuestion = String(msg.question ?? '').trim();
            const nextOptions = Array.isArray(msg.options) ? msg.options as string[] : [];
            const hasTurn = typeof msg.turn === 'number' && Number.isFinite(msg.turn);

            const firstQuestionIsGenericCategory =
              hasTurn &&
              Number(msg.turn) === 1 &&
              /^what type of request is this\??$/i.test(nextQuestion);

            if (
              firstQuestionIsGenericCategory &&
              !autoClassifiedFirstQuestionRef.current &&
              isLikelyFeatureBuildPrompt(rawPrompt)
            ) {
              autoClassifiedFirstQuestionRef.current = true;
              setIsSubmitting(true);
              setPhase('loading');
              vscode?.postMessage({
                type: 'sendMessage',
                sessionId: sessionRef.current,
                userMessage: 'New feature',
              });
              return;
            }

            if (nextQuestion) {
              setQuestion(nextQuestion);
              lastQuestionRef.current = nextQuestion;
            }
            setOptions(nextOptions);

            if (hasTurn) {
              setTurnNum(Math.max(1, Number(msg.turn)));
            } else {
              setTurnNum((prev) => prev + 1);
            }

            setPhase('asking');
            setTimeout(() => inputRef.current?.focus(), 80);
          }
          break;

        case 'sessionError':
          setIsSubmitting(false);
          setError(msg.error ?? 'Something went wrong');
          setPhase('idle');
          break;
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleStart = (presetPrompt?: string) => {
    const prompt = presetPrompt || rawPrompt.trim();
    if (!prompt || isSubmitting) return;
    setIsSubmitting(true);
    setError('');
    setQuestion('');
    setOptions([]);
    lastQuestionRef.current = '';
    autoClassifiedFirstQuestionRef.current = false;
    setTurnNum(1);
    setPhase('loading');
    vscode?.postMessage({
      type: 'startSession',
      rawPrompt: prompt,
      workspaceContext: buildSessionContext(prompt),
    });
  };

  const handleAnswer = (answerText?: string) => {
    const a = answerText || answer.trim();
    if (!a || !sessionRef.current || isSubmitting) return;
    setIsSubmitting(true);
    setAnswer('');
    setPhase('loading');
    vscode?.postMessage({ type: 'sendMessage', sessionId: sessionRef.current, userMessage: a });
  };

  const reset = () => {
    setPhase('idle');
    setRawPrompt('');
    setAssembled('');
    setScores(null);
    sessionRef.current = null;
    setTurnNum(1);
    setQuestion('');
    setOptions([]);
    setAnswer('');
    setIsSubmitting(false);
    lastQuestionRef.current = '';
    autoClassifiedFirstQuestionRef.current = false;
    setCopied(false);
    setError('');
  };

  return (
    <div style={S.root}>
      <div style={S.shell}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={S.logo}>⚡ PromptOS Copilot</div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>prompt refinement assistant</div>
        </div>
        {phase !== 'login' && phase !== 'loginPolling' && phase !== 'loginTimeout' && (
          <button
            onClick={() => vscode?.postMessage({ type: 'logout' })}
            style={{ background: 'transparent', border: 'none', color: C.muted, fontSize: 10, cursor: 'pointer', padding: '2px 4px' }}
          >
            logout
          </button>
        )}
      </div>

      <div style={S.divider} />

      {/* ── LOGIN ── */}
      {phase === 'login' && (
        <>
          <div style={{ ...S.card, textAlign: 'left' }}>
            <div style={S.sectionTitle}>Account</div>
            <p style={{ margin: '8px 0 6px', fontWeight: 600, fontSize: 14 }}>Sign in to continue</p>
            <p style={{ margin: '0 0 16px', fontSize: 11, color: C.muted, lineHeight: 1.5 }}>
              Connect your PromptOS account once, then refine prompts directly from the sidebar.
            </p>
            <button
              onClick={() => vscode?.postMessage({ type: 'login' })}
              style={{ ...S.btnPrimary, opacity: isSubmitting ? 0.8 : 1 }}
              disabled={isSubmitting}
            >
              Continue with Google
            </button>
          </div>
          <div style={{ fontSize: 11, color: C.muted }}>
            Opens your browser and returns automatically after sign-in.
          </div>
        </>
      )}

      {/* ── LOGIN POLLING ── */}
      {phase === 'loginPolling' && (
        <div style={{ ...S.card, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 20 }}>
          <Spinner text="Waiting for login..." />
          <p style={{ fontSize: 11, color: C.muted, margin: 0, textAlign: 'center' }}>
            Complete sign-in in the browser tab to continue.
          </p>
        </div>
      )}

      {/* ── LOGIN TIMEOUT ── */}
      {phase === 'loginTimeout' && (
        <>
          <div style={{ ...S.card, borderLeft: `3px solid ${C.warning}` }}>
            <p style={{ margin: 0, fontSize: 12, color: C.warning, fontWeight: 600 }}>Sign-in timed out</p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: C.muted }}>Please try once more.</p>
          </div>
          <button onClick={() => vscode?.postMessage({ type: 'login' })} style={S.btnPrimary}>
            Try again
          </button>
        </>
      )}

      {/* ── IDLE ── */}
      {phase === 'idle' && (
        <>
          {error && (
            <div style={{ ...S.card, borderLeft: `3px solid ${C.danger}`, padding: '8px 12px' }}>
              <p style={{ margin: 0, fontSize: 11, color: C.danger }}>{error}</p>
            </div>
          )}
          <div style={S.divider} />

          <div style={S.label}>Your prompt</div>
          <textarea
            placeholder="Describe what you want help with..."
            value={rawPrompt}
            onChange={(e) => setRawPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && e.metaKey && handleStart()}
            rows={4}
            style={S.textarea}
          />
          <button onClick={() => handleStart()} style={S.btnPrimary} disabled={!rawPrompt.trim()}>
            Start refinement
          </button>
          <div style={{ fontSize: 10, color: C.muted, textAlign: 'center' }}>⌘↵ to start</div>
        </>
      )}

      {/* ── LOADING ── */}
      {phase === 'loading' && (
        <div style={{ ...S.card, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Spinner />
        </div>
      )}

      {/* ── ASKING ── */}
      {phase === 'asking' && (
        <>
          <div style={{ ...S.card, borderLeft: `3px solid ${C.primary}` }}>
            <div style={S.sectionTitle}>Question</div>
            <p style={{ margin: '4px 0 0', fontWeight: 600, fontSize: 13, lineHeight: 1.5 }}>{question}</p>
          </div>

          {/* Options pills */}
          {options.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(opt)}
                  style={S.optionPill}
                  disabled={isSubmitting}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
          <input
            ref={inputRef}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAnswer()}
            placeholder="Or type your answer..."
            style={S.input}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handleAnswer('Not sure')}
              style={{ ...S.btnSecondary, flex: 1 }}
              disabled={isSubmitting}
            >
              Not sure
            </button>
            <button onClick={() => handleAnswer()} style={{ ...S.btnPrimary, flex: 1 }} disabled={!answer.trim() || isSubmitting}>
              Submit →
            </button>
          </div>
        </>
      )}

      {/* ── REFUSED ── */}
      {phase === 'refused' && (
        <>
          <div style={{ ...S.card, borderLeft: `3px solid ${C.warning}`, background: `${C.warning}11` }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: C.warning }}>Prompt guidance</p>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: C.text, lineHeight: 1.5 }}>{refuseMsg}</p>
          </div>
          <button onClick={reset} style={S.btnSecondary}>Start over</button>
        </>
      )}

      {/* ── COMPLETE ── */}
      {phase === 'complete' && (
        <>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={S.resultBadge}>Gemini</span>
          </div>
          <div style={{ ...S.card, padding: '10px 12px' }}>
            <div style={S.sectionTitle}>Assembled Prompt</div>
          </div>
          <pre style={S.pre}>{assembled}</pre>
          {scores && (
            <div style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <ScoreRow label="Token Efficiency" value={scores.token_efficiency_score} />
              <ScoreRow label="Thinking Depth"   value={scores.thinking_depth_score} />
              <ScoreRow label="AI Dependency"    value={scores.dependency_score} />
              <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                Turns saved: <span style={{ color: C.accent, fontWeight: 700 }}>{scores.estimated_turns_saved}</span>
              </div>
            </div>
          )}
          <button onClick={() => { vscode?.postMessage({ type: 'sendToTerminal', assembledPrompt: assembled }); setPhase('sent'); }} style={S.btnAccent}>
            Send to Claude Code
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { navigator.clipboard?.writeText(assembled); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ ...S.btnSecondary, flex: 1 }}>
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
            <button onClick={reset} style={{ ...S.btnSecondary, flex: 1 }}>
              New session
            </button>
          </div>
        </>
      )}

      {/* ── SENT ── */}
      {phase === 'sent' && (
        <div style={{ ...S.card, textAlign: 'center', padding: '20px 12px' }}>
          <p style={{ margin: '0 0 4px', fontWeight: 600, color: C.accent, fontSize: 14 }}>Prompt sent</p>
          <p style={{ margin: '0 0 16px', fontSize: 11, color: C.muted }}>Check your terminal</p>
          <button onClick={reset} style={S.btnSecondary}>New session</button>
        </div>
      )}
      </div>
    </div>
  );
}

const root = document.getElementById('root');
if (root) createRoot(root).render(<App />);
