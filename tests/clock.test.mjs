import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatTime, greetingAt } from '../src/lib/clock.mjs';

const at = (h, m) => new Date(2026, 0, 1, h, m, 0);

test('formatTime 24h pads hours', () => {
  assert.equal(formatTime(at(9, 5)), '09:05');
  assert.equal(formatTime(at(23, 59)), '23:59');
});

test('formatTime 12h renders AM/PM correctly', () => {
  assert.equal(formatTime(at(0, 5), { hour12: true }), '12:05 AM');
  assert.equal(formatTime(at(12, 5), { hour12: true }), '12:05 PM');
  assert.equal(formatTime(at(15, 30), { hour12: true }), '3:30 PM');
});

test('greetingAt covers the day boundaries', () => {
  assert.equal(greetingAt(0).romaji, 'Ohayou'); // pre-dawn tabs greet the morning
  assert.equal(greetingAt(8).romaji, 'Ohayou');
  assert.equal(greetingAt(13).romaji, 'Konnichiwa');
  assert.equal(greetingAt(19).romaji, 'Konbanwa');
  assert.equal(greetingAt(23).romaji, 'Oyasumi');
});
