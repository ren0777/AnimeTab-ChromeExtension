import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSearchUrl, normalizeEngine, DEFAULT_ENGINE, SEARCH_ENGINES } from '../src/lib/search.mjs';

test('normalizeEngine whitelists ids', () => {
  for (const e of SEARCH_ENGINES) assert.equal(normalizeEngine(e.id), e.id);
  assert.equal(normalizeEngine('bogus'), DEFAULT_ENGINE);
  assert.equal(normalizeEngine(undefined), DEFAULT_ENGINE);
});

test('buildSearchUrl encodes queries for every engine', () => {
  assert.equal(buildSearchUrl('google', 'a b'), 'https://www.google.com/search?q=a%20b');
  assert.equal(buildSearchUrl('duckduckgo', 'jk manga'), 'https://duckduckgo.com/?q=jk%20manga');
  assert.equal(buildSearchUrl('youtube', 'op 13'), 'https://www.youtube.com/results?search_query=op%2013');
  assert.equal(buildSearchUrl('anilist', 'frieren'), 'https://anilist.co/search/anime?search=frieren');
  assert.equal(buildSearchUrl('unknown', 'x'), 'https://www.google.com/search?q=x');
});
