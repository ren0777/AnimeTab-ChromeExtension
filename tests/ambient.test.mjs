import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAmbient, modeLabel, AMBIENT_MODES } from '../src/lib/ambient.mjs';

test('ambient mode registry is user-facing complete', () => {
  assert.deepEqual(AMBIENT_MODES.map((m) => m.id), ['off', 'rain', 'vinyl', 'ocean']);
  for (const m of AMBIENT_MODES) assert.ok(m.icon && m.label);
});

test('normalizeAmbient whitelists ids', () => {
  assert.equal(normalizeAmbient('rain'), 'rain');
  assert.equal(normalizeAmbient('club'), 'off');
  assert.equal(normalizeAmbient(undefined), 'off');
});

test('modeLabel falls back to Off', () => {
  assert.equal(modeLabel('ocean'), 'Ocean');
  assert.equal(modeLabel('??'), 'Off');
});
