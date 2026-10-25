# AnimeTab

AnimeTab is a Manifest V3 Chrome extension that turns your new tab into an anime dashboard: rotating wallpapers (nekos.best with bundled fallbacks), a live clock with Japanese greetings, a daily quote, an editable quick-link grid, an "Airing Soon" countdown from the AniList API, and a curated affiliate merch card.

Everything runs client-side. User data stays local: preferences and anonymous feature counters live in `chrome.storage.local`; uploaded backgrounds live in the extension's IndexedDB.

## Features

- **Wallpapers** – three keyless sources: **Anime portraits** (nekos.best, with a Type selector: Waifu/Neko/Kitsune/Husbando/Any), **Anime scenes** (wallhaven anime category, full-resolution art), and **Anime landscapes** (wallhaven landscape tag); requests are SFW-filtered; shuffle or pin the current image; upload your own image/video (kept in IndexedDB). New tabs paint the cached wallpaper instantly, then crossfade to a fresh one.
- **Mood themes** – Wano / LoFi / Cute / Romantic / Fighting; auto-detected from each wallpaper's palette (light-pastel → Cute, dark-vibrant → LoFi) or set manually.
- **Clock & greeting** – 24h or 12h format, hourly Japanese greeting (おはよう / こんにちは / こんばんは / おやすみ).
- **Search bar** – engine picker (Google, DuckDuckGo, YouTube, AniList), autofocus, persists your choice.
- **Quick Links** – add / remove / reorder tiles; favicons fetched from Google's favicon service; custom links persist locally.
- **Word of the Day** – deterministic daily quote from `quotes.json`.
- **Airing Soon** – next scheduled episodes for the current AniList season, cached 6 hours in the background worker.
- **Focus timer** – 25-minute Pomodoro persisted in storage, so every new tab shows the same countdown; completion chime + toast.
- **Ambient sound** – synthesized rain / vinyl / ocean (WebAudio, no audio files). Off by default; selection remembered, never auto-plays.
- **Daily streak** – 🔥 pill for consecutive days with a tab open.
- **Invite hub** – one-tap share (X, Telegram, WhatsApp, Reddit, Discord, copy) with cosmetic unlocks at 3/5/10 invite actions: neon rain overlay, night-drive quote mode, hologram clock skin.
- **Share my setup** – export/import a setup code (links + theme + engine + clock format) so friends can clone your vibe.
- **Merch card** – hourly auto-rotation plus manual "→"; hide/show from the Wallpaper Studio; disclosure shown on the card; opens Amazon in a new tab only on click.
- **Local metrics** – anonymous counters (fresh tabs, merch clicks, uploads, focus, invites) visible in the Wallpaper Studio. No third-party analytics; no network telemetry.

## Monetization setup

`merch.json` contains `affiliateTag: ""`. Add your Amazon Associates tag there — links then get `&tag=<your-tag>` appended (links work without it). The affiliate disclosure is embedded in the card and covered in `privacy.html`.

## Development

```bash
npm install
npm run dev        # webpack watch mode
npm test           # node:test unit tests (pure logic in src/lib)
npm run lint       # eslint
npm run build      # production bundle → dist/
npm run package    # store zip → release/animetab-v1.4.1.zip
```

See `DEV-README.md` for architecture and `TESTING.md` for the QA checklist.
