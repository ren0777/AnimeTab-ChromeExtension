import React, { useEffect, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import BlurWallpaperBackground from './components/BlurWallpaperBackground';
import WanoArcDashboard from './components/WanoArcDashboard';
import { useNekosWallpaper } from './hooks/useNekosWallpaper';

/**
 * Main App component that integrates WanoArcDashboard
 * with AnimeTab's wallpaper system and blur transitions
 */
const App = () => {
  const {
    wallpaperUrl,
    customEnabled,
    uploadCustomWallpaper,
    removeCustomWallpaper,
    themeMode,
    updateThemeMode
  } = useNekosWallpaper();

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

  // Handle search from WanoArcDashboard
  const handleSearch = useCallback((query) => {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    window.location.href = searchUrl;
  }, []);

  // Hide loading screen after React mounts
  useEffect(() => {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) loadingScreen.classList.add('hidden');
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-anime-theme', themeMode);
  }, [themeMode]);

  return (
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
        onSearch={handleSearch}
        customEnabled={customEnabled}
        onUploadCustom={uploadCustomWallpaper}
        onRemoveCustom={removeCustomWallpaper}
        wallpaperUrl={wallpaperUrl}
        themeMode={themeMode}
        onThemeChange={updateThemeMode}
      />
    </BlurWallpaperBackground>
  );
};

// Initialize React app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
} else {
  console.error('[AnimeTab] Root element #root not found in newtab.html');
  // Fallback: show error message
  document.body.innerHTML = '<div style="padding:20px;color:#ff3d63;font-family:sans-serif;">AnimeTab failed to load. Please reload the extension.</div>';
}
