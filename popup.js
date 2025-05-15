// popup.js
document.addEventListener("DOMContentLoaded", function () {
  // Handle all links with target="_blank" to open in new tab
  document.querySelectorAll('a[target="_blank"]').forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      chrome.tabs.create({ url: this.href });
    });
  });
});
