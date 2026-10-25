# Changelog

All notable changes to AnimeTab. Versions follow [the release loop](DEV-README.md#release-loop) (`npm run release`); store zips live in `release/` (gitignored, CI-uploaded).

## [1.6.1] — 2026-10-26

### Added
- Real rendered icon art (128/48/16 PNG) via the dependency-free generator `scripts/generate-icons.mjs` (sakura blossom on night gradient).
- `CHANGELOG.md` (this file).

### Fixed
- Provider-aware source fallback chain could skip sibling sources of the requested provider (`wallhaven.cc` doubles).
- Remaining `react-hooks/exhaustive-deps` warnings resolved (0 lint problems).

## [1.6.0] — 2026-10-26

### Added
- **Photo of the day** wallpaper source — keyless Bing daily archive (8 rotating SFW landscape photographs), pooled per day.
- **Save image…** in the Wallpaper Studio (`chrome.downloads`, save dialog, works for remote/bundled/custom backgrounds).
- **Release loop**: `npm run release [patch|minor|major]` — clean-tree guard, lockstep version bump (manifest + package + cache-bust), full `lint → test → build → package` gate, commit + `v{version}` tag.

### Fixed
- The wallpaper attempt chain now walks *providers* first (wallhaven → Bing → nekos fallback ordering is intent-affine), so a whole-provider outage still lands on a live source before bundled images.

## [1.5.0] — 2026-10-26

### Added
- **Watchlist for the Airing card**: search AniList inline, pin favorite airing shows (max 12) above the seasonal list, with per-show countdowns and instant removal; separate 6h cache invalidated on edits.
- **Focus length picker** (15/25/45/60 min) in the Wallpaper Studio.
- **First-run welcome toast** (once) surfacing the Studio + invite perks.
- **Font preloading** in `newtab.html` (no fallback-font flash).
- Legacy `chrome.storage` key cleanup from pre-1.2 builds (background worker, on start).
- Git release tags (`v…`).

## [1.4.x] — 2026-10-25/26

### Added
- **Anime scenes / Anime landscapes** sources (wallhaven.cc, keyless + SFW `purity=100`, 1080p+, random pages pooled for ~15 min).
- `background.js` became an ES module importing shared, unit-tested logic (`src/lib/wallpaperSources.mjs`).

### Fixed
- **Anime landscapes precision**: the loose `q=` search leaked character art → scenery sources are now filtered *by the returned tags* (landscape/scenery/nature/… family) with retrying page fetches; wallhaven pools keyed per source and versioned (`wallhavenPoolV2`) to invalidate stale, pre-fix pools.
- Wallpaper UX: instant cached paint on new tabs + background crossfade; dark native selection popups (`color-scheme`); manual mood picks no longer overwritten by auto-detection.

## [1.3.0] — 2026-10-26

### Added
- **Invite hub** with share actions (copy/X/Telegram/WhatsApp/Reddit/Discord) and cosmetic unlocks at 3/5/10 invites: neon rain overlay, night-drive quote mode, hologram clock skin.
- **Share my setup** — unicode-safe portable setup codes (links + mood + engine + clock).
- **Cross-tab focus timer** (25 min, storage-persisted countdown, completion chime + toast).
- **Generative ambient sound** (WebAudio rain/vinyl/ocean — no audio assets).
- **Daily streak** pill from local metrics.
- Merch card hide/show toggle.

## [1.2.0] — overhaul

### Added
- React app as the single source of truth (`src/`) with the Wano Arc dashboard.
- **Merch card that works**: wired into React (the old fixed-bottom bar shipped as dead markup), hourly rotation + manual next, disclosure badge, single `affiliateTag` config field, 24 curated products.
- **Local, privacy-first analytics** (no third-party trackers — MV3/CSP compliant), visible in the studio.
- Self-hosted woff2 fonts (subset Noto Serif JP + Quicksand) — no remote code/styles.
- Wallpaper shuffle/pin + custom uploads via IndexedDB.
- Editable quick-links, search engine picker, AniList airing card, 24h/12h clock.
- Unit test suite (`node --test`), ESLint, store packaging (`npm run package`), GitHub Actions CI.

### Removed
- Dead vanilla `newtab.js` generation, unused 60 MB wallpapers (incl. a copyrighted PDF), staging duplicates.

### Security
- No remote code in the shipped package (MV3 CSP compliant end to end).
