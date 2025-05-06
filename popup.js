// popup.js
document.addEventListener('DOMContentLoaded', () => {
    // Send message to content script to open the “what‑if” panel
    document.getElementById('open-panel').addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          function: () => document.getElementById('whatif-panel').classList.toggle('hidden')
        });
      });
    });
  });
  