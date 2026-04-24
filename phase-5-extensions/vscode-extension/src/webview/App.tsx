/**
 * VS Code Webview React App — Phase 5, Task 5.3
 *
 * Renders the full question flow UI inside the PromptOS sidebar webview.
 *
 * State machine:
 *   idle → asking (Q loop) → complete → sent
 *
 * Communicates with the extension host via window.vscode.postMessage.
 */

import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const vscode = (window as any).acquireVsCodeApi?.();

type Phase = 'idle' | 'asking' | 'refused' | 'complete' | 'sent';

interface Scores {
  token_efficiency_score: number;
  thinking_depth_score: number;
  dependency_score: number;
  estimated_turns_saved: number;
}

export default function App() {
  const [phase, setPhase]               = useState<Phase>('idle');
  const [rawPrompt, setRawPrompt]       = useState('');
  const [sessionId, setSessionId]       = useState<string | null>(null);
  const [question, setQuestion]         = useState('');
  const [turnNum, setTurnNum]           = useState(1);
  const [answer, setAnswer]             = useState('');
  const [assembled, setAssembled]       = useState('');
  const [scores, setScores]             = useState<Scores | null>(null);
  const [refuseMsg, setRefuseMsg]       = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  // Listen for messages from extension host
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      switch (msg.type) {
        case 'sessionStarted':
          setSessionId(msg.sessionId);
          // Immediately request first question
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
              vscode?.postMessage({ type: 'completeSession', sessionId });
            }
          } else {
            setQuestion(msg.question);
            setTurnNum(msg.turn ?? turnNum + 1);
            setPhase('asking');
            setTimeout(() => inputRef.current?.focus(), 100);
          }
          break;
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [sessionId, turnNum]);

  const handleStart = () => {
    if (!rawPrompt.trim()) return;
    vscode?.postMessage({ type: 'startSession', rawPrompt: rawPrompt.trim() });
  };

  const handleAnswer = () => {
    if (!answer.trim() || !sessionId) return;
    vscode?.postMessage({ type: 'sendMessage', sessionId, userMessage: answer.trim() });
    setAnswer('');
  };

  const handleSendToTerminal = () => {
    vscode?.postMessage({ type: 'sendToTerminal', assembledPrompt: assembled });
    setPhase('sent');
  };

  return (
    <div style={{ padding: 16, fontFamily: 'var(--vscode-font-family)', color: 'var(--vscode-editor-foreground)' }}>
      <h2 style={{ margin: '0 0 12px', fontSize: 16 }}>⚡ PromptOS</h2>

      {/* Idle — prompt entry */}
      {phase === 'idle' && (
        <>
          <textarea
            placeholder="Paste your raw prompt here..."
            value={rawPrompt}
            onChange={(e) => setRawPrompt(e.target.value)}
            rows={4}
            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)', border: '1px solid var(--vscode-input-border)', borderRadius: 6, padding: 8, resize: 'vertical' }}
          />
          <button onClick={handleStart} style={{ marginTop: 8, width: '100%', padding: '8px 0', background: 'var(--vscode-button-background)', color: 'var(--vscode-button-foreground)', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            Start Refinement →
          </button>
        </>
      )}

      {/* Asking — question loop */}
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
            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)', border: '1px solid var(--vscode-input-border)', borderRadius: 6, padding: 8 }}
          />
          <button onClick={handleAnswer} style={{ marginTop: 8, width: '100%', padding: '8px 0', background: 'var(--vscode-button-background)', color: 'var(--vscode-button-foreground)', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            Submit →
          </button>
        </>
      )}

      {/* Refused — Refusal Engine fired */}
      {phase === 'refused' && (
        <div style={{ background: '#f59e0b22', border: '1px solid #f59e0b', borderRadius: 8, padding: 12 }}>
          <p style={{ margin: 0, fontWeight: 600 }}>🚫 {refuseMsg}</p>
          <button onClick={() => setPhase('idle')} style={{ marginTop: 8, background: 'transparent', color: 'var(--vscode-textLink-foreground)', border: 'none', cursor: 'pointer', padding: 0 }}>
            Start over
          </button>
        </div>
      )}

      {/* Complete — show assembled prompt + scores */}
      {phase === 'complete' && (
        <>
          <p style={{ fontWeight: 600, marginBottom: 6 }}>✅ Assembled Prompt</p>
          <pre style={{ fontSize: 11, background: 'var(--vscode-textCodeBlock-background)', padding: 10, borderRadius: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 200, overflow: 'auto' }}>
            {assembled}
          </pre>
          {scores && (
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--vscode-descriptionForeground)' }}>
              <div>Depth: {scores.thinking_depth_score}/100 · Dep: {scores.dependency_score}/100 · Turns saved: {scores.estimated_turns_saved}</div>
            </div>
          )}
          <button onClick={handleSendToTerminal} style={{ marginTop: 10, width: '100%', padding: '8px 0', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            Send to Claude Code →
          </button>
          <button onClick={() => { setPhase('idle'); setRawPrompt(''); setAssembled(''); setScores(null); }} style={{ marginTop: 6, width: '100%', padding: '6px 0', background: 'transparent', color: 'var(--vscode-textLink-foreground)', border: 'none', cursor: 'pointer' }}>
            New session
          </button>
        </>
      )}

      {/* Sent to terminal */}
      {phase === 'sent' && (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <p style={{ fontSize: 24 }}>🚀</p>
          <p>Prompt sent to terminal!</p>
          <button onClick={() => { setPhase('idle'); setRawPrompt(''); setAssembled(''); setScores(null); }} style={{ marginTop: 8, background: 'transparent', color: 'var(--vscode-textLink-foreground)', border: 'none', cursor: 'pointer' }}>
            New session
          </button>
        </div>
      )}
    </div>
  );
}

// Mount
const root = document.getElementById('root');
if (root) createRoot(root).render(<App />);
