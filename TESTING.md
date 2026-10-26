# AnimeTab v1.4.1 — QA Checklist

## Load

- [ ] `npm run build` then load `animetab/` unpacked (`chrome://extensions`)
- [ ] New tab opens without a blank flash; no red console errors (F12)

## Wallpaper & themes

- [ ] New tab paints the cached wallpaper instantly (no blank wait), then crossfades to a fresh one
- [ ] Studio → Source select (Anime portraits / Anime scenes / Anime landscapes / Photo of the day) fetches from the chosen provider and persists; Type row appears only for Anime portraits; 💾 Save image… opens the browser save dialog and tracks `wallpaper_save`. On a network that blocks wallhaven, "Anime scenes/landscapes" still lands a live wallpaper (degrades through the source chain, check the SW console log lines); scenes *quality* needs a wallhaven-reachable network (VPN/hotspot)
- [ ] Studio → Type select (dark popup): Waifu/Neko/Kitsune/Husbando fetches a matching portrait and persists; "Any type" restores the random mix
- [ ] Wallpaper Studio: Shuffle fetches a new image; Pin keeps the same image across tabs; Unpin restores random
- [ ] Upload an image (and a video): the video plays muted on loop; reload → custom background returns and the video still plays with no console errors; Reset reverts
- [ ] Pin works on a random wallpaper, on a wallhaven image and on a bundled fallback (Viewer keeps the same image across new tabs); with a custom upload active the Pin button is hidden (uploads persist on their own)
- [ ] Mood picker changes palette and stops auto-detection from overwriting it on later tabs; light wallpaper auto-lands on Cute, dark on LoFi only while mood never manually chosen

## Clock, search, quote

- [ ] Clock shows 24h by default; switch to 12h in Studio, reload → format persists
- [ ] Search bar is focused on page load; Enter navigates to the selected engine
- [ ] Engine picker (Google/DDG/YouTube/AniList) persists after reload
- [ ] Quote stays the same all day; changes the next day

## Quick links

- [ ] Edit mode: ✎ opens per-tile edit — rename and change URL (scheme-less like `example.com` accepted), ✓ saves, ✕ cancels; Leaving edit mode cancels open tile edits
- [ ] Reorder ↑/↓, add a new link, remove one; reload → everything persists
- [ ] Favicons render; a link without favicon shows an emoji fallback

## Airing card

- [ ] Shows up to 5 upcoming seasonal episodes with relative countdowns; hides if API unreachable
- [ ] ＋ Add show → fuzzy AniList search → pick one; it appears under a watchlist divider with countdowns; ✕ removes; watchlist survives reloads and survives tab restarts (6h cache cleared on edit)
- [ ] FINISHED-show picks disappear gracefully (no upcoming episode inside 14 days)

## Habits & growth

- [ ] 🔥 streak pill appears after two consecutive days of use (manipulate a `days` bucket to test)
- [ ] Focus: length selectable in Studio (15/25/45/60) — the dock button label updates IMMEDIATELY on change; starts with chosen length, ticks in all tabs, cancel works; letting it finish chimes + toast
- [ ] First open shows the welcome toast (once); reload → no toast
- [ ] Ambient button cycles 🌧️/💿/🌊/🔇 with audible generative loops; new tab stays silent but remembers mode
- [ ] Invite hub: all six share actions increment the counter and every link carries the live store URL (`chromewebstore.google.com/detail/animetab/…`); rewards unlock at 3/5/10 (neon rain visible, quote card restyles, clock goes hologram)
- [ ] Export produces a readable code; pasting it in a friend-with-reset state applies links/theme/engine/clock
- [ ] Studio → untick "Show merch card" hides the card immediately; re-tick restores

## Merch & analytics

- [ ] Merch card bottom-left, rotates hourly + manual →; links always amazon.com, with `&tag=` once configured
- [ ] Clicking a product opens a new tab; counters visible in Studio metrics line increase accordingly
- [ ] Stats line shows only local counters; check DevTools → Network shows no analytics beacons

## Packaging

- [ ] `npm run package` → `release/animetab-v1.4.1.zip` (~1.6 MB), contains manifest/newtab/dist/assets only
- [ ] zip loads unpacked (rename to .crx not required) and behaves identically
