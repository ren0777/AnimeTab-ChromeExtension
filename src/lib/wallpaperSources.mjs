// Wallpaper source registry + URL builders (pure, unit-tested).
// Sources:
//  - 'nekos'   nekos.best portraits (waifu/neko/kitsune/husbando)
//  - 'scenes'  wallhaven anime category (full art scenes)
//  - 'scenery' wallhaven general category, landscape tag (art/photographic)

export const NEKOS_CATEGORIES = ['neko', 'waifu', 'kitsune', 'husbando'];

export const WALLPAPER_SOURCES = [
  { id: 'nekos', label: 'Anime portraits', provider: 'nekos.best' },
  { id: 'scenes', label: 'Anime scenes', provider: 'wallhaven.cc' },
  { id: 'scenery', label: 'Anime landscapes', provider: 'wallhaven.cc' },
  { id: 'photo', label: 'Photo of the day', provider: 'bing.com' }
];

export const DEFAULT_SOURCE = 'nekos';

export function normalizeSource(value) {
  return WALLPAPER_SOURCES.some((s) => s.id === value) ? value : DEFAULT_SOURCE;
}

/** A known category narrows the nekos pool to it; anything else = random mix. */
export function pickNekosCategory(category) {
  const pool = NEKOS_CATEGORIES.includes(category) ? [category] : NEKOS_CATEGORIES;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function buildNekosUrl(category) {
  return `https://nekos.best/api/v2/${pickNekosCategory(category)}`;
}

// wallhaven: keyless API, SFW-only (purity=100), 1080p minimum, random sorting.
const WALLHAVEN_ABI = 'https://wallhaven.cc/api/v1/search';
const WALLHAVEN_BASE_PARAMS = { purity: '100', sorting: 'random', atleast: '1920x1080' };
export const WALLHAVEN_PAGE_POOL = 10;

// wallhaven categories are a general/anime/people bitmask ("anime" is not a
// valid value and would fall back to the default all-category search).
const WALLHAVEN_ANIME_ONLY = '010';

// Landscapes: require the "landscape" tag and drop what the anime category
// still lets through — real-world photos (animeirl), character art (anime
// girls) and game screenshots. ~600 SFW 1080p+ results as of 2026-10.
export const WALLHAVEN_SCENERY_QUERY = '+landscape -animeirl -"anime girls" -"video games"';

export function buildWallhavenUrl(sourceId, page = 1) {
  const params = new URLSearchParams(WALLHAVEN_BASE_PARAMS);
  params.set('categories', WALLHAVEN_ANIME_ONLY);
  if (sourceId !== 'scenes') {
    params.set('q', WALLHAVEN_SCENERY_QUERY);
  }
  params.set('page', String(page));
  return `${WALLHAVEN_ABI}?${params.toString()}`;
}

export function wallhavenPage() {
  return 1 + Math.floor(Math.random() * WALLHAVEN_PAGE_POOL);
}

/** Full-res candidate paths from a search response (defensive on shape). */
export function wallhavenPaths(data) {
  const items = Array.isArray(data?.data) ? data.data : [];
  return items
    .filter((item) => typeof item?.path === 'string' && /^https:/.test(item.path))
    .filter((item) => !item.dimension_x || item.dimension_x >= 1920)
    .map((item) => item.path);
}

// --- Bing daily wallpapers (keyless, SFW, genuine landscape photos) --------
export const BING_ARCHIVE_URL = 'https://www.bing.com/HPImageArchive.aspx?format=js&n=8&mkt=en-US';
export const BING_IMAGE_DAYS = 8;

export function buildBingUrl(idx = 0) {
  return `https://www.bing.com/HPImageArchive.aspx?format=js&idx=${Math.max(0, Math.min(BING_IMAGE_DAYS - 1, idx))}&n=${BING_IMAGE_DAYS}&mkt=en-US`;
}

/** The last 8 Bing daily images as absolute https URLs. */
export function bingPaths(data) {
  const images = Array.isArray(data?.images) ? data.images : [];
  return images
    .map((img) => {
      const raw = typeof img?.url === 'string' ? img.url : '';
      if (!raw) return '';
      return /^https:/.test(raw) ? raw : `https://www.bing.com${raw}`;
    })
    .filter((url) => /^https:\/\/www\.bing\.com\/th\?id=/.test(url));
}

/** nekos.best response → image URL (handles a few known shapes). */
export function extractNekosUrl(data) {
  return data?.results?.[0]?.url || data?.data?.[0]?.url || data?.url || null;
}

/** Which source to try when the requested one fails (stay near the intent). */
export function fallbackSourceFor(sourceId) {
  if (sourceId === 'nekos') return 'scenes';
  if (sourceId === 'scenes') return 'scenery';
  if (sourceId === 'photo') return 'scenery';
  return 'photo';
}

/**
 * Attempt chain for a load: the requested source first, its same-provider
 * sibling next, then every other provider — so a whole-provider outage
 * (e.g. all wallhaven endpoints unreachable) still lands on a live provider
 * before the bundled images are ever touched.
 */
export const PROVIDER_ORDER = ['wallhaven.cc', 'bing.com', 'nekos.best'];

/** Closest-to-intent next provider when the requested one fails. */
const AFFINITY_PROVIDER = {
  scenery: 'bing.com',
  photo: 'wallhaven.cc',
  nekos: 'wallhaven.cc',
  scenes: 'nekos.best'
};

export function sourceAttemptChain(sourceId) {
  const wanted = normalizeSource(sourceId);
  const providerOf = (id) => WALLPAPER_SOURCES.find((s) => s.id === id)?.provider;
  const byProvider = new Map();
  for (const source of WALLPAPER_SOURCES) {
    if (!byProvider.has(source.provider)) byProvider.set(source.provider, []);
    byProvider.get(source.provider).push(source.id);
  }

  const chain = [wanted];
  const addProvider = (provider) => {
    for (const id of byProvider.get(provider) || []) {
      if (!chain.includes(id)) chain.push(id);
    }
  };

  const wantedProvider = providerOf(wanted);
  const order = [wantedProvider, AFFINITY_PROVIDER[wanted], ...PROVIDER_ORDER];
  const processed = new Set();
  for (const provider of order) {
    if (!provider || processed.has(provider)) continue;
    processed.add(provider);
    addProvider(provider); // siblings of the wanted source come first
  }
  return chain;
}
