// Focus (Pomodoro) session model. The session end is persisted in
// chrome.storage so every new tab shows the same remaining time and the exact
// moment of completion is handled by whichever tab is open.

export const FOCUS_KEY = 'focusSession'; // { endAt, startedAt, minutes } | null
export const FOCUS_COMPLETE_KEY = 'focusCompleteAt'; // ms timestamp
export const FOCUS_MINUTES_KEY = 'focusMinutes';
export const FOCUS_MINUTES_EVENT = 'animetab:focus-minutes'; // detail: number
export const FOCUS_MINUTE_OPTIONS = [15, 25, 45, 60];
export const DEFAULT_MINUTES = 25;
export const STALE_COMPLETION_MS = 5 * 60 * 1000;

export function normalizeFocusMinutes(value) {
  return FOCUS_MINUTE_OPTIONS.includes(Number(value)) ? Number(value) : DEFAULT_MINUTES;
}

export function normalizeSession(raw, now = Date.now()) {
  if (!raw || typeof raw !== 'object') return null;
  const { endAt, startedAt, minutes = DEFAULT_MINUTES } = raw;
  if (typeof endAt !== 'number' || endAt <= now) return null;
  return {
    endAt,
    minutes,
    startedAt: Number.isFinite(startedAt) ? startedAt : endAt - minutes * 60 * 1000
  };
}

export function startSession(now = Date.now(), minutes = DEFAULT_MINUTES) {
  return { endAt: now + minutes * 60 * 1000, startedAt: now, minutes };
}

export function remainingMs(endAt, now = Date.now()) {
  return Math.max(0, endAt - now);
}

export function formatFocusRemaining(ms) {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
