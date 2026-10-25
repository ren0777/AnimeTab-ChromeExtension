import {
  normalizeSource, fallbackSourceFor, buildNekosUrl, extractNekosUrl,
  buildWallhavenUrl, wallhavenPage, wallhavenPaths
} from '../src/lib/wallpaperSources.mjs';

// Bundled images used when every remote source fails.
const FALLBACK_WALLPAPERS = [
  'assets/fallback/fallback1.jpg',
  'assets/fallback/fallback2.jpg',
  'assets/fallback/fallback3.jpg',
  'assets/fallback/fallback4.jpg'
];

const REQUEST_TIMEOUT_MS = 9000; // wallhaven serves large images
const WALLHAVEN_POOL_KEY = 'wallhavenPool';
const WALLHAVEN_POOL_TTL_MS = 15 * 60 * 1000;

const pickRandom = (items) => items[Math.floor(Math.random() * items.length)];

const localFallbackUrl = () =>
  chrome.runtime.getURL(pickRandom(FALLBACK_WALLPAPERS));

const storageGet = (keys) => new Promise((resolve) => chrome.storage.local.get(keys, (r) => resolve(r || {})));
const storageSet = (values) => new Promise((resolve) => chrome.storage.local.set(values, resolve));

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

// --- AniList "Airing Soon" ------------------------------------------------

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';
const ANILIST_CACHE_KEY = 'anilistAiringCache';
const ANILIST_TTL_MS = 6 * 60 * 60 * 1000;

const currentSeason = (date = new Date()) => {
  const m = date.getMonth();
  if (m <= 1) return { season: 'WINTER', seasonYear: date.getFullYear() };
  if (m <= 4) return { season: 'SPRING', seasonYear: date.getFullYear() };
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

const handleFetchAiring = async () => {
  try {
    const cache = (await storageGet(ANILIST_CACHE_KEY))[ANILIST_CACHE_KEY];
    if (cache && Date.now() - cache.fetchedAt < ANILIST_TTL_MS) {
      return { items: cache.items, cached: true };
    }
  } catch { /* cache miss */ }

  try {
    const { season, seasonYear } = currentSeason();
    const data = await fetchJson(ANILIST_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: AIRING_QUERY, variables: { season, seasonYear } })
    });
    const items = parseAiringItems(data);
    await storageSet({ [ANILIST_CACHE_KEY]: { items, fetchedAt: Date.now() } });
    return { items, cached: false };
  } catch (error) {
    console.warn('[AnimeTab] AniList request failed:', error?.message || error);
    try {
      const cache = (await storageGet(ANILIST_CACHE_KEY))[ANILIST_CACHE_KEY];
      if (cache) return { items: cache.items, cached: true, stale: true };
    } catch { /* ignore */ }
    return { items: [] };
  }
};

// --- Wallpaper sources -----------------------------------------------------

/**
 * One API call fills a pool of candidate paths so ~24 tabs share a single
 * wallhaven request (they rate-limit anonymous traffic).
 */
const refillWallhavenPool = async (sourceId) => {
  const data = await fetchJson(buildWallhavenUrl(sourceId, wallhavenPage()));
  const paths = wallhavenPaths(data);
  if (!paths.length) throw new Error(`No wallpapers in ${sourceId} response`);
  await storageSet({ [WALLHAVEN_POOL_KEY]: { paths, fetchedAt: Date.now() } });
  return paths;
};

const takeWallhavenImage = async (sourceId) => {
  const pool = (await storageGet(WALLHAVEN_POOL_KEY))[WALLHAVEN_POOL_KEY];
  if (pool && Date.now() - pool.fetchedAt < WALLHAVEN_POOL_TTL_MS && pool.paths?.length) {
    const [path, ...rest] = pool.paths;
    await storageSet({ [WALLHAVEN_POOL_KEY]: { ...pool, paths: rest } });
    return path;
  }
  const paths = await refillWallhavenPool(sourceId);
  return pickRandom(paths);
};

const resolveSource = async (sourceId, category) => {
  if (sourceId === 'nekos') {
    const data = await fetchJson(buildNekosUrl(category));
    const url = extractNekosUrl(data);
    if (!url) throw new Error(`No wallpaper URL in nekos.best response`);
    return url;
  }
  return takeWallhavenImage(sourceId); // 'scenes' | 'scenery'
};

const handleFetchWallpaper = async ({ source, category }) => {
  const wanted = normalizeSource(source);
  // Try the requested source, then a near-neighbor; when wallhaven is
  // unreachable for both variants, gracefully degrade to nekos.best before
  // resorting to the bundled images.
  const attempts = wanted === 'nekos'
    ? ['nekos', 'scenes']
    : [wanted, fallbackSourceFor(wanted), 'nekos'].filter((v, i, a) => a.indexOf(v) === i);
  let lastError = null;

  for (const attempt of attempts) {
    try {
      const url = await resolveSource(attempt, category);
      console.log(`[AnimeTab] Wallpaper from ${attempt}:`, url);
      return { url, source: attempt };
    } catch (error) {
      lastError = error;
      console.warn(`[AnimeTab] ${attempt} request failed:`, error?.name, error?.message);
    }
  }

  const fallbackUrl = localFallbackUrl();
  console.warn('[AnimeTab] All sources failed; using bundled wallpaper:', fallbackUrl, lastError?.message || '');
  return { url: fallbackUrl, fallback: true, source: 'bundled' };
};

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'FETCH_AIRING') {
    (async () => sendResponse(await handleFetchAiring()))();
    return true;
  }

  if (request.type !== 'FETCH_WALLPAPER') {
    return undefined;
  }

  (async () => sendResponse(await handleFetchWallpaper(request)))();
  return true;
});
