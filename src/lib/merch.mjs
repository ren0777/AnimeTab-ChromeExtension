// Merch rotation + affiliate URL logic. Pure functions (unit-tested).

export const ROTATION_HOUR_MS = 60 * 60 * 1000;

/**
 * Compute a rotation state from persisted state.
 * - auto-advances one slot per full hour since the last write
 * - manual "Next" bumps persist via manualBump so they survive reloads
 */
export function nextRotation(state, now = Date.now()) {
  const s = state || {};
  const index = Math.max(0, s.index || 0);
  const hourTile = s.hourTile || 0;
  const manualBump = Math.max(0, s.manualBump || 0);
  const hour = Math.floor(now / ROTATION_HOUR_MS);
  const advance = Math.max(0, hour - hourTile) + manualBump;
  return { index, hourTile: hour, manualBump, advance };
}

/** Persistable state for the next load. */
export function commitRotation(state, now = Date.now()) {
  const { moveBy = 0 } = { moveBy: state?.advance || 0 };
  const s = nextRotation(state, now);
  return {
    index: s.index,
    hourTile: s.hourTile,
    manualBump: moveBy
  };
}

/**
 * Build the destination URL for a product.
 * - `search` builds an Amazon search link
 * - direct `href` is honored and the affiliate tag appended if missing
 * - keeps working with an empty tag (no earning param, fully compliant)
 */
export function buildAmazonUrl({ search = '', href = '', tag = '' } = {}) {
  const t = String(tag || '').trim();
  const target = String(href || '').trim();
  const q = String(search || '').trim();

  if (target && /^https?:\/\//i.test(target)) {
    if (!t) return target;
    let url = target;
    try {
      const u = new URL(target);
      if (!u.searchParams.has('tag')) u.searchParams.set('tag', t);
      url = u.toString();
    } catch { /* keep raw target */ }
    return url;
  }
  if (!q) return '';
  const base = `https://www.amazon.com/s?k=${encodeURIComponent(q)}`;
  return t ? `${base}&tag=${encodeURIComponent(t)}` : base;
}

export function hasProducts(json) {
  return Array.isArray(json?.products) && json.products.length > 0;
}

export function pickProduct(json, index) {
  if (!hasProducts(json)) return null;
  const list = json.products;
  return list[((index % list.length) + list.length) % list.length];
}
