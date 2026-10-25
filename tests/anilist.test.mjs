import { test } from 'node:test';
import assert from 'node:assert/strict';
import { currentSeason, parseAiring, formatCountdown, AIRING_QUERY } from '../src/lib/anilist.mjs';

test('currentSeason maps months to AniList seasons', () => {
  assert.deepEqual(currentSeason(new Date(2026, 0, 15)), { season: 'WINTER', seasonYear: 2026 });
  assert.deepEqual(currentSeason(new Date(2026, 5, 1)), { season: 'SUMMER', seasonYear: 2026 });
  assert.deepEqual(currentSeason(new Date(2026, 11, 1)), { season: 'WINTER', seasonYear: 2027 });
});

test('parseAiring keeps only upcoming episodes inside a 14 day window', () => {
  const now = Date.UTC(2026, 9, 25, 12); // Oct 25 2026 12:00 UTC
  const data = {
    data: {
      Page: {
        media: [
          { title: { english: 'Past Show' }, nextAiringEpisode: { episode: 3, airingAt: Math.floor(now / 1000) - 100 } },
          { title: { romaji: 'Far Future' }, nextAiringEpisode: { episode: 5, airingAt: Math.floor(now / 1000) + 20 * 86400 } },
          { title: { english: 'Soon Show' }, nextAiringEpisode: { episode: 8, airingAt: Math.floor(now / 1000) + 3600 * 2 } }
        ]
      }
    }
  };
  const out = parseAiring(data, now);
  assert.equal(out.length, 1);
  assert.equal(out[0].title, 'Soon Show');
  assert.equal(out[0].episode, 8);
});

test('parseAiring tolerates malformed payloads', () => {
  assert.deepEqual(parseAiring(null), []);
  assert.deepEqual(parseAiring({ data: { Page: { media: undefined } } }), []);
});

test('formatCountdown renders human readable deltas', () => {
  const now = 1000000000000;
  assert.equal(formatCountdown(now + 2 * 3600000 + 5 * 60000, now), 'in 2h 5m');
  assert.equal(formatCountdown(now + 30 * 3600000, now), 'in 1d 6h');
  assert.equal(formatCountdown(now, now), 'in 0h 0m');
});

test('AIRING_QUERY declares the variables it uses', () => {
  assert.ok(AIRING_QUERY().includes('$season: MediaSeason'));
  assert.ok(AIRING_QUERY().includes('nextAiringEpisode'));
});
