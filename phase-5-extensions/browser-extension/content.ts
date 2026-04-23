/**
 * Browser Extension Content Script — Phase 5, Task 5.4
 *
 * Injects the "Enhance with PromptOS" button below the chat input
 * on claude.ai and chat.openai.com.
 * Uses Shadow DOM to isolate the overlay UI from the host page's CSS.
 */

(function () {
  const SITES = {
    claude: {
      host: 'claude.ai',
      inputSelector: 'div[contenteditable="true"]',
      buttonContainer: 'fieldset', // Adjust based on actual DOM
    },
    chatgpt: {
      host: 'chat.openai.com',
      inputSelector: 'textarea#prompt-textarea',
      buttonContainer: 'form', // Adjust based on actual DOM
    },
  };

  const currentSite = Object.values(SITES).find((s) => window.location.hostname.includes(s.host));
  if (!currentSite) return;

  function injectButton() {
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
      padding: 6px 12px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
      z-index: 9999;
    `;

    btn.onclick = (e) => {
      e.preventDefault();
      openOverlay();
    };

    container.appendChild(btn);
  }

  function openOverlay() {
    const inputEl = document.querySelector(currentSite!.inputSelector) as HTMLElement | HTMLTextAreaElement;
    const rawPrompt = inputEl ? ('value' in inputEl ? inputEl.value : inputEl.innerText) : '';

    const hostDiv = document.createElement('div');
    hostDiv.id = 'promptos-overlay-host';
    hostDiv.style.cssText = 'position: fixed; inset: 0; z-index: 100000; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.6);';

    const shadow = hostDiv.attachShadow({ mode: 'closed' });

    // Load CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('overlay.css');
    shadow.appendChild(link);

    // Build UI (simplified for scaffold)
    const wrapper = document.createElement('div');
    wrapper.className = 'promptos-modal';
    wrapper.innerHTML = `
      <div class="header">
        <h2>⚡ PromptOS Refinement</h2>
        <button id="close-btn">×</button>
      </div>
      <div class="content">
        <p>Raw prompt detected:</p>
        <pre>${rawPrompt || '(empty)'}</pre>
        <button id="start-btn" class="primary-btn">Start Flow</button>
      </div>
    `;

    shadow.appendChild(wrapper);
    document.body.appendChild(hostDiv);

    // Event listeners
    shadow.getElementById('close-btn')!.onclick = () => hostDiv.remove();

    shadow.getElementById('start-btn')!.onclick = () => {
      // TODO: Implement the actual question flow logic here (fetch to localhost:8000)
      // For now, simulate completion and inject result back
      const fakeResult = `[PromptOS Enhanced]\n${rawPrompt}\n\nContext:\n- File: app.ts\n- Error: timeout`;
      
      if (inputEl) {
        if ('value' in inputEl) {
          inputEl.value = fakeResult;
        } else {
          inputEl.innerText = fakeResult;
        }
        // Dispatch event to trigger React/framework update on the page
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      hostDiv.remove();
    };
  }

  // Observe DOM for dynamic SPA navigation
  const observer = new MutationObserver(() => injectButton());
  observer.observe(document.body, { childList: true, subtree: true });

  // Initial attempt
  setTimeout(injectButton, 2000);
})();
