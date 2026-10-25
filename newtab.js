(() => {
  'use strict';

  const WALLPAPERS = [
    'assets/wallpapers/1598073.jpg',
    'assets/wallpapers/268199.png',
    'assets/wallpapers/2950467.jpg',
    'assets/wallpapers/403041.jpg',
    'assets/wallpapers/4146301.jpg',
    'assets/wallpapers/490282.jpg',
    'assets/wallpapers/490294.jpg',
    'assets/wallpapers/609311f3-a085-4569-96c6-c4a87f49a5f8-cover.png',
    'assets/wallpapers/742320.png',
    'assets/wallpapers/anime-style-clouds_23-2151071771.webp',
    'assets/wallpapers/Bts aesthetic lyrics desktop wallpaper -Love Myself.jpeg',
    'assets/wallpapers/Cotton Candy Castle.jpeg',
    'assets/wallpapers/demon-slayer-mitsuri-kanroji-pink-anime-desktop-wallpaper-4k.jpg',
    'assets/wallpapers/desktop-wallpaper-best-laptop-anime.jpg',
    'assets/wallpapers/download (1).jpeg'
  ];
  const FALLBACK_QUOTE = {
    text: 'Keep walking. Even moonlight finds the patient traveler.',
    author: 'Hana Kurotsuki'
  };
  const DEFAULT_LOFI_STREAM = 'https://ice1.somafm.com/groovesalad-128-mp3';
  const AMBIENT_URLS = {
    rain: 'https://ice1.somafm.com/dronezone-128-mp3',
    cafe: 'https://ice1.somafm.com/secretagent-128-mp3',
    vinyl: 'https://ice1.somafm.com/defcon-128-mp3'
  };
  const REWARDS = [
    { id: 'neon-rain', invites: 3 },
    { id: 'night-drive', invites: 5 },
    { id: 'hologram-clock', invites: 10 }
  ];

  const STORAGE_KEYS = {
    wallpaperIndex: 'currentWallpaperIndex',
    featuredDismissed: 'featuredDismissed',
    customBackgroundData: 'customBackgroundData',
    customBackgroundMime: 'customBackgroundMime',
    customBackgroundEnabled: 'customBackgroundEnabled',
    lofiStreamUrl: 'lofiStreamUrl',
    lofiVolume: 'lofiVolume',
    lofiMuted: 'lofiMuted',
    inviteCount: 'inviteCount',
    growthMetrics: 'growthMetrics',
    unlockedRewards: 'unlockedRewards',
    setupCode: 'setupCode',
    streakCount: 'streakCount',
    lastOpenDate: 'lastOpenDate',
    ambientMode: 'ambientMode',
    focusEndAt: 'focusEndAt'
  };

  const state = {
    wallpaperIndex: 0,
    activeWallpaperLayer: 'a',
    clockTimerId: null,
    wallpaperTimerId: null,
    customBackgroundEnabled: false,
    controlHubOpen: false,
    growthMetrics: { invites: 0, shareActions: 0, setupExports: 0, rewardUnlocks: 0 },
    unlockedRewards: [],
    focusTimerId: null,
    focusEndAt: 0
  };

  const dom = {
    page: document.querySelector('.page'),
    clock: document.querySelector('[data-clock]'),
    greetingJa: document.querySelector('[data-greeting-ja]'),
    greetingRomaji: document.querySelector('[data-greeting-romaji]'),
    quoteText: document.querySelector('[data-quote-text]'),
    quoteAuthor: document.querySelector('[data-quote-author]'),
    moodText: document.querySelector('[data-mood-text]'),
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
    inviteButtons: document.querySelectorAll('[data-share-method]'),
    inviteStatus: document.querySelector('[data-invite-status]'),
    rewardLocks: document.querySelectorAll('[data-reward-lock]'),
    rewardItems: document.querySelectorAll('.reward-item'),
    lofiAudio: document.querySelector('[data-lofi-audio]'),
    lofiStatus: document.querySelector('[data-lofi-status]'),
    lofiToggle: document.querySelector('[data-lofi-toggle]'),
    lofiMute: document.querySelector('[data-lofi-mute]'),
    lofiVolume: document.querySelector('[data-lofi-volume]'),
    lofiUrl: document.querySelector('[data-lofi-url]'),
    lofiSaveUrl: document.querySelector('[data-lofi-save-url]'),
    setupExport: document.querySelector('[data-setup-export]'),
    setupImport: document.querySelector('[data-setup-import]'),
    setupCode: document.querySelector('[data-setup-code]'),
    setupStatus: document.querySelector('[data-setup-share-status]'),
    streakStatus: document.querySelector('[data-streak-status]'),
    focusToggle: document.querySelector('[data-focus-toggle]'),
    focusTimer: document.querySelector('[data-focus-timer]'),
    ambientSelect: document.querySelector('[data-ambient-select]'),
    ambientAudio: document.querySelector('[data-ambient-audio]'),
    growthMetrics: document.querySelector('[data-growth-metrics]')
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

  const setInviteStatus = (message) => {
    rafWrite(() => {
      dom.inviteStatus.textContent = message;
    });
  };

  const setSetupStatus = (message) => {
    rafWrite(() => {
      dom.setupStatus.textContent = message;
    });
  };

  const formatGrowthMetrics = () => {
    const { invites, shareActions, setupExports, rewardUnlocks } = state.growthMetrics;
    return `Invites: ${invites} • Shares: ${shareActions} • Exports: ${setupExports} • Rewards: ${rewardUnlocks}`;
  };

  const renderGrowthMetrics = () => {
    rafWrite(() => {
      dom.growthMetrics.textContent = formatGrowthMetrics();
    });
  };

  const bumpMetric = async (key, amount = 1) => {
    state.growthMetrics[key] = (state.growthMetrics[key] || 0) + amount;
    renderGrowthMetrics();
    await storage.set({ [STORAGE_KEYS.growthMetrics]: state.growthMetrics });
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

  const updateMoodWidget = () => {
    const hour = new Date().getHours();
    const mood = hour < 12
      ? 'Morning resolve • build your arc with one clean chapter.'
      : hour < 18
        ? 'Afternoon grind • steady focus beats chaos.'
        : 'Night drive lo-fi • moonlight, rain, and deep work.';
    rafWrite(() => {
      dom.moodText.textContent = mood;
    });
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
    updateMoodWidget();
    state.clockTimerId = window.setInterval(() => {
      updateClock();
      updateMoodWidget();
      updateFocusCountdown();
    }, 1000);
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
      const hasNightDrive = state.unlockedRewards.includes('night-drive');
      const filtered = hasNightDrive ? quotes : quotes.filter((_, idx) => idx % 3 !== 0);
      const quoteIndex = Math.floor(Math.random() * filtered.length);
      renderQuote(filtered[quoteIndex]);
    } catch (error) {
      console.error('[AnimeTab] Failed to load quotes.json, using fallback quote:', error);
      renderQuote(FALLBACK_QUOTE);
    }
  };

  const setControlHubOpen = (isOpen) => {
    state.controlHubOpen = isOpen;
    rafWrite(() => {
      dom.controlHubPanel.classList.toggle('is-open', isOpen);
      dom.controlHubToggle.setAttribute('aria-expanded', String(isOpen));
    });
  };

  const initControlHub = () => {
    dom.controlHubToggle.addEventListener('click', () => setControlHubOpen(!state.controlHubOpen));
    dom.controlHubClose.addEventListener('click', () => setControlHubOpen(false));
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

  const rotateWallpaper = async () => {
    if (state.customBackgroundEnabled) {
      return false;
    }
    let attempts = 0;
    while (attempts < WALLPAPERS.length) {
      const nextIndex = (state.wallpaperIndex + 1) % WALLPAPERS.length;
      const nextPath = WALLPAPERS[nextIndex];
      try {
        await preloadWallpaper(nextPath);
        applyWallpaperSwap(nextPath);
        state.wallpaperIndex = nextIndex;
        await storage.set({ [STORAGE_KEYS.wallpaperIndex]: nextIndex });
        return true;
      } catch (error) {
        attempts += 1;
        state.wallpaperIndex = nextIndex;
        console.error('[AnimeTab] Wallpaper failed to load, trying next image:', error);
      }
    }
    console.error('[AnimeTab] No wallpaper images could be loaded.');
    return false;
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
    if (mimeType.startsWith('video/')) {
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
    // #region agent log
    // #endregion
    state.customBackgroundEnabled = false;
    await storage.set({
      [STORAGE_KEYS.customBackgroundEnabled]: false,
      [STORAGE_KEYS.customBackgroundData]: '',
      [STORAGE_KEYS.customBackgroundMime]: ''
    });
    showBuiltInWallpapers();
    setCustomMediaStatus('Using built-in wallpaper rotation.');
    const initOk = await initWallpaper();
    if (!initOk) {
      setCustomMediaStatus('Built-in wallpapers not found. Add bg1.webp to bg15.webp in assets/wallpapers/.');
      // #region agent log
      // #endregion
    }
    // #region agent log
    // #endregion
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
    const data = await storage.get([STORAGE_KEYS.customBackgroundData, STORAGE_KEYS.customBackgroundMime, STORAGE_KEYS.customBackgroundEnabled]);
    const savedData = data[STORAGE_KEYS.customBackgroundData];
    const savedMime = data[STORAGE_KEYS.customBackgroundMime];
    if (data[STORAGE_KEYS.customBackgroundEnabled] === true && typeof savedData === 'string' && savedData && typeof savedMime === 'string' && savedMime) {
      try {
        await applyCustomBackground(savedData, savedMime);
      } catch (error) {
        console.error('[AnimeTab] Failed to restore custom background:', error);
        await resetToBuiltInWallpapers();
      }
    } else {
      setCustomMediaStatus('Using built-in wallpaper rotation.');
    }

    dom.customUploadButton.addEventListener('click', () => dom.customInput.click());
    dom.customResetButton.addEventListener('click', () => void resetToBuiltInWallpapers());
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

  const applyRewardVisuals = () => {
    dom.rewardItems.forEach((item) => {
      const rewardId = item.getAttribute('data-reward-id');
      item.classList.toggle('is-unlocked', state.unlockedRewards.includes(rewardId));
    });
    dom.rewardLocks.forEach((lock) => {
      const rewardId = lock.getAttribute('data-reward-lock');
      lock.textContent = state.unlockedRewards.includes(rewardId) ? 'Unlocked' : 'Locked';
    });
    dom.page.classList.toggle('overlay-neon-rain', state.unlockedRewards.includes('neon-rain'));
    dom.clock.classList.toggle('clock-hologram', state.unlockedRewards.includes('hologram-clock'));
  };

  const checkRewardUnlocks = async () => {
    const inviteCount = state.growthMetrics.invites;
    const newlyUnlocked = REWARDS
      .filter((reward) => inviteCount >= reward.invites && !state.unlockedRewards.includes(reward.id))
      .map((reward) => reward.id);
    if (newlyUnlocked.length > 0) {
      state.unlockedRewards = [...state.unlockedRewards, ...newlyUnlocked];
      state.growthMetrics.rewardUnlocks += newlyUnlocked.length;
      await storage.set({
        [STORAGE_KEYS.unlockedRewards]: state.unlockedRewards,
        [STORAGE_KEYS.growthMetrics]: state.growthMetrics
      });
      applyRewardVisuals();
      setInviteStatus(`Reward unlocked: ${newlyUnlocked.join(', ')}`);
      renderGrowthMetrics();
    }
  };

  const initInviteHub = () => {
    const extensionUrl = 'https://chrome.google.com/webstore';
    const message = 'My AnimeTab setup is fire, try this anime new tab vibe:';
    const shareBuilders = {
      copy: () => `${message} ${extensionUrl}`,
      discord: () => `https://discord.com/channels/@me?message=${encodeURIComponent(`${message} ${extensionUrl}`)}`,
      whatsapp: () => `https://wa.me/?text=${encodeURIComponent(`${message} ${extensionUrl}`)}`,
      telegram: () => `https://t.me/share/url?url=${encodeURIComponent(extensionUrl)}&text=${encodeURIComponent(message)}`,
      x: () => `https://x.com/intent/tweet?text=${encodeURIComponent(`${message} ${extensionUrl}`)}`
    };

    dom.inviteButtons.forEach((button) => {
      button.addEventListener('click', async () => {
        const method = button.getAttribute('data-share-method');
        // #region agent log
        // #endregion
        try {
          if (method === 'copy') {
            await navigator.clipboard.writeText(shareBuilders.copy());
            setInviteStatus('Invite link copied. Send it to your anime squad.');
            // #region agent log
            // #endregion
          } else {
            const openedWindow = window.open(shareBuilders[method](), '_blank', 'noopener,noreferrer');
            if (!openedWindow) {
              setInviteStatus(`Popup blocked for ${method}. Allow popups for this extension.`);
            } else {
              setInviteStatus(`Opened ${method} share.`);
            }
            // #region agent log
            // #endregion
          }
          await bumpMetric('shareActions', 1);
          await bumpMetric('invites', 1);
          await checkRewardUnlocks();
        } catch (error) {
          console.error('[AnimeTab] Invite share failed:', error);
          setInviteStatus('Could not complete share action.');
          // #region agent log
          // #endregion
        }
      });
    });
  };

  const updateLofiButtons = () => {
    dom.lofiToggle.textContent = dom.lofiAudio.paused ? 'Play' : 'Pause';
    dom.lofiMute.textContent = dom.lofiAudio.muted ? 'Unmute' : 'Mute';
  };

  const initLofi = async () => {
    const data = await storage.get([STORAGE_KEYS.lofiStreamUrl, STORAGE_KEYS.lofiVolume, STORAGE_KEYS.lofiMuted]);
    const savedUrl = typeof data[STORAGE_KEYS.lofiStreamUrl] === 'string' && data[STORAGE_KEYS.lofiStreamUrl] ? data[STORAGE_KEYS.lofiStreamUrl] : DEFAULT_LOFI_STREAM;
    const savedVolumeRaw = Number(data[STORAGE_KEYS.lofiVolume]);
    const savedVolume = Number.isFinite(savedVolumeRaw) ? Math.max(0, Math.min(1, savedVolumeRaw)) : 0.35;
    dom.lofiAudio.src = savedUrl;
    dom.lofiAudio.volume = savedVolume;
    dom.lofiAudio.muted = data[STORAGE_KEYS.lofiMuted] === true;
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

    const isLikelyDirectAudioUrl = (url) => {
      return /^https:\/\/.+(\.mp3|\.aac|\.ogg|\.m4a|\.wav)(\?.*)?$/i.test(url) || /somafm|stream|radio/i.test(url);
    };

    dom.lofiSaveUrl.addEventListener('click', async () => {
      const nextUrl = dom.lofiUrl.value.trim();
      if (!nextUrl || !/^https:\/\//i.test(nextUrl)) {
        setLofiStatus('Use a valid https:// stream URL.');
        return;
      }
      if (!isLikelyDirectAudioUrl(nextUrl)) {
        setLofiStatus('Use a direct audio stream/file URL (not a web page URL).');
        // #region agent log
        // #endregion
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
          setLofiStatus('Stream blocked (likely CORS). Try direct mp3/aac stream URL.');
          // #region agent log
          // #endregion
        }
      }
      updateLofiButtons();
    });

    dom.lofiAudio.addEventListener('error', () => setLofiStatus('Stream error. Try another lo-fi URL.'));
    dom.lofiAudio.addEventListener('play', updateLofiButtons);
    dom.lofiAudio.addEventListener('pause', updateLofiButtons);
  };

  const buildSetupPayload = () => {
    return {
      v: 1,
      customEnabled: state.customBackgroundEnabled,
      lofiUrl: dom.lofiUrl.value.trim() || DEFAULT_LOFI_STREAM,
      lofiVolume: Number(dom.lofiVolume.value),
      ambient: dom.ambientSelect.value,
      rewards: state.unlockedRewards
    };
  };

  const encodeSetupCode = (payload) => {
    return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  };

  const decodeSetupCode = (code) => {
    return JSON.parse(decodeURIComponent(escape(atob(code))));
  };

  const initSetupShare = () => {
    dom.setupExport.addEventListener('click', async () => {
      try {
        const code = encodeSetupCode(buildSetupPayload());
        dom.setupCode.value = code;
        await navigator.clipboard.writeText(code);
        setSetupStatus('Setup code exported and copied.');
        await bumpMetric('setupExports', 1);
      } catch (error) {
        console.error('[AnimeTab] Setup export failed:', error);
        setSetupStatus('Setup export failed.');
      }
    });

    dom.setupImport.addEventListener('click', async () => {
      const code = dom.setupCode.value.trim();
      if (!code) {
        setSetupStatus('Paste setup code before importing.');
        return;
      }
      try {
        const payload = decodeSetupCode(code);
        const normalizedVolume = Math.max(0, Math.min(100, Number(payload.lofiVolume || 35)));
        dom.lofiUrl.value = payload.lofiUrl || DEFAULT_LOFI_STREAM;
        dom.lofiVolume.value = String(normalizedVolume);
        dom.lofiAudio.src = dom.lofiUrl.value;
        dom.lofiAudio.volume = normalizedVolume / 100;
        dom.ambientSelect.value = payload.ambient || 'none';
        await applyAmbient(dom.ambientSelect.value);
        if (Array.isArray(payload.rewards)) {
          state.unlockedRewards = Array.from(new Set([...state.unlockedRewards, ...payload.rewards]));
          await storage.set({ [STORAGE_KEYS.unlockedRewards]: state.unlockedRewards });
          applyRewardVisuals();
        }
        await storage.set({
          [STORAGE_KEYS.lofiStreamUrl]: dom.lofiUrl.value,
          [STORAGE_KEYS.lofiVolume]: normalizedVolume / 100,
          [STORAGE_KEYS.setupCode]: code
        });
        setSetupStatus('Setup imported successfully.');
      } catch (error) {
        console.error('[AnimeTab] Setup import failed:', error);
        setSetupStatus('Invalid setup code.');
      }
    });
  };

  const todayKey = () => new Date().toISOString().slice(0, 10);

  const initStreak = async () => {
    const data = await storage.get([STORAGE_KEYS.streakCount, STORAGE_KEYS.lastOpenDate]);
    const today = todayKey();
    const last = data[STORAGE_KEYS.lastOpenDate];
    let streak = Number.isInteger(data[STORAGE_KEYS.streakCount]) ? data[STORAGE_KEYS.streakCount] : 1;
    if (last !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      streak = last === yesterday ? streak + 1 : 1;
      await storage.set({ [STORAGE_KEYS.lastOpenDate]: today, [STORAGE_KEYS.streakCount]: streak });
    }
    rafWrite(() => {
      dom.streakStatus.textContent = `Streak: ${streak} day${streak === 1 ? '' : 's'}`;
    });
  };

  const updateFocusCountdown = () => {
    if (!state.focusEndAt) {
      return;
    }
    const remaining = Math.max(0, Math.floor((state.focusEndAt - Date.now()) / 1000));
    const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
    const ss = String(remaining % 60).padStart(2, '0');
    rafWrite(() => {
      dom.focusTimer.textContent = `${mm}:${ss}`;
    });
    if (remaining === 0) {
      state.focusEndAt = 0;
      dom.focusToggle.textContent = 'Start 25m Focus';
      void storage.set({ [STORAGE_KEYS.focusEndAt]: 0 });
    }
  };

  const applyAmbient = async (mode) => {
    // #region agent log
    // #endregion
    if (!AMBIENT_URLS[mode]) {
      dom.ambientAudio.pause();
      dom.ambientAudio.removeAttribute('src');
      return;
    }
    dom.ambientAudio.src = AMBIENT_URLS[mode];
    try {
      await dom.ambientAudio.play();
    } catch (error) {
      console.error('[AnimeTab] Ambient playback failed:', error);
      // #region agent log
      // #endregion
    }
  };

  const initHabitLoop = async () => {
    const data = await storage.get([STORAGE_KEYS.focusEndAt, STORAGE_KEYS.ambientMode]);
    state.focusEndAt = Number(data[STORAGE_KEYS.focusEndAt]) || 0;
    dom.ambientSelect.value = data[STORAGE_KEYS.ambientMode] || 'none';
    await applyAmbient(dom.ambientSelect.value);
    updateFocusCountdown();

    dom.focusToggle.addEventListener('click', async () => {
      if (state.focusEndAt > Date.now()) {
        state.focusEndAt = 0;
        dom.focusToggle.textContent = 'Start 25m Focus';
        await storage.set({ [STORAGE_KEYS.focusEndAt]: 0 });
        updateFocusCountdown();
        return;
      }
      state.focusEndAt = Date.now() + (25 * 60 * 1000);
      dom.focusToggle.textContent = 'Stop Focus';
      await storage.set({ [STORAGE_KEYS.focusEndAt]: state.focusEndAt });
      updateFocusCountdown();
    });

    dom.ambientSelect.addEventListener('change', async () => {
      await applyAmbient(dom.ambientSelect.value);
      await storage.set({ [STORAGE_KEYS.ambientMode]: dom.ambientSelect.value });
    });
  };

  const initWallpaper = async () => {
    if (state.customBackgroundEnabled) {
      return false;
    }
    const data = await storage.get([STORAGE_KEYS.wallpaperIndex]);
    const storedIndex = Number.isInteger(data[STORAGE_KEYS.wallpaperIndex]) ? data[STORAGE_KEYS.wallpaperIndex] : Math.floor(Math.random() * WALLPAPERS.length);
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
      const rotated = await rotateWallpaper();
      if (!rotated) {
        return false;
      }
    }
    startWallpaperTimer();
    return true;
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
    window.setTimeout(() => dom.searchInput.focus(), 300);
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

  const hydrateGrowthState = async () => {
    const data = await storage.get([STORAGE_KEYS.growthMetrics, STORAGE_KEYS.unlockedRewards, STORAGE_KEYS.setupCode]);
    if (data[STORAGE_KEYS.growthMetrics] && typeof data[STORAGE_KEYS.growthMetrics] === 'object') {
      state.growthMetrics = { ...state.growthMetrics, ...data[STORAGE_KEYS.growthMetrics] };
    }
    if (Array.isArray(data[STORAGE_KEYS.unlockedRewards])) {
      state.unlockedRewards = data[STORAGE_KEYS.unlockedRewards];
    }
    if (typeof data[STORAGE_KEYS.setupCode] === 'string' && data[STORAGE_KEYS.setupCode]) {
      dom.setupCode.value = data[STORAGE_KEYS.setupCode];
    }
    renderGrowthMetrics();
    applyRewardVisuals();
  };

  // Merch & Affiliate Section
  let merchProducts = [];
  let currentMerchIndex = 0;

  const loadMerchData = async () => {
    try {
      const response = await fetch('merch.json');
      const data = await response.json();
      merchProducts = data.products || [];
      return true;
    } catch (error) {
      console.error('[AnimeTab] Failed to load merch data:', error);
      return false;
    }
  };

  const displayMerchProduct = (index) => {
    if (merchProducts.length === 0) return;
    const product = merchProducts[index % merchProducts.length];
    const merchCard = document.getElementById('merch-card');
    const merchImage = document.getElementById('merch-image');
    const merchTitle = document.getElementById('merch-title');
    const merchPrice = document.getElementById('merch-price');

    if (merchImage) merchImage.src = product.image;
    if (merchImage) merchImage.alt = product.title;
    if (merchTitle) merchTitle.textContent = product.title;
    if (merchPrice) merchPrice.textContent = product.price;

    if (merchCard) {
      merchCard.onclick = () => {
        // Track affiliate click with Google Analytics
        if (window.gtag) {
          window.gtag('event', 'affiliate_click', {
            'product_title': product.title,
            'product_price': product.price,
            'product_category': product.category
          });
        }
        window.open(product.affiliateLink, '_blank');
      };
      merchCard.style.cursor = 'pointer';
    }
  };

  const rotateHourlyMerch = () => {
    const hour = new Date().getHours();
    currentMerchIndex = hour % (merchProducts.length || 1);
    displayMerchProduct(currentMerchIndex);
  };

  const initMerch = async () => {
    const loaded = await loadMerchData();
    if (!loaded || merchProducts.length === 0) {
      const merchSection = document.getElementById('merch-section');
      if (merchSection) merchSection.style.display = 'none';
      return;
    }

    rotateHourlyMerch();

    // Manual rotation button
    const nextButton = document.getElementById('merch-next');
    if (nextButton) {
      nextButton.addEventListener('click', () => {
        currentMerchIndex = (currentMerchIndex + 1) % merchProducts.length;
        displayMerchProduct(currentMerchIndex);
        if (window.gtag) {
          window.gtag('event', 'merch_manual_rotation');
        }
      });
    }

    // Rotate hourly
    window.setInterval(() => {
      rotateHourlyMerch();
    }, 3600000); // 1 hour in milliseconds
  };

  const init = async () => {
    const hasRequiredDom = Object.values(dom).every((node) => node !== null);
    // #region agent log
    // #endregion
    if (!hasRequiredDom) {
      console.error('[AnimeTab] Required DOM nodes are missing.');
      // #region agent log
      // #endregion
      return;
    }
    startClock();
    initControlHub();
    await hydrateGrowthState();
    await initCustomMedia();
    await Promise.all([initWallpaper(), loadDailyQuote(), initFeaturedCard(), initLofi(), initStreak(), initHabitLoop(), initMerch()]);
    initInviteHub();
    initSetupShare();
    initSearch();
  };

  // #region agent log
  void init().catch((error) => {
  });
  // #endregion
})();
