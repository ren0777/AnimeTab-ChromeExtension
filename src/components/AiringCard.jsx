import React, { useEffect, useState } from 'react';
import { sendMessage } from '../lib/platform.mjs';
import { formatCountdown } from '../lib/anilist.mjs';
import './AiringCard.css';

/**
 * "Airing Soon" card backed by the public AniList API, cached in the
 * background service worker (see background.js FETCH_AIRING).
 */
export default function AiringCard() {
  const [items, setItems] = useState(null); // null = loading, [] = unavailable

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await sendMessage({ type: 'FETCH_AIRING' });
        if (cancelled) return;
        setItems(Array.isArray(res?.items) ? res.items.slice(0, 5) : []);
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <div className="airing-card glass-quote-card">
      <div className="quote-header">
        <span className="quote-icon">⏱</span>
        <h3 className="quote-title">Airing Soon</h3>
      </div>
      <ul className="airing-list">
        {items.map((item) => (
          <li key={`${item.title}-${item.episode}`} className="airing-row">
            <span className="airing-title" title={item.title}>{item.title}</span>
            <span className="airing-when">
              Ep {item.episode} · {formatCountdown(item.airingAt)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
