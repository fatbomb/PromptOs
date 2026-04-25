const btn = document.getElementById('login-btn');
const status = document.getElementById('login-status');
const polling = document.getElementById('login-polling');
const errorEl = document.getElementById('login-error');
const extIdEl = document.getElementById('ext-id');

// Show extension ID
extIdEl.textContent = chrome.runtime.id;
extIdEl.addEventListener('click', () => {
  navigator.clipboard.writeText(chrome.runtime.id);
  extIdEl.textContent = '✓ Copied!';
  setTimeout(() => { extIdEl.textContent = chrome.runtime.id; }, 1500);
});

// Check if already logged in
chrome.storage.local.get('promptos_jwt', (result) => {
  if (result && result.promptos_jwt) {
    btn.textContent = '✓ Logged in — Open Dashboard →';
    btn.href = 'http://localhost:3000/dashboard';
    status.style.display = 'block';
  }
});

btn.addEventListener('click', (e) => {
  if (btn.textContent.includes('Logged in')) return;

  e.preventDefault();
  btn.style.opacity = '0.5';
  btn.style.pointerEvents = 'none';
  polling.style.display = 'block';
  errorEl.style.display = 'none';

  chrome.runtime.sendMessage({ type: 'START_LOGIN' }, (res) => {
    polling.style.display = 'none';
    btn.style.opacity = '1';
    btn.style.pointerEvents = 'auto';
    if (res && res.ok) {
      btn.textContent = '✓ Logged in — Open Dashboard →';
      btn.href = 'http://localhost:3000/dashboard';
      status.style.display = 'block';
    } else {
      errorEl.textContent = 'Login timed out. Try again.';
      errorEl.style.display = 'block';
    }
  });
});
