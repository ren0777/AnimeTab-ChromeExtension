// Theme model shared by the hook, dashboard and tests.
export const THEMES = ['wano', 'lofi', 'cute', 'romantic', 'fighting'];
export const DEFAULT_THEME = 'wano';

/**
 * Normalize a stored/computed theme value.
 * The mood detector used to report 'kawaii'/'aesthetic' which silently fell
 * back to 'wano'; both now map onto real themes so detection works.
 */
export function normalizeTheme(value) {
  if (!value) return DEFAULT_THEME;
  if (THEMES.includes(value)) return value;
  if (value === 'kawaii') return 'cute';
  if (value === 'aesthetic') return 'lofi';
  return DEFAULT_THEME;
}
