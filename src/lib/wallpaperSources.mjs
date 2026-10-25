// Wallpaper source registry + URL builders (pure, unit-tested).
// Sources:
//  - 'nekos'   nekos.best portraits (waifu/neko/kitsune/husbando)
//  - 'scenes'  wallhaven anime category (full art scenes)
//  - 'scenery' wallhaven general category, landscape tag (art/photographic)

export const NEKOS_CATEGORIES = ['neko', 'waifu', 'kitsune', 'husbando'];

export const WALLPAPER_SOURCES = [
  { id: 'nekos', label: 'Anime portraits', provider: 'nekos.best' },
  { id: 'scenes', label: 'Anime scenes', provider: 'wallhaven.cc' },
  { id: 'scenery', label: 'Anime landscapes', provider: 'wallhaven.cc' }
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

export function buildWallhavenUrl(sourceId, page = 1) {
  const params = new URLSearchParams(WALLHAVEN_BASE_PARAMS);
  if (sourceId === 'scenes') {
    params.set('categories', 'anime');
  } else {
    params.set('categories', 'general');
    params.set('q', 'anime landscape');
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

/** nekos.best response → image URL (handles a few known shapes). */
export function extractNekosUrl(data) {
  return data?.results?.[0]?.url || data?.data?.[0]?.url || data?.url || null;
}

/** Which source to try when the requested one fails (stay near the intent). */
export function fallbackSourceFor(sourceId) {
  if (sourceId === 'nekos') return 'scenes';
  if (sourceId === 'scenes') return 'scenery';
  return 'nekos';
}
