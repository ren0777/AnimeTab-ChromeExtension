import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'nekosWallpaperUrl';

const getStoredWallpaper = () =>
  new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) =>
      resolve(result[STORAGE_KEY] || null)
    );
  });

const storeWallpaper = (url) =>
  new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: url }, resolve);
  });

export const useNekosWallpaper = () => {
  const [wallpaperUrl, setWallpaperUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNew = useCallback(() => {
    setLoading(true);
    setError(null);

    chrome.runtime.sendMessage({ type: 'FETCH_WALLPAPER' }, async (response) => {
      if (chrome.runtime.lastError) {
        setError(chrome.runtime.lastError.message);
        setLoading(false);
        return;
      }

      if (response?.error) {
        setError(response.error);
        setLoading(false);
        return;
      }

      const url = response?.url;
      if (url) {
        setWallpaperUrl(url);
        setLoading(false);
        await storeWallpaper(url);
      }
    });
  }, []);

  useEffect(() => {
    getStoredWallpaper().then((cached) => {
      if (cached) {
        setWallpaperUrl(cached);
        setLoading(false);
      }
      fetchNew();
    });
  }, [fetchNew]);

  return { wallpaperUrl, loading, error, refreshWallpaper: fetchNew };
};
