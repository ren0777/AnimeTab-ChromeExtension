// Privacy-friendly, fully local analytics counters (chrome.storage only —
// no network calls, aligns with MV3 CSP rules and Web Store policy).

const METRICS_KEY = 'animetabMetrics';
const MAX_DAYS = 30;

export const EVENT_TYPES = {
  TAB_OPEN: 'tab_open',
  AFFILIATE_CLICK: 'affiliate_click',
  MERCH_NEXT: 'merch_next',
  MERCH_TOGGLE: 'merch_toggle',
  WALLPAPER_UPLOAD: 'wallpaper_upload',
  WALLPAPER_PIN: 'wallpaper_pin',
  WALLPAPER_SHUFFLE: 'wallpaper_shuffle',
  LINK_EDIT: 'link_edit',
  FOCUS_START: 'focus_start',
  FOCUS_COMPLETE: 'focus_complete',
  INVITE_ACTION: 'invite_action',
  SETUP_IMPORT: 'setup_import',
  SHOW_PIN: 'show_pin',
  SHOW_REMOVE: 'show_remove'
};

const dayKeyOf = (date) => date.toISOString().slice(0, 10);

export function createAnalytics({ get, set }) {
  const read = async () => (await get(METRICS_KEY)) || { totals: {}, days: {} };
  const write = (m) => set(METRICS_KEY, m);

  return {
    async track(event) {
      try {
        const m = await read();
        const day = dayKeyOf(new Date());
        const totals = { ...m.totals, [event]: (m.totals?.[event] || 0) + 1 };
        const days = { ...(m.days || {}), [day]: { ...(m.days?.[day] || {}), [event]: ((m.days?.[day]?.[event]) || 0) + 1 } };
        const keys = Object.keys(days).sort();
        while (keys.length > MAX_DAYS) delete days[keys.shift()];
        await write({ totals, days });
      } catch { /* metrics must never break the UI */ }
    },
    async snapshot() {
      let m;
      try { m = await read(); } catch { m = { totals: {}, days: {} }; }
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const week = {};
      let weekTotal = 0;
      for (const [day, events] of Object.entries(m.days || {})) {
        if (new Date(`${day}T00:00:00Z`).getTime() >= cutoff) {
          for (const [name, num] of Object.entries(events)) week[name] = (week[name] || 0) + num, weekTotal += num;
        }
      }
      return { totals: m.totals || {}, week, weekTotal, days: m.days || {} };
    }
  };
}

export const METRICS_STORAGE_KEY = METRICS_KEY;
