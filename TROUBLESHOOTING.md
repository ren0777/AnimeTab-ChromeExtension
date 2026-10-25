# Troubleshooting: Extension Shows Blank/Default Chrome New Tab

## Quick Fix (Most Common)

1. Go to `chrome://extensions/`
2. Find **AnimeTab** in the list
3. Click the **Reload/Refresh** button (🔄)
4. Open a **new tab** — should show Wano Arc dashboard

If still blank, continue below.

---

## Diagnosis Steps

### Step 1: Check if extension is loaded
In `chrome://extensions/`, AnimeTab should show:
- Enabled toggle: **ON**
- No error warnings
- ID at bottom (e.g., `abcdefghijklmno...`)

If you see "Error loading manifest" or "Service worker failed" — the manifest has issues. Check JSON syntax.

### Step 2: Open DevTools on the New Tab page
1. Open a new tab
2. Press **F12** (or `Ctrl+Shift+I`) to open DevTools
3. Look at the **Console** tab
4. Refresh the page (`Ctrl+R`)

**What to look for:**

| Error | Fix |
|-------|-----|
| `Failed to load resource: net::ERR_FILE_NOT_FOUND bundle.js` | Run `npm run build` again. Ensure `dist/bundle.js` exists. |
| `Uncaught ReferenceError: chrome is not defined` | You're testing `newtab.html` directly in browser. Must load as extension. |
| `Refused to load stylesheet` (CSP) | External resources blocked. Build should inline CSS — run `npm run build`. |
| `Uncaught TypeError: Cannot read properties of null` | DOM element missing. Check `newtab.html` has `<div id="root"></div>`. |
| Nothing at all (no errors) | Extension not overriding new tab. Check `manifest.json` path. |

### Step 3: Verify files exist
These files must exist in your `animetab/` folder:

```
animetab/
├── newtab.html              ← Our React entry point
├── dist/
│   ├── bundle.js            ← Built React app
│   └── index.html           ← (not used, but ok)
├── manifest.json            ← Points to newtab.html
└── background.js            ← Service worker
```

If `dist/bundle.js` is missing → run `npm run build`.

### Step 4: Reload extension properly
After any file change:
1. Go to `chrome://extensions/`
2. Click AnimeTab's **Reload** button (or disable → enable)
3. Open **new tab** (close old tab first if open)

### Step 5: Test bundle standalone
Open `test-bundle.html` in a regular browser (not extension). It should log:
```
✅ React loaded: 18.2.0
✅ Framer Motion loaded
```

If these fail → build issue. Run `npm install` then `npm run build` again.

### Step 6: Clear Chrome extension cache
Sometimes Chrome caches old JS. Fix:
1. Go to `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Service worker** → "Inspect" under AnimeTab
4. In that DevTools window, right-click → **Reload** (or `Ctrl+R`)
5. Close and reopen new tab

---

## Known Issues & Solutions

### "Google Fonts blocked" (CSP error)
**Cause:** Google Fonts blocked by extension CSP.
**Fixed:** Removed `@import` from CSS. Uses system fonts now.

### "ERR_CONNECTION_RESET" in console
**Cause:** Chrome trying to reach Google Play Services telemetry. **Not your fault.** Safe to ignore. It's unrelated.

### Blank white screen, no errors
**Cause:** `newtab.html` doesn't have `#root` div, or React failed silently.
**Check:** `newtab.html` should contain `<div id="root"></div>` and `<script src="dist/bundle.js"></script>`.

### "Cannot access chrome.storage"
**Cause:** Extension background script not initialized.
**Fix:** Service worker might be failing. Check `chrome://extensions/` → "Errors" under AnimeTab. Reload extension.

### Wallpapers not loading
**Cause:** API blocked or offline.
**Check:** `background.js` service worker console. Open "Service worker" → "Inspect" in extensions page.

### Styles look broken
**Cause:** CSS not loaded.
**Check:** Elements tab in DevTools → check if `.wano-dashboard` styles applied. If not, CSS may not have bundled.

---

## Reinstall from Scratch

If nothing works, clean reinstall:

```bash
# 1. Remove old build
cd "D:/Documents/projects/anime extension/animetab"
rimraf dist  # or manually delete dist folder
rimraf node_modules/.cache

# 2. Reinstall dependencies
npm install

# 3. Build fresh
npm run build

# 4. In Chrome:
#    - Go to chrome://extensions/
#    - Remove AnimeTab (click "Remove")
#    - Click "Load unpacked"
#    - Select animetab folder again
#    - Open new tab
```

---

## Still Not Working?

1. Take a screenshot of DevTools **Console** tab on the new tab page
2. Check `chrome://extensions/` → click "Errors" if any
3. Paste both in a new issue

Common root causes:
- Windows path with spaces (`anime extension`) — sometimes causes issues. Try moving project to path without spaces.
- Antivirus/firewall blocking local extension files — whitelist the folder.
- Chrome policies (enterprise-managed) — check `chrome://policy/`

---

## File Reference

| File | Purpose |
|------|---------|
| `newtab.html` | Entry HTML loaded by Chrome |
| `dist/bundle.js` | React app bundle |
| `src/index.jsx` | React root render |
| `src/components/WanoArcDashboard.jsx` | Main UI |
| `src/components/BlurWallpaperBackground.jsx` | Wallpaper wrapper |
| `src/hooks/useNekosWallpaper.js` | Wallpaper API hook |
| `background.js` | Service worker for wallpaper fetch |
| `quotes.json` | Daily quotes database |
| `manifest.json` | Extension config |

---

## Build Commands

```bash
# Development (watch mode)
npm run dev

# Production build
npm run build

# Clean build artifacts
npm run clean
```

---

## Last Resort: Fall Back to Original

If React continues to fail, restore original `newtab.html` and `newtab.js`:

1. Keep `newtab.html` as-is (the React version)
2. Replace `newtab.html` with the original file (from git if backed up)
3. Point `manifest.json` back: `"newtab": "newtab.html"`
4. Reload extension

Original non-React version will work instantly.
