import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLinkList, moveLink, faviconFor, prepareUrl, DEFAULT_LINKS } from '../src/lib/links.mjs';

test('prepareUrl adds https when scheme is missing', () => {
  assert.equal(prepareUrl('anilist.co'), 'https://anilist.co');
  assert.equal(prepareUrl('https://x.com'), 'https://x.com');
  assert.equal(prepareUrl('  '), '');
});

test('normalizeLinkList defaults names from hostname and removes empties', () => {
  const out = normalizeLinkList([{ url: 'mirror.xyz/' }, { name: ' ', url: '' }, { name: 'CAL', url: 'calendar.google.com' }]);
  assert.equal(out.length, 2);
  assert.equal(out[0].name, 'mirror.xyz');
  assert.equal(out[1].id, 2);
  assert.equal(out[1].name, 'CAL');
});

test('normalizeLinkList falls back to null for garbage', () => {
  assert.equal(normalizeLinkList([]), null);
  assert.equal(normalizeLinkList(null), null);
});

test('moveLink swaps neighbors without mutating the source', () => {
  const list = DEFAULT_LINKS.slice(0, 3).map((l, i) => ({ ...l, id: i + 1 }));
  const moved = moveLink(list, 2, 'up');
  assert.equal(moved[0].name, list[1].name); // item 2 moved up
  assert.equal(moved[1].name, list[0].name);
  assert.equal(list[0].name, list[0].name); // untouched
  assert.equal(moveLink(list, 1, 'up')[0].name, list[0].name);
});

test('faviconFor builds a favicon endpoint', () => {
  assert.equal(faviconFor('https://anilist.co'), 'https://www.google.com/s2/favicons?sz=64&domain=anilist.co');
  assert.equal(faviconFor('::::'), '');
});
