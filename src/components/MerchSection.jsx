import React, { useCallback, useEffect, useRef, useState } from 'react';
import { assetUrl, storageGet, storageSet } from '../lib/platform.mjs';
import { buildAmazonUrl, nextRotation, pickProduct, hasProducts } from '../lib/merch.mjs';
import { createAnalytics, EVENT_TYPES } from '../lib/analytics.mjs';
import './MerchSection.css';

const MERCH_STATE_KEY = 'merchRotationState';

const CATEGORY_ICONS = {
  'Figure': '🧸', 'Wall Scroll': '🖼️', 'Poster': '🖼️', 'Apparel': '👕',
  'Keychain': '🔑', 'Manga': '📖', 'Collector': '🛍️', 'Blu-ray': '💿',
  'Plush': '🧸', 'Lamp': '💡', 'Model Kit': '🔧'
};

/**
 * Affiliate merch card. Fixes the old fixed-bottom bar that shipped as dead
 * markup: this renders inside React, rotates hourly, supports manual "Next"
 * and records clicks into the local privacy-friendly metrics store.
 */
export default function MerchSection({ analytics = createAnalytics({ get: async () => ({}), set: async () => ({}) }) }) {
  const [product, setProduct] = useState(null);
  const [weekInfo, setWeekInfo] = useState(null);
  const jsonRef = useRef(null);
  const tagRef = useRef('');
  const indexRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(assetUrl('merch.json'), { cache: 'no-store' });
        const json = await res.json();
        if (cancelled || !hasProducts(json)) return;

        jsonRef.current = json;
        tagRef.current = String(json.affiliateTag || '').trim();

        const state = (await storageGet([MERCH_STATE_KEY]))[MERCH_STATE_KEY] || {};
        const len = json.products.length;
        const rot = nextRotation(state);
        const display = ((rot.index + rot.advance) % len + len) % len;
        indexRef.current = display;
        // Persist consumed rotation so manual bumps & hours don't double-apply.
        if (rot.advance > 0) {
          await storageSet({ [MERCH_STATE_KEY]: { index: display, hourTile: rot.hourTile, manualBump: 0 } });
        }

        const first = pickProduct(json, display);
        setProduct({
          ...first,
          url: buildAmazonUrl({ search: first.search, href: first.href, tag: tagRef.current })
        });

        if (analytics) setWeekInfo(await analytics.snapshot());
      } catch { /* leave hidden */ }
    })();
    return () => { cancelled = true; };
  }, [analytics]);

  const showAt = useCallback(async (nextIndex, trackEvent) => {
    const json = jsonRef.current;
    if (!json) return;
    const len = json.products.length;
    const i = ((nextIndex % len) + len) % len;
    indexRef.current = i;
    await storageSet({ [MERCH_STATE_KEY]: { index: i, hourTile: Math.floor(Date.now() / 3600000), manualBump: 0 } });
    const p = pickProduct(json, i);
    setProduct({ ...p, url: buildAmazonUrl({ search: p.search, href: p.href, tag: tagRef.current }) });
    if (analytics) await analytics.track(trackEvent);
  }, [analytics]);

  const handleNext = () => showAt(indexRef.current + 1, EVENT_TYPES.MERCH_NEXT);

  const handleClick = () => analytics && analytics.track(EVENT_TYPES.AFFILIATE_CLICK);

  if (!product) return null;

  const tooltip = weekInfo
    ? `Local metrics (never sent anywhere) — this week: ${weekInfo.weekTotal || 0} fresh tabs`
    : 'Local metrics (never sent anywhere)';

  return (
    <aside className="merch-card" aria-label="Featured anime merch">
      <a
        className="merch-main"
        href={product.url}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={handleClick}
      >
        <span className="merch-emoji" role="img" aria-hidden="true">
          {product.image || CATEGORY_ICONS[product.category] || '🛍️'}
        </span>
        <span className="merch-info">
          <span className="merch-title">{product.title}</span>
          <span className="merch-meta">
            {product.price ? `${product.price} · ` : ''}{product.category}
          </span>
          <span className="merch-cta">Shop on Amazon ↗</span>
        </span>
      </a>
      <button className="merch-next" onClick={handleNext} title="Next product" aria-label="Next product">→</button>
      <span className="merch-disclosure" title={tooltip}>
        <span className="merch-dot" aria-hidden="true" />
        Affiliate
      </span>
    </aside>
  );
}
