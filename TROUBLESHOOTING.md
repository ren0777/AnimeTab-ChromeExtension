# AnimeTab v1.4.1 — Troubleshooting

### "Cannot find module 'framer-motion'"
Run `npm install` again.

### Wallpapers not loading
`background.js` fetches from `https://nekos.best/*` (listed in manifest `host_permissions`). Check the service worker console: `chrome://extensions` → AnimeTab → "service worker". When offline the app shows bundled `assets/fallback/*.jpg`.

### nekos.best returns HTTP 403
nekos.best rejects any *browser* User-Agent and requires `AppName (contact)` per their API docs. `fetch()` may not set `User-Agent` (forbidden header), so `background.js` installs a `declarativeNetRequest` **session rule** that rewrites `User-Agent` to `AnimeTab (store listing URL)` for `requestDomains: ['nekos.best']` on every service-worker start. Verify it applied in the service-worker console (`[AnimeTab] nekos.best User-Agent rule installed`), or at `chrome://extensions` → AnimeTab → `declarativeNetRequest` rules. The permission used is `declarativeNetRequestWithHostAccess` — no extra Chrome permission prompt, since the `https://nekos.best/*` host permission already covers the rule. If the rule can't install, the app still falls back to wallhaven and then to the bundled images.

### Fonts look wrong
Fonts smell like fallback system fonts → `npm run deps:fonts` re-downloads the subsets (needs network). Bundled faces live in `assets/fonts/` and are emitted to `dist/fonts/` at build; make sure you rebuilt after adding them.

### Styles broken
`WanoArcDashboard.css`, `MerchSection.css`, etc. are imported by their JSX files; verify the imports exist.

### Merch card missing
`fetch(merch.json)` failures are silent by design (card hides). Validate `merch.json` is well-formed JSON. Card also hides when `products` is empty.

### Airing card missing
AniList networking lives in the background worker with a 6-hour local cache (`anilistAiringCache`). If it can't reach the API it falls back to the cache, then hides.

### Extension not updating after build
`chrome://extensions/` → AnimeTab → **Reload**. `dist/` is regenerated with `clean: true` on every build.

### Version drift errors from `npm run package`
The pack script compares `manifest.json` and `package.json` versions — bump both (cache-bust query in `newtab.html` too).
