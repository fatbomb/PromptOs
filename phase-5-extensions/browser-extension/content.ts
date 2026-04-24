/**
 * Browser Extension Content Script — Phase 5, Task 5.4
 *
 * Injects the "Enhance with PromptOS" button below the chat input
 * on claude.ai and chat.openai.com.
 * Uses Shadow DOM to isolate the overlay UI from the host page's CSS.
 *
 * Real question flow:
 *   POST /session/start → loop POST /session/message → inject assembled prompt
 */

const API_BASE = 'http://localhost:8000';

// JWT stored in chrome.storage.local — optional when backend runs in dev mode (AUTH_REQUIRED=false)
async function getToken(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get('promptos_jwt', (result) => {
      resolve(result.promptos_jwt ?? null);
    });
  });
}

async function apiFetch(path: string, body: object): Promise<Record<string, unknown>> {
  const token = await getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Site config
// ---------------------------------------------------------------------------

interface SiteConfig {
  host: string;
  inputSelector: string;
  buttonContainer: string;
}

const SITES: Record<string, SiteConfig> = {
  claude: {
    host: 'claude.ai',
    inputSelector: 'div[contenteditable="true"]',
    buttonContainer: 'fieldset',
  },
  chatgpt: {
    host: 'chat.openai.com',
    inputSelector: 'textarea#prompt-textarea',
    buttonContainer: 'form',
  },
};

const currentSite = Object.values(SITES).find((s) =>
  window.location.hostname.includes(s.host)
);
if (!currentSite) {
  // Not on a supported site — do nothing
  throw new Error('PromptOS: unsupported site');
}

// ---------------------------------------------------------------------------
// Button injection
// ---------------------------------------------------------------------------

function injectButton(): void {
  if (document.getElementById('promptos-inject-btn')) return;

  const container = document.querySelector(currentSite!.buttonContainer);
  if (!container) return;

  const btn = document.createElement('button');
  btn.id = 'promptos-inject-btn';
  btn.innerText = '⚡ Enhance with PromptOS';
  btn.style.cssText = `
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 6px 14px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    margin-top: 8px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    z-index: 9999;
  `;

  btn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    openOverlay();
  };

  container.appendChild(btn);
}

// ---------------------------------------------------------------------------
// Overlay — Shadow DOM isolated question flow
// ---------------------------------------------------------------------------

function openOverlay(): void {
  // Prevent duplicate overlays
  if (document.getElementById('promptos-overlay-host')) return;

  const inputEl = document.querySelector(
    currentSite!.inputSelector
  ) as HTMLElement | HTMLTextAreaElement | null;

  const rawPrompt = inputEl
    ? 'value' in inputEl
      ? (inputEl as HTMLTextAreaElement).value
      : inputEl.innerText
    : '';

  // Host element + Shadow DOM
  const hostDiv = document.createElement('div');
  hostDiv.id = 'promptos-overlay-host';
  hostDiv.style.cssText =
    'position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.65);';

  const shadow = hostDiv.attachShadow({ mode: 'open' });

  // Inject styles
  const style = document.createElement('style');
  style.textContent = overlayCSS();
  shadow.appendChild(style);

  // Initial UI — show raw prompt, Start Flow button
  shadow.appendChild(buildInitialUI(rawPrompt));
  document.body.appendChild(hostDiv);

  // Close on backdrop click
  hostDiv.addEventListener('click', (e) => {
    if (e.target === hostDiv) hostDiv.remove();
  });

  // Wire up Start Flow
  shadow.getElementById('promptos-start-btn')!.addEventListener('click', () => {
    runQuestionFlow(shadow, hostDiv, inputEl, rawPrompt);
  });

  shadow.getElementById('promptos-close-btn')!.addEventListener('click', () => {
    hostDiv.remove();
  });
}

// ---------------------------------------------------------------------------
// Question flow state machine
// ---------------------------------------------------------------------------

async function runQuestionFlow(
  shadow: ShadowRoot,
  hostDiv: HTMLElement,
  inputEl: HTMLElement | HTMLTextAreaElement | null,
  rawPrompt: string
): Promise<void> {
  // Show loading state
  setContent(shadow, loadingHTML('Starting session...'));

  let sessionId: string;
  try {
    const startRes = await apiFetch('/session/start', { raw_prompt: rawPrompt });
    sessionId = startRes.session_id as string;
  } catch (err) {
    setContent(shadow, errorHTML(`Failed to start session: ${err}`));
    return;
  }

  // Kick off first turn
  await askNextQuestion(shadow, hostDiv, inputEl, sessionId, '_init_', 1);
}

async function askNextQuestion(
  shadow: ShadowRoot,
  hostDiv: HTMLElement,
  inputEl: HTMLElement | HTMLTextAreaElement | null,
  sessionId: string,
  userMessage: string,
  turnNum: number
): Promise<void> {
  setContent(shadow, loadingHTML('Thinking...'));

  let msgRes: Record<string, unknown>;
  try {
    msgRes = await apiFetch('/session/message', {
      session_id: sessionId,
      user_message: userMessage,
    });
  } catch (err) {
    setContent(shadow, errorHTML(`API error: ${err}`));
    return;
  }

  if (msgRes.done) {
    if (msgRes.should_refuse) {
      // Refusal Engine fired
      setContent(shadow, refusalHTML(msgRes.message as string));
      shadow.getElementById('promptos-restart-btn')?.addEventListener('click', () => hostDiv.remove());
    } else {
      // Session complete — inject assembled prompt
      const assembled = msgRes.assembled_prompt as string;
      const scores = msgRes.scores as Record<string, number> | undefined;
      setContent(shadow, completeHTML(assembled, scores));

      shadow.getElementById('promptos-inject-btn-confirm')?.addEventListener('click', () => {
        injectPrompt(inputEl, assembled);
        hostDiv.remove();
      });
      shadow.getElementById('promptos-cancel-btn')?.addEventListener('click', () => hostDiv.remove());
      shadow.getElementById('promptos-close-btn')?.addEventListener('click', () => hostDiv.remove());
    }
    return;
  }

  // Show next question
  const question = msgRes.question as string;
  setContent(shadow, questionHTML(question, turnNum));

  const submitAnswer = async () => {
    const input = shadow.getElementById('promptos-answer-input') as HTMLInputElement | null;
    const answer = input?.value.trim();
    if (!answer) return;
    await askNextQuestion(shadow, hostDiv, inputEl, sessionId, answer, turnNum + 1);
  };

  shadow.getElementById('promptos-submit-btn')?.addEventListener('click', submitAnswer);
  const answerInput = shadow.getElementById('promptos-answer-input') as HTMLInputElement | null;
  answerInput?.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') submitAnswer();
  });
  setTimeout(() => answerInput?.focus(), 50);
}

// ---------------------------------------------------------------------------
// Inject assembled prompt back into the page input
// ---------------------------------------------------------------------------

function injectPrompt(
  inputEl: HTMLElement | HTMLTextAreaElement | null,
  text: string
): void {
  if (!inputEl) return;
  if ('value' in inputEl) {
    (inputEl as HTMLTextAreaElement).value = text;
  } else {
    inputEl.innerText = text;
  }
  // Trigger React/framework synthetic event so the page picks up the change
  inputEl.dispatchEvent(new Event('input', { bubbles: true }));
  inputEl.dispatchEvent(new Event('change', { bubbles: true }));
  inputEl.focus();
}

// ---------------------------------------------------------------------------
// Shadow DOM helpers — set inner content
// ---------------------------------------------------------------------------

function setContent(shadow: ShadowRoot, html: string): void {
  let wrapper = shadow.getElementById('promptos-wrapper');
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.id = 'promptos-wrapper';
    shadow.appendChild(wrapper);
  }
  wrapper.innerHTML = html;
}

// ---------------------------------------------------------------------------
// HTML templates
// ---------------------------------------------------------------------------

function buildInitialUI(rawPrompt: string): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.id = 'promptos-wrapper';
  wrapper.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title">⚡ PromptOS Refinement</span>
        <button id="promptos-close-btn" class="close-btn">×</button>
      </div>
      <div class="modal-body">
        <p class="label">Your current prompt</p>
        <pre class="prompt-preview">${escapeHtml(rawPrompt || '(empty — type a prompt first)')}</pre>
        <button id="promptos-start-btn" class="primary-btn">Start Refinement →</button>
      </div>
    </div>
  `;
  return wrapper;
}

function loadingHTML(msg: string): string {
  return `
    <div class="modal">
      <div class="modal-body center">
        <div class="spinner-wrap">
          <div class="spinner"></div>
          <span>${escapeHtml(msg)}</span>
        </div>
      </div>
    </div>
  `;
}

function questionHTML(question: string, turn: number): string {
  const dots = Array.from({ length: 4 }, (_, i) =>
    `<span class="step-dot${i < turn ? ' active' : ''}"></span>`
  ).join('');

  return `
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title">⚡ PromptOS</span>
        <div class="step-info">
          <span>Q${turn} of ~4</span>
          <div class="step-dots">${dots}</div>
        </div>
        <div style="width:24px"></div>
      </div>
      <div class="modal-body">
        <div class="question-card">
          <p class="question-text">${escapeHtml(question)}</p>
        </div>
        <input id="promptos-answer-input" class="answer-input" type="text" placeholder="Your answer... (Enter to submit)" autocomplete="off" />
        <button id="promptos-submit-btn" class="primary-btn">Submit →</button>
      </div>
    </div>
  `;
}

function refusalHTML(message: string): string {
  return `
    <div class="modal">
      <div class="modal-body">
        <div class="refuse-card">
          <p class="refuse-title">🚫 Refusal Engine</p>
          <p class="refuse-msg">${escapeHtml(message ?? 'You already know the answer. Try implementing it.')}</p>
        </div>
        <button id="promptos-restart-btn" class="secondary-btn">Close</button>
      </div>
    </div>
  `;
}

function scoreBarHTML(val: number): string {
  const color = val >= 75 ? '#10B981' : val >= 40 ? '#F59E0B' : '#EF4444';
  const filled = Math.round((val / 100) * 16);
  const bar = `<span style="color:${color}">${'█'.repeat(filled)}</span>${'░'.repeat(16 - filled)}`;
  return `<span class="score-bar">${bar}</span>`;
}

function completeHTML(assembled: string, scores?: Record<string, number>): string {
  const scoresHTML = scores ? `
    <div class="scores">
      <div class="score-row">
        <span class="score-label">Token Efficiency</span>
        <span class="score-val" style="color:${scores.token_efficiency_score >= 75 ? '#10B981' : scores.token_efficiency_score >= 40 ? '#F59E0B' : '#EF4444'}">${scores.token_efficiency_score}</span>
        ${scoreBarHTML(scores.token_efficiency_score)}
      </div>
      <div class="score-row">
        <span class="score-label">Thinking Depth</span>
        <span class="score-val" style="color:${scores.thinking_depth_score >= 75 ? '#10B981' : scores.thinking_depth_score >= 40 ? '#F59E0B' : '#EF4444'}">${scores.thinking_depth_score}</span>
        ${scoreBarHTML(scores.thinking_depth_score)}
      </div>
      <div class="score-row">
        <span class="score-label">AI Dependency</span>
        <span class="score-val" style="color:${scores.dependency_score >= 75 ? '#10B981' : scores.dependency_score >= 40 ? '#F59E0B' : '#EF4444'}">${scores.dependency_score}</span>
        ${scoreBarHTML(scores.dependency_score)}
      </div>
      <div class="turns-saved">Turns saved: <strong style="color:#10B981">${scores.estimated_turns_saved}</strong></div>
    </div>
  ` : '';

  return `
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title">✦ Assembled Prompt</span>
        <button id="promptos-close-btn" class="close-btn">×</button>
      </div>
      <div class="modal-body">
        <pre class="assembled-prompt">${escapeHtml(assembled)}</pre>
        ${scoresHTML}
        <button id="promptos-inject-btn-confirm" class="accent-btn">Inject into chat →</button>
        <button id="promptos-cancel-btn" class="secondary-btn">Cancel</button>
      </div>
    </div>
  `;
}

function errorHTML(msg: string): string {
  return `
    <div class="modal">
      <div class="modal-body">
        <div class="error-card">
          <p class="error-msg">⚠️ ${escapeHtml(msg)}</p>
          <p class="hint">Make sure the PromptOS backend is running on localhost:8000.</p>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Overlay CSS (injected into Shadow DOM)
// ---------------------------------------------------------------------------

function overlayCSS(): string {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }

    .modal {
      background: #0f0f17;
      color: #e2e8f0;
      border: 1px solid #1e1b2e;
      border-top: 2px solid transparent;
      border-image: linear-gradient(90deg, #7C3AED, #06B6D4, #10B981) 1 0 0 0;
      border-radius: 14px;
      width: 500px;
      max-width: 96vw;
      max-height: 82vh;
      display: flex;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      overflow: hidden;
      box-shadow: 0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px #1e1b2e;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 13px 16px 12px;
      border-bottom: 1px solid #1e1b2e;
      background: #0d0d14;
    }

    .modal-title {
      font-weight: 700;
      font-size: 14px;
      background: linear-gradient(90deg, #7C3AED, #06B6D4, #10B981);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: -0.2px;
    }

    .step-info {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      color: #6B7280;
    }

    .step-dots {
      display: flex;
      gap: 4px;
    }

    .step-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #374151;
      transition: background 0.2s;
    }

    .step-dot.active { background: #7C3AED; }

    .close-btn {
      background: none;
      border: none;
      color: #4B5563;
      font-size: 18px;
      cursor: pointer;
      line-height: 1;
      padding: 2px 6px;
      border-radius: 4px;
      transition: color 0.15s, background 0.15s;
    }
    .close-btn:hover { color: #e2e8f0; background: #1e1b2e; }

    .modal-body {
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .modal-body.center {
      align-items: center;
      text-align: center;
      justify-content: center;
      min-height: 120px;
    }

    .label {
      font-size: 10px;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 600;
    }

    .prompt-preview {
      background: #0d0d14;
      border: 1px solid #1e1b2e;
      border-left: 3px solid #7C3AED;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 100px;
      overflow-y: auto;
      color: #a78bfa;
      font-family: 'Fira Code', 'Cascadia Code', monospace;
      line-height: 1.5;
    }

    .assembled-prompt {
      background: #0d0d14;
      border: 1px solid #1e1b2e;
      border-left: 3px solid #10B981;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 160px;
      overflow-y: auto;
      color: #6ee7b7;
      font-family: 'Fira Code', 'Cascadia Code', monospace;
      line-height: 1.5;
    }

    .question-card {
      background: #0d0d14;
      border: 1px solid #1e1b2e;
      border-left: 3px solid #7C3AED;
      border-radius: 8px;
      padding: 12px 14px;
    }

    .question-text {
      font-size: 14px;
      font-weight: 600;
      line-height: 1.55;
      color: #e2e8f0;
    }

    .answer-input {
      width: 100%;
      background: #0d0d14;
      border: 1px solid #374151;
      border-radius: 8px;
      padding: 10px 12px;
      color: #e2e8f0;
      font-size: 14px;
      outline: none;
      transition: border-color 0.15s;
    }
    .answer-input:focus { border-color: #7C3AED; box-shadow: 0 0 0 2px #7C3AED22; }

    .primary-btn {
      width: 100%;
      padding: 10px;
      background: linear-gradient(90deg, #7C3AED, #06B6D4);
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.15s;
      letter-spacing: 0.1px;
    }
    .primary-btn:hover { opacity: 0.9; }
    .primary-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    .accent-btn {
      width: 100%;
      padding: 10px;
      background: linear-gradient(90deg, #10B981, #06B6D4);
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .accent-btn:hover { opacity: 0.9; }

    .secondary-btn {
      width: 100%;
      padding: 8px;
      background: transparent;
      color: #06B6D4;
      border: 1px solid #1e1b2e;
      border-radius: 8px;
      font-size: 13px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .secondary-btn:hover { background: #1e1b2e; }

    .scores {
      display: flex;
      flex-direction: column;
      gap: 6px;
      background: #0d0d14;
      border: 1px solid #1e1b2e;
      border-radius: 8px;
      padding: 10px 12px;
    }

    .score-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
    }

    .score-label { color: #6B7280; width: 110px; flex-shrink: 0; }
    .score-val   { font-weight: 700; width: 28px; }
    .score-bar   { font-family: monospace; font-size: 10px; letter-spacing: -1px; }

    .turns-saved {
      font-size: 10px;
      color: #6B7280;
      margin-top: 2px;
    }

    .refuse-card {
      background: #1a1200;
      border: 1px solid #F59E0B44;
      border-left: 3px solid #F59E0B;
      border-radius: 8px;
      padding: 12px 14px;
    }

    .refuse-title { font-weight: 700; font-size: 13px; color: #F59E0B; margin-bottom: 6px; }
    .refuse-msg   { font-size: 13px; color: #e2e8f0; line-height: 1.5; }

    .error-card {
      background: #1a0808;
      border: 1px solid #EF444444;
      border-left: 3px solid #EF4444;
      border-radius: 8px;
      padding: 12px 14px;
    }

    .error-msg { font-size: 13px; color: #fca5a5; margin-bottom: 4px; }
    .hint      { font-size: 11px; color: #6B7280; }

    .spinner-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #06B6D4;
      font-size: 13px;
    }

    .spinner {
      width: 18px;
      height: 18px;
      border: 2px solid #1e1b2e;
      border-top-color: #7C3AED;
      border-right-color: #06B6D4;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      flex-shrink: 0;
    }

    @keyframes spin { to { transform: rotate(360deg); } }
  `;
}

// ---------------------------------------------------------------------------
// DOM observer — re-inject button on SPA navigation
// ---------------------------------------------------------------------------

const observer = new MutationObserver(() => injectButton());
observer.observe(document.body, { childList: true, subtree: true });

// Initial attempt after page settles
setTimeout(injectButton, 2000);
