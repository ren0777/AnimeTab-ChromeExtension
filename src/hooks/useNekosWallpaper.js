import { useState, useEffect, useCallback, useRef } from 'react';
import { normalizeTheme } from '../lib/theme.mjs';
import { normalizeSource } from '../lib/wallpaperSources.mjs';
import { createAnalytics, EVENT_TYPES } from '../lib/analytics.mjs';
import { storageGet, storageSet } from '../lib/platform.mjs';

// Primary key used by the React app; ALT keys kept for legacy readers.
const STORAGE_KEY = 'nekosWallpaperUrl';
const ALT_STORAGE_KEY = 'anime_bg_url';
const THEME_KEY = 'animeThemeMode';
const MOOD_TOUCHED_KEY = 'moodTouched'; // user picked a mood manually → stop auto-detecting
const PINNED_URL_KEY = 'wallpaperPinnedUrl';
const CATEGORY_KEY = 'wallpaperCategory';
const SOURCE_KEY = 'wallpaperSource';
const CUSTOM_DATA_KEY = 'customBackgroundData';
const CUSTOM_MIME_KEY = 'customBackgroundMime';
const CUSTOM_ENABLED_KEY = 'customBackgroundEnabled';
const CUSTOM_REF_KEY = 'customBackgroundRef';

// Pinnable URLs: remote images plus the bundled fallbacks (stable
// chrome-extension:// paths). blob: URLs (custom uploads) die on reload and
// uploads already persist in IndexedDB, so pinning those means nothing —
// that gap is what made Pin/Unpin silently do nothing on fallback days.
const PINNABLE_URL_RE = /^(https?:\/\/|chrome-extension:\/\/)/;

// Must mirror the categories the background worker knows (background.js).
export const WALLPAPER_CATEGORIES = ['any', 'waifu', 'neko', 'kitsune', 'husbando'];
const DEFAULT_CATEGORY = 'any';

export const normalizeCategory = (value) =>
  WALLPAPER_CATEGORIES.includes(value) ? value : DEFAULT_CATEGORY;

const preloadImage = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = () => reject(new Error('Image failed to load'));
    img.src = url;
  });

// Videos must never go through the <img> probe above (they fail it and log
// console errors); a muted <video> works for object URLs and direct URLs.
const preloadVideo = (url) =>
  new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.loop = true;
    video.preload = 'auto';
    video.onloadeddata = () => resolve(url);
    video.onerror = () => reject(new Error('Video failed to load'));
    video.src = url;
  });

// Very small, fast mood detector. Draws a downsized copy of the image to a
// canvas and computes average HSL lightness/saturation, mapping results onto
// real themes. Only applied when the user hasn't chosen a mood manually.
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
  const [wallpaperIsVideo, setWallpaperIsVideo] = useState(false);
  const [themeMode, setThemeMode] = useState('wano');
  const [wallpaperCategory, setWallpaperCategoryState] = useState('any');
  const [wallpaperSource, setWallpaperSourceState] = useState('nekos');
  const objectUrlRef = useRef(null);

  const revokeObjectUrl = () => {
    try {
      if (objectUrlRef.current && objectUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    } catch { /* ignore */ }
    objectUrlRef.current = null;
  };

  const setBlobWallpaper = useCallback((blob, mime = '') => {
    revokeObjectUrl();
    const objUrl = URL.createObjectURL(blob);
    objectUrlRef.current = objUrl;
    // Custom uploads may be videos; render them with a <video> layer.
    setWallpaperIsVideo(String(mime || blob.type || '').toLowerCase().startsWith('video/'));
    setWallpaperUrl(objUrl);
    return objUrl;
  }, []);

  const updateThemeMode = useCallback(async (nextTheme, { userAction = false } = {}) => {
    const normalized = normalizeTheme(nextTheme);
    setThemeMode(normalized);
    await storageSet(userAction
      ? { [THEME_KEY]: normalized, [MOOD_TOUCHED_KEY]: '1' }
      : { [THEME_KEY]: normalized });
  }, []);

  const applyRemoteWallpaper = useCallback(async (url) => {
    await preloadImage(url);
    await storageSet({ [STORAGE_KEY]: url, [ALT_STORAGE_KEY]: url, [CUSTOM_ENABLED_KEY]: false });
    revokeObjectUrl();
    setWallpaperIsVideo(false);
    setWallpaperUrl(url);
  }, []);

  /**
   * Wallpaper loader.
   * - instant:    show the cached/stored wallpaper first (no spinner), then
   *               still refresh in the background so the next paint crossfades
   *               to a fresh image. Kills the blank/white wait on new tabs.
   * - forceNew:   skip the cache entirely and fetch a fresh image (Shuffle).
   */
  const loadWallpaper = useCallback(async ({ forceNew = false, instant = false } = {}) => {
    try {
      setLoading(true);
      setError(null);

      const stored = await storageGet([
        CUSTOM_ENABLED_KEY, CUSTOM_REF_KEY, CUSTOM_MIME_KEY,
        STORAGE_KEY, ALT_STORAGE_KEY, THEME_KEY, MOOD_TOUCHED_KEY,
        PINNED_URL_KEY, CATEGORY_KEY, SOURCE_KEY
      ]);
      setThemeMode(normalizeTheme(stored[THEME_KEY]));
      setWallpaperCategoryState(normalizeCategory(stored[CATEGORY_KEY]));
      setWallpaperSourceState(normalizeSource(stored[SOURCE_KEY]));
      const moodTouched = Boolean(stored[MOOD_TOUCHED_KEY]);
      const category = normalizeCategory(stored[CATEGORY_KEY]);
      const source = normalizeSource(stored[SOURCE_KEY]);

      // Custom uploads (kept in IndexedDB) always win.
      if (stored[CUSTOM_ENABLED_KEY] && stored[CUSTOM_REF_KEY]) {
        try {
          const blob = await idbGet(stored[CUSTOM_REF_KEY]);
          if (blob) {
            setBlobWallpaper(blob, stored[CUSTOM_MIME_KEY]);
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
          setWallpaperIsVideo(false);
          setCustomEnabled(false);
          setIsPinned(true);
          setLoading(false);
          return;
        } catch {
          await storageSet({ [PINNED_URL_KEY]: '' }); // dead link, forget it
        }
      }

      // Show the cached wallpaper immediately (unless this is an explicit
      // shuffle that should surprise us).
      let shownCached = false;
      if (instant || !forceNew) {
        for (const candidate of [stored[ALT_STORAGE_KEY], stored[STORAGE_KEY]]) {
          if (!candidate || typeof candidate !== 'string') continue;
          if (candidate.startsWith('indexeddb://')) continue; // handled via CUSTOM_REF
          try {
            await preloadImage(candidate);
            revokeObjectUrl();
            setWallpaperUrl(candidate);
            setWallpaperIsVideo(false);
            shownCached = true;
            setCustomEnabled(false);
            setLoading(false);
            break;
          } catch { /* try next */ }
        }
      }

      if (!forceNew && shownCached && !instant) {
        return; // old behavior: cached is enough when nothing forced a refresh
      }

      // Fresh wallpaper from the background service worker. While we already
      // show a cached image, keep the spinner off during the refresh.
      if (!shownCached) setLoading(true);
      const url = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: 'FETCH_WALLPAPER', category, source }, (response) => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else if (response?.error) reject(new Error(response.error));
          else resolve(response?.url);
        });
      });
      if (!url) throw new Error('No wallpaper URL returned');

      await applyRemoteWallpaper(url);
      setCustomEnabled(false);
      setIsPinned(false);

      // Best-effort mood detection — only while the user hasn't picked one.
      if (!moodTouched) {
        const detected = await detectThemeFromImage(url);
        if (detected) await updateThemeMode(detected);
      }
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [applyRemoteWallpaper, updateThemeMode, setBlobWallpaper]);

  const shuffleWallpaper = useCallback(async () => {
    await storageSet({ [PINNED_URL_KEY]: '' });
    await loadWallpaper({ forceNew: true });
    await analytics.track(EVENT_TYPES.WALLPAPER_SHUFFLE);
  }, [loadWallpaper, analytics]);

  const pinWallpaper = useCallback(async (pinned = true) => {
    if (pinned && wallpaperUrl && PINNABLE_URL_RE.test(wallpaperUrl)) {
      await storageSet({ [PINNED_URL_KEY]: wallpaperUrl });
      setIsPinned(true);
    } else {
      await storageSet({ [PINNED_URL_KEY]: '' });
      setIsPinned(false);
      if (!pinned) await loadWallpaper({ forceNew: true });
    }
    await analytics.track(EVENT_TYPES.WALLPAPER_PIN);
  }, [wallpaperUrl, loadWallpaper, analytics]);

  const setWallpaperCategory = useCallback(async (nextCategory) => {
    const normalized = normalizeCategory(nextCategory);
    setWallpaperCategoryState(normalized);
    await storageSet({ [CATEGORY_KEY]: normalized });
    await loadWallpaper({ forceNew: true }); // show a matching wallpaper right away
  }, [loadWallpaper]);

  const setWallpaperSource = useCallback(async (nextSource) => {
    const normalized = normalizeSource(nextSource);
    setWallpaperSourceState(normalized);
    await storageSet({ [SOURCE_KEY]: normalized });
    await loadWallpaper({ forceNew: true });
  }, [loadWallpaper]);

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

      // Validate before saving: <img> probe for images, muted <video> for videos.
      if (file.type.startsWith('image/')) await preloadImage(dataUrl);
      else await preloadVideo(dataUrl);

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
        [MOOD_TOUCHED_KEY]: '1',
        [PINNED_URL_KEY]: '',
        [CUSTOM_DATA_KEY]: ''
      });
      setBlobWallpaper(blob, file.type);
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
      setWallpaperIsVideo(false);
      setWallpaperUrl(null);
      await updateThemeMode('wano', { userAction: true });
      await loadWallpaper({ forceNew: true });
    } catch { /* ignore */ }
  }, [loadWallpaper, updateThemeMode]);

  useEffect(() => {
    // Instant paint from cache, then refresh to a fresh image via crossfade.
    loadWallpaper({ instant: true });
    return () => revokeObjectUrl();
  }, [loadWallpaper]);

  return {
    wallpaperUrl, loading, error, customEnabled, isPinned, wallpaperIsVideo, themeMode,
    wallpaperCategory, wallpaperSource,
    refreshWallpaper: () => loadWallpaper({ forceNew: true }),
    shuffleWallpaper,
    pinWallpaper,
    setWallpaperCategory,
    setWallpaperSource,
    uploadCustomWallpaper,
    removeCustomWallpaper,
    updateThemeMode
  };
};
