/**
 * VS Code Webview React App — PromptOS Copilot
 * Matches CLI structure: Full / Quick / Instant modes, session receipt, quality comparison
 */

import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

const vscode = (window as any).acquireVsCodeApi?.();

type Phase = 'login' | 'loginPolling' | 'loginTimeout' | 'idle' | 'loading' | 'asking' | 'refused' | 'complete' | 'sent';
type Mode  = 'default' | 'mid' | 'skip';

interface Scores {
  token_efficiency_score: number;
  thinking_depth_score: number;
  dependency_score: number;
  estimated_turns_saved: number;
  raw_specificity_score?: number;
  assembled_specificity_score?: number;
  quality_delta?: number;
}

const C = {
  primary:      'var(--vscode-button-background)',
  accent:       'var(--vscode-testing-iconPassed, #10B981)',
  warning:      '#F59E0B',
  danger:       '#EF4444',
  muted:        'var(--vscode-descriptionForeground, #9AA0A6)',
  surface:      'var(--vscode-input-background)',
  panel:        'var(--vscode-editorWidget-background, var(--vscode-sideBar-background))',
  border:       'var(--vscode-input-border, #313244)',
  text:         'var(--vscode-editor-foreground)',
  btnText:      'var(--vscode-button-foreground)',
  font:         'var(--vscode-font-family)',
};

const MODES: { id: Mode; label: string; desc: string; maxQ: number }[] = [
  { id: 'default', label: '🔍 Full',    desc: 'Up to 6 questions',    maxQ: 6 },
  { id: 'mid',     label: '⚡ Quick',   desc: 'At most 3 questions',  maxQ: 3 },
  { id: 'skip',    label: '🚀 Instant', desc: 'No questions',         maxQ: 0 },
];

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
      <span style={{ width: 14, height: 14, border: `2px solid ${C.border}`, borderTopColor: C.primary, borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
      <span>{text}</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Receipt({ rawPrompt, scores, mode }: { rawPrompt: string; scores: Scores; mode: Mode }) {
  const turnsWithout = Math.max(1, 6 - Math.floor((scores.thinking_depth_score ?? 0) / 20));
  const turnsWithPromptOS = mode === 'skip' ? 0 : mode === 'mid' ? 2 : 1;
  const timeWithout = (turnsWithout * 40 / 60).toFixed(1);
  const timeWith = (Math.max(turnsWithPromptOS, 1) * 40 / 60).toFixed(1);
  const timeRecovered = Math.max(0, (turnsWithout - Math.max(turnsWithPromptOS, 1)) * 40 / 60).toFixed(1);
  const dep = scores.dependency_score ?? 0;
  const depColor = dep < 40 ? C.accent : dep < 70 ? C.warning : C.danger;
  const truncated = rawPrompt.length > 38 ? rawPrompt.slice(0, 35) + '…' : rawPrompt;

  const row = (label: string, val: string, highlight?: boolean) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: 11 }}>
      <span style={{ color: C.muted }}>{label}</span>
      <span style={{ color: highlight ? C.accent : C.text, fontWeight: highlight ? 700 : 400 }}>{val}</span>
    </div>
  );

  return (
    <div style={{ background: 'var(--vscode-editor-background)', border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.accent}`, borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>SESSION RECEIPT</div>
      {row('Prompt', `"${truncated}"`)}
      {row('Mode', mode)}
      <div style={{ height: 1, background: C.border, margin: '6px 0' }} />
      {row('Without PromptOS', `~${turnsWithout} turns · ${timeWithout} min`)}
      {row('With PromptOS', `${Math.max(turnsWithPromptOS, 1)} turn · ${timeWith} min`)}
      {row('Time Recovered', `✦ ${timeRecovered} min`, true)}
      <div style={{ height: 1, background: C.border, margin: '6px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
        <span style={{ color: C.muted }}>AI Dependency</span>
        <span style={{ color: depColor, fontWeight: 700 }}>{dep}/100</span>
      </div>
    </div>
  );
}

function classifyPrompt(prompt: string): 'feature_build' | 'bug_fix' | 'refactor' | 'unspecified' {
  const p = prompt.toLowerCase();
  if (/(fix|crash|broken|error|bug|fail|not working|issue|wrong|undefined|null|exception)/.test(p)) return 'bug_fix';
  if (/(build|create|develop|make|implement|add|introduce|enable|support)/.test(p)) return 'feature_build';
  if (/(refactor|clean|reorganize|restructure|simplify|optimize|improve)/.test(p)) return 'refactor';
  return 'unspecified';
}

function buildSessionContext(prompt: string, mode: Mode): Record<string, unknown> {
  return {
    refinement_preferences: { ask_one_question_per_turn: true },
    inferred_intent: classifyPrompt(prompt),
    mode,
  };
}

export default function App() {
  const [phase, setPhase]         = useState<Phase>('login');
  const [mode, setMode]           = useState<Mode>('default');
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
  const autoClassifiedRef = useRef(false);

  const maxQ = MODES.find(m => m.id === mode)?.maxQ ?? 6;

  useEffect(() => {
    vscode?.postMessage({ type: 'ready' });

    const handler = (event: MessageEvent) => {
      const msg = event.data;
      switch (msg.type) {
        case 'authState':
          setPhase(p => msg.loggedIn
            ? (p === 'login' || p === 'loginPolling' || p === 'loginTimeout') ? 'idle' : p
            : 'login');
          break;
        case 'loginPolling':  setPhase('loginPolling'); break;
        case 'loginTimeout':  setPhase('loginTimeout'); break;

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
            const nextQ = String(msg.question ?? '').trim();
            const nextOpts = Array.isArray(msg.options) ? msg.options as string[] : [];
            const hasTurn = typeof msg.turn === 'number';

            // Auto-classify first generic question
            const isGeneric = hasTurn && Number(msg.turn) === 1 && /^what type of request is this\??$/i.test(nextQ);
            const promptClass = classifyPrompt(rawPrompt);
            const autoAnswer = promptClass === 'feature_build' ? 'New feature' : promptClass === 'bug_fix' ? 'Bug fix' : promptClass === 'refactor' ? 'Refactor' : null;

            if (isGeneric && !autoClassifiedRef.current && autoAnswer) {
              autoClassifiedRef.current = true;
              setIsSubmitting(true);
              setPhase('loading');
              vscode?.postMessage({ type: 'sendMessage', sessionId: sessionRef.current, userMessage: autoAnswer });
              return;
            }

            if (nextQ) setQuestion(nextQ);
            setOptions(nextOpts);
            setTurnNum(hasTurn ? Math.max(1, Number(msg.turn)) : t => t + 1);
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

  const handleStart = () => {
    const prompt = rawPrompt.trim();
    if (!prompt || isSubmitting) return;
    setIsSubmitting(true);
    setError('');
    setQuestion('');
    setOptions([]);
    autoClassifiedRef.current = false;
    setTurnNum(1);
    setPhase('loading');
    vscode?.postMessage({ type: 'startSession', rawPrompt: prompt, workspaceContext: buildSessionContext(prompt, mode), mode });
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
    autoClassifiedRef.current = false;
    setCopied(false);
    setError('');
  };

  const card: React.CSSProperties = { background: 'var(--vscode-editor-background)', border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 };
  const label: React.CSSProperties = { fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 };
  const btnPrimary: React.CSSProperties = { width: '100%', padding: '10px 12px', background: C.primary, color: C.btnText, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' };
  const btnSecondary: React.CSSProperties = { width: '100%', padding: '9px 12px', background: 'transparent', color: C.text, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12, cursor: 'pointer' };
  const divider: React.CSSProperties = { height: 1, background: C.border };

  return (
    <div style={{ padding: 12, fontFamily: C.font, color: C.text, fontSize: 13, boxSizing: 'border-box', background: 'var(--vscode-sideBar-background)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>⚡ PromptOS</div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>prompt refinement assistant</div>
          </div>
          {phase !== 'login' && phase !== 'loginPolling' && phase !== 'loginTimeout' && (
            <button onClick={() => vscode?.postMessage({ type: 'logout' })} style={{ background: 'transparent', border: 'none', color: C.muted, fontSize: 10, cursor: 'pointer' }}>logout</button>
          )}
        </div>

        <div style={divider} />

        {/* LOGIN */}
        {phase === 'login' && (
          <>
            <div style={card}>
              <div style={label}>Account</div>
              <p style={{ margin: '8px 0 6px', fontWeight: 600, fontSize: 14 }}>Sign in to continue</p>
              <p style={{ margin: '0 0 14px', fontSize: 11, color: C.muted, lineHeight: 1.5 }}>Connect your PromptOS account to refine prompts from the sidebar.</p>
              <button onClick={() => vscode?.postMessage({ type: 'login' })} style={btnPrimary} disabled={isSubmitting}>Continue with Google</button>
            </div>
            <div style={{ fontSize: 11, color: C.muted }}>Opens your browser — returns automatically after sign-in.</div>
          </>
        )}

        {/* LOGIN POLLING */}
        {phase === 'loginPolling' && (
          <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 20 }}>
            <Spinner text="Waiting for login..." />
            <p style={{ fontSize: 11, color: C.muted, margin: 0, textAlign: 'center' }}>Complete sign-in in the browser tab.</p>
          </div>
        )}

        {/* LOGIN TIMEOUT */}
        {phase === 'loginTimeout' && (
          <>
            <div style={{ ...card, borderLeft: `3px solid ${C.warning}` }}>
              <p style={{ margin: 0, fontSize: 12, color: C.warning, fontWeight: 600 }}>Sign-in timed out</p>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: C.muted }}>Please try once more.</p>
            </div>
            <button onClick={() => vscode?.postMessage({ type: 'login' })} style={btnPrimary}>Try again</button>
          </>
        )}

        {/* IDLE */}
        {phase === 'idle' && (
          <>
            {error && <div style={{ ...card, borderLeft: `3px solid ${C.danger}`, padding: '8px 12px' }}><p style={{ margin: 0, fontSize: 11, color: C.danger }}>{error}</p></div>}

            <div style={label}>Your prompt</div>
            <textarea
              placeholder="Describe what you want help with..."
              value={rawPrompt}
              onChange={e => setRawPrompt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && e.metaKey && handleStart()}
              rows={4}
              style={{ width: '100%', boxSizing: 'border-box', background: C.surface, color: C.text, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: C.font, resize: 'vertical', outline: 'none', lineHeight: 1.5, minHeight: 80 }}
            />

            {/* Mode selector — matches CLI */}
            <div style={label}>Mode</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {MODES.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  title={m.desc}
                  style={{
                    flex: 1, padding: '7px 4px', fontSize: 11, fontWeight: 600, cursor: 'pointer', borderRadius: 8, border: `1px solid ${mode === m.id ? C.primary : C.border}`,
                    background: mode === m.id ? `${C.primary}22` : 'transparent',
                    color: mode === m.id ? C.text : C.muted,
                    transition: 'all 0.15s',
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 10, color: C.muted }}>{MODES.find(m => m.id === mode)?.desc}</div>

            <button onClick={handleStart} style={btnPrimary} disabled={!rawPrompt.trim() || isSubmitting}>
              Start refinement {mode === 'skip' ? '(instant)' : mode === 'mid' ? '(quick)' : ''}
            </button>
            <div style={{ fontSize: 10, color: C.muted, textAlign: 'center' }}>⌘↵ to start</div>
          </>
        )}

        {/* LOADING */}
        {phase === 'loading' && (
          <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <Spinner />
          </div>
        )}

        {/* ASKING */}
        {phase === 'asking' && (
          <>
            <div style={{ ...card, borderLeft: `3px solid ${C.primary}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={label}>Question {turnNum} of ~{maxQ}</div>
                <div style={{ fontSize: 9, color: C.muted }}>{Math.max(0, maxQ - turnNum)} left</div>
              </div>
              {/* Progress dots */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                {Array.from({ length: Math.min(maxQ, 6) }, (_, i) => (
                  <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i < turnNum ? C.primary : C.border, display: 'inline-block' }} />
                ))}
              </div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 13, lineHeight: 1.5 }}>{question}</p>
            </div>

            {options.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {options.map((opt, i) => (
                  <button key={i} onClick={() => handleAnswer(opt)} disabled={isSubmitting}
                    style={{ padding: '6px 12px', background: 'var(--vscode-editor-background)', color: C.text, border: `1px solid ${C.border}`, borderRadius: 999, fontSize: 12, cursor: 'pointer' }}>
                    {opt}
                  </button>
                ))}
              </div>
            )}

            <input ref={inputRef} value={answer} onChange={e => setAnswer(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAnswer()} placeholder="Or type your answer..."
              style={{ width: '100%', boxSizing: 'border-box', background: C.surface, color: C.text, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: C.font, outline: 'none' }} />

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => handleAnswer('Not sure')} style={{ ...btnSecondary, flex: 1 }} disabled={isSubmitting}>Not sure</button>
              <button onClick={() => handleAnswer()} style={{ ...btnPrimary, flex: 1 }} disabled={!answer.trim() || isSubmitting}>Submit →</button>
            </div>
            <button onClick={reset} style={{ ...btnSecondary, fontSize: 11, color: C.muted }}>✕ Cancel session</button>
          </>
        )}

        {/* REFUSED */}
        {phase === 'refused' && (
          <>
            <div style={{ ...card, borderLeft: `3px solid ${C.warning}`, background: `${C.warning}11` }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: C.warning }}>Prompt guidance</p>
              <p style={{ margin: '6px 0 0', fontSize: 12, color: C.text, lineHeight: 1.5 }}>{refuseMsg}</p>
            </div>
            <button onClick={reset} style={btnSecondary}>Start over</button>
          </>
        )}

        {/* COMPLETE */}
        {phase === 'complete' && (
          <>
            {/* Quality comparison */}
            {scores && scores.raw_specificity_score !== undefined && (
              <div style={card}>
                <div style={{ ...label, marginBottom: 8 }}>✦ Prompt Quality Improvement</div>
                <ScoreRow label="Raw prompt" value={scores.raw_specificity_score} />
                <div style={{ marginTop: 4 }}>
                  <ScoreRow label="Refined prompt" value={scores.assembled_specificity_score ?? 0} />
                </div>
                {(scores.quality_delta ?? 0) !== 0 && (
                  <div style={{ fontSize: 10, color: (scores.quality_delta ?? 0) > 0 ? C.accent : C.danger, marginTop: 4 }}>
                    {(scores.quality_delta ?? 0) > 0 ? '+' : ''}{scores.quality_delta} ✦
                  </div>
                )}
              </div>
            )}

            {/* Assembled prompt — large readable box */}
            <div style={label}>Assembled Prompt</div>
            <pre style={{ fontSize: 12, background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.accent}`, borderRadius: 10, padding: 14, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 300, minHeight: 100, overflow: 'auto', color: C.text, fontFamily: C.font, lineHeight: 1.7, margin: 0 }}>
              {assembled}
            </pre>

            {/* Score bars */}
            {scores && (
              <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <ScoreRow label="Token Efficiency" value={scores.token_efficiency_score} />
                <ScoreRow label="Thinking Depth"   value={scores.thinking_depth_score} />
                <ScoreRow label="AI Dependency"    value={scores.dependency_score} />
                <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                  Turns saved: <span style={{ color: C.accent, fontWeight: 700 }}>{scores.estimated_turns_saved}</span>
                </div>
              </div>
            )}

            {/* Session Receipt */}
            {scores && <Receipt rawPrompt={rawPrompt} scores={scores} mode={mode} />}

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { navigator.clipboard?.writeText(assembled); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ ...btnPrimary, flex: 1 }}>
                {copied ? '✓ Copied!' : '📋 Copy prompt'}
              </button>
              <button onClick={reset} style={{ ...btnSecondary, flex: 1 }}>New session</button>
            </div>
          </>
        )}

        {/* SENT */}
        {phase === 'sent' && (
          <div style={{ ...card, textAlign: 'center', padding: '20px 12px' }}>
            <p style={{ margin: '0 0 4px', fontWeight: 600, color: C.accent, fontSize: 14 }}>Prompt sent ✓</p>
            <p style={{ margin: '0 0 16px', fontSize: 11, color: C.muted }}>Check your terminal</p>
            <button onClick={reset} style={btnSecondary}>New session</button>
          </div>
        )}

      </div>
    </div>
  );
}

const root = document.getElementById('root');
if (root) createRoot(root).render(<App />);
