// nekos.best static image categories (it has no "wallpaper" route)
const CATEGORIES = ['neko', 'waifu', 'kitsune', 'husbando'];

// Bundled images used when the API is unreachable, rate-limited, or blocks us.
// Keep these paths in sync with what is actually shipped in the package.
// Sources: Pexels / Unsplash (free-licensed photos).
const FALLBACK_WALLPAPERS = [
  'assets/fallback/fallback1.jpg',
  'assets/fallback/fallback2.jpg',
  'assets/fallback/fallback3.jpg',
  'assets/fallback/fallback4.jpg'
];

const REQUEST_TIMEOUT_MS = 5000;
const MAX_ATTEMPTS = 2;

const pickRandom = (items) => items[Math.floor(Math.random() * items.length)];

const localFallbackUrl = () =>
  chrome.runtime.getURL(pickRandom(FALLBACK_WALLPAPERS));

const fetchJson = async (url) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
};

const extractImageUrl = (data) =>
  data?.results?.[0]?.url || data?.url || data?.data?.url || null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type !== 'FETCH_WALLPAPER') {
    return undefined;
  }

  (async () => {
    // Try a random category first, then one different category as a retry.
    const categories = [...CATEGORIES].sort(() => Math.random() - 0.5).slice(0, MAX_ATTEMPTS);
    let lastError = null;

    for (const category of categories) {
      try {
        const data = await fetchJson(`https://nekos.best/api/v2/${category}`);
        const url = extractImageUrl(data);

        if (!url) {
          throw new Error(`No wallpaper URL in ${category} response`);
        }

        console.log(`[AnimeTab] Wallpaper from ${category}:`, url);
        sendResponse({ url, source: category });
        return;
      } catch (error) {
        lastError = error;
        console.warn(
          `[AnimeTab] ${category} request failed:`,
          error.name,
          error.message
        );
      }
    }

    // Never leave the new tab without a wallpaper just because the API failed.
    const fallbackUrl = localFallbackUrl();
    console.warn(
      '[AnimeTab] API unavailable; using bundled wallpaper:',
      fallbackUrl,
      lastError?.message || ''
    );
    sendResponse({ url: fallbackUrl, fallback: true });
  })();

  return true;
});
