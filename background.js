// AnimeTab background service worker.
// - Fetches random wallpapers from nekos.best (with bundled fallbacks).
// - Caches the AniList "Airing Soon" schedule for 6 hours.

const CATEGORIES = ['neko', 'waifu', 'kitsune', 'husbando'];

// A specific category ("waifu", ...) narrows the pool; anything else = any.
const categoryPool = (value) =>
  CATEGORIES.includes(value) ? [value] : CATEGORIES;

// Bundled images used when the API is unreachable, rate-limited, or blocks us.
const FALLBACK_WALLPAPERS = [
  'assets/fallback/fallback1.jpg',
  'assets/fallback/fallback2.jpg',
  'assets/fallback/fallback3.jpg',
  'assets/fallback/fallback4.jpg'
];

const REQUEST_TIMEOUT_MS = 5000;
const MAX_ATTEMPTS = 2;

// --- Airing schedule (AniList) -------------------------------------------
const ANILIST_ENDPOINT = 'https://graphql.anilist.co';
const ANILIST_CACHE_KEY = 'anilistAiringCache';
const ANILIST_TTL_MS = 6 * 60 * 60 * 1000;

const pickRandom = (items) => items[Math.floor(Math.random() * items.length)];

const localFallbackUrl = () =>
  chrome.runtime.getURL(pickRandom(FALLBACK_WALLPAPERS));

const fetchJson = async (url, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal,
      ...options
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

// Season/year for AniList windows (WINTER = Dec→Feb calendar concept).
const currentSeason = (date = new Date()) => {
  const m = date.getMonth();
  if (m <= 4) return { season: m <= 1 ? 'WINTER' : 'SPRING', seasonYear: date.getFullYear() };
  if (m <= 7) return { season: 'SUMMER', seasonYear: date.getFullYear() };
  if (m <= 10) return { season: 'FALL', seasonYear: date.getFullYear() };
  return { season: 'WINTER', seasonYear: date.getFullYear() + 1 };
};

const AIRING_QUERY = `query ($season: MediaSeason, $seasonYear: Int) {
  Page(perPage: 6) {
    media(season: $season, seasonYear: $seasonYear, type: ANIME, status: RELEASING, sort: POPULARITY_DESC) {
      title { english romaji }
      nextAiringEpisode { episode airingAt }
    }
  }
}`;

const parseAiringItems = (data, now = Date.now()) => {
  const media = data?.data?.Page?.media || [];
  const nowSec = Math.floor(now / 1000);
  const windowSec = 14 * 24 * 60 * 60;
  return media
    .map((m) => {
      const ep = m?.nextAiringEpisode;
      if (!ep || typeof ep.airingAt !== 'number') return null;
      if (ep.airingAt < nowSec || ep.airingAt > nowSec + windowSec) return null;
      return {
        title: m.title?.english || m.title?.romaji || 'Unknown series',
        episode: ep.episode,
        airingAt: ep.airingAt * 1000
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.airingAt - b.airingAt);
};

const fetchAiringItems = async () => {
  const { season, seasonYear } = currentSeason();
  const data = await fetchJson(ANILIST_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: AIRING_QUERY, variables: { season, seasonYear } })
  });
  return parseAiringItems(data);
};

const handleFetchAiring = async () => {
  try {
    const cache = (await new Promise((resolve) => chrome.storage.local.get(ANILIST_CACHE_KEY, resolve)))[ANILIST_CACHE_KEY];
    if (cache && Date.now() - cache.fetchedAt < ANILIST_TTL_MS) {
      return { items: cache.items, cached: true };
    }
  } catch { /* cache miss */ }

  try {
    const items = await fetchAiringItems();
    await new Promise((resolve) => chrome.storage.local.set({
      [ANILIST_CACHE_KEY]: { items, fetchedAt: Date.now() }
    }, resolve));
    return { items, cached: false };
  } catch (error) {
    console.warn('[AnimeTab] AniList request failed:', error?.message || error);
    // Serve stale cache rather than nothing.
    try {
      const cache = (await new Promise((resolve) => chrome.storage.local.get(ANILIST_CACHE_KEY, resolve)))[ANILIST_CACHE_KEY];
      if (cache) return { items: cache.items, cached: true, stale: true };
    } catch { /* ignore */ }
    return { items: [] };
  }
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'FETCH_AIRING') {
    (async () => sendResponse(await handleFetchAiring()))();
    return true;
  }

  if (request.type !== 'FETCH_WALLPAPER') {
    return undefined;
  }

  (async () => {
    // Try a random category first, then one different category as a retry.
    // The user-selected type (Waifu/Neko/…) narrows the pool to one category.
    const pool = categoryPool(request.category);
    const categories = [...pool].sort(() => Math.random() - 0.5).slice(0, MAX_ATTEMPTS);
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
