import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextRotation, buildAmazonUrl, pickProduct, hasProducts } from '../src/lib/merch.mjs';

const HOUR = 60 * 60 * 1000;

test('nextRotation advances one slot per elapsed hour', () => {
  const now = (10 * HOUR) + 1234;
  const state = { index: 3, hourTile: 10, manualBump: 0 };
  assert.equal(nextRotation(state, now).advance, 0);
  assert.equal(nextRotation(state, now + 2 * HOUR).advance, 2);
});

test('nextRotation honors manual bumps', () => {
  const now = 10 * HOUR;
  assert.equal(nextRotation({ index: 0, hourTile: 9, manualBump: 1 }, now).advance, 2);
  // no negative jumps when the clock state is ahead
  assert.equal(nextRotation({ index: 0, hourTile: 11, manualBump: 0 }, now).advance, 0);
});

test('buildAmazonUrl appends the affiliate tag', () => {
  const url = buildAmazonUrl({ search: 'luffy figure', tag: 'animetab-20' });
  assert.equal(url, 'https://www.amazon.com/s?k=luffy%20figure&tag=animetab-20');
  assert.equal(buildAmazonUrl({ search: 'luffy figure', tag: '' }), 'https://www.amazon.com/s?k=luffy%20figure');
});

test('buildAmazonUrl keeps direct links and tags them once', () => {
  assert.equal(
    buildAmazonUrl({ href: 'https://amazon.com/dp/XYZ', tag: 'animetab-20' }),
    'https://amazon.com/dp/XYZ?tag=animetab-20'
  );
  assert.equal(
    buildAmazonUrl({ href: 'https://amazon.com/dp/XYZ?tag=animetab-20', tag: 'other' }),
    'https://amazon.com/dp/XYZ?tag=animetab-20'
  );
});

test('pickProduct wraps and rejects empty catalogs', () => {
  const json = { products: [{ title: 'a' }, { title: 'b' }] };
  assert.equal(pickProduct(json, 2).title, 'a');
  assert.equal(pickProduct(json, -1).title, 'b'); // wraps instead of crashing
  assert.equal(pickProduct({}, 0), null);
  assert.equal(hasProducts({ products: [] }), false);
});
