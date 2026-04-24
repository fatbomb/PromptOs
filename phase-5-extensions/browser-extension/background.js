/**
 * Background Script — Phase 5
 * 
 * Handles messages from the Dashboard to sync the JWT token.
 */
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message.type === 'SET_TOKEN') {
    chrome.storage.local.set({ promptos_jwt: message.token }, () => {
      console.log('PromptOS: JWT synced from Dashboard.');
      sendResponse({ success: true });
    });
    return true; // Keep channel open for async response
  }
});
