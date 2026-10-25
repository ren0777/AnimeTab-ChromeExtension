import React, { useEffect, useState } from 'react';
import { SEARCH_ENGINES, DEFAULT_ENGINE, normalizeEngine, buildSearchUrl } from '../lib/search.mjs';
import { storageGet, storageSet } from '../lib/platform.mjs';
import './SearchBar.css';

const ENGINE_KEY = 'searchEngine';

/**
 * Web search bar with a selectable engine (Google / DuckDuckGo / YouTube /
 * AniList). The box is autofocused so typing works immediately.
 */
export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [engine, setEngine] = useState(DEFAULT_ENGINE);
  const inputRef = React.useRef(null);

  useEffect(() => {
    (async () => {
      const stored = (await storageGet([ENGINE_KEY]))[ENGINE_KEY];
      setEngine(normalizeEngine(stored));
    })();
    inputRef.current?.focus();
  }, []);

  const changeEngine = async (id) => {
    setEngine(id);
    await storageSet({ [ENGINE_KEY]: id });
    inputRef.current?.focus();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) { inputRef.current?.focus(); return; }
    window.location.href = buildSearchUrl(engine, q);
  };

  return (
    <form className="search-container" onSubmit={handleSubmit}>
      <div className="search-input-wrapper">
        <span className="search-icon">🔍</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${SEARCH_ENGINES.find((e) => e.id === engine)?.label || 'the web'}...`}
          className="search-input"
          aria-label="Search the web"
        />
        <label className="engine-select">
          <span className="visually-hidden">Search engine</span>
          <select
            value={engine}
            onChange={(e) => changeEngine(e.target.value)}
            title="Search engine"
          >
            {SEARCH_ENGINES.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
        </label>
      </div>
    </form>
  );
}
