/**
 * VS Code Webview React App — Phase 5, Task 5.3
 *
 * State machine: idle → asking → complete → sent | refused
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const vscode = (window as any).acquireVsCodeApi?.();

type Phase = 'idle' | 'asking' | 'refused' | 'complete' | 'sent';

interface Scores {
  token_efficiency_score: number;
  thinking_depth_score: number;
  dependency_score: number;
  estimated_turns_saved: number;
}

const s: Record<string, React.CSSProperties> = {
  wrap:    { padding: 16, fontFamily: 'var(--vscode-font-family)', color: 'var(--vscode-editor-foreground)' },
  input:   { width: '100%', boxSizing: 'border-box', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)', border: '1px solid var(--vscode-input-border)', borderRadius: 6, padding: 8 },
  btn:     { marginTop: 8, width: '100%', padding: '8px 0', background: 'var(--vscode-button-background)', color: 'var(--vscode-button-foreground)', border: 'none', borderRadius: 6, cursor: 'pointer' },
  linkBtn: { marginTop: 6, width: '100%', padding: '6px 0', background: 'transparent', color: 'var(--vscode-textLink-foreground)', border: 'none', cursor: 'pointer' },
  pre:     { fontSize: 11, background: 'var(--vscode-textCodeBlock-background)', padding: 10, borderRadius: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 200, overflow: 'auto' },
  error:   { background: '#f59e0b22', border: '1px solid #f59e0b', borderRadius: 8, padding: 12 },
  apiErr:  { background: '#ef444422', border: '1px solid #ef4444', borderRadius: 8, padding: 10, fontSize: 12, marginTop: 8 },
};

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
  const [apiError, setApiError]   = useState<string | null>(null);

  const inputRef    = useRef<HTMLInputElement>(null);
  const sessionRef  = useRef<string | null>(null);

  // Keep ref in sync so message handler always has latest sessionId
  useEffect(() => { sessionRef.current = sessionId; }, [sessionId]);

  const reset = useCallback(() => {
    setPhase('idle');
    setRawPrompt('');
    setAssembled('');
    setScores(null);
    setApiError(null);
    setTurnNum(1);
  }, []);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      setApiError(null);

      switch (msg.type) {
        case 'sessionStarted':
          setSessionId(msg.sessionId);
          vscode?.postMessage({ type: 'sendMessage', sessionId: msg.sessionId, userMessage: '_init_' });
          break;

        case 'messageResponse':
          if (msg.done) {
            if (msg.should_refuse) {
              setRefuseMsg(msg.message ?? 'You already know the answer.');
              setPhase('refused');
            } else {
              setAssembled(msg.assembled_prompt);
              setScores(msg.scores);
              setPhase('complete');
              vscode?.postMessage({ type: 'completeSession', sessionId: sessionRef.current });
            }
          } else {
            setQuestion(msg.question);
            setTurnNum(msg.turn ?? (t => t + 1));
            setPhase('asking');
            setTimeout(() => inputRef.current?.focus(), 100);
          }
          break;

        case 'error':
          setApiError(msg.message ?? 'Something went wrong.');
          break;
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []); // no deps — uses refs for mutable values

  const handleStart = () => {
    if (!rawPrompt.trim()) return;
    setApiError(null);
    vscode?.postMessage({ type: 'startSession', rawPrompt: rawPrompt.trim() });
  };

  const handleAnswer = () => {
    if (!answer.trim() || !sessionRef.current) return;
    vscode?.postMessage({ type: 'sendMessage', sessionId: sessionRef.current, userMessage: answer.trim() });
    setAnswer('');
  };

  const handleSendToTerminal = () => {
    vscode?.postMessage({ type: 'sendToTerminal', assembledPrompt: assembled });
    setPhase('sent');
  };

  return (
    <div style={s.wrap}>
      <h2 style={{ margin: '0 0 12px', fontSize: 16 }}>⚡ PromptOS</h2>

      {apiError && <div style={s.apiErr}>⚠️ {apiError}</div>}

      {phase === 'idle' && (
        <>
          <textarea
            placeholder="Paste your raw prompt here..."
            value={rawPrompt}
            onChange={(e) => setRawPrompt(e.target.value)}
            rows={4}
            style={{ ...s.input, resize: 'vertical' }}
          />
          <button onClick={handleStart} style={s.btn}>Start Refinement →</button>
        </>
      )}

      {phase === 'asking' && (
        <>
          <p style={{ fontSize: 12, color: 'var(--vscode-descriptionForeground)' }}>Question {turnNum} of ~4</p>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>{question}</p>
          <input
            ref={inputRef}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAnswer()}
            placeholder="Your answer..."
            style={s.input}
          />
          <button onClick={handleAnswer} style={s.btn}>Submit →</button>
        </>
      )}

      {phase === 'refused' && (
        <div style={s.error}>
          <p style={{ margin: 0, fontWeight: 600 }}>🚫 {refuseMsg}</p>
          <button onClick={reset} style={{ ...s.linkBtn, marginTop: 8, width: 'auto' }}>Start over</button>
        </div>
      )}

      {phase === 'complete' && (
        <>
          <p style={{ fontWeight: 600, marginBottom: 6 }}>✅ Assembled Prompt</p>
          <pre style={s.pre}>{assembled}</pre>
          {scores && (
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--vscode-descriptionForeground)' }}>
              Depth: {scores.thinking_depth_score}/100 · Dep: {scores.dependency_score}/100 · Turns saved: {scores.estimated_turns_saved}
            </div>
          )}
          <button onClick={handleSendToTerminal} style={{ ...s.btn, background: '#2563eb', color: '#fff' }}>
            Send to Claude Code →
          </button>
          <button onClick={reset} style={s.linkBtn}>New session</button>
        </>
      )}

      {phase === 'sent' && (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <p style={{ fontSize: 24 }}>🚀</p>
          <p>Prompt sent to terminal!</p>
          <button onClick={reset} style={s.linkBtn}>New session</button>
        </div>
      )}
    </div>
  );
}
