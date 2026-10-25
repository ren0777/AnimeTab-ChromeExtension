# AnimeTab

AnimeTab is a Manifest V3 Chrome extension that turns your new tab into an anime dashboard: rotating wallpapers (nekos.best with bundled fallbacks), a live clock with Japanese greetings, a daily quote, an editable quick-link grid, an "Airing Soon" countdown from the AniList API, and a curated affiliate merch card.

Everything runs client-side. User data stays local: preferences and anonymous feature counters live in `chrome.storage.local`; uploaded backgrounds live in the extension's IndexedDB.

## Features

- **Wallpapers** – random from the nekos.best API via the background service worker; shuffle or pin the current image from the Wallpaper Studio; upload your own image/video (kept in IndexedDB).
- **Mood themes** – Wano / LoFi / Cute / Romantic / Fighting; auto-detected from each wallpaper's palette (light-pastel → Cute, dark-vibrant → LoFi) or set manually.
- **Clock & greeting** – 24h or 12h format, hourly Japanese greeting (おはよう / こんにちは / こんばんは / おやすみ).
- **Search bar** – engine picker (Google, DuckDuckGo, YouTube, AniList), autofocus, persists your choice.
- **Quick Links** – add / remove / reorder tiles; favicons fetched from Google's favicon service; custom links persist locally.
- **Word of the Day** – deterministic daily quote from `quotes.json`.
- **Airing Soon** – next scheduled episodes for the current AniList season, cached 6 hours in the background worker.
- **Merch card** – hourly auto-rotation plus manual "→"; disclosure shown on the card; opens Amazon in a new tab only on click.
- **Local metrics** – anonymous counters (fresh tabs, merch clicks, uploads) visible in the Wallpaper Studio. No third-party analytics; no network telemetry.

## Monetization setup

`merch.json` contains `affiliateTag: ""`. Add your Amazon Associates tag there — links then get `&tag=<your-tag>` appended (links work without it). The affiliate disclosure is embedded in the card and covered in `privacy.html`.

## Development

```bash
npm install
npm run dev        # webpack watch mode
npm test           # node:test unit tests (pure logic in src/lib)
npm run lint       # eslint
npm run build      # production bundle → dist/
npm run package    # store zip → release/animetab-v1.2.0.zip
```

See `DEV-README.md` for architecture and `TESTING.md` for the QA checklist.
