import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  WALLPAPER_SOURCES, normalizeSource, pickNekosCategory, buildNekosUrl,
  buildWallhavenUrl, wallhavenPage, wallhavenPaths, extractNekosUrl, fallbackSourceFor
} from '../src/lib/wallpaperSources.mjs';

test('source registry + fallback chain stay consistent', () => {
  assert.deepEqual(WALLPAPER_SOURCES.map((s) => s.id), ['nekos', 'scenes', 'scenery']);
  for (const s of WALLPAPER_SOURCES) {
    assert.equal(normalizeSource(s.id), s.id);
    assert.ok(fallbackSourceFor(s.id) !== s.id);
    assert.equal(normalizeSource(fallbackSourceFor(s.id)), fallbackSourceFor(s.id));
  }
  assert.equal(normalizeSource('bogus'), 'nekos');
  assert.equal(normalizeSource(undefined), 'nekos');
});

test('pickNekosCategory honors a single choice or mixes the pool', () => {
  for (let i = 0; i < 20; i++) assert.equal(pickNekosCategory('kitsune'), 'kitsune');
  const seen = new Set();
  for (let i = 0; i < 60; i++) seen.add(pickNekosCategory('any-such'));
  assert.ok(seen.size > 1); // multiple categories occur over time
});

test('buildNekosUrl stays inside the API v2 root', () => {
  assert.ok(buildNekosUrl('waifu').startsWith('https://nekos.best/api/v2/waifu'));
});

test('buildWallhavenUrl encodes SFW, 1080p, random-sort searches', () => {
  const scenes = buildWallhavenUrl('scenes', 3);
  assert.ok(scenes.includes('categories=anime'));
  assert.ok(scenes.includes('purity=100'));
  assert.ok(scenes.includes('atleast=1920x1080'));
  assert.ok(scenes.includes('sorting=random'));
  assert.ok(scenes.includes('page=3'));

  const scenery = buildWallhavenUrl('scenery', 1);
  assert.ok(scenery.includes('categories=anime'));
  assert.ok(scenery.includes('q=landscape')); // single strong tag, no character-art leakage
});

test('wallhavenPage stays within the page pool', () => {
  for (let i = 0; i < 30; i++) {
    const p = wallhavenPage();
    assert.ok(p >= 1 && p <= 10);
  }
});

test('wallhavenPaths keeps https full-res paths and drops junk', () => {
  assert.deepEqual(
    wallhavenPaths({ data: [
      { path: 'https://w.wallhaven.cc/full/abc.jpg', dimension_x: 2560 },
      { path: 'http://insecure.jpg', dimension_x: 2560 },
      { path: 'https://small.jpg', dimension_x: 1280 },
      { path: null },
      'nonsense'
    ] }),
    ['https://w.wallhaven.cc/full/abc.jpg']
  );
  assert.deepEqual(wallhavenPaths(null), []);
  assert.deepEqual(wallhavenPaths({ data: 'nope' }), []);
});

test('extractNekosUrl handles known response shapes', () => {
  assert.equal(extractNekosUrl({ results: [{ url: 'a' }] }), 'a');
  assert.equal(extractNekosUrl({ data: [{ url: 'b' }] }), 'b');
  assert.equal(extractNekosUrl({ url: 'c' }), 'c');
  assert.equal(extractNekosUrl({}), null);
});
