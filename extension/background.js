'use strict';
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || message?.type !== 'OPEN_OPTIONS') return;
  chrome.runtime.openOptionsPage().then(() => sendResponse({ok: true}), () => sendResponse({ok: false}));
  return true;
});
