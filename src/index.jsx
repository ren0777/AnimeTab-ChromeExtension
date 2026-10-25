import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './fonts.css';
import BlurWallpaperBackground from './components/BlurWallpaperBackground';
import WanoArcDashboard from './components/WanoArcDashboard';
import MerchSection from './components/MerchSection';
import { useNekosWallpaper } from './hooks/useNekosWallpaper';
import { createAnalytics, EVENT_TYPES } from './lib/analytics.mjs';
import { storageGet, storageSet } from './lib/platform.mjs';
import { GROWTH_KEY, unlockedRewards } from './lib/growth.mjs';

// One shared, fully-local metrics store (chrome.storage only — never networked).
// createAnalytics expects get(key) → value and set(key, value).
const analytics = createAnalytics({
  get: async (key) => (await storageGet([key]))[key],
  set: (key, value) => storageSet({ [key]: value })
});

const App = () => {
  const {
    wallpaperUrl,
    wallpaperIsVideo,
    customEnabled,
    isPinned,
    uploadCustomWallpaper,
    removeCustomWallpaper,
    shuffleWallpaper,
    pinWallpaper,
    wallpaperCategory,
    setWallpaperCategory,
    wallpaperSource,
    setWallpaperSource,
    themeMode,
    updateThemeMode
  } = useNekosWallpaper(analytics);

  const [rewards, setRewards] = useState([]);

  useEffect(() => {
    analytics.track(EVENT_TYPES.TAB_OPEN);
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) loadingScreen.classList.add('hidden');
    // analytics is a module-level singleton; the effect is mount-only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  // Cosmetic rewards unlocked by invite actions (local counters only).
  useEffect(() => {
    (async () => {
      const growth = (await storageGet([GROWTH_KEY]))[GROWTH_KEY];
      setRewards(unlockedRewards(growth?.inviteCount || 0));
    })();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-anime-theme', themeMode);
  }, [themeMode]);

  // Palette-only fallback while the wallpaper network request is in flight.
  const fallbackWallpaper = useMemo(() => {
    const palette = {
      wano: ['#ff9bb0', '#3f51b5'],
      lofi: ['#4c7bd9', '#8b5cf6'],
      cute: ['#ff9bd2', '#ffd27a'],
      romantic: ['#ff6b8a', '#f6c94c'],
      fighting: ['#d64545', '#6d28d9']
    };
    const [a, b] = palette[themeMode] || palette.wano;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="1600" height="900" fill="#0a0a0f"/><rect width="1600" height="900" fill="url(#g)" opacity="0.22"/><circle cx="300" cy="180" r="260" fill="${a}" opacity="0.18"/><circle cx="1310" cy="760" r="300" fill="${b}" opacity="0.22"/><text x="80" y="770" font-family="serif" font-size="260" fill="rgba(255,255,255,0.06)">和</text></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }, [themeMode]);

  return (
    <>
      <BlurWallpaperBackground
        imageUrl={wallpaperUrl || fallbackWallpaper}
        isVideo={wallpaperIsVideo}
        blurAmount={20}
        transitionDuration={800}
        overlayOpacity={0.5}
        gradientOverlay={true}
        preloadNext={true}
        fallbackUrl={fallbackWallpaper}
      >
        <WanoArcDashboard
          customEnabled={customEnabled}
          isPinned={isPinned}
          onUploadCustom={uploadCustomWallpaper}
          onRemoveCustom={removeCustomWallpaper}
          onShuffle={shuffleWallpaper}
          onPin={pinWallpaper}
          wallpaperCategory={wallpaperCategory}
          onCategoryChange={setWallpaperCategory}
          wallpaperSource={wallpaperSource}
          onSourceChange={setWallpaperSource}
          themeMode={themeMode}
          onThemeChange={updateThemeMode}
          rewards={rewards}
          analytics={analytics}
        />
      </BlurWallpaperBackground>
      {rewards.includes('neonRain') && (
        <div className="neon-rain-overlay" aria-hidden="true">
          {Array.from({ length: 14 }, (_, i) => <span key={i} className="drop" />)}
        </div>
      )}
      <MerchSection analytics={analytics} />
    </>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
} else {
  console.error('[AnimeTab] Root element #root not found in newtab.html');
  document.body.innerHTML = '<div style="padding:20px;color:#ff3d63;font-family:sans-serif;">AnimeTab failed to load. Please reload the extension.</div>';
}
