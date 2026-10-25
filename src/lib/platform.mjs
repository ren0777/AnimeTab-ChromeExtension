// Thin, promise-based access to chrome APIs with graceful dev-mode fallbacks
// (chrome storage not available when previewing the page outside the extension).

export const isExtension =
  typeof chrome !== 'undefined' &&
  typeof chrome.runtime?.getURL === 'function' &&
  !!chrome.storage?.local;

export const storageGet = (keys) =>
  new Promise((resolve) => {
    if (!isExtension) return resolve({});
    try { chrome.storage.local.get(keys, (r) => resolve(r || {})); }
    catch { resolve({}); }
  });

export const storageSet = (values) =>
  new Promise((resolve) => {
    if (!isExtension) return resolve();
    try { chrome.storage.local.set(values, resolve); }
    catch { resolve(); }
  });

export const assetUrl = (path) =>
  isExtension ? chrome.runtime.getURL(path) : path;

export const sendMessage = (message) =>
  new Promise((resolve, reject) => {
    if (!isExtension) return reject(new Error('Extension runtime unavailable'));
    try {
      chrome.runtime.sendMessage(message, (res) => {
        const err = chrome.runtime.lastError;
        if (err) reject(new Error(err.message));
        else resolve(res);
      });
    } catch (e) { reject(e); }
  });

/** Save a file via chrome.downloads (user picks the location). */
export const downloadFile = (url, filename) =>
  new Promise((resolve, reject) => {
    if (!isExtension || !chrome.downloads?.download) return reject(new Error('Downloads API unavailable'));
    try {
      chrome.downloads.download({ url, filename: filename || 'download', saveAs: true }, (id) => {
        const err = chrome.runtime.lastError;
        if (err) reject(new Error(err.message));
        else resolve(id);
      });
    } catch (e) { reject(e); }
  });
