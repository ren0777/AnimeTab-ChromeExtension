// Growth model: invite actions, cosmetic rewards, daily streaks, setup codes.
// Everything here is local: invite actions are just counters the user earns
// cosmetic unlocks with — nothing is transmitted anywhere.

// Chrome Web Store item ID: ankkpnnnciabjkpkjonnaffmdifkeank (pending review).
export const STORE_URL =
  'https://chromewebstore.google.com/detail/animetab/ankkpnnnciabjkpkjonnaffmdifkeank';

export const GROWTH_KEY = 'growthState'; // { inviteCount: n }
export const MERCH_HIDDEN_KEY = 'merchHidden';

// Preference keys used by Share My Setup export/import.
export const PREF_KEYS = {
  theme: 'animeThemeMode',
  engine: 'searchEngine',
  clock: 'clockFormat'
};

export const REWARDS = [
  { id: 'neonRain', label: 'Neon rain overlay', threshold: 3 },
  { id: 'nightDrive', label: 'Night-drive quote mode', threshold: 5 },
  { id: 'hologram', label: 'Hologram clock skin', threshold: 10 }
];

export function unlockedRewards(inviteCount = 0) {
  return REWARDS.filter((r) => inviteCount >= r.threshold).map((r) => r.id);
}

export function nextRewardAt(inviteCount = 0) {
  const next = REWARDS.find((r) => inviteCount < r.threshold);
  return next ? next.threshold : null;
}

/** Daily opening streak from the local metrics day buckets (UTC day keys). */
export function streakFromMetrics(days = {}, today = new Date()) {
  const toISO = (d) => d.toISOString().slice(0, 10);
  const hasOpens = (d) => (days[d]?.tab_open || 0) > 0;

  let cursor = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if (!hasOpens(toISO(cursor))) {
    cursor = new Date(cursor.getTime() - 86400000);
    if (!hasOpens(toISO(cursor))) return 0;
  }
  let streak = 0;
  while (hasOpens(toISO(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - 86400000);
  }
  return streak;
}

export const SHARE_MESSAGE = 'My new tab is a whole anime dashboard now — wallpapers, quotes, airing countdowns. AnimeTab for Chrome:';

export const INVITE_CHANNELS = [
  { id: 'copy', label: 'Copy link', icon: '📋' },
  { id: 'x', label: 'X', icon: '🐦' },
  { id: 'telegram', label: 'Telegram', icon: '✈️' },
  { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { id: 'reddit', label: 'Reddit', icon: '👽' },
  { id: 'discord', label: 'Discord', icon: '🎮' }
];

export function shareUrlFor(channel, url = STORE_URL) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(SHARE_MESSAGE);
  switch (channel) {
    case 'x': return `https://twitter.com/intent/tweet?text=${t}%20${u}`;
    case 'telegram': return `https://t.me/share/url?url=${u}&text=${t}`;
    case 'whatsapp': return `https://wa.me/?text=${t}%20${u}`;
    case 'reddit': return `https://www.reddit.com/submit?url=${u}&title=${t}`;
    case 'discord': return 'https://discord.com/channels/@me'; // opens DMs, user pastes
    default: return url;
  }
}

// --- Share my setup (unicode-safe base64 codec) ---------------------------

const bytesToB64 = (bytes) => {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
};

const b64ToBytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

export const SETUP_CODE_VERSION = 1;

export function encodeSetup(setup = {}) {
  const payload = {
    v: SETUP_CODE_VERSION,
    links: Array.isArray(setup.links) ? setup.links : [],
    prefs: {
      themeMode: setup.themeMode || undefined,
      searchEngine: setup.searchEngine || undefined,
      clockFormat: setup.clockFormat || undefined
    }
  };
  return `ATB${SETUP_CODE_VERSION}.${bytesToB64(new TextEncoder().encode(JSON.stringify(payload)))}`;
}

export function decodeSetup(code) {
  try {
    const m = /^ATB(\d+)\.([A-Za-z0-9+/=]+)$/.exec(String(code || '').trim());
    if (!m || Number(m[1]) !== SETUP_CODE_VERSION) return null;
    const data = JSON.parse(new TextDecoder().decode(b64ToBytes(m[2])));
    if (!Array.isArray(data.links)) return null;
    return { links: data.links, prefs: data.prefs || {} };
  } catch {
    return null;
  }
}

export const SETUP_STORAGE_KEY = 'setupCode';