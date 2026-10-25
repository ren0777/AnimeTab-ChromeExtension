// Search engine registry for the search bar picker.
export const SEARCH_ENGINES = [
  { id: 'google', label: 'Google', build: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
  { id: 'duckduckgo', label: 'DuckDuckGo', build: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}` },
  { id: 'youtube', label: 'YouTube', build: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}` },
  { id: 'anilist', label: 'AniList', build: (q) => `https://anilist.co/search/anime?search=${encodeURIComponent(q)}` }
];

export const DEFAULT_ENGINE = 'google';

export function normalizeEngine(id) {
  return SEARCH_ENGINES.some((e) => e.id === id) ? id : DEFAULT_ENGINE;
}

export function buildSearchUrl(engineId, query) {
  const engine = SEARCH_ENGINES.find((e) => e.id === normalizeEngine(engineId));
  return engine.build(String(query || '').trim());
}
