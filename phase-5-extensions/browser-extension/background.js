/**
 * PromptOS Background Service Worker
 */

const API_BASE = 'https://prompt-os-dusky.vercel.app';
const DASHBOARD_BASE = 'https://prompt-os-dashboard.vercel.app';

// ---------------------------------------------------------------------------
// Message handler — login, token storage, SET_TOKEN from dashboard
// ---------------------------------------------------------------------------
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'START_LOGIN') {
    handleLogin(sendResponse);
    return true;
  }

  if (msg.type === 'GET_TOKEN') {
    chrome.storage.local.get('promptos_jwt', (result) => {
      sendResponse({ token: result.promptos_jwt ?? null });
    });
    return true;
  }

  if (msg.type === 'CLEAR_TOKEN') {
    chrome.storage.local.remove('promptos_jwt', () => {
      sendResponse({ ok: true });
    });
    return true;
  }

  // SET_TOKEN — pushed by dashboard ExtensionSync after OAuth login
  if (msg.type === 'SET_TOKEN' && msg.token) {
    chrome.storage.local.set({ promptos_jwt: msg.token }, () => {
      sendResponse({ ok: true });
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { type: 'LOGIN_SUCCESS' }).catch(() => {});
          }
        });
      });
    });
    return true;
  }
});

// ---------------------------------------------------------------------------
// Long-lived port for API calls — keeps service worker alive during fetch
// ---------------------------------------------------------------------------
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'api-fetch') return;
  console.log('[PromptOS-Background] port connected for api-fetch');

  port.onMessage.addListener(async (msg) => {
    if (msg.type !== 'API_FETCH') return;
    console.log(`[PromptOS-Background] handling API_FETCH for: ${msg.path}`);
    try {
      const result = await chrome.storage.local.get('promptos_jwt');
      const token = result.promptos_jwt ?? null;
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}${msg.path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(msg.body),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(`[PromptOS-Background] fetch error: ${res.status}`, text);
        port.postMessage({ error: `API error ${res.status}: ${text}` });
        return;
      }

      const data = await res.json();
      console.log(`[PromptOS-Background] fetch success for: ${msg.path}`, data);
      port.postMessage({ data });
    } catch (err) {
      console.error(`[PromptOS-Background] fetch caught error:`, err);
      port.postMessage({ error: String(err) });
    }
  });
});

// ---------------------------------------------------------------------------
// Login flow — open dashboard, poll for JWT
// ---------------------------------------------------------------------------
async function handleLogin(sendResponse) {
  const state = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  const loginUrl = `${DASHBOARD_BASE}/login?state=${state}`;

  chrome.tabs.create({ url: loginUrl });

  let found = false;
  for (let i = 0; i < 30; i++) {
    await sleep(2000);
    try {
      const res = await fetch(`${API_BASE}/auth/cli-token?state=${state}`);
      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          await chrome.storage.local.set({ promptos_jwt: data.token });
          found = true;
          sendResponse({ ok: true });
          chrome.tabs.query({}, (tabs) => {
            tabs.forEach((tab) => {
              if (tab.id) {
                chrome.tabs.sendMessage(tab.id, { type: 'LOGIN_SUCCESS' }).catch(() => {});
              }
            });
          });
          break;
        }
      }
    } catch (_) {
      // keep polling
    }
  }

  if (!found) {
    sendResponse({ ok: false, error: 'timeout' });
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
