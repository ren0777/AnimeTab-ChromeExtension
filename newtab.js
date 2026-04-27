(() => {
  'use strict';

  const WALLPAPERS = Array.from({ length: 15 }, (_, index) => `assets/wallpapers/bg${index + 1}.webp`);
  const FALLBACK_QUOTE = {
    text: 'Keep walking. Even moonlight finds the patient traveler.',
    author: 'Hana Kurotsuki'
  };

  const STORAGE_KEYS = {
    wallpaperIndex: 'currentWallpaperIndex',
    featuredDismissed: 'featuredDismissed',
    customBackgroundData: 'customBackgroundData',
    customBackgroundMime: 'customBackgroundMime',
    customBackgroundEnabled: 'customBackgroundEnabled',
    lofiStreamUrl: 'lofiStreamUrl',
    lofiVolume: 'lofiVolume',
    lofiMuted: 'lofiMuted'
  };
  const DEFAULT_LOFI_STREAM = 'https://ice1.somafm.com/groovesalad-128-mp3';

  const state = {
    wallpaperIndex: 0,
    activeWallpaperLayer: 'a',
    clockTimerId: null,
    wallpaperTimerId: null,
    customBackgroundEnabled: false,
    controlHubOpen: false
  };

  const dom = {
    clock: document.querySelector('[data-clock]'),
    greetingJa: document.querySelector('[data-greeting-ja]'),
    greetingRomaji: document.querySelector('[data-greeting-romaji]'),
    quoteText: document.querySelector('[data-quote-text]'),
    quoteAuthor: document.querySelector('[data-quote-author]'),
    searchForm: document.querySelector('[data-search-form]'),
    searchInput: document.querySelector('[data-search-input]'),
    wallpaperA: document.querySelector('[data-wallpaper-a]'),
    wallpaperB: document.querySelector('[data-wallpaper-b]'),
    customVideo: document.querySelector('[data-custom-video]'),
    featuredCard: document.querySelector('[data-featured-card]'),
    featuredDismiss: document.querySelector('[data-featured-dismiss]'),
    customMediaStatus: document.querySelector('[data-custom-media-status]'),
    customUploadButton: document.querySelector('[data-custom-upload]'),
    customResetButton: document.querySelector('[data-custom-reset]'),
    customInput: document.querySelector('[data-custom-input]'),
    controlHubToggle: document.querySelector('[data-control-hub-toggle]'),
    controlHubPanel: document.querySelector('[data-control-hub-panel]'),
    controlHubClose: document.querySelector('[data-control-hub-close]'),
    lofiAudio: document.querySelector('[data-lofi-audio]'),
    lofiStatus: document.querySelector('[data-lofi-status]'),
    lofiToggle: document.querySelector('[data-lofi-toggle]'),
    lofiMute: document.querySelector('[data-lofi-mute]'),
    lofiVolume: document.querySelector('[data-lofi-volume]'),
    lofiUrl: document.querySelector('[data-lofi-url]'),
    lofiSaveUrl: document.querySelector('[data-lofi-save-url]')
  };

  const rafWrite = (writeFn) => {
    window.requestAnimationFrame(writeFn);
  };

  const storage = {
    get: async (keys) => {
      try {
        return await chrome.storage.local.get(keys);
      } catch (error) {
        console.error('[AnimeTab] Failed to read storage:', error);
        return {};
      }
    },
    set: async (values) => {
      try {
        await chrome.storage.local.set(values);
      } catch (error) {
        console.error('[AnimeTab] Failed to write storage:', error);
      }
    }
  };

  const getGreetingByHour = (hour) => {
    if (hour >= 5 && hour <= 11) {
      return { ja: 'おはようございます', romaji: 'Ohayou gozaimasu' };
    }
    if (hour >= 12 && hour <= 17) {
      return { ja: 'こんにちは', romaji: 'Konnichiwa' };
    }
    if (hour >= 18 && hour <= 22) {
      return { ja: 'こんばんは', romaji: 'Konbanwa' };
    }
    return { ja: 'おやすみなさい', romaji: 'Oyasumi nasai' };
  };

  const updateClock = () => {
    const now = new Date();
    const timeText = now.toLocaleTimeString('en-GB', { hour12: false });
    const greeting = getGreetingByHour(now.getHours());

    rafWrite(() => {
      dom.clock.textContent = timeText;
      dom.greetingJa.textContent = greeting.ja;
      dom.greetingRomaji.textContent = greeting.romaji;
    });
  };

  const startClock = () => {
    updateClock();
    state.clockTimerId = window.setInterval(updateClock, 1000);
  };

  const getDayOfYear = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    return Math.floor(diff / 86400000);
  };

  const renderQuote = (quote) => {
    rafWrite(() => {
      dom.quoteText.textContent = `“${quote.text}”`;
      dom.quoteAuthor.textContent = `— ${quote.author}`;
    });
  };

  const loadDailyQuote = async () => {
    try {
      const response = await fetch('quotes.json', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Quote fetch failed with status ${response.status}`);
      }
      const quotes = await response.json();
      if (!Array.isArray(quotes) || quotes.length === 0) {
        throw new Error('Quote data is empty or invalid');
      }
      const quoteIndex = Math.floor(getDayOfYear() % quotes.length);
      renderQuote(quotes[quoteIndex]);
    } catch (error) {
      console.error('[AnimeTab] Failed to load quotes.json, using fallback quote:', error);
      renderQuote(FALLBACK_QUOTE);
    }
  };

  const getNextWallpaperIndex = (currentIndex) => {
    return (currentIndex + 1) % WALLPAPERS.length;
  };

  const setCustomMediaStatus = (message) => {
    rafWrite(() => {
      dom.customMediaStatus.textContent = message;
    });
  };

  const setLofiStatus = (message) => {
    rafWrite(() => {
      dom.lofiStatus.textContent = message;
    });
  };

  const setControlHubOpen = (isOpen) => {
    state.controlHubOpen = isOpen;
    rafWrite(() => {
      dom.controlHubPanel.classList.toggle('is-open', isOpen);
      dom.controlHubToggle.setAttribute('aria-expanded', String(isOpen));
    });
  };

  const initControlHub = () => {
    dom.controlHubToggle.addEventListener('click', () => {
      setControlHubOpen(!state.controlHubOpen);
    });

    dom.controlHubClose.addEventListener('click', () => {
      setControlHubOpen(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && state.controlHubOpen) {
        setControlHubOpen(false);
      }
    });
  };

  const setWallpaperBackground = (element, imagePath) => {
    element.style.backgroundImage = `url('${imagePath}')`;
  };

  const preloadWallpaper = (imagePath) => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.loading = 'lazy';
      image.onload = resolve;
      image.onerror = reject;
      image.src = imagePath;
    });
  };

  const applyWallpaperSwap = (nextPath) => {
    const showLayerA = state.activeWallpaperLayer === 'b';
    const nextLayer = showLayerA ? dom.wallpaperA : dom.wallpaperB;
    const currentLayer = showLayerA ? dom.wallpaperB : dom.wallpaperA;

    setWallpaperBackground(nextLayer, nextPath);
    rafWrite(() => {
      nextLayer.style.opacity = '1';
      currentLayer.style.opacity = '0';
      state.activeWallpaperLayer = showLayerA ? 'a' : 'b';
    });
  };

  const hideCustomVideo = () => {
    rafWrite(() => {
      dom.customVideo.style.opacity = '0';
    });
    dom.customVideo.pause();
    dom.customVideo.removeAttribute('src');
    dom.customVideo.load();
  };

  const showBuiltInWallpapers = () => {
    hideCustomVideo();
    rafWrite(() => {
      dom.wallpaperA.style.opacity = '1';
      dom.wallpaperB.style.opacity = '0';
    });
  };

  const clearWallpaperTimer = () => {
    if (state.wallpaperTimerId !== null) {
      window.clearInterval(state.wallpaperTimerId);
      state.wallpaperTimerId = null;
    }
  };

  const startWallpaperTimer = () => {
    clearWallpaperTimer();
    state.wallpaperTimerId = window.setInterval(() => {
      if (!state.customBackgroundEnabled) {
        void rotateWallpaper();
      }
    }, 300000);
  };

  const applyCustomBackground = async (dataUrl, mimeType) => {
    state.customBackgroundEnabled = true;
    clearWallpaperTimer();
    const isVideo = mimeType.startsWith('video/');

    if (isVideo) {
      dom.customVideo.src = dataUrl;
      rafWrite(() => {
        dom.wallpaperA.style.opacity = '0';
        dom.wallpaperB.style.opacity = '0';
        dom.customVideo.style.opacity = '1';
      });
      try {
        await dom.customVideo.play();
      } catch (error) {
        console.error('[AnimeTab] Autoplay blocked for custom video background:', error);
      }
      setCustomMediaStatus('Using custom video background.');
      return;
    }

    hideCustomVideo();
    setWallpaperBackground(dom.wallpaperA, dataUrl);
    setWallpaperBackground(dom.wallpaperB, dataUrl);
    rafWrite(() => {
      dom.wallpaperA.style.opacity = '1';
      dom.wallpaperB.style.opacity = '0';
    });
    setCustomMediaStatus('Using custom photo or GIF background.');
  };

  const resetToBuiltInWallpapers = async () => {
    state.customBackgroundEnabled = false;
    await storage.set({
      [STORAGE_KEYS.customBackgroundEnabled]: false,
      [STORAGE_KEYS.customBackgroundData]: '',
      [STORAGE_KEYS.customBackgroundMime]: ''
    });
    showBuiltInWallpapers();
    setCustomMediaStatus('Using built-in wallpaper rotation.');
    await initWallpaper();
  };

  const fileToDataUrl = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read selected file.'));
      reader.readAsDataURL(file);
    });
  };

  const initCustomMedia = async () => {
    const data = await storage.get([
      STORAGE_KEYS.customBackgroundData,
      STORAGE_KEYS.customBackgroundMime,
      STORAGE_KEYS.customBackgroundEnabled
    ]);

    const savedData = data[STORAGE_KEYS.customBackgroundData];
    const savedMime = data[STORAGE_KEYS.customBackgroundMime];
    const isEnabled = data[STORAGE_KEYS.customBackgroundEnabled] === true;

    if (isEnabled && typeof savedData === 'string' && savedData && typeof savedMime === 'string' && savedMime) {
      try {
        await applyCustomBackground(savedData, savedMime);
      } catch (error) {
        console.error('[AnimeTab] Failed to restore custom background:', error);
        await resetToBuiltInWallpapers();
      }
    } else {
      setCustomMediaStatus('Using built-in wallpaper rotation.');
    }

    dom.customUploadButton.addEventListener('click', () => {
      dom.customInput.click();
    });

    dom.customResetButton.addEventListener('click', () => {
      void resetToBuiltInWallpapers();
    });

    dom.customInput.addEventListener('change', async (event) => {
      const selectedFile = event.target.files && event.target.files[0];
      if (!selectedFile) {
        return;
      }

      if (!selectedFile.type.startsWith('image/') && !selectedFile.type.startsWith('video/')) {
        setCustomMediaStatus('Unsupported file type. Please upload an image, GIF, or video.');
        dom.customInput.value = '';
        return;
      }

      setCustomMediaStatus('Processing custom background...');

      try {
        const dataUrl = await fileToDataUrl(selectedFile);
        await applyCustomBackground(dataUrl, selectedFile.type);
        await storage.set({
          [STORAGE_KEYS.customBackgroundData]: dataUrl,
          [STORAGE_KEYS.customBackgroundMime]: selectedFile.type,
          [STORAGE_KEYS.customBackgroundEnabled]: true
        });
      } catch (error) {
        console.error('[AnimeTab] Failed to set custom background:', error);
        setCustomMediaStatus('Could not apply this file. Try a smaller image or video.');
      } finally {
        dom.customInput.value = '';
      }
    });
  };

  const updateLofiButtons = () => {
    const isPlaying = !dom.lofiAudio.paused;
    dom.lofiToggle.textContent = isPlaying ? 'Pause' : 'Play';
    dom.lofiMute.textContent = dom.lofiAudio.muted ? 'Unmute' : 'Mute';
  };

  const initLofi = async () => {
    const data = await storage.get([
      STORAGE_KEYS.lofiStreamUrl,
      STORAGE_KEYS.lofiVolume,
      STORAGE_KEYS.lofiMuted
    ]);

    const savedUrl = typeof data[STORAGE_KEYS.lofiStreamUrl] === 'string' && data[STORAGE_KEYS.lofiStreamUrl]
      ? data[STORAGE_KEYS.lofiStreamUrl]
      : DEFAULT_LOFI_STREAM;
    const savedVolumeRaw = Number(data[STORAGE_KEYS.lofiVolume]);
    const savedVolume = Number.isFinite(savedVolumeRaw) ? Math.max(0, Math.min(1, savedVolumeRaw)) : 0.35;
    const savedMuted = data[STORAGE_KEYS.lofiMuted] === true;

    dom.lofiAudio.src = savedUrl;
    dom.lofiAudio.volume = savedVolume;
    dom.lofiAudio.muted = savedMuted;
    dom.lofiUrl.value = savedUrl;
    dom.lofiVolume.value = String(Math.round(savedVolume * 100));
    setLofiStatus('Ready. Press play for lo-fi.');
    updateLofiButtons();

    dom.lofiToggle.addEventListener('click', async () => {
      try {
        if (dom.lofiAudio.paused) {
          await dom.lofiAudio.play();
          setLofiStatus('Playing lo-fi stream.');
        } else {
          dom.lofiAudio.pause();
          setLofiStatus('Paused.');
        }
      } catch (error) {
        console.error('[AnimeTab] Failed to play lo-fi stream:', error);
        setLofiStatus('Could not play stream. Try another URL.');
      } finally {
        updateLofiButtons();
      }
    });

    dom.lofiMute.addEventListener('click', async () => {
      dom.lofiAudio.muted = !dom.lofiAudio.muted;
      await storage.set({ [STORAGE_KEYS.lofiMuted]: dom.lofiAudio.muted });
      updateLofiButtons();
    });

    dom.lofiVolume.addEventListener('input', async () => {
      const volume = Math.max(0, Math.min(1, Number(dom.lofiVolume.value) / 100));
      dom.lofiAudio.volume = volume;
      await storage.set({ [STORAGE_KEYS.lofiVolume]: volume });
    });

    dom.lofiSaveUrl.addEventListener('click', async () => {
      const nextUrl = dom.lofiUrl.value.trim();
      if (!nextUrl || !/^https:\/\//i.test(nextUrl)) {
        setLofiStatus('Use a valid https:// stream URL.');
        return;
      }

      const wasPlaying = !dom.lofiAudio.paused;
      dom.lofiAudio.pause();
      dom.lofiAudio.src = nextUrl;
      await storage.set({ [STORAGE_KEYS.lofiStreamUrl]: nextUrl });
      setLofiStatus('Stream updated.');

      if (wasPlaying) {
        try {
          await dom.lofiAudio.play();
          setLofiStatus('Playing updated stream.');
        } catch (error) {
          console.error('[AnimeTab] Failed to play updated lo-fi stream:', error);
          setLofiStatus('Stream saved, but playback failed.');
        }
      }
      updateLofiButtons();
    });

    dom.lofiAudio.addEventListener('error', () => {
      setLofiStatus('Stream error. Try another lo-fi URL.');
      updateLofiButtons();
    });

    dom.lofiAudio.addEventListener('play', updateLofiButtons);
    dom.lofiAudio.addEventListener('pause', updateLofiButtons);
  };

  const rotateWallpaper = async () => {
    if (state.customBackgroundEnabled) {
      return;
    }

    let attempts = 0;
    while (attempts < WALLPAPERS.length) {
      const nextIndex = getNextWallpaperIndex(state.wallpaperIndex);
      const nextPath = WALLPAPERS[nextIndex];

      try {
        await preloadWallpaper(nextPath);
        applyWallpaperSwap(nextPath);
        state.wallpaperIndex = nextIndex;
        await storage.set({ [STORAGE_KEYS.wallpaperIndex]: nextIndex });
        return;
      } catch (error) {
        attempts += 1;
        state.wallpaperIndex = nextIndex;
        console.error('[AnimeTab] Wallpaper failed to load, trying next image:', error);
      }
    }

    console.error('[AnimeTab] No wallpaper images could be loaded.');
  };

  const initWallpaper = async () => {
    if (state.customBackgroundEnabled) {
      return;
    }

    const data = await storage.get([STORAGE_KEYS.wallpaperIndex]);
    const storedIndex = Number.isInteger(data[STORAGE_KEYS.wallpaperIndex])
      ? data[STORAGE_KEYS.wallpaperIndex]
      : Math.floor(Math.random() * WALLPAPERS.length);

    state.wallpaperIndex = Math.max(0, Math.min(storedIndex, WALLPAPERS.length - 1));

    try {
      const initialPath = WALLPAPERS[state.wallpaperIndex];
      await preloadWallpaper(initialPath);
      setWallpaperBackground(dom.wallpaperA, initialPath);
      dom.wallpaperA.style.opacity = '1';
      dom.wallpaperB.style.opacity = '0';
      await storage.set({ [STORAGE_KEYS.wallpaperIndex]: state.wallpaperIndex });
    } catch (error) {
      console.error('[AnimeTab] Initial wallpaper failed, moving to next available image:', error);
      await rotateWallpaper();
    }

    startWallpaperTimer();
  };

  const initSearch = () => {
    dom.searchForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const query = dom.searchInput.value.trim();
      if (!query) {
        return;
      }

      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      dom.searchInput.value = '';
      window.location.assign(searchUrl);
    });

    window.setTimeout(() => {
      dom.searchInput.focus();
    }, 300);
  };

  const hideFeaturedCard = () => {
    rafWrite(() => {
      dom.featuredCard.hidden = true;
    });
  };

  const initFeaturedCard = async () => {
    const data = await storage.get([STORAGE_KEYS.featuredDismissed]);
    if (data[STORAGE_KEYS.featuredDismissed] === true) {
      hideFeaturedCard();
      return;
    }

    dom.featuredDismiss.addEventListener('click', async () => {
      hideFeaturedCard();
      await storage.set({ [STORAGE_KEYS.featuredDismissed]: true });
    });
  };

  const init = async () => {
    const hasRequiredDom = Object.values(dom).every((node) => node !== null);
    if (!hasRequiredDom) {
      console.error('[AnimeTab] Required DOM nodes are missing.');
      return;
    }

    startClock();
    initControlHub();
    await initCustomMedia();
    await Promise.all([
      initWallpaper(),
      loadDailyQuote(),
      initFeaturedCard(),
      initLofi()
    ]);
    initSearch();
  };

  void init();
})();
