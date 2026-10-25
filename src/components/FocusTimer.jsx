import React, { useEffect, useRef, useState } from 'react';
import {
  FOCUS_KEY, FOCUS_COMPLETE_KEY, STALE_COMPLETION_MS,
  startSession, normalizeSession, remainingMs, formatFocusRemaining
} from '../lib/focus.mjs';
import { createAmbientEngine } from '../lib/ambient.mjs';
import { EVENT_TYPES } from '../lib/analytics.mjs';
import { storageGet, storageSet } from '../lib/platform.mjs';
import { createAnalytics } from '../lib/analytics.mjs';
import './HabitDock.css';

/**
 * 25-minute focus timer shared across tabs: the end timestamp lives in
 * chrome.storage, so every new tab shows the same countdown and whichever
 * tab is open at completion plays the chime.
 */
export default function FocusTimer({ analytics = createAnalytics({ get: async () => ({}), set: async () => ({}) }) }) {
  const [session, setSession] = useState(null);
  const [remaining, setRemaining] = useState(null);
  const [toast, setToast] = useState(false);
  const engineRef = useRef(null);
  const sessionRef = useRef(null);
  sessionRef.current = session;

  useEffect(() => {
    (async () => {
      // Surface (then clear) a completion that happened while no tab was open.
      const stored = (await storageGet([FOCUS_KEY, FOCUS_COMPLETE_KEY]));
      const fresh = normalizeSession(stored[FOCUS_KEY]);
      setSession(fresh);
      if (stored[FOCUS_COMPLETE_KEY]) {
        if (Date.now() - stored[FOCUS_COMPLETE_KEY] <= STALE_COMPLETION_MS) {
          setToast(true);
          setTimeout(() => setToast(false), 6000);
        }
        await storageSet({ [FOCUS_COMPLETE_KEY]: null });
      }
    })();
  }, []);

  useEffect(() => {
    if (!session) return undefined;
    const tick = () => {
      const left = remainingMs(session.endAt);
      if (left <= 0) {
        setSession(null);
        setRemaining(null);
        (async () => {
          await storageSet({ [FOCUS_KEY]: null, [FOCUS_COMPLETE_KEY]: Date.now() });
          setToast(true);
          setTimeout(() => setToast(false), 8000);
          engineRef.current ||= createAmbientEngine();
          engineRef.current.chime();
          if (analytics) await analytics.track(EVENT_TYPES.FOCUS_COMPLETE);
        })();
        return;
      }
      setRemaining(left);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session, analytics]);

  const start = async () => {
    const next = startSession(Date.now(), 25);
    setSession(next);
    await storageSet({ [FOCUS_KEY]: next });
    if (analytics) await analytics.track(EVENT_TYPES.FOCUS_START);
  };

  const cancel = async () => {
    setSession(null);
    setRemaining(null);
    await storageSet({ [FOCUS_KEY]: null });
  };

  if (session && remaining !== null) {
    return (
      <button
        type="button"
        className="focus-pill active"
        onClick={cancel}
        title="Focus timer — click to cancel"
      >
        ⏳ {formatFocusRemaining(remaining)}
      </button>
    );
  }

  return (
    <>
      <button type="button" className="focus-pill" onClick={start} title="Start a 25-minute focus session">
        ⏱ Focus 25
      </button>
      {toast && <div className="focus-toast">⚡ Focus session complete — nice work!</div>}
    </>
  );
}
