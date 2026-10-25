import React, { useEffect, useState } from 'react';
import {
  GROWTH_KEY, INVITE_CHANNELS, REWARDS, unlockedRewards, nextRewardAt,
  shareUrlFor, encodeSetup, decodeSetup, PREF_KEYS
} from '../lib/growth.mjs';
import { EVENT_TYPES } from '../lib/analytics.mjs';
import { LINKS_STORAGE_KEY, normalizeLinkList } from '../lib/links.mjs';
import { storageGet, storageSet } from '../lib/platform.mjs';
import { createAnalytics } from '../lib/analytics.mjs';
import './InviteHub.css';

const LINKS_EVENT = 'animetab:links-changed';
const CLOCK_EVENT = 'animetab:clock-format';

/**
 * Invite hub: one-tap sharing (all local), cosmetic reward unlocks at
 * 3/5/10 invite actions, and "Share my setup" export/import codes.
 * Nothing is ever transmitted by the extension itself.
 */
export default function InviteHub({ analytics = createAnalytics({ get: async () => ({}), set: async () => ({}) }) }) {
  const [open, setOpen] = useState(false);
  const [inviteCount, setInviteCount] = useState(0);
  const [setupCode, setSetupCode] = useState('');
  const [importText, setImportText] = useState('');
  const [applyMsg, setApplyMsg] = useState('');

  useEffect(() => {
    if (!open) return;
    (async () => {
      const stored = (await storageGet([GROWTH_KEY]))[GROWTH_KEY];
      setInviteCount(stored?.inviteCount || 0);
    })();
  }, [open]);

  if (!open) {
    return (
      <button
        type="button"
        className="invite-btn"
        onClick={() => setOpen(true)}
        title="Invite friends — unlock cosmetic rewards"
      >
        <span className="icon">🎁</span> Invite
      </button>
    );
  }

  const share = async (channel) => {
    const url = shareUrlFor(channel);
    if (channel === 'copy') {
      try { await navigator.clipboard.writeText(url); } catch { /* clipboard may be blocked */ }
    }
    const next = inviteCount + 1;
    setInviteCount(next);
    await storageSet({ [GROWTH_KEY]: { inviteCount: next } });
    if (analytics) await analytics.track(EVENT_TYPES.INVITE_ACTION);
  };

  const doExport = async () => {
    const stored = await storageGet([LINKS_STORAGE_KEY, PREF_KEYS.theme, PREF_KEYS.engine, PREF_KEYS.clock]);
    const code = encodeSetup({
      links: normalizeLinkList(stored[LINKS_STORAGE_KEY]) || [],
      themeMode: stored[PREF_KEYS.theme],
      searchEngine: stored[PREF_KEYS.engine],
      clockFormat: stored[PREF_KEYS.clock]
    });
    setSetupCode(code);
    setImportText('');
    setApplyMsg('');
    try { await navigator.clipboard.writeText(code); } catch { /* ignore */ }
  };

  const doImport = async () => {
    const decoded = decodeSetup(importText);
    if (!decoded) { setApplyMsg('Invalid setup code'); return; }

    const writes = {};
    if (decoded.links.length) writes[LINKS_STORAGE_KEY] = normalizeLinkList(decoded.links);
    const prefs = decoded.prefs || {};
    if (prefs.themeMode) writes[PREF_KEYS.theme] = prefs.themeMode;
    if (prefs.searchEngine) writes[PREF_KEYS.engine] = prefs.searchEngine;
    if (prefs.clockFormat) writes[PREF_KEYS.clock] = prefs.clockFormat;
    await storageSet(writes);

    if (decoded.links.length) window.dispatchEvent(new CustomEvent(LINKS_EVENT));
    if (prefs.clockFormat) window.dispatchEvent(new CustomEvent(CLOCK_EVENT, { detail: prefs.clockFormat }));
    if (analytics) await analytics.track(EVENT_TYPES.SETUP_IMPORT);
    setApplyMsg('Setup applied ✨');
  };

  const unlocked = unlockedRewards(inviteCount);
  const nextAt = nextRewardAt(inviteCount);

  return (
    <div className="invite-backdrop" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
      <div className="invite-modal" role="dialog" aria-label="Invite friends">
        <div className="invite-head">
          <strong>Invite Friends</strong>
          <button aria-label="Close invite hub" onClick={() => setOpen(false)}>✕</button>
        </div>

        <p className="invite-copy">
          Share AnimeTab with one tap. Every invite action counts toward cosmetic rewards
          (stored locally, nothing is transmitted).
        </p>

        <div className="share-grid">
          {INVITE_CHANNELS.map((ch) => (
            <a
              key={ch.id}
              className="invite-btn"
              href={shareUrlFor(ch.id)}
              target="_blank"
              rel="noopener noreferrer"
              title={ch.label}
              onClick={() => share(ch.id)}
            >
              <span className="icon">{ch.icon}</span> {ch.label}
            </a>
          ))}
        </div>

        <div className="rewards-block">
          <h4>Rewards <span className="invite-count">· {inviteCount} action{inviteCount === 1 ? '' : 's'}</span></h4>
          <ul className="rewards-list">
            {REWARDS.map((r) => {
              const isUnlocked = unlocked.includes(r.id);
              return (
                <li key={r.id} className={isUnlocked ? 'unlocked' : 'locked'}>
                  <span className="reward-state">{isUnlocked ? '✓' : `${r.threshold} invites`}</span>
                  {r.label}
                </li>
              );
            })}
          </ul>
          {nextAt && (
            <p className="next-hint">{nextAt - inviteCount} more to unlock the next reward</p>
          )}
        </div>

        <div className="setup-block">
          <h4>Share my setup</h4>
          <div className="setup-actions">
            <button type="button" className="setup-btn" onClick={doExport}>Export setup code</button>
          </div>
          {setupCode && <textarea readOnly value={setupCode} rows={2} spellCheck={false} onFocus={(e) => e.target.select()} />}
          <textarea
            placeholder="Paste a friend's setup code here…"
            value={importText}
            onChange={(e) => { setImportText(e.target.value); setApplyMsg(''); }}
            rows={2}
            spellCheck={false}
          />
          <div className="setup-actions">
            <button type="button" className="setup-btn" onClick={doImport} disabled={!importText.trim()}>
              Apply setup
            </button>
            {applyMsg && <span className="apply-msg">{applyMsg}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
