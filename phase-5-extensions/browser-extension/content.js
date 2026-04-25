"use strict";
/**
 * Browser Extension Content Script — PromptOS Copilot
 *
 * Injects the "⚡ PromptOS Copilot" button below the chat input
 * on claude.ai and chat.openai.com.
 * Uses Shadow DOM to isolate the overlay UI from the host page's CSS.
 *
 * Command Center → Context + Mode + Tool → Question Flow → Inject
 */
const API_BASE = 'https://prompt-os-dusky.vercel.app';
let sessionConfig = {
    mode: 'default',
    targetTool: 'auto',
    contextCode: '',
    contextError: '',
    contextProject: '',
};
const MODES = [
    { id: 'bugfix', icon: '🐛', label: 'Bug Fix', backendMode: 'default', desc: 'Full deep-dive debugging' },
    { id: 'feature', icon: '✨', label: 'Feature', backendMode: 'default', desc: 'Build something new' },
    { id: 'refactor', icon: '♻️', label: 'Refactor', backendMode: 'mid', desc: 'Clean up existing code' },
    { id: 'review', icon: '🔍', label: 'Review', backendMode: 'mid', desc: 'Code review assistance' },
    { id: 'learn', icon: '📖', label: 'Learn', backendMode: 'skip', desc: 'Instant explanation' },
];
const PRESETS = [
    { icon: '🐛', label: 'Debug this error', prompt: 'Help me debug this error', mode: 'default', contextType: 'error' },
    { icon: '📝', label: 'Explain this code', prompt: 'Explain how this code works step by step', mode: 'skip', contextType: 'code' },
    { icon: '♻️', label: 'Refactor for perf', prompt: 'Refactor this code for better performance', mode: 'mid', contextType: 'code' },
    { icon: '🧪', label: 'Write tests', prompt: 'Write comprehensive tests for this code', mode: 'mid', contextType: 'code' },
    { icon: '📖', label: 'How does this work?', prompt: 'Explain the architecture and design decisions', mode: 'skip', contextType: '' },
    { icon: '🔒', label: 'Security audit', prompt: 'Review this code for security vulnerabilities', mode: 'mid', contextType: 'code' },
];
const TOOLS = ['auto', 'claude', 'chatgpt', 'gemini'];
// ---------------------------------------------------------------------------
// JWT helper
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// JWT helper — read chrome.storage.local directly
// ---------------------------------------------------------------------------
async function getToken() {
    return new Promise((resolve) => {
        try {
            chrome.storage.local.get('promptos_jwt', (result) => {
                resolve(result?.promptos_jwt ?? null);
            });
        }
        catch {
            resolve(null);
        }
    });
}
// Listen for login success from background worker — re-run the flow instead of closing
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'LOGIN_SUCCESS') {
        const overlay = document.getElementById('promptos-overlay-host');
        if (overlay && overlay.shadowRoot?.getElementById('promptos-login-btn')) {
            // Store the pending prompt on the host element so we can recover it
            const pending = overlay._pendingPrompt;
            const inputEl = overlay._inputEl;
            if (pending) {
                runQuestionFlow(overlay.shadowRoot, overlay, inputEl ?? null, pending);
            }
        }
    }
});
// ---------------------------------------------------------------------------
// API calls — routed through background service worker to bypass page CSP
// Uses ports for long-lived connection to survive MV3 service worker restarts
// ---------------------------------------------------------------------------
async function apiFetch(path, body) {
    console.log(`[PromptOS] apiFetch called: ${path}`, body);
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            console.error(`[PromptOS] apiFetch timeout: ${path}`);
            reject(new Error('Request timed out after 30s. Is the backend running on prompt-os-dusky.vercel.app?'));
        }, 30000);
        try {
            const port = chrome.runtime.connect({ name: 'api-fetch' });
            port.onMessage.addListener((res) => {
                clearTimeout(timeout);
                port.disconnect();
                if (res.error) {
                    console.error(`[PromptOS] apiFetch error from background:`, res.error);
                    reject(new Error(res.error));
                }
                else {
                    console.log(`[PromptOS] apiFetch success: ${path}`, res.data);
                    resolve(res.data);
                }
            });
            port.onDisconnect.addListener(() => {
                clearTimeout(timeout);
                if (chrome.runtime.lastError) {
                    console.error(`[PromptOS] apiFetch port disconnected:`, chrome.runtime.lastError.message);
                    reject(new Error(`Port disconnected: ${chrome.runtime.lastError.message}`));
                }
            });
            port.postMessage({ type: 'API_FETCH', path, body });
        }
        catch (err) {
            clearTimeout(timeout);
            console.error(`[PromptOS] apiFetch caught error:`, err);
            reject(err);
        }
    });
}
const SITES = {
    claude: {
        host: 'claude.ai',
        // Claude uses a ProseMirror contenteditable — multiple fallback selectors
        inputSelector: [
            'div[contenteditable="true"].ProseMirror',
            'div[contenteditable="true"][data-placeholder]',
            'div[contenteditable="true"]',
        ].join(', '),
        buttonContainer: 'fieldset, div[data-testid="input-menu-container"], footer, form',
        toolName: 'claude',
    },
    chatgpt: {
        host: 'chat.openai.com',
        inputSelector: [
            'div[contenteditable="true"]#prompt-textarea',
            'textarea#prompt-textarea',
            'div[contenteditable="true"]',
        ].join(', '),
        buttonContainer: 'div[data-testid="composer-footer"], form, div.relative.flex',
        toolName: 'chatgpt',
    },
    chatgpt2: {
        host: 'chatgpt.com',
        inputSelector: [
            'div[contenteditable="true"]#prompt-textarea',
            'textarea#prompt-textarea',
            'div[contenteditable="true"]',
        ].join(', '),
        buttonContainer: 'div[data-testid="composer-footer"], form, div.relative.flex',
        toolName: 'chatgpt',
    },
};
const currentSite = Object.values(SITES).find((s) => window.location.hostname.includes(s.host));
if (!currentSite) {
    throw new Error('PromptOS: unsupported site');
}
// ---------------------------------------------------------------------------
// Button injection
// ---------------------------------------------------------------------------
function injectButton() {
    if (document.getElementById('promptos-inject-btn'))
        return;
    // Try each selector in the comma-separated list
    const selectors = currentSite.buttonContainer.split(', ');
    let container = null;
    for (const sel of selectors) {
        container = document.querySelector(sel.trim());
        if (container)
            break;
    }
    if (!container)
        return;
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
function openOverlay() {
    if (document.getElementById('promptos-overlay-host'))
        return;
    const inputEl = document.querySelector(currentSite.inputSelector);
    const rawPrompt = inputEl
        ? 'value' in inputEl
            ? inputEl.value
            : inputEl.innerText
        : '';
    // Reset session config
    sessionConfig = {
        mode: 'default',
        targetTool: currentSite.toolName,
        contextCode: '',
        contextError: '',
        contextProject: '',
    };
    const hostDiv = document.createElement('div');
    hostDiv.id = 'promptos-overlay-host';
    hostDiv.style.cssText =
        'position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);';
    // Stash for LOGIN_SUCCESS handler
    hostDiv._pendingPrompt = rawPrompt;
    hostDiv._inputEl = inputEl;
    const shadow = hostDiv.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = overlayCSS();
    shadow.appendChild(style);
    shadow.appendChild(buildCommandCenter(rawPrompt));
    document.body.appendChild(hostDiv);
    // Close on backdrop click — only if the click landed on the host itself (not bubbled from modal)
    hostDiv.addEventListener('click', (e) => {
        if (e.target === hostDiv && !shadow.getElementById('promptos-wrapper')) {
            hostDiv.remove();
        }
    });
    wireCommandCenter(shadow, hostDiv, inputEl, rawPrompt);
}
// ---------------------------------------------------------------------------
// Command Center — the new initial UI
// ---------------------------------------------------------------------------
function buildCommandCenter(rawPrompt) {
    const wrapper = document.createElement('div');
    wrapper.id = 'promptos-wrapper';
    // CLI-matching modes: default=full, mid=quick, skip=instant
    const modeButtons = [
        { id: 'default', label: '🔍 Full', desc: 'Up to 6 questions — deepest refinement', backendMode: 'default' },
        { id: 'mid', label: '⚡ Quick', desc: 'At most 3 questions — fast refinement', backendMode: 'mid' },
        { id: 'skip', label: '🚀 Instant', desc: 'No questions — auto-format immediately', backendMode: 'skip' },
    ].map((m, i) => `<button class="mode-btn${i === 0 ? ' active' : ''}" data-backend-mode="${m.backendMode}" title="${m.desc}">${m.label}</button>`).join('');
    wrapper.innerHTML = `
    <div class="modal command-center">
      <div class="modal-header">
        <span class="modal-title">⚡ PromptOS Copilot</span>
        <span class="header-badge">prompt refinement</span>
        <button id="promptos-close-btn" class="close-btn" title="Close">×</button>
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

        <!-- Mode Selector — matches CLI: full / quick / instant -->
        <div class="section">
          <div class="section-header-static">
            <span class="section-icon">🎯</span>
            <span class="section-label">MODE</span>
            <span id="promptos-mode-desc" style="font-size:10px;color:#6B7280;margin-left:auto;padding-right:12px;">Up to 6 questions — deepest refinement</span>
          </div>
          <div class="mode-grid">${modeButtons}</div>
        </div>

        <!-- Start Button -->
        <button id="promptos-start-btn" class="primary-btn glow-btn">Start Refinement →</button>
        <div style="text-align:center;font-size:10px;color:#4B5563;margin-top:-4px;">
          Auto-optimized for ${escapeHtml(currentSite.toolName)}
        </div>
      </div>
    </div>
  `;
    return wrapper;
}
// Wire a freshly-rendered login screen — call this every time loginHTML() is shown.
function wireLoginScreen(shadow, hostDiv, inputEl, rawPrompt) {
    const loginBtn = shadow.getElementById('promptos-login-btn');
    const closeLoginBtn = shadow.getElementById('promptos-close-login-btn');
    if (loginBtn && !loginBtn._posBound) {
        loginBtn._posBound = true;
        loginBtn.addEventListener('click', () => {
            setContent(shadow, loadingHTML('Opening login... waiting up to 60s'));
            chrome.runtime.sendMessage({ type: 'START_LOGIN' }, (res) => {
                if (res?.ok) {
                    runQuestionFlow(shadow, hostDiv, inputEl, rawPrompt);
                }
                else {
                    setContent(shadow, errorHTML('Login timed out. Please try again via the extension popup.'));
                }
            });
        });
    }
    if (closeLoginBtn && !closeLoginBtn._posBound) {
        closeLoginBtn._posBound = true;
        closeLoginBtn.addEventListener('click', () => hostDiv.remove());
    }
}
function wireCommandCenter(shadow, hostDiv, inputEl, rawPrompt) {
    const closeBtn = shadow.getElementById('promptos-close-btn');
    const startBtn = shadow.getElementById('promptos-start-btn');
    const promptToggle = shadow.getElementById('promptos-prompt-toggle');
    if (!closeBtn || !startBtn)
        return;
    closeBtn.addEventListener('click', () => hostDiv.remove());
    promptToggle?.addEventListener('click', () => {
        const body = shadow.getElementById('promptos-prompt-body');
        const chevron = shadow.querySelector('#promptos-prompt-toggle .section-chevron');
        if (!body || !chevron)
            return;
        const isHidden = body.style.display === 'none';
        body.style.display = isHidden ? 'block' : 'none';
        chevron.classList.toggle('collapsed', !isHidden);
    });
    // Mode selector — update desc label on click
    const modeDescs = {
        default: 'Up to 6 questions — deepest refinement',
        mid: 'At most 3 questions — fast refinement',
        skip: 'No questions — auto-format immediately',
    };
    shadow.querySelectorAll('.mode-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            shadow.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            const backendMode = btn.dataset.backendMode;
            sessionConfig.mode = backendMode;
            const descEl = shadow.getElementById('promptos-mode-desc');
            if (descEl)
                descEl.textContent = modeDescs[backendMode] || '';
        });
    });
    // Tool selector (kept for internal use, no UI)
    sessionConfig.targetTool = currentSite.toolName;
    startBtn.addEventListener('click', async () => {
        console.log('[PromptOS] Start button clicked, rawPrompt:', rawPrompt);
        if (!rawPrompt.trim()) {
            setContent(shadow, errorHTML('Please type a prompt in the chat input first, then click ⚡ PromptOS Copilot.'));
            return;
        }
        try {
            await runQuestionFlow(shadow, hostDiv, inputEl, rawPrompt);
        }
        catch (err) {
            console.error('[PromptOS] runQuestionFlow threw:', err);
            setContent(shadow, errorHTML(`Unexpected error: ${err}`));
        }
    });
}
// ---------------------------------------------------------------------------
// Question flow state machine
// ---------------------------------------------------------------------------
async function runQuestionFlow(shadow, hostDiv, inputEl, rawPrompt) {
    console.log('[PromptOS] runQuestionFlow started');
    setContent(shadow, loadingHTML('Checking login...'));
    let token = await getToken();
    console.log('[PromptOS] token exists:', !!token);
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.exp * 1000 < Date.now()) {
                console.log('[PromptOS] token is expired');
                token = null;
                chrome.storage.local.remove('promptos_jwt');
            }
        }
        catch {
            token = null;
            chrome.storage.local.remove('promptos_jwt');
        }
    }
    if (!token) {
        console.log('[PromptOS] no valid token — showing login screen');
        setContent(shadow, loginHTML());
        wireLoginScreen(shadow, hostDiv, inputEl, rawPrompt);
        return;
    }
    setContent(shadow, loadingHTML('Starting session...'));
    console.log('[PromptOS] calling /session/start');
    let sessionId;
    try {
        const startRes = await apiFetch('/session/start', {
            raw_prompt: rawPrompt,
            mode: sessionConfig.mode,
            target_tool: sessionConfig.targetTool === 'auto' ? currentSite.toolName : sessionConfig.targetTool,
            workspace_context: null,
            source: 'browser_extension',
        });
        sessionId = startRes.session_id;
        console.log('[PromptOS] session started:', sessionId);
    }
    catch (err) {
        const errMsg = String(err);
        console.error('[PromptOS] /session/start error:', errMsg);
        if (errMsg.includes('401') || errMsg.includes('403')) {
            // Token was accepted locally but rejected by backend — clear it and ask to re-login
            chrome.storage.local.remove('promptos_jwt');
            setContent(shadow, loginHTML());
            wireLoginScreen(shadow, hostDiv, inputEl, rawPrompt);
        }
        else {
            setContent(shadow, errorHTML(`Failed to start session: ${errMsg}`));
        }
        return;
    }
    await askNextQuestion(shadow, hostDiv, inputEl, sessionId, '_init_', 1);
}
async function askNextQuestion(shadow, hostDiv, inputEl, sessionId, userMessage, turnNum) {
    console.log(`[PromptOS] askNextQuestion started. Session: ${sessionId}, Turn: ${turnNum}, Message: ${userMessage}`);
    setContent(shadow, loadingHTML('Thinking...'));
    let msgRes;
    try {
        msgRes = await apiFetch('/session/message', {
            session_id: sessionId,
            user_message: userMessage,
        });
        console.log('[PromptOS] askNextQuestion msgRes received:', msgRes);
    }
    catch (err) {
        console.error('[PromptOS] askNextQuestion API error:', err);
        setContent(shadow, errorHTML(`API error: ${err}`));
        return;
    }
    if (msgRes.done) {
        if (msgRes.should_refuse) {
            setContent(shadow, refusalHTML(msgRes.message));
            shadow.getElementById('promptos-restart-btn')?.addEventListener('click', () => hostDiv.remove());
        }
        else {
            const assembled = msgRes.assembled_prompt;
            const scores = msgRes.scores;
            setContent(shadow, completeHTML(assembled, scores));
            shadow.getElementById('promptos-inject-btn-confirm')?.addEventListener('click', () => {
                injectPrompt(inputEl, assembled);
                hostDiv.remove();
            });
            shadow.getElementById('promptos-copy-btn')?.addEventListener('click', () => {
                navigator.clipboard.writeText(assembled);
                const copyBtn = shadow.getElementById('promptos-copy-btn');
                if (copyBtn) {
                    copyBtn.textContent = '✓ Copied!';
                    setTimeout(() => { copyBtn.textContent = '📋 Copy'; }, 1500);
                }
            });
            shadow.getElementById('promptos-cancel-btn')?.addEventListener('click', () => hostDiv.remove());
            shadow.getElementById('promptos-close-btn')?.addEventListener('click', () => hostDiv.remove());
        }
        return;
    }
    const question = msgRes.question;
    const options = msgRes.options;
    setContent(shadow, questionHTML(question, turnNum, options));
    const submitAnswer = async (answerText) => {
        const input = shadow.getElementById('promptos-answer-input');
        const answer = answerText || input?.value.trim();
        if (!answer)
            return;
        await askNextQuestion(shadow, hostDiv, inputEl, sessionId, answer, turnNum + 1);
    };
    shadow.getElementById('promptos-submit-btn')?.addEventListener('click', () => submitAnswer());
    shadow.getElementById('promptos-skip-btn')?.addEventListener('click', () => submitAnswer('Skip'));
    shadow.getElementById('promptos-cancel-session-btn')?.addEventListener('click', () => hostDiv.remove());
    options?.forEach((opt, idx) => {
        shadow.getElementById(`promptos-opt-${idx}`)?.addEventListener('click', () => submitAnswer(opt));
    });
    const answerInput = shadow.getElementById('promptos-answer-input');
    answerInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter')
            submitAnswer();
    });
    setTimeout(() => answerInput?.focus(), 50);
}
// ---------------------------------------------------------------------------
// Inject assembled prompt back into the page input
// ---------------------------------------------------------------------------
function injectPrompt(inputEl, text) {
    if (!inputEl)
        return;
    if ('value' in inputEl && inputEl.tagName === 'TEXTAREA') {
        // Standard textarea (some ChatGPT versions)
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
        nativeInputValueSetter?.call(inputEl, text);
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        inputEl.dispatchEvent(new Event('change', { bubbles: true }));
    }
    else {
        // contenteditable (Claude ProseMirror, ChatGPT div)
        inputEl.focus();
        // Select all existing content and replace
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(inputEl);
        selection?.removeAllRanges();
        selection?.addRange(range);
        // Use execCommand for broad compatibility with rich text editors
        document.execCommand('selectAll', false);
        document.execCommand('insertText', false, text);
        // Also set innerText as fallback and fire all relevant events
        if (!inputEl.innerText.includes(text.substring(0, 20))) {
            inputEl.innerText = text;
        }
        inputEl.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: text }));
        inputEl.dispatchEvent(new Event('change', { bubbles: true }));
        inputEl.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    }
    inputEl.focus();
}
// ---------------------------------------------------------------------------
// Shadow DOM helpers
// ---------------------------------------------------------------------------
function setContent(shadow, html) {
    // Remove existing wrapper and replace entirely
    const existing = shadow.getElementById('promptos-wrapper');
    if (existing) {
        existing.remove();
    }
    const wrapper = document.createElement('div');
    wrapper.id = 'promptos-wrapper';
    wrapper.innerHTML = html;
    shadow.appendChild(wrapper);
}
// ---------------------------------------------------------------------------
// HTML templates
// ---------------------------------------------------------------------------
function loadingHTML(msg) {
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
function questionHTML(question, turn, options) {
    const maxQ = sessionConfig.mode === 'mid' ? 3 : sessionConfig.mode === 'skip' ? 1 : 6;
    const dots = Array.from({ length: Math.min(maxQ, 6) }, (_, i) => `<span class="step-dot${i < turn ? ' active' : ''}"></span>`).join('');
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
        <div style="width:24px"><button id="promptos-cancel-session-btn" class="close-btn" title="Cancel session">×</button></div>
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
        <button id="promptos-cancel-session-btn" class="secondary-btn" style="margin-top:4px;color:#6B7280;font-size:11px;">✕ Cancel session</button>
      </div>
    </div>
  `;
}
function refusalHTML(message) {
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
function scoreBarHTML(val) {
    const color = val >= 75 ? '#10B981' : val >= 40 ? '#F59E0B' : '#EF4444';
    const filled = Math.round((val / 100) * 16);
    const bar = `<span style="color:${color}">${'█'.repeat(filled)}</span>${'░'.repeat(16 - filled)}`;
    return `<span class="score-bar">${bar}</span>`;
}
function receiptHTML(rawPrompt, scores) {
    if (!scores)
        return '';
    const thinkingDepth = scores.thinking_depth_score ?? 0;
    const turnsWithout = Math.max(1, 6 - Math.floor(thinkingDepth / 20));
    const mode = sessionConfig.mode;
    const turnsWithPromptOS = mode === 'skip' ? 0 : mode === 'mid' ? 2 : 1;
    const timeWithout = (turnsWithout * 40 / 60).toFixed(1);
    const timeWith = (Math.max(turnsWithPromptOS, 1) * 40 / 60).toFixed(1);
    const timeRecovered = Math.max(0, (turnsWithout - Math.max(turnsWithPromptOS, 1)) * 40 / 60).toFixed(1);
    const dep = scores.dependency_score ?? 0;
    const depColor = dep < 40 ? '#10B981' : dep < 70 ? '#F59E0B' : '#EF4444';
    const truncated = rawPrompt.length > 40 ? rawPrompt.slice(0, 37) + '…' : rawPrompt;
    return `
    <div class="receipt">
      <div class="receipt-title">SESSION RECEIPT</div>
      <div class="receipt-row"><span class="receipt-label">Prompt</span><span class="receipt-val">"${escapeHtml(truncated)}"</span></div>
      <div class="receipt-row"><span class="receipt-label">Mode</span><span class="receipt-val">${mode}</span></div>
      <div class="receipt-row"><span class="receipt-label">Tool</span><span class="receipt-val">${sessionConfig.targetTool === 'auto' ? currentSite.toolName : sessionConfig.targetTool}</span></div>
      <div class="receipt-divider"></div>
      <div class="receipt-row"><span class="receipt-label">Without PromptOS</span><span class="receipt-val">~${turnsWithout} turns · ${timeWithout} min</span></div>
      <div class="receipt-row"><span class="receipt-label">With PromptOS</span><span class="receipt-val">${Math.max(turnsWithPromptOS, 1)} turn · ${timeWith} min</span></div>
      <div class="receipt-row highlight"><span class="receipt-label">Time Recovered</span><span class="receipt-val" style="color:#10B981;font-weight:700;">✦ ${timeRecovered} min</span></div>
      <div class="receipt-divider"></div>
      <div class="receipt-row"><span class="receipt-label">AI Dependency</span><span class="receipt-val" style="color:${depColor}">${dep}/100</span></div>
    </div>
  `;
}
function completeHTML(assembled, scores) {
    const modeLabel = MODES.find((m) => m.backendMode === sessionConfig.mode)?.label || 'Default';
    const toolLabel = sessionConfig.targetTool === 'auto' ? currentSite.toolName : sessionConfig.targetTool;
    const qualityDeltaHTML = (scores && scores.raw_specificity_score !== undefined) ? `
    <div class="quality-comparison">
      <div class="quality-title">✦ Prompt Quality Improvement</div>
      <div class="quality-row">
        <span class="quality-label">Raw Prompt</span>
        <span class="quality-val">${scores.raw_specificity_score}</span>
        ${scoreBarHTML(scores.raw_specificity_score)}
      </div>
      <div class="quality-row">
        <span class="quality-label">Refined Prompt</span>
        <span class="quality-val highlight">${scores.assembled_specificity_score}</span>
        ${scoreBarHTML(scores.assembled_specificity_score)}
        <span class="quality-delta ${scores.quality_delta >= 0 ? 'plus' : 'minus'}">
          ${scores.quality_delta >= 0 ? '+' : ''}${scores.quality_delta} ✦
        </span>
      </div>
    </div>
  ` : '';
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
        ${qualityDeltaHTML}
        ${scoresHTML}
        ${receiptHTML(assembled, scores)}
        <button id="promptos-inject-btn-confirm" class="accent-btn">Inject into chat →</button>
        <div class="action-buttons">
          <button id="promptos-copy-btn" class="secondary-btn" style="flex: 1;">📋 Copy</button>
          <button id="promptos-cancel-btn" class="secondary-btn" style="flex: 1;">Cancel</button>
        </div>
      </div>
    </div>
  `;
}
function loginHTML() {
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
        <p style="font-size:10px;color:#374151;margin-top:10px;">Opens prompt-os-dashboard.vercel.app in a new tab</p>
      </div>
    </div>
  `;
}
function errorHTML(msg) {
    return `
    <div class="modal">
      <div class="modal-body">
        <div class="error-card">
          <p class="error-msg">⚠️ ${escapeHtml(msg)}</p>
          <p class="hint">Make sure the PromptOS backend is running on prompt-os-dusky.vercel.app.</p>
        </div>
      </div>
    </div>
  `;
}
function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
// ---------------------------------------------------------------------------
// Overlay CSS (injected into Shadow DOM)
// ---------------------------------------------------------------------------
function overlayCSS() {
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
      max-height: 92vh;
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
      padding: 14px 16px;
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 320px;
      min-height: 120px;
      overflow-y: auto;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.7;
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

    .receipt {
      background: #0d0d14;
      border: 1px solid #1e1b2e;
      border-left: 3px solid #10B981;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 11px;
    }
    .receipt-title {
      font-size: 9px;
      font-weight: 700;
      color: #10B981;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 8px;
    }
    .receipt-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 2px 0;
    }
    .receipt-row.highlight { margin-top: 2px; }
    .receipt-label { color: #6B7280; }
    .receipt-val { color: #e2e8f0; text-align: right; }
    .receipt-divider { height: 1px; background: #1e1b2e; margin: 6px 0; }

    /* ---- Quality Comparison ---- */

    .quality-comparison {
      background: #0d0d14;
      border: 1px solid #1e1b2e;
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 12px;
    }

    .quality-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #06B6D4;
      margin-bottom: 10px;
    }

    .quality-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
    }

    .quality-label {
      width: 90px;
      font-size: 11px;
      color: #9CA3AF;
    }

    .quality-val {
      font-size: 12px;
      font-weight: 700;
      width: 24px;
      text-align: right;
      color: #e2e8f0;
    }

    .quality-val.highlight {
      color: #06B6D4;
    }

    .quality-delta {
      font-size: 11px;
      font-weight: 700;
      margin-left: 4px;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .quality-delta.plus {
      background: #10B98115;
      color: #10B981;
    }

    .quality-delta.minus {
      background: #EF444415;
      color: #EF4444;
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
// Retry at multiple intervals to handle slow SPA renders
setTimeout(injectButton, 1000);
setTimeout(injectButton, 2000);
setTimeout(injectButton, 4000);
setTimeout(injectButton, 8000);
