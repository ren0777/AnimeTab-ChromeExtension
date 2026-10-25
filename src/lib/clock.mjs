// Pure clock helpers so both the dashboard and tests share one implementation.

export function formatTime(date, { hour12 = false } = {}) {
  const mm = String(date.getMinutes()).padStart(2, '0');
  if (hour12) {
    const h = date.getHours() % 12;
    const hourNum = h === 0 ? 12 : h;
    const ampm = date.getHours() < 12 ? 'AM' : 'PM';
    return `${hourNum}:${mm} ${ampm}`;
  }
  const hh = String(date.getHours()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function greetingAt(hour) {
  if (hour < 12) return { ja: 'おはよう', romaji: 'Ohayou' };
  if (hour < 17) return { ja: 'こんにちは', romaji: 'Konnichiwa' };
  if (hour < 21) return { ja: 'こんばんは', romaji: 'Konbanwa' };
  return { ja: 'おやすみ', romaji: 'Oyasumi' };
}
