window.saveData = function (key, value) {
  return new Promise((resolve, reject) => {
    if (!chrome || !chrome.storage) {
      console.warn("Chrome storage API not available");
      reject("Storage API not available");
      return;
    }

    const data = {};
    data[key] = value;

    chrome.storage.local.set(data, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
};

// Load data from chrome.storage.local
window.loadData = function (key) {
  return new Promise((resolve, reject) => {
    if (!chrome || !chrome.storage) {
      console.warn("Chrome storage API not available");
      reject("Storage API not available");
      return;
    }

    chrome.storage.local.get(key, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result[key]);
      }
    });
  });
};

// Clear specific data from chrome.storage.local
window.clearData = function (key) {
  return new Promise((resolve, reject) => {
    if (!chrome || !chrome.storage) {
      console.warn("Chrome storage API not available");
      reject("Storage API not available");
      return;
    }

    chrome.storage.local.remove(key, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
};

// Clear all extension data from chrome.storage.local
window.clearAllData = function () {
  return new Promise((resolve, reject) => {
    if (!chrome || !chrome.storage) {
      console.warn("Chrome storage API not available");
      reject("Storage API not available");
      return;
    }

    chrome.storage.local.clear(() => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
};
