import React, { useEffect, useState } from 'react';
import {
  DEFAULT_LINKS, LINKS_STORAGE_KEY, normalizeLinkList, moveLink, prepareUrl
} from '../lib/links.mjs';
import { storageGet, storageSet } from '../lib/platform.mjs';
import { createAnalytics, EVENT_TYPES } from '../lib/analytics.mjs';
import './QuickLinks.css';

/**
 * User-editable quick links with favicon tiles. Edits persist in
 * chrome.storage.local and can be reordered/added/removed.
 */
export default function QuickLinks({ analytics = createAnalytics({ get: async () => ({}), set: async () => ({}) }) }) {
  const [links, setLinks] = useState(null);
  const [editing, setEditing] = useState(false);
  const [favicons, setFavicons] = useState({});
  const [draft, setDraft] = useState({ name: '', url: '' });
  const [editId, setEditId] = useState(null); // tile id currently being renamed/re-linked
  const [editDraft, setEditDraft] = useState({ name: '', url: '' });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const stored = (await storageGet([LINKS_STORAGE_KEY]))[LINKS_STORAGE_KEY];
      if (cancelled) return;
      setLinks(normalizeLinkList(stored) || normalizeLinkList(DEFAULT_LINKS));
      // Best-effort favicons, non-blocking.
      const source = normalizeLinkList(stored) || DEFAULT_LINKS;
      const map = {};
      for (const l of source) {
        try { map[l.name] = `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(new URL(l.url).hostname)}`; } catch { /* skip */ }
      }
      setFavicons(map);
    };
    load();
    // Setup import (Invite Hub) rewrites this key and notifies us.
    window.addEventListener('animetab:links-changed', load);
    return () => {
      cancelled = true;
      window.removeEventListener('animetab:links-changed', load);
    };
  }, []);

  const persist = async (next) => {
    setLinks(next);
    await storageSet({ [LINKS_STORAGE_KEY]: next });
    if (analytics) await analytics.track(EVENT_TYPES.LINK_EDIT);
  };

  const addLink = async (e) => {
    e.preventDefault();
    const name = draft.name.trim();
    const url = prepareUrl(draft.url);
    if (!url) return;
    const next = [...links, { name: name || url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0], url, icon: '🌐', gradient: 'linear-gradient(135deg,#ff6b8a,#3f51b5)' }]
      .map((item, i) => ({ ...item, id: i + 1 }));
    setDraft({ name: '', url: '' });
    await persist(next);
  };

  const startEdit = (link) => {
    setEditId(link.id);
    setEditDraft({ name: link.name, url: link.url });
  };

  const saveEdit = async (id) => {
    const url = prepareUrl(editDraft.url);
    if (!url) return; // invalid edit → keep previous value
    const name = editDraft.name.trim() || url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
    const next = links.map((l) => (l.id === id ? { ...l, name, url } : l));
    setEditId(null);
    setEditDraft({ name: '', url: '' });
    await persist(next);
  };

  if (!links) return null;

  return (
    <section className="quick-links-section" aria-label="Quick links">
      <div className="section-title-row">
        <h2 className="section-title">Quick Links</h2>
        <button
          type="button"
          className={`links-edit-btn ${editing ? 'active' : ''}`}
          onClick={() => setEditing((e) => { if (e) setEditId(null); return !e; })}
          aria-pressed={editing}
        >
          {editing ? 'Done' : 'Edit'}
        </button>
      </div>
      <div className="quick-links-grid">
        {links.map((link) => (
          <div key={link.id} className="quick-link-cell">
            {editing && editId === link.id ? (
              <form
                className="link-edit-form"
                onSubmit={(e) => { e.preventDefault(); saveEdit(link.id); }}
              >
                <input
                  type="text"
                  placeholder="Name"
                  value={editDraft.name}
                  onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                  maxLength={24}
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="example.com"
                  value={editDraft.url}
                  onChange={(e) => setEditDraft((d) => ({ ...d, url: e.target.value }))}
                  inputMode="url"
                />
                <div className="link-edit-actions">
                  <button type="submit" title="Save">✓</button>
                  <button type="button" title="Cancel" onClick={() => setEditId(null)}>✕</button>
                </div>
              </form>
            ) : (
              <>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="quick-link-card"
                  style={{ background: link.gradient }}
                  onClick={() => { /* navigation is natural */ }}
                >
                  {favicons[link.name]
                    ? <img className="link-favicon" src={favicons[link.name]} alt="" width="22" height="22" loading="lazy" />
                    : <div className="link-icon">{link.icon}</div>}
                  <div className="link-name">{link.name}</div>
                </a>
                {editing && (
                  <div className="link-controls">
                    <button type="button" className="primary" title="Edit link" onClick={() => startEdit(link)}>✎</button>
                    <button type="button" title="Move up" onClick={() => persist(moveLink(links, link.id, 'up'))}>↑</button>
                    <button type="button" title="Move down" onClick={() => persist(moveLink(links, link.id, 'down'))}>↓</button>
                    <button type="button" className="danger" title="Remove" onClick={() => persist(links.filter((l) => l.id !== link.id).map((l, i) => ({ ...l, id: i + 1 })))}>✕</button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
      {editing && (
        <form className="link-add-row" onSubmit={addLink}>
          <input
            type="text"
            placeholder="Name (optional)"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            maxLength={24}
          />
          <input
            type="text"
            placeholder="example.com"
            value={draft.url}
            onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
            inputMode="url"
            required
          />
          <button type="submit">Add</button>
        </form>
      )}
    </section>
  );
}
