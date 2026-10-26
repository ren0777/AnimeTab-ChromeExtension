import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  REWARDS, unlockedRewards, nextRewardAt, streakFromMetrics,
  shareUrlFor, encodeSetup, decodeSetup, SETUP_CODE_VERSION, STORE_URL
} from '../src/lib/growth.mjs';

const buildDay = (base, offset, opens = 2) => {
  const d = new Date(base.getTime() - offset * 86400000);
  return [d.toISOString().slice(0, 10), { tab_open: opens }];
};

test('unlockedRewards respects thresholds', () => {
  assert.deepEqual(unlockedRewards(0), []);
  assert.deepEqual(unlockedRewards(2), []);
  assert.deepEqual(unlockedRewards(3), ['neonRain']);
  assert.deepEqual(unlockedRewards(9), ['neonRain', 'nightDrive']);
  assert.deepEqual(unlockedRewards(10).length, REWARDS.length);
});

test('nextRewardAt reports the next threshold or null', () => {
  assert.equal(nextRewardAt(1), 3);
  assert.equal(nextRewardAt(3), 5);
  assert.equal(nextRewardAt(10), null);
  assert.equal(nextRewardAt(99), null);
});

// A pinned reference day keeps this test stable across UTC day rollovers
// (fixtures must not be relative to Date.now() when `today` is fixed).
const TODAY = new Date('2026-10-25T15:00:00Z');

test('streakFromMetrics counts consecutive active days', () => {
  const entries = Object.fromEntries([
    buildDay(TODAY, 0), buildDay(TODAY, 1), buildDay(TODAY, 2), buildDay(TODAY, 4)
  ]);
  assert.equal(streakFromMetrics(entries, TODAY), 3);
});

test('streakFromMetrics waits until today has an open', () => {
  const entries = Object.fromEntries([buildDay(TODAY, 1), buildDay(TODAY, 2)]);
  assert.equal(streakFromMetrics(entries, TODAY), 2);
});

test('streakFromMetrics returns 0 for empty history', () => {
  assert.equal(streakFromMetrics({}, new Date()), 0);
});

test('STORE_URL points at the real Web Store listing (no placeholder)', () => {
  assert.match(STORE_URL, /^https:\/\/chromewebstore\.google\.com\/detail\/animetab\/[a-p]{32}$/);
  assert.ok(!STORE_URL.includes('REPLACE_WITH'), 'placeholder must never reach a shipped share link');
});

test('shareUrlFor builds deep links per channel', () => {
  const url = 'https://example.com/x?a=1&b=2';
  assert.ok(shareUrlFor('x', url).startsWith('https://twitter.com/intent/tweet?'));
  assert.ok(shareUrlFor('telegram', url).includes('t.me/share/url?url='));
  assert.ok(shareUrlFor('whatsapp', url).includes('wa.me/?text='));
  assert.ok(shareUrlFor('reddit', url).includes('reddit.com/submit?url='));
  assert.equal(shareUrlFor('discord', url), 'https://discord.com/channels/@me');
  assert.equal(shareUrlFor('copy', url), url);
});

test('setup codec round-trips links, prefs and unicode names', () => {
  const setup = {
    links: [{ name: '日常', url: 'https://nhk.jp', icon: '🌐', gradient: 'g' }],
    themeMode: 'cute',
    searchEngine: 'anilist',
    clockFormat: '12'
  };
  const code = encodeSetup(setup);
  assert.ok(code.startsWith(`ATB${SETUP_CODE_VERSION}.`));
  const decoded = decodeSetup(code);
  assert.deepEqual(decoded, {
    links: setup.links,
    prefs: { themeMode: 'cute', searchEngine: 'anilist', clockFormat: '12' }
  });
});

test('decodeSetup rejects garbage and foreign versions', () => {
  assert.equal(decodeSetup(''), null);
  assert.equal(decodeSetup('ATB9.QUJD'), null);
  assert.equal(decodeSetup('not a code'), null);
  assert.equal(decodeSetup('ATB1.@@@'), null);
  assert.equal(decodeSetup(null), null);
});

test('setup codec drops unset prefs and ignores extra fields', () => {
  const code = encodeSetup({ links: [], themeMode: 'lofi', merchHidden: true });
  const decoded = decodeSetup(code);
  assert.deepEqual(decoded.links, []);
  assert.deepEqual(decoded.prefs, { themeMode: 'lofi' }); // undefined prefs removed by JSON
});
