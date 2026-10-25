import { useState, useEffect, useCallback, useRef } from 'react';

// Primary key used by the React app; we support legacy and external keys too
const STORAGE_KEY = 'nekosWallpaperUrl';
const ALT_STORAGE_KEY = 'anime_bg_url';
const THEME_KEY = 'animeThemeMode';
const API_URL = 'https://nekos.best/api/v2/wallpaper';
const CUSTOM_DATA_KEY = 'customBackgroundData';
const CUSTOM_MIME_KEY = 'customBackgroundMime';
const CUSTOM_ENABLED_KEY = 'customBackgroundEnabled';
const CUSTOM_REF_KEY = 'customBackgroundRef';
const DEFAULT_THEME = 'wano';

const normalizeTheme = (value) => {
  const allowed = ['wano', 'lofi', 'cute', 'romantic', 'fighting'];
  return allowed.includes(value) ? value : DEFAULT_THEME;
};

const preloadImage = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = () => reject(new Error('Image failed to load'));
    img.src = url;
  });

// Very small, fast palette/mood detector. Draws a downsized copy of the image
// to a canvas and computes average HSL values to classify into a simple
// 'kawaii' (light/pastel) or 'aesthetic' (darker/vibrant) theme.
const detectThemeFromImage = (url) =>
  new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const max = 120; // downscale to keep it fast
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
          const l = (maxc + minc) / 2; // lightness 0..1
          let s = 0;
          if (maxc !== minc) {
            s = (l > 0.5) ? (maxc - minc) / (2 - maxc - minc) : (maxc - minc) / (maxc + minc);
          }
          // Pastel & very light -> kawaii. Otherwise, aesthetic.
          if (l > 0.78 && s < 0.35) resolve('kawaii');
          else resolve('aesthetic');
        } catch (e) {
          resolve(DEFAULT_THEME);
        }
      };
      img.onerror = () => resolve(DEFAULT_THEME);
      img.src = url;
    } catch (e) {
      resolve(DEFAULT_THEME);
    }
  });

const getStorage = (keys) =>
  new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => resolve(result));
  });

const setStorage = (values) =>
  new Promise((resolve) => {
    chrome.storage.local.set(values, resolve);
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
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
    };
    r.onerror = () => {
      db.close();
      reject(r.error || new Error('IDB put failed'));
    };
  });
};

const idbGet = async (key) => {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readonly');
    const store = tx.objectStore('files');
    const r = store.get(key);
    r.onsuccess = () => {
      db.close();
      resolve(r.result);
    };
    r.onerror = () => {
      db.close();
      reject(r.error || new Error('IDB get failed'));
    };
  });
};

const idbDelete = async (key) => {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readwrite');
    const store = tx.objectStore('files');
    const r = store.delete(key);
    r.onsuccess = () => {
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
    };
    r.onerror = () => {
      db.close();
      reject(r.error || new Error('IDB delete failed'));
    };
  });
};

export const useNekosWallpaper = () => {
    const [wallpaperUrl, setWallpaperUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [customEnabled, setCustomEnabled] = useState(false);
    const [themeMode, setThemeMode] = useState(DEFAULT_THEME);
    const objectUrlRef = useRef(null);

    const revokeObjectUrl = () => {
      try {
        if (objectUrlRef.current && objectUrlRef.current.startsWith('blob:')) {
          URL.revokeObjectURL(objectUrlRef.current);
        }
      } catch (e) {
        // ignore
      } finally {
        objectUrlRef.current = null;
      }
    };

    const loadWallpaper = useCallback(async (forceNew = false) => {
      try {
        setLoading(true);
        setError(null);

      // ALWAYS check for custom wallpaper first, regardless of forceNew
      const stored = await getStorage([
        CUSTOM_ENABLED_KEY,
        CUSTOM_REF_KEY,
        CUSTOM_MIME_KEY,
        STORAGE_KEY,
        ALT_STORAGE_KEY,
        THEME_KEY
      ]);
      setThemeMode(normalizeTheme(stored[THEME_KEY]));

      // If user has a saved custom background stored in IDB, load it
      if (stored[CUSTOM_ENABLED_KEY] && stored[CUSTOM_REF_KEY]) {
        try {
          const blob = await idbGet(stored[CUSTOM_REF_KEY]);
          if (blob) {
            revokeObjectUrl();
            const objUrl = URL.createObjectURL(blob);
            objectUrlRef.current = objUrl;
            setWallpaperUrl(objUrl);
            setCustomEnabled(true);
            setLoading(false);
            return;
          }
        } catch (e) {
          // IDB read failure -> fallthrough
        }
      }

      // If forceNew is false and no custom, try to use stored URL
      if (!forceNew) {
        const tryLoadFromStored = async (val) => {
          if (!val) return false;
          if (typeof val === 'string' && val.startsWith('indexeddb://')) {
            const ref = val.replace('indexeddb://', '');
            try {
              const blob = await idbGet(ref);
              if (blob) {
                revokeObjectUrl();
                const objUrl = URL.createObjectURL(blob);
                objectUrlRef.current = objUrl;
                setWallpaperUrl(objUrl);
                setCustomEnabled(true);
                return true;
              }
            } catch (e) {
              return false;
            }
          }
          try {
            await preloadImage(val);
            setWallpaperUrl(val);
            return true;
          } catch (e) {
            return false;
          }
        };

        if (await tryLoadFromStored(stored[ALT_STORAGE_KEY])) {
          setLoading(false);
          return;
        }
        if (await tryLoadFromStored(stored[STORAGE_KEY])) {
          setLoading(false);
          return;
        }
      }

      // Fetch from background service worker (always get fresh on new tab)
      const url = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: 'FETCH_WALLPAPER' }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response?.error) {
            reject(new Error(response.error));
          } else {
            resolve(response?.url);
          }
        });
      });

      if (!url) throw new Error('No wallpaper URL returned');

      await preloadImage(url);
      await setStorage({ [STORAGE_KEY]: url, [CUSTOM_ENABLED_KEY]: false });
      revokeObjectUrl();
      setWallpaperUrl(url);
      // Detect theme from fetched wallpaper (best-effort)
      try {
        const detected = await detectThemeFromImage(url);
        await updateThemeMode(detected);
      } catch (e) {
        // ignore detection failures
      }
      setCustomEnabled(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
    }, []);

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

        // For images, attempt to preload to ensure valid image data
        if (file.type.startsWith('image/')) {
          await preloadImage(dataUrl);
        }

        // Convert dataUrl -> Blob and store in IDB to avoid chrome.storage quota
        const blob = await (await fetch(dataUrl)).blob();
        const refKey = `custom_bg_${Date.now()}`;
        await idbPut(refKey, blob);

        await setStorage({
          [CUSTOM_REF_KEY]: refKey,
          [CUSTOM_MIME_KEY]: file.type,
          [CUSTOM_ENABLED_KEY]: true,
          // store a small pointer in chrome.storage so legacy readers can detect it
          [STORAGE_KEY]: `indexeddb://${refKey}`,
          [ALT_STORAGE_KEY]: `indexeddb://${refKey}`,
          [THEME_KEY]: themeMode,
          // clear any raw data field if present
          [CUSTOM_DATA_KEY]: ''
        });

        // Create an object URL for immediate display
        revokeObjectUrl();
        const objUrl = URL.createObjectURL(blob);
        objectUrlRef.current = objUrl;
        setWallpaperUrl(objUrl);

        // Analyze uploaded image and pick a matching theme
        try {
          if (file.type.startsWith('image/')) {
            const detected = await detectThemeFromImage(objUrl);
            await updateThemeMode(detected);
          } else {
            await updateThemeMode('aesthetic');
          }
        } catch (e) {
          // ignore
        }
        setCustomEnabled(true);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, [themeMode]);

    const removeCustomWallpaper = useCallback(async () => {
      try {
        const stored = await getStorage([CUSTOM_REF_KEY]);
        const ref = stored[CUSTOM_REF_KEY];
        if (ref) {
          try {
            await idbDelete(ref);
          } catch (e) {
            // ignore delete errors
          }
        }
        revokeObjectUrl();
        await setStorage({
          [CUSTOM_ENABLED_KEY]: false,
          [CUSTOM_REF_KEY]: '',
          [CUSTOM_MIME_KEY]: '',
          [STORAGE_KEY]: '',
          [ALT_STORAGE_KEY]: '',
          [CUSTOM_DATA_KEY]: ''
        });
        setCustomEnabled(false);
        setWallpaperUrl(null);
        // Reset theme to default Wano when user removes custom wallpaper
        setThemeMode(DEFAULT_THEME);
        await setStorage({ [THEME_KEY]: DEFAULT_THEME });
        loadWallpaper(true);
      } catch (e) {
        // ignore
      }
    }, [loadWallpaper]);

    const updateThemeMode = useCallback(async (nextTheme) => {
      const normalized = normalizeTheme(nextTheme);
      setThemeMode(normalized);
      await setStorage({ [THEME_KEY]: normalized });
    }, []);

    useEffect(() => {
      // Always fetch a fresh wallpaper when component mounts (new tab)
      // but custom wallpapers are always preserved
      loadWallpaper(true);
      return () => revokeObjectUrl();
    }, [loadWallpaper]);

    return {
      wallpaperUrl,
      loading,
      error,
      customEnabled,
      themeMode,
      refreshWallpaper: () => loadWallpaper(true),
      uploadCustomWallpaper,
      removeCustomWallpaper,
      updateThemeMode
    };
  };
