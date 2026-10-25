# AnimeTab v1.2.0 — QA Checklist

## Load

- [ ] `npm run build` then load `animetab/` unpacked (`chrome://extensions`)
- [ ] New tab opens without a blank flash; no red console errors (F12)

## Wallpaper & themes

- [ ] Tabs open with a random wallpaper (or bundled fallback if offline)
- [ ] Wallpaper Studio: Shuffle fetches a new image; Pin keeps the same image across tabs; Unpin restores random
- [ ] Upload an image (and a video); Reload tab → custom background returns; Reset reverts
- [ ] Mood picker changes palette; light wallpaper auto-lands on Cute, dark on LoFi (new fetches only)

## Clock, search, quote

- [ ] Clock shows 24h by default; switch to 12h in Studio, reload → format persists
- [ ] Search bar is focused on page load; Enter navigates to the selected engine
- [ ] Engine picker (Google/DDG/YouTube/AniList) persists after reload
- [ ] Quote stays the same all day; changes the next day

## Quick links

- [ ] Edit → reorder ↑/↓, add a link without scheme (`example.com`), remove one; reload → order persists
- [ ] Favicons render; a link without favicon shows an emoji fallback

## Airing card

- [ ] Shows up to 5 upcoming episodes with relative countdowns; hides if API unreachable

## Habits & growth

- [ ] 🔥 streak pill appears after two consecutive days of use (manipulate a `days` bucket to test)
- [ ] Focus 25: starts, ticks in all tabs, cancel works; letting it finish chimes + toast
- [ ] Ambient button cycles 🌧️/💿/🌊/🔇 with audible generative loops; new tab stays silent but remembers mode
- [ ] Invite hub: all six share actions increment the counter; rewards unlock at 3/5/10 (neon rain visible, quote card restyles, clock goes hologram)
- [ ] Export produces a readable code; pasting it in a friend-with-reset state applies links/theme/engine/clock
- [ ] Studio → untick "Show merch card" hides the card immediately; re-tick restores

## Merch & analytics

- [ ] Merch card bottom-left, rotates hourly + manual →; links always amazon.com, with `&tag=` once configured
- [ ] Clicking a product opens a new tab; counters visible in Studio metrics line increase accordingly
- [ ] Stats line shows only local counters; check DevTools → Network shows no analytics beacons

## Packaging

- [ ] `npm run package` → `release/animetab-v1.2.0.zip` (~1.6 MB), contains manifest/newtab/dist/assets only
- [ ] zip loads unpacked (rename to .crx not required) and behaves identically
