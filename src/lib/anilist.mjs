// AniList GraphQL helpers for the "Airing Soon" card.
// Data comes from the public AniList API (no key required).

export const ANILIST_ENDPOINT = 'https://graphql.anilist.co';

export const SEASONS = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];

/** Map a date to the AniList season/year window it belongs to. */
export function currentSeason(date = new Date()) {
  const m = date.getMonth();
  if (m <= 1) return { season: 'WINTER', seasonYear: date.getFullYear() };
  if (m <= 4) return { season: 'SPRING', seasonYear: date.getFullYear() };
  if (m <= 7) return { season: 'SUMMER', seasonYear: date.getFullYear() };
  if (m <= 10) return { season: 'FALL', seasonYear: date.getFullYear() };
  return { season: 'WINTER', seasonYear: date.getFullYear() + 1 };
}

export const AIRING_QUERY = (perPage = 6) =>
  `query ($season: MediaSeason, $seasonYear: Int) { Page(perPage: ${perPage}) { media(season: $season, seasonYear: $seasonYear, type: ANIME, status: RELEASING, sort: POPULARITY_DESC) { title { english romaji } nextAiringEpisode { episode airingAt } } } }`;

/**
 * Reduce a GraphQL response to upcoming episodes within the next 14 days,
 * sorted by air time.
 */
export function parseAiring(data, now = Date.now()) {
  const media = data?.data?.Page?.media || [];
  const nowSec = Math.floor(now / 1000);
  const windowSec = 14 * 24 * 60 * 60;
  return media
    .map((m) => {
      const ep = m?.nextAiringEpisode;
      if (!ep || typeof ep.airingAt !== 'number') return null;
      if (ep.airingAt < nowSec || ep.airingAt > nowSec + windowSec) return null;
      const title = m.title?.english || m.title?.romaji || 'Unknown series';
      return { title, episode: ep.episode, airingAt: ep.airingAt * 1000 };
    })
    .filter(Boolean)
    .sort((a, b) => a.airingAt - b.airingAt);
}

export function formatCountdown(target, now = Date.now()) {
  const delta = Math.max(0, target - now);
  const h = Math.floor(delta / 3600000);
  const m = Math.floor((delta % 3600000) / 60000);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return `in ${d}d ${h % 24}h`;
  }
  return `in ${h}h ${m}m`;
}
