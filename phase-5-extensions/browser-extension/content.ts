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
        <p class="label">Your current prompt:</p>
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
        <div class="spinner"></div>
        <p>${escapeHtml(msg)}</p>
      </div>
    </div>
  `;
}

function questionHTML(question: string, turn: number): string {
  return `
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title">⚡ PromptOS — Question ${turn} of ~4</span>
      </div>
      <div class="modal-body">
        <p class="question-text">${escapeHtml(question)}</p>
        <input id="promptos-answer-input" class="answer-input" type="text" placeholder="Your answer..." autocomplete="off" />
        <button id="promptos-submit-btn" class="primary-btn">Submit →</button>
      </div>
    </div>
  `;
}

function refusalHTML(message: string): string {
  return `
    <div class="modal">
      <div class="modal-body center">
        <p class="refuse-msg">🚫 ${escapeHtml(message ?? 'You already know the answer. Try implementing it.')}</p>
        <button id="promptos-restart-btn" class="secondary-btn">Close</button>
      </div>
    </div>
  `;
}

function completeHTML(assembled: string, scores?: Record<string, number>): string {
  const scoreBar = scores
    ? `<div class="scores">
        <span>Depth: ${scores.thinking_depth_score}/100</span>
        <span>Dep: ${scores.dependency_score}/100</span>
        <span>Turns saved: ${scores.estimated_turns_saved}</span>
       </div>`
    : '';
  return `
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title">✅ Assembled Prompt</span>
      </div>
      <div class="modal-body">
        <pre class="assembled-prompt">${escapeHtml(assembled)}</pre>
        ${scoreBar}
        <button id="promptos-inject-btn-confirm" class="primary-btn">Inject into chat →</button>
        <button id="promptos-cancel-btn" class="secondary-btn">Cancel</button>
      </div>
    </div>
  `;
}

function errorHTML(msg: string): string {
  return `
    <div class="modal">
      <div class="modal-body center">
        <p class="error-msg">⚠️ ${escapeHtml(msg)}</p>
        <p class="hint">Make sure the PromptOS backend is running on localhost:8000.</p>
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
      background: #1e1e2e;
      color: #cdd6f4;
      border: 1px solid #313244;
      border-radius: 12px;
      width: 480px;
      max-width: 95vw;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      overflow: hidden;
      box-shadow: 0 24px 64px rgba(0,0,0,0.6);
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      border-bottom: 1px solid #313244;
    }

    .modal-title {
      font-weight: 700;
      font-size: 15px;
    }

    .close-btn {
      background: none;
      border: none;
      color: #6c7086;
      font-size: 20px;
      cursor: pointer;
      line-height: 1;
      padding: 0 4px;
    }
    .close-btn:hover { color: #cdd6f4; }

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
    }

    .label {
      font-size: 12px;
      color: #6c7086;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .prompt-preview, .assembled-prompt {
      background: #181825;
      border: 1px solid #313244;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 140px;
      overflow-y: auto;
      color: #a6e3a1;
      font-family: 'Fira Code', 'Cascadia Code', monospace;
    }

    .question-text {
      font-size: 15px;
      font-weight: 600;
      line-height: 1.5;
    }

    .answer-input {
      width: 100%;
      background: #181825;
      border: 1px solid #45475a;
      border-radius: 8px;
      padding: 10px 12px;
      color: #cdd6f4;
      font-size: 14px;
      outline: none;
    }
    .answer-input:focus { border-color: #89b4fa; }

    .primary-btn {
      width: 100%;
      padding: 10px;
      background: #2563eb;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    .primary-btn:hover { background: #1d4ed8; }

    .secondary-btn {
      width: 100%;
      padding: 8px;
      background: transparent;
      color: #89b4fa;
      border: 1px solid #313244;
      border-radius: 8px;
      font-size: 13px;
      cursor: pointer;
    }
    .secondary-btn:hover { background: #313244; }

    .scores {
      display: flex;
      gap: 12px;
      font-size: 12px;
      color: #6c7086;
    }

    .refuse-msg {
      font-size: 15px;
      font-weight: 600;
      color: #f9e2af;
    }

    .error-msg {
      font-size: 14px;
      color: #f38ba8;
    }

    .hint {
      font-size: 12px;
      color: #6c7086;
    }

    .spinner {
      width: 28px;
      height: 28px;
      border: 3px solid #313244;
      border-top-color: #89b4fa;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
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
