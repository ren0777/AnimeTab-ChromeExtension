# AnimeTab

AnimeTab is a Manifest V3 Chrome extension that replaces your default new tab with an anime-inspired dashboard featuring rotating wallpapers, a live 24-hour clock, Japanese greetings, and a deterministic daily quote. It also lets you upload your own photo, GIF, or video as a persistent custom background. It runs fully client-side with no backend services and keeps data local for a privacy-first experience.

## Growth Features (Word of Mouth)

- **Invite Friends Hub** in the corner control panel with one-tap sharing for copy link, Discord, WhatsApp, Telegram, and X.
- **Referral Rewards** unlock visual perks at 3/5/10 invite actions (neon rain overlay, night-drive quote mode, hologram clock skin).
- **Share My Setup** export/import setup code so friends can instantly clone your vibe.
- **Habit Loop** includes daily streak tracking, 25-minute focus timer, and ambient mode (rain/cafe/vinyl).
- **Local Growth Snapshot** shows invite/share/export/reward counts to track momentum without external analytics.

## Add Wallpapers

- Format: WebP
- Minimum resolution: 1920x1080
- Recommended maximum size: 500 KB each
- File names must be `bg1.webp` through `bg15.webp`
- Place all files in `assets/wallpapers/`

If any wallpaper is missing or fails to load, AnimeTab automatically cycles to the next available file.

## Use Your Own Photo, GIF, or Video

- Click **Upload Photo/GIF/Video** on the new tab page.
- Select any local image or video file.
- AnimeTab stores the selected media in local extension storage and reuses it in future tabs.
- Click **Use Built-In Wallpapers** anytime to switch back to the rotating `bg1.webp` to `bg15.webp` set.

## Load Unpacked in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked**.
4. Select the `animetab/` folder.
5. Open a new tab to verify AnimeTab is active.

## Package for Chrome Web Store

1. From the workspace root, create a zip package:
   - PowerShell: `Compress-Archive -Path .\animetab\* -DestinationPath .\animetab.zip -Force`
2. Exclude local development artifacts if present (for example: `.git/`, screenshot source files, or editor metadata).
3. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
4. Create a new item and upload `animetab.zip`.

## Folder Structure

- `manifest.json`: Extension metadata and permissions.
- `newtab.html`: New tab page markup.
- `style.css`: Sakura + Midnight styling, glassmorphism, and animations.
- `newtab.js`: Clock, greeting, wallpaper rotation, quote loading, search, and featured card logic.
- `quotes.json`: 60 deterministic anime-style quotes.
- `privacy.html`: Privacy policy page for listing and review.
- `assets/icon16.png`, `assets/icon48.png`, `assets/icon128.png`: Extension icons.
  - Current files are tiny placeholders; replace them with production icon art at the same paths.
- `assets/wallpapers/README.md`: Wallpaper sourcing and compression instructions.
- `TESTING.md`: Manual QA checklist.
- `STORE_LISTING.md`: Chrome Web Store listing copy.

## Customize Featured Card Affiliate Link

Edit `newtab.html` and update the anchor with `data-featured-link`:

- Change the `href` to your destination URL.
- Update the link text shown to users.

You can also adjust card styling in `style.css` using the `.featured-card` and `.featured-link` selectors.

## License

MIT
