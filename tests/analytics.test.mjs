import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAnalytics, EVENT_TYPES, METRICS_STORAGE_KEY } from '../src/lib/analytics.mjs';

function memoryStore() {
  const data = new Map();
  return {
    get: async (k) => data.get(k),
    set: async (k, v) => { data.set(k, v); }
  };
}

test('track increments totals and day buckets, pruned to 30 days', async () => {
  const store = memoryStore();
  const a = createAnalytics(store);
  await a.track(EVENT_TYPES.TAB_OPEN);
  await a.track(EVENT_TYPES.TAB_OPEN);
  await a.track(EVENT_TYPES.AFFILIATE_CLICK);

  const snap = await a.snapshot();
  assert.equal(snap.totals[EVENT_TYPES.TAB_OPEN], 2);
  assert.equal(snap.totals[EVENT_TYPES.AFFILIATE_CLICK], 1);
  assert.ok(snap.week[EVENT_TYPES.TAB_OPEN] >= 2);
  assert.ok(snap.weekTotal >= 3);
  assert.equal(snap.week.event_missing, undefined);
});

test('pruning keeps only the newest 30 day buckets', async () => {
  const store = memoryStore();
  const a = createAnalytics(store);
  const old = { totals: { tab_open: 7 }, days: {} };
  for (let i = 40; i > 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    old.days[d] = { tab_open: 1 };
  }
  await store.set(METRICS_STORAGE_KEY, old);
  const written = (await store.get(METRICS_STORAGE_KEY));
  assert.ok(Object.keys(written.days).length > 30);
  await a.track(EVENT_TYPES.TAB_OPEN);
  const after = await store.get(METRICS_STORAGE_KEY);
  assert.equal(Object.keys(after.days).length, 30);
  assert.equal(after.totals.tab_open, 8);
});

test('analytics survives storage failures', async () => {
  const a = createAnalytics({ get: async () => { throw new Error('boom'); }, set: async () => { throw new Error('boom'); } });
  await a.track(EVENT_TYPES.TAB_OPEN); // must not throw
  const snap = await a.snapshot();
  assert.deepEqual(snap.totals, {});
});

test('concurrent tracks are serialized — none of the burst is lost', async () => {
  const store = memoryStore();
  const a = createAnalytics(store);
  await Promise.all(Array.from({ length: 40 }, () => a.track(EVENT_TYPES.TAB_OPEN)));
  const snap = await a.snapshot();
  assert.equal(snap.totals[EVENT_TYPES.TAB_OPEN], 40);
});
