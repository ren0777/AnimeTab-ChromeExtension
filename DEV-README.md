# AnimeTab Wano Arc Edition — Developer Guide

## Quick Start

1. **Install dependencies:**
```bash
cd animetab
npm install
```

2. **Build the extension:**
```bash
npm run build
```
This creates `dist/` folder with `bundle.js` and `index.html`.

3. **Load in Chrome:**
   - Open `chrome://extensions/`
   - Enable **Developer mode** (toggle top right)
   - Click **Load unpacked**
   - Select the `animetab` folder

4. **Open a new tab** to see the Wano Arc dashboard.

## Development Mode

For live reloading during development:

```bash
npm run dev
```

This runs Webpack in watch mode and rebuilds automatically when you edit files in `src/`. After each rebuild, go to `chrome://extensions/` and click the **Refresh** button on the AnimeTab card to apply changes.

## Project Structure

```
animetab/
├── src/
│   ├── components/
│   │   ├── BlurWallpaperBackground.jsx   # Blur transition background wrapper
│   │   ├── BlurWallpaperBackground.css   # Background styles
│   │   ├── WanoArcDashboard.jsx          # Main dashboard UI
│   │   └── WanoArcDashboard.css          # Dashboard styles (Wano Arc colors)
│   ├── hooks/
│   │   └── useNekosWallpaper.js          # Wallpaper fetching hook
│   ├── index.jsx                         # React entry point
│   └── index.html                        # HTML template
├── dist/                                 # Built files (generated)
├── background.js                         # Service worker (wallpaper API)
├── hooks/
│   └── useNekosWallpaper.js              # Original hook (backup)
├── manifest.json                         # Extension manifest
├── package.json
├── webpack.config.js
└── README.md
```

## Technologies

- **React 18** — UI library
- **Framer Motion** — Animations (spring physics, transitions)
- **Webpack 5** — Bundling
- **Babel** — JSX transpilation
- **CSS** — Custom properties, keyframe animations, glassmorphism

## Customization

### Change Color Palette

Edit `WanoArcDashboard.css` root variables:

```css
:root {
  --sakura-300: #ff6b8a;   /* Pink */
  --indigo-500: #3f51b5;   /* Indigo */
  --gold-200: #f6c94c;     /* Gold */
  --jade-500: #009688;     /* Jade */
}
```

### Adjust Clock Font

The clock uses `Noto Serif JP`. Change in CSS:

```css
.clock-text {
  font-family: 'YourFont', serif;
}
```

### Modify Quick Links

Edit the `quickLinks` array in `WanoArcDashboard.jsx`.

### Tweak Blur Transition

In `src/index.jsx`, adjust props on `BlurWallpaperBackground`:

```jsx
<BlurWallpaperBackground
  blurAmount={15}          // Less blur
  transitionDuration={600} // Faster
  overlayOpacity={0.3}     // Lighter overlay
>
```

## Architecture

### Data Flow

```
Background Script (background.js)
    ↓ (chrome.runtime.sendMessage)
useNekosWallpaper Hook
    ↓ (wallpaperUrl prop)
BlurWallpaperBackground
    ↓ (children prop)
WanoArcDashboard (UI)
```

### Wallpaper System

- `useNekosWallpaper` fetches a random wallpaper from nekos.best API via background script
- Caches URL in chrome.storage
- Provides `wallpaperUrl` and loading state
- `BlurWallpaperBackground` handles the image loading, blur transition, and overlay

### Styling Strategy

- **BlurWallpaperBackground.css** — Generic premium background styles
- **WanoArcDashboard.css** — Wano Arc specific colors, animations, layout
- No external CSS framework (Tailwind not used); custom CSS mirrors Tailwind utilities

## Building for Production

```bash
npm run build
```

The build outputs minified JS to `dist/bundle.js`. The extension loads these files directly.

## Troubleshooting

### "Cannot find module 'framer-motion'"
Run `npm install` again.

### Wallpapers not loading
Ensure `background.js` is running and has permission to fetch `https://nekos.best/*`. Check chrome://extensions → AnimeTab → Service Worker → Inspect for errors.

### Styles broken
Make sure `BlurWallpaperBackground.css` and `WanoArcDashboard.css` are imported correctly in their JSX files.

### Extension not updating after build
Go to `chrome://extensions/`, find AnimeTab, and click **Reload** (or **Refresh**).

## License

MIT
