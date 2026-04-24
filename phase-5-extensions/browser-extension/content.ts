/**
 * Browser Extension Content Script — PromptOS Copilot
 *
 * Injects the "⚡ PromptOS Copilot" button below the chat input
 * on claude.ai and chat.openai.com.
 * Uses Shadow DOM to isolate the overlay UI from the host page's CSS.
 *
 * Command Center → Context + Mode + Tool → Question Flow → Inject
 */

const API_BASE = 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Session configuration state
// ---------------------------------------------------------------------------

interface SessionConfig {
  mode: string;
  targetTool: string;
  contextCode: string;
  contextError: string;
  contextProject: string;
}

let sessionConfig: SessionConfig = {
  mode: 'default',
  targetTool: 'auto',
  contextCode: '',
  contextError: '',
  contextProject: '',
};

// ---------------------------------------------------------------------------
// Mode & preset definitions
// ---------------------------------------------------------------------------

interface ModeOption {
  id: string;
  icon: string;
  label: string;
  backendMode: string;
  desc: string;
}

const MODES: ModeOption[] = [
  { id: 'bugfix',   icon: '🐛', label: 'Bug Fix',   backendMode: 'default', desc: 'Full deep-dive debugging' },
  { id: 'feature',  icon: '✨', label: 'Feature',   backendMode: 'default', desc: 'Build something new' },
  { id: 'refactor', icon: '♻️', label: 'Refactor',  backendMode: 'mid',     desc: 'Clean up existing code' },
  { id: 'review',   icon: '🔍', label: 'Review',    backendMode: 'mid',     desc: 'Code review assistance' },
  { id: 'learn',    icon: '📖', label: 'Learn',     backendMode: 'skip',    desc: 'Instant explanation' },
];

interface PresetOption {
  icon: string;
  label: string;
  prompt: string;
  mode: string;
  contextType: string;
}

const PRESETS: PresetOption[] = [
  { icon: '🐛', label: 'Debug this error',    prompt: 'Help me debug this error',                      mode: 'default', contextType: 'error' },
  { icon: '📝', label: 'Explain this code',    prompt: 'Explain how this code works step by step',      mode: 'skip',    contextType: 'code' },
  { icon: '♻️', label: 'Refactor for perf',   prompt: 'Refactor this code for better performance',     mode: 'mid',     contextType: 'code' },
  { icon: '🧪', label: 'Write tests',          prompt: 'Write comprehensive tests for this code',       mode: 'mid',     contextType: 'code' },
  { icon: '📖', label: 'How does this work?',  prompt: 'Explain the architecture and design decisions', mode: 'skip',    contextType: '' },
  { icon: '🔒', label: 'Security audit',       prompt: 'Review this code for security vulnerabilities', mode: 'mid',     contextType: 'code' },
];

const TOOLS = ['auto', 'claude', 'chatgpt', 'gemini'] as const;

// ---------------------------------------------------------------------------
// JWT helper
// ---------------------------------------------------------------------------

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
  toolName: string;
}

const SITES: Record<string, SiteConfig> = {
  claude: {
    host: 'claude.ai',
    inputSelector: 'div[contenteditable="true"]',
    buttonContainer: 'fieldset',
    toolName: 'claude',
  },
  chatgpt: {
    host: 'chat.openai.com',
    inputSelector: 'textarea#prompt-textarea',
    buttonContainer: 'form',
    toolName: 'chatgpt',
  },
};

const currentSite = Object.values(SITES).find((s) =>
  window.location.hostname.includes(s.host)
);
if (!currentSite) {
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
  btn.innerText = '⚡ PromptOS Copilot';
  btn.style.cssText = `
    background: linear-gradient(90deg, #7C3AED, #06B6D4);
    color: white;
    border: none;
    border-radius: 8px;
    padding: 7px 16px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    margin-top: 8px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    z-index: 9999;
    transition: opacity 0.15s, transform 0.15s;
  `;

  btn.onmouseenter = () => { btn.style.opacity = '0.9'; btn.style.transform = 'translateY(-1px)'; };
  btn.onmouseleave = () => { btn.style.opacity = '1'; btn.style.transform = 'translateY(0)'; };

  btn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    openOverlay();
  };

  container.appendChild(btn);
}

// ---------------------------------------------------------------------------
// Overlay — Shadow DOM isolated Command Center
// ---------------------------------------------------------------------------

function openOverlay(): void {
  if (document.getElementById('promptos-overlay-host')) return;

  const inputEl = document.querySelector(
    currentSite!.inputSelector
  ) as HTMLElement | HTMLTextAreaElement | null;

  const rawPrompt = inputEl
    ? 'value' in inputEl
      ? (inputEl as HTMLTextAreaElement).value
      : inputEl.innerText
    : '';

  // Reset session config
  sessionConfig = {
    mode: 'default',
    targetTool: currentSite!.toolName,
    contextCode: '',
    contextError: '',
    contextProject: '',
  };

  const hostDiv = document.createElement('div');
  hostDiv.id = 'promptos-overlay-host';
  hostDiv.style.cssText =
    'position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);';

  const shadow = hostDiv.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = overlayCSS();
  shadow.appendChild(style);

  shadow.appendChild(buildCommandCenter(rawPrompt));
  document.body.appendChild(hostDiv);

  // Close on backdrop click
  hostDiv.addEventListener('click', (e) => {
    if (e.target === hostDiv) hostDiv.remove();
  });

  wireCommandCenter(shadow, hostDiv, inputEl, rawPrompt);
}

// ---------------------------------------------------------------------------
// Command Center — the new initial UI
// ---------------------------------------------------------------------------

function buildCommandCenter(rawPrompt: string): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.id = 'promptos-wrapper';

  const autoTool = currentSite!.toolName;
  const toolButtons = TOOLS.map((t) => {
    const isActive = t === autoTool;
    const label = t === 'auto' ? `Auto (${autoTool})` : t.charAt(0).toUpperCase() + t.slice(1);
    return `<button class="tool-btn${isActive ? ' active' : ''}" data-tool="${t}">${label}</button>`;
  }).join('');

  const modeButtons = MODES.map((m, i) => {
    const isActive = i === 0;
    return `<button class="mode-btn${isActive ? ' active' : ''}" data-mode-id="${m.id}" data-backend-mode="${m.backendMode}" title="${m.desc}">${m.icon} ${m.label}</button>`;
  }).join('');

  const presetChips = PRESETS.map((p, i) =>
    `<button class="preset-chip" data-preset-idx="${i}">${p.icon} ${p.label}</button>`
  ).join('');

  wrapper.innerHTML = `
    <div class="modal command-center">
      <div class="modal-header">
        <span class="modal-title">⚡ PromptOS Copilot</span>
        <span class="header-badge">coding companion</span>
        <button id="promptos-close-btn" class="close-btn">×</button>
      </div>
      <div class="modal-body">

        <!-- Prompt Preview -->
        <div class="section">
          <div class="section-header" id="promptos-prompt-toggle">
            <span class="section-icon">💬</span>
            <span class="section-label">YOUR PROMPT</span>
            <span class="section-chevron">▾</span>
          </div>
          <div id="promptos-prompt-body" class="section-body">
            <pre class="prompt-preview">${escapeHtml(rawPrompt || '(empty — type a prompt first)')}</pre>
          </div>
        </div>

        <!-- Context Panel -->
        <div class="section">
          <div class="section-header" id="promptos-context-toggle">
            <span class="section-icon">📎</span>
            <span class="section-label">ADD CONTEXT</span>
            <span class="context-badge" id="promptos-context-badge" style="display:none;">0</span>
            <span class="section-chevron collapsed">▾</span>
          </div>
          <div id="promptos-context-body" class="section-body" style="display:none;">
            <div class="context-tabs">
              <button class="ctx-tab active" data-ctx="code">📄 Code</button>
              <button class="ctx-tab" data-ctx="error">🚨 Error Log</button>
              <button class="ctx-tab" data-ctx="project">🏗️ Stack</button>
            </div>
            <div class="ctx-panel" id="promptos-ctx-code">
              <textarea id="promptos-ctx-code-input" class="ctx-textarea" placeholder="Paste your code snippet, file contents, or relevant function here..."></textarea>
            </div>
            <div class="ctx-panel" id="promptos-ctx-error" style="display:none;">
              <textarea id="promptos-ctx-error-input" class="ctx-textarea" placeholder="Paste terminal errors, stack traces, or compiler output..."></textarea>
            </div>
            <div class="ctx-panel" id="promptos-ctx-project" style="display:none;">
              <input id="promptos-ctx-project-input" class="ctx-input" type="text" placeholder="e.g. Next.js 14 + Prisma + PostgreSQL + Tailwind" />
            </div>
          </div>
        </div>

        <!-- Mode Selector -->
        <div class="section">
          <div class="section-header-static">
            <span class="section-icon">🎯</span>
            <span class="section-label">MODE</span>
          </div>
          <div class="mode-grid">${modeButtons}</div>
        </div>

        <!-- Target Tool -->
        <div class="section">
          <div class="section-header-static">
            <span class="section-icon">🎯</span>
            <span class="section-label">OPTIMIZED FOR</span>
          </div>
          <div class="tool-grid">${toolButtons}</div>
        </div>

        <!-- Smart Presets -->
        <div class="section">
          <div class="section-header-static">
            <span class="section-icon">⚡</span>
            <span class="section-label">QUICK ACTIONS</span>
          </div>
          <div class="presets-grid">${presetChips}</div>
        </div>

        <!-- Start Button -->
        <button id="promptos-start-btn" class="primary-btn glow-btn">Start Refinement →</button>
      </div>
    </div>
  `;
  return wrapper;
}

function wireCommandCenter(
  shadow: ShadowRoot,
  hostDiv: HTMLElement,
  inputEl: HTMLElement | HTMLTextAreaElement | null,
  rawPrompt: string
): void {
  // Close
  shadow.getElementById('promptos-close-btn')!.addEventListener('click', () => hostDiv.remove());

  // Prompt section toggle
  shadow.getElementById('promptos-prompt-toggle')?.addEventListener('click', () => {
    const body = shadow.getElementById('promptos-prompt-body')!;
    const chevron = shadow.querySelector('#promptos-prompt-toggle .section-chevron')!;
    const isHidden = body.style.display === 'none';
    body.style.display = isHidden ? 'block' : 'none';
    chevron.classList.toggle('collapsed', !isHidden);
  });

  // Context section toggle
  shadow.getElementById('promptos-context-toggle')?.addEventListener('click', () => {
    const body = shadow.getElementById('promptos-context-body')!;
    const chevron = shadow.querySelector('#promptos-context-toggle .section-chevron')!;
    const isHidden = body.style.display === 'none';
    body.style.display = isHidden ? 'block' : 'none';
    chevron.classList.toggle('collapsed', !isHidden);
  });

  // Context tabs
  shadow.querySelectorAll('.ctx-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const ctx = (tab as HTMLElement).dataset.ctx!;
      shadow.querySelectorAll('.ctx-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      shadow.querySelectorAll('.ctx-panel').forEach((p) => (p as HTMLElement).style.display = 'none');
      shadow.getElementById(`promptos-ctx-${ctx}`)!.style.display = 'block';
    });
  });

  // Context badge updater
  const updateContextBadge = () => {
    const code = (shadow.getElementById('promptos-ctx-code-input') as HTMLTextAreaElement)?.value || '';
    const error = (shadow.getElementById('promptos-ctx-error-input') as HTMLTextAreaElement)?.value || '';
    const project = (shadow.getElementById('promptos-ctx-project-input') as HTMLInputElement)?.value || '';
    sessionConfig.contextCode = code;
    sessionConfig.contextError = error;
    sessionConfig.contextProject = project;
    const count = [code, error, project].filter((v) => v.trim().length > 0).length;
    const badge = shadow.getElementById('promptos-context-badge')!;
    badge.textContent = String(count);
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
  };
  shadow.getElementById('promptos-ctx-code-input')?.addEventListener('input', updateContextBadge);
  shadow.getElementById('promptos-ctx-error-input')?.addEventListener('input', updateContextBadge);
  shadow.getElementById('promptos-ctx-project-input')?.addEventListener('input', updateContextBadge);

  // Mode selector
  shadow.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      shadow.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      sessionConfig.mode = (btn as HTMLElement).dataset.backendMode!;
    });
  });

  // Tool selector
  shadow.querySelectorAll('.tool-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      shadow.querySelectorAll('.tool-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      sessionConfig.targetTool = (btn as HTMLElement).dataset.tool!;
    });
  });

  // Smart presets
  shadow.querySelectorAll('.preset-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const idx = parseInt((chip as HTMLElement).dataset.presetIdx!, 10);
      const preset = PRESETS[idx];
      // Set mode
      sessionConfig.mode = preset.mode;
      shadow.querySelectorAll('.mode-btn').forEach((b) => {
        const bMode = MODES.find((m) => m.backendMode === preset.mode);
        b.classList.toggle('active', (b as HTMLElement).dataset.backendMode === preset.mode && (b as HTMLElement).dataset.modeId === bMode?.id);
      });
      // Expand context panel if needed
      if (preset.contextType) {
        const body = shadow.getElementById('promptos-context-body')!;
        body.style.display = 'block';
        shadow.querySelectorAll('.ctx-tab').forEach((t) => {
          t.classList.toggle('active', (t as HTMLElement).dataset.ctx === preset.contextType);
        });
        shadow.querySelectorAll('.ctx-panel').forEach((p) => (p as HTMLElement).style.display = 'none');
        const panel = shadow.getElementById(`promptos-ctx-${preset.contextType}`);
        if (panel) panel.style.display = 'block';
      }
      // Start session with preset prompt
      const finalPrompt = rawPrompt ? `${rawPrompt}\n\n${preset.prompt}` : preset.prompt;
      updateContextBadge();
      runQuestionFlow(shadow, hostDiv, inputEl, finalPrompt);
    });
  });

  // Start button
  shadow.getElementById('promptos-start-btn')!.addEventListener('click', () => {
    updateContextBadge();
    runQuestionFlow(shadow, hostDiv, inputEl, rawPrompt);
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
  setContent(shadow, loadingHTML('Starting session...'));

  const token = await getToken();
  if (!token) {
    setContent(shadow, loginHTML());
    shadow.getElementById('promptos-login-btn')?.addEventListener('click', () => {
      window.open('http://localhost:3000/auth/login', '_blank');
      hostDiv.remove();
    });
    shadow.getElementById('promptos-close-login-btn')?.addEventListener('click', () => hostDiv.remove());
    return;
  }

  // Build workspace context from gathered inputs
  const workspaceContext: Record<string, string> = {};
  if (sessionConfig.contextCode.trim()) workspaceContext.code_snippet = sessionConfig.contextCode;
  if (sessionConfig.contextError.trim()) workspaceContext.error_log = sessionConfig.contextError;
  if (sessionConfig.contextProject.trim()) workspaceContext.project_stack = sessionConfig.contextProject;

  const resolvedTool = sessionConfig.targetTool === 'auto' ? currentSite!.toolName : sessionConfig.targetTool;

  let sessionId: string;
  try {
    const startRes = await apiFetch('/session/start', {
      raw_prompt: rawPrompt,
      mode: sessionConfig.mode,
      target_tool: resolvedTool,
      workspace_context: Object.keys(workspaceContext).length > 0 ? workspaceContext : null,
      source: 'browser_extension',
    });
    sessionId = startRes.session_id as string;
  } catch (err) {
    const errMsg = String(err);
    if (errMsg.includes('401') || errMsg.includes('403')) {
      setContent(shadow, loginHTML());
      shadow.getElementById('promptos-login-btn')?.addEventListener('click', () => {
        window.open('http://localhost:3000/auth/login', '_blank');
        hostDiv.remove();
      });
      shadow.getElementById('promptos-close-login-btn')?.addEventListener('click', () => hostDiv.remove());
    } else {
      setContent(shadow, errorHTML(`Failed to start session: ${err}`));
    }
    return;
  }

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
      setContent(shadow, refusalHTML(msgRes.message as string));
      shadow.getElementById('promptos-restart-btn')?.addEventListener('click', () => hostDiv.remove());
    } else {
      const assembled = msgRes.assembled_prompt as string;
      const scores = msgRes.scores as Record<string, number> | undefined;
      setContent(shadow, completeHTML(assembled, scores));

      shadow.getElementById('promptos-inject-btn-confirm')?.addEventListener('click', () => {
        injectPrompt(inputEl, assembled);
        hostDiv.remove();
      });
      shadow.getElementById('promptos-copy-btn')?.addEventListener('click', () => {
        navigator.clipboard.writeText(assembled);
        const copyBtn = shadow.getElementById('promptos-copy-btn');
        if (copyBtn) { copyBtn.textContent = '✓ Copied!'; setTimeout(() => { copyBtn.textContent = '📋 Copy'; }, 1500); }
      });
      shadow.getElementById('promptos-cancel-btn')?.addEventListener('click', () => hostDiv.remove());
      shadow.getElementById('promptos-close-btn')?.addEventListener('click', () => hostDiv.remove());
    }
    return;
  }

  const question = msgRes.question as string;
  const options = msgRes.options as string[] | undefined;
  setContent(shadow, questionHTML(question, turnNum, options));

  const submitAnswer = async (answerText?: string) => {
    const input = shadow.getElementById('promptos-answer-input') as HTMLInputElement | null;
    const answer = answerText || input?.value.trim();
    if (!answer) return;
    await askNextQuestion(shadow, hostDiv, inputEl, sessionId, answer, turnNum + 1);
  };

  shadow.getElementById('promptos-submit-btn')?.addEventListener('click', () => submitAnswer());
  shadow.getElementById('promptos-skip-btn')?.addEventListener('click', () => submitAnswer('Skip'));

  options?.forEach((opt, idx) => {
    shadow.getElementById(`promptos-opt-${idx}`)?.addEventListener('click', () => submitAnswer(opt));
  });

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
  inputEl.dispatchEvent(new Event('input', { bubbles: true }));
  inputEl.dispatchEvent(new Event('change', { bubbles: true }));
  inputEl.focus();
}

// ---------------------------------------------------------------------------
// Shadow DOM helpers
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

function questionHTML(question: string, turn: number, options?: string[]): string {
  const maxQ = sessionConfig.mode === 'mid' ? 3 : sessionConfig.mode === 'skip' ? 1 : 6;
  const dots = Array.from({ length: Math.min(maxQ, 6) }, (_, i) =>
    `<span class="step-dot${i < turn ? ' active' : ''}"></span>`
  ).join('');

  let optionsHTML = '';
  if (options && Array.isArray(options) && options.length > 0) {
    optionsHTML = `
      <div class="options-container">
        ${options.map((opt, i) => `<button id="promptos-opt-${i}" class="option-pill">${escapeHtml(opt)}</button>`).join('')}
      </div>
    `;
  }

  const modeLabel = MODES.find((m) => m.backendMode === sessionConfig.mode)?.label || 'Default';

  return `
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title">⚡ PromptOS Copilot</span>
        <div class="step-info">
          <span class="mode-badge-sm">${modeLabel}</span>
          <span>Q${turn} of ~${maxQ}</span>
          <div class="step-dots">${dots}</div>
        </div>
        <div style="width:24px"></div>
      </div>
      <div class="modal-body">
        <div class="question-card">
          <p class="question-text">${escapeHtml(question)}</p>
        </div>
        ${optionsHTML}
        <input id="promptos-answer-input" class="answer-input" type="text" placeholder="Or type your answer... (Enter to submit)" autocomplete="off" />
        <div class="action-buttons">
          <button id="promptos-skip-btn" class="secondary-btn" style="flex: 1;">Skip</button>
          <button id="promptos-submit-btn" class="primary-btn" style="flex: 2;">Submit →</button>
        </div>
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
  const modeLabel = MODES.find((m) => m.backendMode === sessionConfig.mode)?.label || 'Default';
  const toolLabel = sessionConfig.targetTool === 'auto' ? currentSite!.toolName : sessionConfig.targetTool;

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

  const contextSummary = [
    sessionConfig.contextCode ? '📄 Code' : '',
    sessionConfig.contextError ? '🚨 Error' : '',
    sessionConfig.contextProject ? '🏗️ Stack' : '',
  ].filter(Boolean).join(' · ');

  return `
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title">✦ Assembled Prompt</span>
        <button id="promptos-close-btn" class="close-btn">×</button>
      </div>
      <div class="modal-body">
        <div class="result-badges">
          <span class="result-badge purple">${modeLabel}</span>
          <span class="result-badge cyan">${toolLabel}</span>
          ${contextSummary ? `<span class="result-badge green">${contextSummary}</span>` : ''}
        </div>
        <pre class="assembled-prompt">${escapeHtml(assembled)}</pre>
        ${scoresHTML}
        <button id="promptos-inject-btn-confirm" class="accent-btn">Inject into chat →</button>
        <div class="action-buttons">
          <button id="promptos-copy-btn" class="secondary-btn" style="flex: 1;">📋 Copy</button>
          <button id="promptos-cancel-btn" class="secondary-btn" style="flex: 1;">Cancel</button>
        </div>
      </div>
    </div>
  `;
}

function loginHTML(): string {
  return `
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title">⚡ PromptOS Copilot</span>
        <button id="promptos-close-login-btn" class="close-btn">×</button>
      </div>
      <div class="modal-body center" style="padding: 24px 16px;">
        <div style="font-size:28px;margin-bottom:12px;">🔐</div>
        <p style="font-weight:700;font-size:14px;margin-bottom:8px;color:#e2e8f0;">Sign in required</p>
        <p style="font-size:12px;color:#6B7280;margin-bottom:20px;line-height:1.6;text-align:center;">
          Login via the PromptOS dashboard to use the extension
        </p>
        <button id="promptos-login-btn" class="primary-btn">Login with Google →</button>
        <p style="font-size:10px;color:#374151;margin-top:10px;">Opens localhost:3000 in a new tab</p>
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
      width: 560px;
      max-width: 96vw;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      overflow: hidden;
      box-shadow: 0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px #1e1b2e;
    }

    .command-center .modal-body { gap: 10px; }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 13px 16px 12px;
      border-bottom: 1px solid #1e1b2e;
      background: #0d0d14;
      gap: 10px;
    }

    .modal-title {
      font-weight: 700;
      font-size: 14px;
      background: linear-gradient(90deg, #7C3AED, #06B6D4, #10B981);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: -0.2px;
      flex-shrink: 0;
    }

    .header-badge {
      font-size: 10px;
      color: #4B5563;
      font-weight: 500;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

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
      flex-shrink: 0;
    }
    .close-btn:hover { color: #e2e8f0; background: #1e1b2e; }

    .modal-body {
      padding: 14px 16px;
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

    /* ---- Sections ---- */

    .section {
      border: 1px solid #1e1b2e;
      border-radius: 10px;
      overflow: hidden;
      background: #0d0d14;
    }

    .section-header, .section-header-static {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 12px;
      cursor: pointer;
      user-select: none;
      transition: background 0.15s;
    }
    .section-header:hover { background: #13131d; }
    .section-header-static { cursor: default; padding-bottom: 4px; }

    .section-icon { font-size: 13px; }
    .section-label {
      font-size: 10px;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 600;
      flex: 1;
    }
    .section-chevron {
      font-size: 10px;
      color: #4B5563;
      transition: transform 0.2s;
    }
    .section-chevron.collapsed { transform: rotate(-90deg); }

    .context-badge {
      background: #7C3AED;
      color: #fff;
      font-size: 9px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 16px;
      height: 16px;
    }

    .section-body {
      padding: 0 12px 12px;
    }

    /* ---- Context Panel ---- */

    .context-tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 8px;
    }

    .ctx-tab {
      background: transparent;
      border: 1px solid #1e1b2e;
      color: #6B7280;
      padding: 5px 10px;
      border-radius: 6px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .ctx-tab:hover { border-color: #374151; color: #9CA3AF; }
    .ctx-tab.active {
      background: #1e1b2e;
      border-color: #7C3AED55;
      color: #e2e8f0;
    }

    .ctx-textarea {
      width: 100%;
      min-height: 80px;
      max-height: 150px;
      background: #0a0a12;
      border: 1px solid #374151;
      border-radius: 8px;
      padding: 10px 12px;
      color: #e2e8f0;
      font-size: 12px;
      font-family: 'Fira Code', 'Cascadia Code', monospace;
      line-height: 1.5;
      outline: none;
      resize: vertical;
      transition: border-color 0.15s;
    }
    .ctx-textarea:focus { border-color: #7C3AED; box-shadow: 0 0 0 2px #7C3AED22; }

    .ctx-input {
      width: 100%;
      background: #0a0a12;
      border: 1px solid #374151;
      border-radius: 8px;
      padding: 10px 12px;
      color: #e2e8f0;
      font-size: 13px;
      outline: none;
      transition: border-color 0.15s;
    }
    .ctx-input:focus { border-color: #7C3AED; box-shadow: 0 0 0 2px #7C3AED22; }

    /* ---- Mode Grid ---- */

    .mode-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 0 12px 12px;
    }

    .mode-btn {
      background: #0a0a12;
      border: 1px solid #1e1b2e;
      color: #9CA3AF;
      padding: 7px 12px;
      border-radius: 8px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;
    }
    .mode-btn:hover { border-color: #374151; color: #e2e8f0; background: #1e1b2e; }
    .mode-btn.active {
      background: linear-gradient(135deg, #7C3AED22, #06B6D422);
      border-color: #7C3AED;
      color: #fff;
      font-weight: 600;
    }

    /* ---- Tool Grid ---- */

    .tool-grid {
      display: flex;
      gap: 6px;
      padding: 0 12px 12px;
    }

    .tool-btn {
      background: #0a0a12;
      border: 1px solid #1e1b2e;
      color: #9CA3AF;
      padding: 6px 10px;
      border-radius: 8px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.15s;
      flex: 1;
      text-align: center;
    }
    .tool-btn:hover { border-color: #374151; color: #e2e8f0; }
    .tool-btn.active {
      background: #06B6D418;
      border-color: #06B6D4;
      color: #06B6D4;
      font-weight: 600;
    }

    /* ---- Presets ---- */

    .presets-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 0 12px 12px;
    }

    .preset-chip {
      background: #0a0a12;
      border: 1px solid #1e1b2e;
      color: #9CA3AF;
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .preset-chip:hover {
      background: #10B98118;
      border-color: #10B981;
      color: #10B981;
      transform: translateY(-1px);
    }

    /* ---- Result Badges ---- */

    .result-badges {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .result-badge {
      font-size: 10px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .result-badge.purple { background: #7C3AED22; color: #a78bfa; border: 1px solid #7C3AED44; }
    .result-badge.cyan   { background: #06B6D422; color: #67e8f9; border: 1px solid #06B6D444; }
    .result-badge.green  { background: #10B98122; color: #6ee7b7; border: 1px solid #10B98144; }

    .mode-badge-sm {
      font-size: 9px;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 999px;
      background: #7C3AED22;
      color: #a78bfa;
      border: 1px solid #7C3AED44;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    /* ---- Common elements ---- */

    .label {
      font-size: 10px;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 600;
    }

    .prompt-preview {
      background: #0a0a12;
      border: 1px solid #1e1b2e;
      border-left: 3px solid #7C3AED;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 80px;
      overflow-y: auto;
      color: #a78bfa;
      font-family: 'Fira Code', 'Cascadia Code', monospace;
      line-height: 1.5;
    }

    .assembled-prompt {
      background: #0a0a12;
      border: 1px solid #1e1b2e;
      border-left: 3px solid #10B981;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 200px;
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
      background: #0a0a12;
      border: 1px solid #374151;
      border-radius: 8px;
      padding: 10px 12px;
      color: #e2e8f0;
      font-size: 14px;
      outline: none;
      transition: border-color 0.15s;
    }
    .answer-input:focus { border-color: #7C3AED; box-shadow: 0 0 0 2px #7C3AED22; }

    .options-container {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 4px;
      margin-bottom: 4px;
    }

    .option-pill {
      background: #1e1b2e;
      border: 1px solid #374151;
      color: #e2e8f0;
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .option-pill:hover {
      background: #2d2847;
      border-color: #7C3AED;
      color: #fff;
    }

    .action-buttons {
      display: flex;
      gap: 10px;
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

    .glow-btn {
      box-shadow: 0 0 20px #7C3AED33, 0 0 40px #06B6D411;
      transition: opacity 0.15s, box-shadow 0.3s;
    }
    .glow-btn:hover { box-shadow: 0 0 25px #7C3AED55, 0 0 50px #06B6D422; }

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

setTimeout(injectButton, 2000);
