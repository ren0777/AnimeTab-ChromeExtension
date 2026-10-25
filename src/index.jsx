import React, { useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import './fonts.css';
import BlurWallpaperBackground from './components/BlurWallpaperBackground';
import WanoArcDashboard from './components/WanoArcDashboard';
import MerchSection from './components/MerchSection';
import { useNekosWallpaper } from './hooks/useNekosWallpaper';
import { createAnalytics, EVENT_TYPES } from './lib/analytics.mjs';
import { storageGet, storageSet } from './lib/platform.mjs';

// One shared, fully-local metrics store (chrome.storage only — never networked).
const analytics = createAnalytics({ get: storageGet, set: storageSet });

const App = () => {
  const {
    wallpaperUrl,
    customEnabled,
    isPinned,
    uploadCustomWallpaper,
    removeCustomWallpaper,
    shuffleWallpaper,
    pinWallpaper,
    themeMode,
    updateThemeMode
  } = useNekosWallpaper(analytics);

  useEffect(() => {
    analytics.track(EVENT_TYPES.TAB_OPEN);
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) loadingScreen.classList.add('hidden');
  }, [analytics]);

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
          themeMode={themeMode}
          onThemeChange={updateThemeMode}
          analytics={analytics}
        />
      </BlurWallpaperBackground>
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
