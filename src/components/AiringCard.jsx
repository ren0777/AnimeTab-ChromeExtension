import React, { useEffect, useRef, useState } from 'react';
import { sendMessage, storageGet, storageSet } from '../lib/platform.mjs';
import { formatCountdown, WATCHLIST_SEARCH_QUERY, ANILIST_ENDPOINT } from '../lib/anilist.mjs';
import { createAnalytics, EVENT_TYPES } from '../lib/analytics.mjs';
import './AiringCard.css';

const WATCHLIST_KEY = 'anilistWatchlist'; // [{ id, title }]
const WATCHLIST_MAX = 12;

const anilistFetch = async (query, variables) => {
  const res = await fetch(ANILIST_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables })
  });
  if (!res.ok) throw new Error(`AniList ${res.status}`);
  return res.json();
};

/** Search airing anime by title for the watchlist picker. */
export async function searchAiringShows(term) {
  const data = await anilistFetch(WATCHLIST_SEARCH_QUERY, { search: term });
  const media = data?.data?.Page?.media || [];
  return media.map((m) => ({ id: m.id, title: m.title?.english || m.title?.romaji }));
}

/**
 * "Airing Soon": the popular current-season shows plus the user's watchlist
 * (pinned shows with upcoming episodes). Data comes from the background
 * service worker (6h cache); adding/removing shows invalidates the watch
 * list cache for an instant refresh.
 */
export default function AiringCard({ analytics = createAnalytics({ get: async () => ({}), set: async () => ({}) }) }) {
  const [items, setItems] = useState(null); // null = loading, [] = none
  const [watchlist, setWatchlist] = useState([]);
  const [adding, setAdding] = useState(false);
  const [term, setTerm] = useState('');
  const [results, setResults] = useState(null); // null = idle/searching
  const timerRef = useRef(null);

  const load = async () => {
    try {
      const res = await sendMessage({ type: 'FETCH_AIRING' });
      setItems(Array.isArray(res?.items) ? res.items.slice(0, 5) : []);
      setWatchlist(Array.isArray(res?.watchlist) ? res.watchlist : []);
    } catch {
      setItems([]);
      setWatchlist([]);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await load();
    })();
    return () => { cancelled = true; };
  }, []);

  // Debounced search while the picker is open.
  useEffect(() => {
    if (!adding) return undefined;
    if (!term.trim()) { setResults(null); return undefined; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        setResults(await searchAiringShows(term.trim()));
      } catch {
        setResults([]);
      }
    }, 400);
    return () => clearTimeout(timerRef.current);
  }, [term, adding]);

  const invalidateWatchCache = () => storageSet({ anilistWatchCache: null });

  const addShow = async (show) => {
    const list = (await storageGet([WATCHLIST_KEY]))[WATCHLIST_KEY] || [];
    if (list.some((s) => s.id === show.id) || list.length >= WATCHLIST_MAX) return;
    await storageSet({ [WATCHLIST_KEY]: [...list, { id: show.id, title: show.title }] });
    setTerm(''); setResults(null);
    await invalidateWatchCache();
    await load();
    if (analytics) await analytics.track(EVENT_TYPES.SHOW_PIN);
  };

  if (!items || (items.length === 0 && watchlist.length === 0 && !adding)) return null;

  return (
    <div className="airing-card glass-quote-card">
      <div className="quote-header">
        <span className="quote-icon">⏱</span>
        <h3 className="quote-title">Airing Soon</h3>
        <button type="button" className="airing-add-btn" onClick={() => setAdding((a) => !a)} aria-expanded={adding} title="Pin shows to your watchlist">
          {adding ? '✕ Close' : '＋ Add show'}
        </button>
      </div>

      {watchlist.length > 0 && (
        <ul className="airing-list airing-watchlist" aria-label="Your watchlist">
          {watchlist.map((item) => (
            <li key={`w-${item.id}`} className="airing-row watched">
              <span className="airing-title" title={item.title}>{item.title}</span>
              <span className="airing-when">
                {item.airingAt ? <>Ep {item.episode} · {formatCountdown(item.airingAt)}</> : 'No episode soon'}
                <button
                  type="button"
                  className="airing-remove"
                  title="Remove from watchlist"
                  onClick={async () => {
                    const list = (await storageGet([WATCHLIST_KEY]))[WATCHLIST_KEY] || [];
                    await storageSet({ [WATCHLIST_KEY]: list.filter((s) => s.id !== item.id) });
                    setWatchlist((cur) => cur.filter((w) => w.id !== item.id));
                    await invalidateWatchCache();
                    await load();
                    if (analytics) await analytics.track(EVENT_TYPES.SHOW_REMOVE);
                  }}
                >✕</button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <ul className={watchlist.length > 0 ? 'airing-list airing-seasonal-title' : 'airing-list'}>
          {items.map((item) => (
            <li key={`${item.title}-${item.episode}`} className="airing-row">
              <span className="airing-title" title={item.title}>{item.title}</span>
              <span className="airing-when">
                Ep {item.episode} · {formatCountdown(item.airingAt)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <div className="airing-picker">
          <input
            type="text"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search AniList for an airing anime…"
            aria-label="Search anime title"
            autoFocus
          />
          {results && (
            <ul className="airing-results">
              {results.length === 0 && <li className="airing-result-empty">No airing matches</li>}
              {results.map((show) => (
                <li key={show.id}>
                  <button type="button" onClick={() => addShow(show)}>{show.title}</button>
                </li>
              ))}
            </ul>
          )}
          <p className="airing-picker-hint">Pinned shows appear above the seasonal list. Max {WATCHLIST_MAX}.</p>
        </div>
      )}
    </div>
  );
}
