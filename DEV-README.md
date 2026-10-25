# AnimeTab v1.2.0 — Developer Guide

## Release loop

Every iteration ships through the same gate:

```bash
npm run release           # patch bump
npm run release minor     # minor bump (features)
```

The script refuses to run on a dirty tree, bumps `manifest.json` +
`package.json` + the `newtab.html` cache-bust in lockstep, runs the full
`lint → test → build → package` suite, then commits and tags `v{version}`.
Store zip lands in `release/` (gitignored by design — CI uploads artifacts).

## Quick Start

```bash
cd animetab
npm install
npm run build
```

Load in Chrome: `chrome://extensions/` → Developer mode → **Load unpacked** → select `animetab/`. Open a new tab.

For live rebuilding during development use `npm run dev` (webpack watch); reload the extension card after each build.

## Project Structure

```
animetab/
├── manifest.json             # MV3 metadata, storage permission, nekos/anilist hosts
├── newtab.html               # extension new-tab page (loads dist/bundle.js)
├── background.js             # service worker: wallpaper fetch + AniList airing cache
├── merch.json                # affiliate catalog + tag config
├── quotes.json               # 60 daily quotes
├── privacy.html              # privacy policy (matches shipped behavior)
├── src/
│   ├── index.jsx             # app root: analytics singleton, layout
│   ├── fonts.css             # generated @font-face declarations (self-hosted)
│   ├── lib/                  # pure, unit-tested helpers (no chrome imports)
│   │   ├── analytics.mjs     # local privacy-friendly counters
│   │   ├── anilist.mjs       # season math + parse/format helpers
│   │   ├── clock.mjs         # time formatting + greetings
│   │   ├── links.mjs         # quick-link model + favicon helper
│   │   ├── merch.mjs         # rotation + affiliate URL builders
│   │   ├── platform.mjs      # promisified chrome.* wrappers
│   │   ├── search.mjs        # search engine registry
│   │   └── theme.mjs         # theme whitelist + detector mapping
│   ├── hooks/
│   │   └── useNekosWallpaper.js  # wallpaper state machine (custom/pin/shuffle/IDB)
│   └── components/
│       ├── BlurWallpaperBackground.jsx/.css
│       ├── WanoArcDashboard.jsx/.css   # layout, quote, watermarks
│       ├── SearchBar.jsx      # engine picker search input
│       ├── QuickLinks.jsx/.css# editable tiles (chrome.storage)
│       ├── AiringCard.jsx/.css# AniList countdown UI
│       ├── MerchSection.jsx/.css# affiliate card
│       └── StudioPanel.css    # wallpaper studio dialog styles
├── scripts/
│   ├── pack.mjs              # store zip builder (python3 zipfile)
│   └── fetch-fonts.mjs       # one-time font subset fetcher
├── tests/                    # node --test suites for src/lib
└── .github/workflows/build.yml  # CI: lint → test → build → package
```

## Key decisions

- **Two generations of code existed** (vanilla `newtab.js` + React). v1.2.0 keeps the React app only (`src/` is the single source of truth; `newtab.html` just bootstraps `dist/bundle.js`).
- **Fonts are self-hosted** woff2 subsets under `assets/fonts/` (also emitted to `dist/fonts/`), generated once by `npm run deps:fonts`. If you add Japanese text to the UI, re-run that script so the subset covers the new glyphs.
- **Analytics are local-only.** MV3 blocks remote scripts in extension pages, and remote-code-based trackers violate store policy anyway. `src/lib/analytics.mjs` bumps counters in `chrome.storage.local` (30-day retention).
- **Testing** uses `node --test` with zero dependencies; every `src/lib/*.mjs` module is chrome/DOM-free by design.

## Building & packaging

```bash
npm run verify      # lint + test + build
npm run package     # release/animetab-v1.2.0.zip (~1.6 MB)
```

The pack script refuses to run when `manifest.json` and `package.json` versions disagree, and it only bundles the files actually loaded at runtime.

## Release checklist

1. `npm run verify`
2. Load unpacked → open 5+ new tabs (wallpapers change, quote/day stable, links editable)
3. Check merch card rotates hourly + `→` works, and affiliate tag appears in URLs once added to `merch.json`.
4. `npm run package`, upload zip to the Web Store.
