import {
  normalizeSource, sourceAttemptChain, buildNekosUrl, extractNekosUrl,
  buildWallhavenUrl, wallhavenPage, wallhavenPaths, sceneryPathsFrom,
  buildBingUrl, bingPaths, BING_IMAGE_DAYS
} from '../src/lib/wallpaperSources.mjs';
import { STORE_URL } from '../src/lib/growth.mjs';

// Bundled images used when every remote source fails.
const FALLBACK_WALLPAPERS = [
  'assets/fallback/fallback1.jpg',
  'assets/fallback/fallback2.jpg',
  'assets/fallback/fallback3.jpg',
  'assets/fallback/fallback4.jpg'
];

// --- nekos.best User-Agent --------------------------------------------------
// nekos.best rejects any browser User-Agent with HTTP 403 and asks for the
// "AppName (contact)" format instead (docs.nekos.best → API Reference). The
// extension cannot override User-Agent from fetch() (forbidden header) nor
// via a browser setting, so a declarativeNetRequest session rule rewrites the
// header on the wire. "declarativeNetRequestWithHostAccess" adds no new
// permission warning while the https://nekos.best/* host permission is already
// declared. Session rules reset with the browser, so (re)install idempotently
// on every service-worker start.
const NEKOS_UA_RULE_ID = 8831;

const installNekosUaRule = () => {
  const dnr = chrome.declarativeNetRequest;
  if (!dnr?.updateSessionRules) return; // DNR unavailable → wallhaven fallback covers us
  dnr.updateSessionRules({
    removeRuleIds: [NEKOS_UA_RULE_ID],
    addRules: [{
      id: NEKOS_UA_RULE_ID,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [{ header: 'User-Agent', operation: 'set', value: `AnimeTab (${STORE_URL})` }]
      },
      condition: {
        // Matches nekos.best and its subdomains (e.g. the i.* image host);
        // every resource type — service-worker fetch() has no distinct type.
        requestDomains: ['nekos.best']
      }
    }]
  })
    .then(() => console.log('[AnimeTab] nekos.best User-Agent rule installed'))
    .catch((error) =>
      console.warn('[AnimeTab] User-Agent rule not installed:', error?.message || error));
};

installNekosUaRule();

// Remove keys written by the pre-1.2 vanilla builds (one-off hygiene).
const LEGACY_KEYS = [
  'customBackgroundData', 'currentWallpaperIndex', 'featuredDismissed',
  'lofiStreamUrl', 'lofiVolume', 'lofiMuted',
  'inviteCount', 'growthMetrics', 'unlockedRewards'
];
try { chrome.storage.local.remove(LEGACY_KEYS); } catch { /* older Chrome */ }

const REQUEST_TIMEOUT_MS = 9000; // wallhaven serves large images
// V4: invalidates pools cached before the categories=010 + tag-query fixes (they held
// all-category results). Pools record their source so scenes and
// landscapes never serve each other's images.
const WALLHAVEN_POOL_KEY = 'wallhavenPoolV4';
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

// --- AniList "Airing Soon" + watchlist ------------------------------------

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';
const ANILIST_CACHE_KEY = 'anilistAiringCache';
const ANILIST_WATCH_CACHE_KEY = 'anilistWatchCache';
const ANILIST_TTL_MS = 6 * 60 * 60 * 1000;
const WATCHLIST_KEY = 'anilistWatchlist'; // [{ id, title }]
const WATCHLIST_MAX = 12;

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
      id
      title { english romaji }
      nextAiringEpisode { episode airingAt }
    }
  }
}`;

const WATCHLIST_QUERY = `query ($ids: [Int]) {
  Page(perPage: 50) {
    media(id_in: $ids, type: ANIME) {
      id
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
        ...(Number.isFinite(m?.id) ? { id: m.id } : {}),
        title: m.title?.english || m.title?.romaji || 'Unknown series',
        episode: ep.episode,
        airingAt: ep.airingAt * 1000
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.airingAt - b.airingAt);
};

const handleFetchAiring = async () => {
  const seasonal = await (async () => {
    try {
      const cache = (await storageGet(ANILIST_CACHE_KEY))[ANILIST_CACHE_KEY];
      if (cache && Date.now() - cache.fetchedAt < ANILIST_TTL_MS) {
        return { items: cache.items };
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
      return { items };
    } catch (error) {
      console.warn('[AnimeTab] AniList request failed:', error?.message || error);
      try {
        const cache = (await storageGet(ANILIST_CACHE_KEY))[ANILIST_CACHE_KEY];
        if (cache) return { items: cache.items, stale: true };
      } catch { /* ignore */ }
      return { items: [] };
    }
  })();

  // Watchlist schedule (cheap ids query, short cache so edits show quickly).
  const watchlist = await (async () => {
    try {
      const cache = (await storageGet(ANILIST_WATCH_CACHE_KEY))[ANILIST_WATCH_CACHE_KEY];
      if (cache && Date.now() - cache.fetchedAt < ANILIST_TTL_MS) {
        return { items: cache.items };
      }
    } catch { /* cache miss */ }
    try {
      const ids = ((await storageGet(WATCHLIST_KEY))[WATCHLIST_KEY] || [])
        .map((entry) => entry?.id).filter(Number.isFinite);
      if (!ids.length) return { items: [] };
      const data = await fetchJson(ANILIST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query: WATCHLIST_QUERY, variables: { ids } })
      });
      const items = parseAiringItems(data);
      await storageSet({ [ANILIST_WATCH_CACHE_KEY]: { items, fetchedAt: Date.now() } });
      return { items };
    } catch (error) {
      console.warn('[AnimeTab] Watchlist request failed:', error?.message || error);
      try {
        const cache = (await storageGet(ANILIST_WATCH_CACHE_KEY))[ANILIST_WATCH_CACHE_KEY];
        if (cache) return { items: cache.items, stale: true };
      } catch { /* ignore */ }
      return { items: [] };
    }
  })();

  return { items: seasonal.items, watchlist: watchlist.items };
};

// --- Wallpaper sources -----------------------------------------------------

/**
 * One API call fills a pool of candidate paths so ~24 tabs share a single
 * wallhaven request (they rate-limit anonymous traffic).
 */
const refillWallhavenPool = async (sourceId) => {
  // Retry fresh pages (tolerating API failures per attempt) before giving
  // the fallback chain a chance. Scenery is ALSO filtered client-side by the
  // returned tags: q= matches titles too, which leaks character art — without
  // this filter the "Anime landscapes" source would show portraits again.
  let paths = [];
  let lastError = null;
  for (let attempt = 0; attempt < 3 && !paths.length; attempt++) {
    try {
      const data = await fetchJson(buildWallhavenUrl(sourceId, wallhavenPage()));
      paths = sourceId === 'scenery' ? sceneryPathsFrom(data) : wallhavenPaths(data);
    } catch (error) {
      lastError = error;
      console.warn(`[AnimeTab] ${sourceId} page attempt failed:`, error?.message || error);
    }
  }
  if (!paths.length) {
    throw new Error(lastError?.message || `No wallpapers in ${sourceId} response`);
  }
  await storageSet({ [WALLHAVEN_POOL_KEY]: { sourceId, paths, fetchedAt: Date.now() } });
  return paths;
};

const takeWallhavenImage = async (sourceId) => {
  const pool = (await storageGet(WALLHAVEN_POOL_KEY))[WALLHAVEN_POOL_KEY];
  if (pool && pool.sourceId === sourceId && Date.now() - pool.fetchedAt < WALLHAVEN_POOL_TTL_MS && pool.paths?.length) {
    const [path, ...rest] = pool.paths;
    await storageSet({ [WALLHAVEN_POOL_KEY]: { ...pool, paths: rest } });
    return path;
  }
  const paths = await refillWallhavenPool(sourceId);
  return pickRandom(paths);
};

// --- Bing daily wallpapers --------------------------------------------------
// Keyless public archive: the last 8 daily hero images (genuine landscape
// photography, always SFW). One JSON request fills a 24h pool.
const BING_POOL_KEY = 'bingPool';
const BING_POOL_TTL_MS = 24 * 60 * 60 * 1000;

const takeBingImage = async () => {
  const pool = (await storageGet(BING_POOL_KEY))[BING_POOL_KEY];
  if (pool && Date.now() - pool.fetchedAt < BING_POOL_TTL_MS && pool.paths?.length) {
    const [path, ...rest] = pool.paths;
    await storageSet({ [BING_POOL_KEY]: { ...pool, paths: rest } });
    return path;
  }
  const data = await fetchJson(buildBingUrl(Math.floor(Math.random() * BING_IMAGE_DAYS)));
  const paths = bingPaths(data);
  if (!paths.length) throw new Error('No Bing wallpapers in archive response');
  await storageSet({ [BING_POOL_KEY]: { paths, fetchedAt: Date.now() } });
  return pickRandom(paths);
};

const resolveSource = async (sourceId, category) => {
  if (sourceId === 'nekos') {
    const data = await fetchJson(buildNekosUrl(category));
    const url = extractNekosUrl(data);
    if (!url) throw new Error(`No wallpaper URL in nekos.best response`);
    return url;
  }
  if (sourceId === 'photo') {
    return takeBingImage();
  }
  return takeWallhavenImage(sourceId); // 'scenes' | 'scenery'
};

const handleFetchWallpaper = async ({ source, category }) => {
  const wanted = normalizeSource(source);
  // sourceAttemptChain: the requested source first, then the remaining ones.
  // A whole provider out — e.g. every wallhaven endpoint unreachable from the
  // user's network — still ends on a different provider; bundled images are
  // only reached when all three sources fail.
  const attempts = sourceAttemptChain(wanted);
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
