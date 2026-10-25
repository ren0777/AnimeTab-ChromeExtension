import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTheme, THEMES, DEFAULT_THEME } from '../src/lib/theme.mjs';

test('normalizeTheme passes through known themes', () => {
  for (const t of THEMES) assert.equal(normalizeTheme(t), t);
});

test('normalizeTheme maps legacy detector values onto real themes', () => {
  assert.equal(normalizeTheme('kawaii'), 'cute');
  assert.equal(normalizeTheme('aesthetic'), 'lofi');
});

test('normalizeTheme falls back to default for unknown values', () => {
  assert.equal(normalizeTheme(''), DEFAULT_THEME);
  assert.equal(normalizeTheme(null), DEFAULT_THEME);
  assert.equal(normalizeTheme("nonsense"), DEFAULT_THEME);
});
