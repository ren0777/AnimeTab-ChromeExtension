import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  WALLPAPER_SOURCES, normalizeSource, pickNekosCategory, buildNekosUrl,
  buildWallhavenUrl, wallhavenPage, wallhavenPaths, extractNekosUrl,
  fallbackSourceFor, sourceAttemptChain, sceneryPathsFrom,
  buildBingUrl, bingPaths, BING_IMAGE_DAYS
} from '../src/lib/wallpaperSources.mjs';

test('source registry + fallback chain stay consistent', () => {
  assert.deepEqual(WALLPAPER_SOURCES.map((s) => s.id), ['nekos', 'scenes', 'scenery', 'photo']);
  for (const s of WALLPAPER_SOURCES) {
    assert.equal(normalizeSource(s.id), s.id);
    assert.ok(fallbackSourceFor(s.id) !== s.id);
    assert.equal(normalizeSource(fallbackSourceFor(s.id)), fallbackSourceFor(s.id));
  }
  assert.equal(normalizeSource('bogus'), 'nekos');
  assert.equal(normalizeSource(undefined), 'nekos');
});

test('sourceAttemptChain covers every source and every provider', () => {
  const providers = new Set(WALLPAPER_SOURCES.map((s) => s.provider));
  assert.equal(providers.size, 3); // nekos.best, wallhaven.cc, bing.com
  for (const wanted of ['nekos', 'scenes', 'scenery', 'photo', 'bogus', undefined]) {
    const chain = sourceAttemptChain(wanted);
    assert.equal(chain.length, WALLPAPER_SOURCES.length);
    assert.equal(chain[0], normalizeSource(wanted));
    assert.equal(new Set(chain).size, chain.length); // each source tried once
    // every provider is represented in the chain (no dead-end outage)
    for (const provider of providers) {
      assert.ok(chain.some((id) => WALLPAPER_SOURCES.find((s) => s.id === id)?.provider === provider));
    }
  }
  // affinity: a scenery failure tries the other provider with landscapes next
  assert.equal(sourceAttemptChain('scenery')[1], 'scenes');
  assert.equal(sourceAttemptChain('scenery').includes('photo'), true);
  assert.equal(sourceAttemptChain('photo')[0], 'photo');
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
  assert.ok(scenes.includes('categories=010')); // general/anime/people bitmask → anime only
  assert.ok(!scenes.includes('q='));
  assert.ok(scenes.includes('purity=100'));
  assert.ok(scenes.includes('atleast=1920x1080'));
  assert.ok(scenes.includes('sorting=random'));
  assert.ok(scenes.includes('page=3'));

  const scenery = buildWallhavenUrl('scenery', 1);
  assert.ok(scenery.includes('categories=010'));
  const q = new URL(scenery).searchParams.get('q');
  assert.ok(q.includes('+landscape')); // tag required, not a loose match
  for (const noise of ['-animeirl', '-"anime girls"', '-"video games"']) assert.ok(q.includes(noise));
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

test('sceneryPathsFrom is best-effort: tightens tagged payloads, never zeroes a pool', () => {
  const data = { data: [
    { path: 'https://w.wallhaven.cc/full/scenery.jpg', dimension_x: 2560, tags: [{ name: 'anime' }, { name: 'Scenery' }] },
    { path: 'https://w.wallhaven.cc/full/character.jpg', dimension_x: 2560, tags: [{ name: 'Gojo Satoru' }] },
    { path: 'https://w.wallhaven.cc/full/titled.jpg', dimension_x: 2560, tags: [{ name: 'rem' }] }, // "landscape" only in title ≠ tagged
    { path: 'https://w.wallhaven.cc/full/sea.jpg', dimension_x: 2560, tags: [{ name: 'sea' }] }
  ] };
  assert.deepEqual(sceneryPathsFrom(data), [
    'https://w.wallhaven.cc/full/scenery.jpg',
    'https://w.wallhaven.cc/full/sea.jpg'
  ]);

  // Payload without tags (older wallhaven shape) → pass-through, not [].
  assert.deepEqual(
    sceneryPathsFrom({ data: [
      { path: 'https://w.wallhaven.cc/full/a.jpg', dimension_x: 2560 },
      { path: 'https://w.wallhaven.cc/full/b.jpg', dimension_x: 2560, tags: [] }
    ] }),
    ['https://w.wallhaven.cc/full/a.jpg', 'https://w.wallhaven.cc/full/b.jpg']
  );

  // Guards still apply, and hideous input shapes yield [] gracefully.
  assert.deepEqual(sceneryPathsFrom({ data: [
    { path: 'http://insecure.jpg', tags: [{ name: 'mountain' }] },
    { path: 'https://small.jpg', dimension_x: 1280, tags: [{ name: 'sky' }] }
  ] }), []);
  assert.deepEqual(sceneryPathsFrom(null), []);
  assert.deepEqual(sceneryPathsFrom({ data: 'nope' }), []);
});

test('extractNekosUrl handles known response shapes', () => {
  assert.equal(extractNekosUrl({ results: [{ url: 'a' }] }), 'a');
  assert.equal(extractNekosUrl({ data: [{ url: 'b' }] }), 'b');
  assert.equal(extractNekosUrl({ url: 'c' }), 'c');
  assert.equal(extractNekosUrl({}), null);
});

test('buildBingUrl clamps idx into the archive window', () => {
  assert.ok(buildBingUrl(0).includes('idx=0&n=8'));
  assert.ok(buildBingUrl(BING_IMAGE_DAYS - 1).includes(`idx=${BING_IMAGE_DAYS - 1}&n=8`));
  assert.ok(buildBingUrl(99).includes(`idx=${BING_IMAGE_DAYS - 1}&n=8`));
  assert.ok(buildBingUrl(-5).includes('idx=0&n=8'));
});

test('bingPaths absolutizes /th?id image urls and drops junk', () => {
  assert.deepEqual(
    bingPaths({ images: [
      { url: '/th?id=OHR.RiceTerraces_EN-US0123_1920x1080.jpg&rf=LaDigue_1920x1080.jpg&pid=hp' },
      { url: 'https://www.bing.com/th?id=OHR.Absolute_EN-US1_1920x1080.jpg' },
      { url: '' },
      { url: '/HPImageArchive.aspx?x=1' }
    ] }),
    [
      'https://www.bing.com/th?id=OHR.RiceTerraces_EN-US0123_1920x1080.jpg&rf=LaDigue_1920x1080.jpg&pid=hp',
      'https://www.bing.com/th?id=OHR.Absolute_EN-US1_1920x1080.jpg'
    ]
  );
  assert.deepEqual(bingPaths(null), []);
  assert.deepEqual(bingPaths({ images: [] }), []);
});
