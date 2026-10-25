import { useState, useEffect, useCallback, useRef } from 'react';
import { normalizeTheme } from '../lib/theme.mjs';
import { createAnalytics, EVENT_TYPES } from '../lib/analytics.mjs';
import { storageGet, storageSet } from '../lib/platform.mjs';

// Primary key used by the React app; ALT keys kept for legacy readers.
const STORAGE_KEY = 'nekosWallpaperUrl';
const ALT_STORAGE_KEY = 'anime_bg_url';
const THEME_KEY = 'animeThemeMode';
const PINNED_URL_KEY = 'wallpaperPinnedUrl';
const CUSTOM_DATA_KEY = 'customBackgroundData';
const CUSTOM_MIME_KEY = 'customBackgroundMime';
const CUSTOM_ENABLED_KEY = 'customBackgroundEnabled';
const CUSTOM_REF_KEY = 'customBackgroundRef';

const preloadImage = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = () => reject(new Error('Image failed to load'));
    img.src = url;
  });

// Very small, fast mood detector. Draws a downsized copy of the image to a
// canvas and computes average HSL lightness/saturation, mapping results onto
// real themes so detection actually changes the look now (previously the
// detected values were silently discarded by normalizeTheme).
const detectThemeFromImage = (url) =>
  new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const max = 120;
          const w = (img.width > max) ? max : img.width || max;
          const h = (img.height > max) ? max : img.height || max;
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          const data = ctx.getImageData(0, 0, w, h).data;
          let r = 0, g = 0, b = 0, count = 0;
          for (let i = 0; i < data.length; i += 4) {
            r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
          }
          r = r / count; g = g / count; b = b / count;
          const rn = r / 255, gn = g / 255, bn = b / 255;
          const maxc = Math.max(rn, gn, bn), minc = Math.min(rn, gn, bn);
          const l = (maxc + minc) / 2;
          let s = 0;
          if (maxc !== minc) {
            s = (l > 0.5) ? (maxc - minc) / (2 - maxc - minc) : (maxc - minc) / (maxc + minc);
          }
          resolve(l > 0.78 && s < 0.35 ? 'cute' : 'lofi');
        } catch { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    } catch { resolve(null); }
  });

// IndexedDB helpers for storing large blobs (avoids chrome.storage quota limits)
const openIdb = () =>
  new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open('animetab-assets', 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('files')) db.createObjectStore('files');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('IDB open failed'));
    } catch (err) {
      reject(err);
    }
  });

const idbPut = async (key, blob) => {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readwrite');
    const store = tx.objectStore('files');
    const r = store.put(blob, key);
    r.onsuccess = () => {
      tx.oncomplete = () => { db.close(); resolve(); };
    };
    r.onerror = () => { db.close(); reject(r.error || new Error('IDB put failed')); };
  });
};

const idbGet = async (key) => {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readonly');
    const store = tx.objectStore('files');
    const r = store.get(key);
    r.onsuccess = () => { db.close(); resolve(r.result); };
    r.onerror = () => { db.close(); reject(r.error || new Error('IDB get failed')); };
  });
};

const idbDelete = async (key) => {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readwrite');
    const store = tx.objectStore('files');
    const r = store.delete(key);
    r.onsuccess = () => {
      tx.oncomplete = () => { db.close(); resolve(); };
    };
    r.onerror = () => { db.close(); reject(r.error || new Error('IDB delete failed')); };
  });
};

export const useNekosWallpaper = (analytics = createAnalytics({ get: async () => ({}), set: async () => ({}) })) => {
  const [wallpaperUrl, setWallpaperUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [customEnabled, setCustomEnabled] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [themeMode, setThemeMode] = useState('wano');
  const objectUrlRef = useRef(null);

  const revokeObjectUrl = () => {
    try {
      if (objectUrlRef.current && objectUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    } catch { /* ignore */ }
    objectUrlRef.current = null;
  };

  const setBlobWallpaper = useCallback((blob) => {
    revokeObjectUrl();
    const objUrl = URL.createObjectURL(blob);
    objectUrlRef.current = objUrl;
    setWallpaperUrl(objUrl);
    return objUrl;
  }, []);

  const updateThemeMode = useCallback(async (nextTheme) => {
    const normalized = normalizeTheme(nextTheme);
    setThemeMode(normalized);
    await storageSet({ [THEME_KEY]: normalized });
  }, []);

  const applyRemoteWallpaper = useCallback(async (url) => {
    await preloadImage(url);
    await storageSet({ [STORAGE_KEY]: url, [ALT_STORAGE_KEY]: url, [CUSTOM_ENABLED_KEY]: false });
    revokeObjectUrl();
    setWallpaperUrl(url);
  }, []);

  const loadWallpaper = useCallback(async (forceNew = false) => {
    try {
      setLoading(true);
      setError(null);

      const stored = await storageGet([
        CUSTOM_ENABLED_KEY, CUSTOM_REF_KEY, CUSTOM_MIME_KEY,
        STORAGE_KEY, ALT_STORAGE_KEY, THEME_KEY, PINNED_URL_KEY
      ]);
      setThemeMode(normalizeTheme(stored[THEME_KEY]));

      // Custom uploads (kept in IndexedDB) always win.
      if (stored[CUSTOM_ENABLED_KEY] && stored[CUSTOM_REF_KEY]) {
        try {
          const blob = await idbGet(stored[CUSTOM_REF_KEY]);
          if (blob) {
            setBlobWallpaper(blob);
            setCustomEnabled(true);
            setIsPinned(false);
            setLoading(false);
            return;
          }
        } catch { /* fall through to remote */ }
      }

      // Pinned wallpaper: user chose to keep this exact image.
      const pinned = stored[PINNED_URL_KEY];
      if (pinned) {
        try {
          await preloadImage(pinned);
          revokeObjectUrl();
          setWallpaperUrl(pinned);
          setCustomEnabled(false);
          setIsPinned(true);
          setLoading(false);
          return;
        } catch {
          await storageSet({ [PINNED_URL_KEY]: '' }); // dead link, forget it
        }
      }

      // Without a forced refresh, try the previously fetched URL first.
      if (!forceNew) {
        for (const candidate of [stored[ALT_STORAGE_KEY], stored[STORAGE_KEY]]) {
          if (!candidate || typeof candidate !== 'string') continue;
          if (candidate.startsWith('indexeddb://')) continue; // handled above via CUSTOM_REF
          try {
            await preloadImage(candidate);
            revokeObjectUrl();
            setWallpaperUrl(candidate);
            setCustomEnabled(false);
            setLoading(false);
            return;
          } catch { /* try next */ }
        }
      }

      // Fresh wallpaper from the background service worker.
      const url = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: 'FETCH_WALLPAPER' }, (response) => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else if (response?.error) reject(new Error(response.error));
          else resolve(response?.url);
        });
      });
      if (!url) throw new Error('No wallpaper URL returned');

      await applyRemoteWallpaper(url);
      setCustomEnabled(false);
      setIsPinned(false);

      // Best-effort mood detection maps onto a real theme now.
      const detected = await detectThemeFromImage(url);
      if (detected) await updateThemeMode(detected);
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [applyRemoteWallpaper, updateThemeMode, setBlobWallpaper]);

  const shuffleWallpaper = useCallback(async () => {
    await storageSet({ [PINNED_URL_KEY]: '' });
    await loadWallpaper(true);
    await analytics.track(EVENT_TYPES.WALLPAPER_SHUFFLE);
  }, [loadWallpaper, analytics]);

  const pinWallpaper = useCallback(async (pinned = true) => {
    if (pinned && wallpaperUrl && /^https?:\/\//.test(wallpaperUrl)) {
      await storageSet({ [PINNED_URL_KEY]: wallpaperUrl });
      setIsPinned(true);
    } else {
      await storageSet({ [PINNED_URL_KEY]: '' });
      setIsPinned(false);
      if (!pinned) await loadWallpaper(true);
    }
    await analytics.track(EVENT_TYPES.WALLPAPER_PIN);
  }, [wallpaperUrl, loadWallpaper, analytics]);

  const uploadCustomWallpaper = useCallback(async (file) => {
    if (!file || (!file.type.startsWith('image/') && !file.type.startsWith('video/'))) {
      setError('Please upload an image or video file');
      return;
    }
    try {
      setLoading(true);
      const reader = new FileReader();
      const dataUrl = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      if (file.type.startsWith('image/')) await preloadImage(dataUrl);

      // Store the blob in IndexedDB to avoid chrome.storage quota limits.
      const blob = await (await fetch(dataUrl)).blob();
      const refKey = `custom_bg_${Date.now()}`;
      await idbPut(refKey, blob);

      await storageSet({
        [CUSTOM_REF_KEY]: refKey,
        [CUSTOM_MIME_KEY]: file.type,
        [CUSTOM_ENABLED_KEY]: true,
        [STORAGE_KEY]: `indexeddb://${refKey}`,
        [ALT_STORAGE_KEY]: `indexeddb://${refKey}`,
        [THEME_KEY]: themeMode,
        [PINNED_URL_KEY]: '',
        [CUSTOM_DATA_KEY]: ''
      });
      await storageSet({ [PINNED_URL_KEY]: '' });
      setBlobWallpaper(blob);
      setCustomEnabled(true);
      setIsPinned(false);
      await analytics.track(EVENT_TYPES.WALLPAPER_UPLOAD);
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [themeMode, analytics, setBlobWallpaper]);

  const removeCustomWallpaper = useCallback(async () => {
    try {
      const stored = await storageGet([CUSTOM_REF_KEY]);
      const ref = stored[CUSTOM_REF_KEY];
      if (ref) { try { await idbDelete(ref); } catch { /* ignore */ } }
      revokeObjectUrl();
      await storageSet({
        [CUSTOM_ENABLED_KEY]: false, [CUSTOM_REF_KEY]: '', [CUSTOM_MIME_KEY]: '',
        [STORAGE_KEY]: '', [ALT_STORAGE_KEY]: '', [CUSTOM_DATA_KEY]: ''
      });
      setCustomEnabled(false);
      setWallpaperUrl(null);
      await updateThemeMode('wano');
      await loadWallpaper(true);
    } catch { /* ignore */ }
  }, [loadWallpaper, updateThemeMode]);

  useEffect(() => {
    loadWallpaper(true);
    return () => revokeObjectUrl();
  }, [loadWallpaper]);

  return {
    wallpaperUrl, loading, error, customEnabled, isPinned, themeMode,
    refreshWallpaper: () => loadWallpaper(true),
    shuffleWallpaper,
    pinWallpaper,
    uploadCustomWallpaper,
    removeCustomWallpaper,
    updateThemeMode
  };
};
