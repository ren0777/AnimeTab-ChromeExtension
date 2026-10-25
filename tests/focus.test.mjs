import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSession, startSession, remainingMs, formatFocusRemaining,
  normalizeFocusMinutes, DEFAULT_MINUTES
} from '../src/lib/focus.mjs';

test('normalizeFocusMinutes whitelists options', () => {
  for (const m of [15, 25, 45, 60]) assert.equal(normalizeFocusMinutes(m), m);
  assert.equal(normalizeFocusMinutes(25), 25);
  assert.equal(normalizeFocusMinutes('45'), 45); // storage round-trip
  assert.equal(normalizeFocusMinutes(99), DEFAULT_MINUTES);
  assert.equal(normalizeFocusMinutes(undefined), DEFAULT_MINUTES);
});

test('normalizeSession keeps in-flight sessions and drops finished ones', () => {
  const now = 1_000_000;
  const live = { endAt: now + 60_000, startedAt: now, minutes: 1 };
  assert.deepEqual(normalizeSession(live, now), live);
  assert.equal(normalizeSession({ endAt: now - 1 }, now), null);
  assert.equal(normalizeSession(null, now), null);
  assert.equal(normalizeSession('nonsense', now), null);
});

test('normalizeSession fills a missing startedAt from minutes', () => {
  const now = 1_000_000;
  const res = normalizeSession({ endAt: now + 10 * 60_000 }, now);
  assert.equal(res.startedAt, now + 10 * 60_000 - DEFAULT_MINUTES * 60_000);
});

test('startSession produces a normalized session', () => {
  const now = 500_000;
  const s = startSession(now, 25);
  assert.equal(s.endAt, now + 25 * 60_000);
  assert.deepEqual(normalizeSession(s, now), s);
});

test('remainingMs clamps at zero', () => {
  assert.equal(remainingMs(1000, 0), 1000);
  assert.equal(remainingMs(0, 5000), 0);
});

test('formatFocusRemaining renders mm:ss', () => {
  assert.equal(formatFocusRemaining(62_000), '1:02');
  assert.equal(formatFocusRemaining(0), '0:00');
  assert.equal(formatFocusRemaining(60_000), '1:00');
  assert.equal(formatFocusRemaining(61_000), '1:01');
});
