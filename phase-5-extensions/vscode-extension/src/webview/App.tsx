/**
 * VS Code Webview React App — Phase 5, Task 5.3
 *
 * Refined UI matching the PromptOS design system:
 * violet / cyan / emerald palette, consistent with CLI ui.js
 *
 * State machine: idle → loading → asking → complete → sent | refused
 */

import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const vscode = (window as any).acquireVsCodeApi?.();

type Phase = 'idle' | 'loading' | 'asking' | 'refused' | 'complete' | 'sent';

interface Scores {
  token_efficiency_score: number;
  thinking_depth_score: number;
  dependency_score: number;
  estimated_turns_saved: number;
}

// ── Design tokens (matches ui.js palette) ──────────────────────────────────
const C = {
  primary:   '#7C3AED',
  secondary: '#06B6D4',
  accent:    '#10B981',
  warning:   '#F59E0B',
  danger:    '#EF4444',
  muted:     '#6B7280',
  bg:        'var(--vscode-editor-background)',
  surface:   'var(--vscode-input-background)',
  border:    'var(--vscode-input-border, #313244)',
  text:      'var(--vscode-editor-foreground)',
  textDim:   'var(--vscode-descriptionForeground)',
  font:      'var(--vscode-font-family)',
};

// ── Shared styles ──────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  root: {
    padding: '14px 12px',
    fontFamily: C.font,
    color: C.text,
    fontSize: 13,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    minHeight: '100vh',
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  logo: {
    fontSize: 15,
    fontWeight: 700,
    background: 'linear-gradient(90deg, #7C3AED, #06B6D4, #10B981)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.3px',
  },
  version: {
    fontSize: 10,
    color: C.muted,
    marginTop: 2,
  },
  textarea: {
    width: '100%',
    boxSizing: 'border-box',
    background: C.surface,
    color: C.text,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 12,
    fontFamily: C.font,
    resize: 'vertical' as const,
    outline: 'none',
    lineHeight: 1.5,
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    background: C.surface,
    color: C.text,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 13,
    fontFamily: C.font,
    outline: 'none',
  },
  btnPrimary: {
    width: '100%',
    padding: '9px 0',
    background: 'linear-gradient(90deg, #7C3AED, #06B6D4)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: '0.2px',
  },
  btnSecondary: {
    width: '100%',
    padding: '7px 0',
    background: 'transparent',
    color: C.secondary,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    fontSize: 12,
    cursor: 'pointer',
  },
  btnAccent: {
    width: '100%',
    padding: '9px 0',
    background: 'linear-gradient(90deg, #10B981, #06B6D4)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  card: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: '10px 12px',
  },
  pre: {
    fontSize: 11,
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: '10px 12px',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
    maxHeight: 180,
    overflow: 'auto',
    color: '#10B981',
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
  stepDots: {
    display: 'flex',
    gap: 4,
    alignItems: 'center',
  },
};

// ── Score bar ──────────────────────────────────────────────────────────────
function ScoreRow({ label, value }: { label: string; value: number }) {
  const color = value >= 75 ? C.accent : value >= 40 ? C.warning : C.danger;
  const filled = Math.round((value / 100) * 16);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
      <span style={{ color: C.muted, width: 110, flexShrink: 0 }}>{label}</span>
      <span style={{ color, fontWeight: 700, width: 28 }}>{value}</span>
      <span style={{ fontFamily: 'monospace', fontSize: 10, color: C.muted, letterSpacing: -1 }}>
        <span style={{ color }}>{'█'.repeat(filled)}</span>{'░'.repeat(16 - filled)}
      </span>
    </div>
  );
}

// ── Step dots ──────────────────────────────────────────────────────────────
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div style={S.stepDots}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: i < current ? C.primary : C.muted,
          display: 'inline-block',
          transition: 'background 0.2s',
        }} />
      ))}
    </div>
  );
}

// ── Spinner ────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.secondary, fontSize: 12 }}>
      <span style={{
        width: 14, height: 14, border: `2px solid ${C.border}`,
        borderTopColor: C.secondary, borderRadius: '50%',
        display: 'inline-block',
        animation: 'spin 0.7s linear infinite',
      }} />
      <span>Thinking...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [phase, setPhase]         = useState<Phase>('idle');
  const [rawPrompt, setRawPrompt] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [question, setQuestion]   = useState('');
  const [turnNum, setTurnNum]     = useState(1);
  const [answer, setAnswer]       = useState('');
  const [assembled, setAssembled] = useState('');
  const [scores, setScores]       = useState<Scores | null>(null);
  const [refuseMsg, setRefuseMsg] = useState('');
  const [copied, setCopied]       = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      switch (msg.type) {
        case 'sessionStarted':
          setSessionId(msg.sessionId);
          setPhase('loading');
          vscode?.postMessage({ type: 'sendMessage', sessionId: msg.sessionId, userMessage: '_init_' });
          break;
        case 'messageResponse':
          if (msg.done) {
            if (msg.should_refuse) {
              setRefuseMsg(msg.message ?? 'You already know the answer. Try implementing it.');
              setPhase('refused');
            } else {
              setAssembled(msg.assembled_prompt);
              setScores(msg.scores);
              setPhase('complete');
              vscode?.postMessage({ type: 'completeSession', sessionId });
            }
          } else {
            setQuestion(msg.question);
            setTurnNum(msg.turn ?? turnNum + 1);
            setPhase('asking');
            setTimeout(() => inputRef.current?.focus(), 80);
          }
          break;
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [sessionId, turnNum]);

  const handleStart = () => {
    if (!rawPrompt.trim()) return;
    setPhase('loading');
    vscode?.postMessage({ type: 'startSession', rawPrompt: rawPrompt.trim() });
  };

  const handleAnswer = () => {
    if (!answer.trim() || !sessionId) return;
    setPhase('loading');
    vscode?.postMessage({ type: 'sendMessage', sessionId, userMessage: answer.trim() });
    setAnswer('');
  };

  const handleSendToTerminal = () => {
    vscode?.postMessage({ type: 'sendToTerminal', assembledPrompt: assembled });
    setPhase('sent');
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(assembled);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setPhase('idle');
    setRawPrompt('');
    setAssembled('');
    setScores(null);
    setSessionId(null);
    setTurnNum(1);
    setCopied(false);
  };

  return (
    <div style={S.root}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <div style={S.logo}>⚡ PromptOS</div>
          <div style={S.version}>prompt refinement layer</div>
        </div>
      </div>

      <div style={{ height: 1, background: `linear-gradient(90deg, ${C.primary}44, ${C.secondary}44, transparent)` }} />

      {/* ── IDLE ── */}
      {phase === 'idle' && (
        <>
          <div style={S.label}>Your raw prompt</div>
          <textarea
            placeholder="Paste your vague prompt here — PromptOS will refine it..."
            value={rawPrompt}
            onChange={(e) => setRawPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && e.metaKey && handleStart()}
            rows={5}
            style={S.textarea}
          />
          <button onClick={handleStart} style={S.btnPrimary} disabled={!rawPrompt.trim()}>
            Start Refinement →
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: C.muted }}>Question {turnNum} of ~4</span>
            <StepDots current={turnNum} total={4} />
          </div>
          <div style={{ ...S.card, borderLeft: `3px solid ${C.primary}` }}>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 13, lineHeight: 1.5 }}>{question}</p>
          </div>
          <input
            ref={inputRef}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAnswer()}
            placeholder="Your answer... (Enter to submit)"
            style={S.input}
          />
          <button onClick={handleAnswer} style={S.btnPrimary} disabled={!answer.trim()}>
            Submit →
          </button>
        </>
      )}

      {/* ── REFUSED ── */}
      {phase === 'refused' && (
        <>
          <div style={{ ...S.card, borderLeft: `3px solid ${C.warning}`, background: `${C.warning}11` }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: C.warning }}>🚫 Refusal Engine</p>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: C.text, lineHeight: 1.5 }}>{refuseMsg}</p>
          </div>
          <button onClick={reset} style={S.btnSecondary}>Start over</button>
        </>
      )}

      {/* ── COMPLETE ── */}
      {phase === 'complete' && (
        <>
          <div style={{ fontSize: 11, color: C.accent, fontWeight: 600 }}>✦ Assembled Prompt</div>
          <pre style={S.pre}>{assembled}</pre>

          {scores && (
            <div style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <ScoreRow label="Token Efficiency"  value={scores.token_efficiency_score} />
              <ScoreRow label="Thinking Depth"    value={scores.thinking_depth_score} />
              <ScoreRow label="AI Dependency"     value={scores.dependency_score} />
              <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                Turns saved: <span style={{ color: C.accent, fontWeight: 700 }}>{scores.estimated_turns_saved}</span>
              </div>
            </div>
          )}

          <button onClick={handleSendToTerminal} style={S.btnAccent}>
            Send to Claude Code →
          </button>
          <button onClick={handleCopy} style={S.btnSecondary}>
            {copied ? '✓ Copied!' : 'Copy to clipboard'}
          </button>
          <button onClick={reset} style={{ ...S.btnSecondary, color: C.muted, borderColor: 'transparent' }}>
            New session
          </button>
        </>
      )}

      {/* ── SENT ── */}
      {phase === 'sent' && (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🚀</div>
          <p style={{ margin: '0 0 4px', fontWeight: 600, color: C.accent }}>Prompt sent!</p>
          <p style={{ margin: '0 0 16px', fontSize: 11, color: C.muted }}>Check your terminal</p>
          <button onClick={reset} style={S.btnSecondary}>New session</button>
        </div>
      )}
    </div>
  );
}

const root = document.getElementById('root');
if (root) createRoot(root).render(<App />);
