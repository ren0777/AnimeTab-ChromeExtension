// Quick-link model: user-editable tiles persisted in chrome.storage.

export const DEFAULT_LINKS = [
  { name: 'Crunchyroll', url: 'https://crunchyroll.com', icon: '📺', gradient: 'linear-gradient(135deg,#f97316,#b91c1c)' },
  { name: 'Netflix', url: 'https://netflix.com', icon: '🎬', gradient: 'linear-gradient(135deg,#dc2626,#7f1d1d)' },
  { name: 'MyAnimeList', url: 'https://myanimelist.net', icon: '📋', gradient: 'linear-gradient(135deg,#3b82f6,#4338ca)' },
  { name: 'AniList', url: 'https://anilist.co', icon: '📊', gradient: 'linear-gradient(135deg,#60a5fa,#06b6d4)' },
  { name: 'YouTube', url: 'https://youtube.com', icon: '▶️', gradient: 'linear-gradient(135deg,#ef4444,#db2777)' },
  { name: 'X', url: 'https://x.com', icon: '🐦', gradient: 'linear-gradient(135deg,#38bdf8,#1d4ed8)' },
  { name: 'Reddit', url: 'https://reddit.com/r/anime', icon: '🔗', gradient: 'linear-gradient(135deg,#ea580c,#b45309)' },
  { name: 'Discord', url: 'https://discord.com', icon: '💬', gradient: 'linear-gradient(135deg,#6366f1,#7c3aed)' }
];

export const LINKS_STORAGE_KEY = 'quickLinksV1';

export function prepareUrl(input) {
  const raw = String(input || '').trim();
  if (!raw) return '';
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  // Reject results that don't parse — e.g. bare "https://" — so a broken
  // href never gets persisted as a clickable tile.
  try { new URL(candidate); return candidate; } catch { return ''; }
}

export function normalizeLink(raw, id) {
  const url = prepareUrl(raw?.url);
  let host = '';
  try { host = url ? new URL(url).hostname.replace(/^www\./, '') : ''; } catch { host = ''; }
  const name = String(raw?.name || '').trim() || host || `Link ${id + 1}`;
  return {
    id,
    name,
    url,
    icon: String(raw?.icon || '').trim() || '🌐',
    gradient: String(raw?.gradient || '').trim() || 'linear-gradient(135deg,#ff6b8a,#3f51b5)'
  };
}

/** Normalize an incoming list (storage merge or defaults), re-keying ids. */
export function normalizeLinkList(list) {
  if (!Array.isArray(list)) return null;
  const cleaned = list
    .map((item) => normalizeLink(item, 0))
    .filter((item) => item.url)
    .map((item, i) => ({ ...item, id: i + 1 }));
  return cleaned.length ? cleaned : null;
}

export function faviconFor(url) {
  try { return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(new URL(url).hostname)}`; }
  catch { return ''; }
}

/** Swap a link with its neighbor; returns a new array (no mutation). */
export function moveLink(list, id, direction) {
  const idx = list.findIndex((l) => l.id === id);
  const target = direction === 'up' ? idx - 1 : idx + 1;
  if (idx < 0 || target < 0 || target >= list.length) return list;
  const copy = [...list];
  [copy[idx], copy[target]] = [copy[target], copy[idx]];
  return copy.map((l, i) => ({ ...l, id: i + 1 }));
}
