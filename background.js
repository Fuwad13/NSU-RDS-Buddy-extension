// background.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "CALCULATE_CGPA") {
    // Get the value from the message or storage
    chrome.storage.local.get("whatIfData", ({ whatIfData }) => {
      // Return the stored data for CGPA calculation
      sendResponse({ success: true, data: whatIfData });
    });
    return true; // Required for async response
  }
});
