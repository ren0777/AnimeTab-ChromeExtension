import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SearchBar from './SearchBar';
import QuickLinks from './QuickLinks';
import AiringCard from './AiringCard';
import FocusTimer from './FocusTimer';
import AmbientButton from './AmbientButton';
import InviteHub from './InviteHub';
import StyleSelect from './StyleSelect';
import { formatTime, greetingAt } from '../lib/clock.mjs';
import { storageGet, storageSet } from '../lib/platform.mjs';
import { createAnalytics, EVENT_TYPES } from '../lib/analytics.mjs';
import { streakFromMetrics, MERCH_HIDDEN_KEY } from '../lib/growth.mjs';
import { normalizeFocusMinutes, FOCUS_MINUTES_KEY, FOCUS_MINUTE_OPTIONS } from '../lib/focus.mjs';
import { WALLPAPER_CATEGORIES } from '../hooks/useNekosWallpaper';
import { WALLPAPER_SOURCES } from '../lib/wallpaperSources.mjs';
import './StudioPanel.css';
import './HabitDock.css';
import './Rewards.css';
import './WanoArcDashboard.css';

const CLOCK_KEY = 'clockFormat';

const themeOptions = [
  { value: 'wano', label: 'Wano' },
  { value: 'lofi', label: 'LoFi' },
  { value: 'cute', label: 'Cute' },
  { value: 'romantic', label: 'Romantic' },
  { value: 'fighting', label: 'Fighting' }
];

const CATEGORY_LABELS = {
  any: 'Any type',
  waifu: 'Waifu',
  neko: 'Neko',
  kitsune: 'Kitsune',
  husbando: 'Husbando'
};

const WanoArcDashboard = ({
  customEnabled,
  isPinned,
  onUploadCustom,
  onRemoveCustom,
  onShuffle,
  onPin,
  onSaveWallpaper,
  wallpaperCategory,
  onCategoryChange,
  wallpaperSource,
  onSourceChange,
  themeMode,
  onThemeChange,
  rewards = [],
  analytics = createAnalytics({ get: async () => ({}), set: async () => ({}) })
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [quote, setQuote] = useState({ text: '', author: '' });
  const [hour12, setHour12] = useState(false);
  const [showStudio, setShowStudio] = useState(false);
  const [studioMetrics, setStudioMetrics] = useState(null);
  const [streak, setStreak] = useState(0);
  const [merchVisible, setMerchVisible] = useState(true);
  const [focusMinutes, setFocusMinutes] = useState(25);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    (async () => {
      const stored = (await storageGet([CLOCK_KEY]))[CLOCK_KEY];
      setHour12(stored === '12');
      const metrics = await analytics.snapshot();
      setStreak(streakFromMetrics(metrics.days || {}));
      const merchAndFocus = await storageGet([MERCH_HIDDEN_KEY, FOCUS_MINUTES_KEY]);
      setMerchVisible(!merchAndFocus[MERCH_HIDDEN_KEY]);
      setFocusMinutes(normalizeFocusMinutes(merchAndFocus[FOCUS_MINUTES_KEY]));
    })();
  }, [analytics]);

  // Setup import can change the clock format from anywhere in the app.
  useEffect(() => {
    const handler = (e) => {
      const value = e.detail === '12' ? '12' : '24';
      setHour12(value === '12');
      storageSet({ [CLOCK_KEY]: value });
    };
    window.addEventListener('animetab:clock-format', handler);
    return () => window.removeEventListener('animetab:clock-format', handler);
  }, []);

  // ...and the mood/theme.
  useEffect(() => {
    if (!onThemeChange) return undefined;
    const handler = (e) => onThemeChange(e.detail, { userAction: true });
    window.addEventListener('animetab:theme', handler);
    return () => window.removeEventListener('animetab:theme', handler);
  }, [onThemeChange]);

  useEffect(() => {
    const loadQuote = async () => {
      try {
        const quotesUrl = typeof chrome !== 'undefined' && chrome.runtime?.getURL
          ? chrome.runtime.getURL('quotes.json')
          : 'quotes.json';
        const response = await fetch(quotesUrl, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const quotes = await response.json();
        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
        setQuote(quotes[dayOfYear % quotes.length]);
      } catch {
        setQuote({
          text: "If you don't take risks, you can't create a future.",
          author: 'Monkey D. Luffy'
        });
      }
    };
    loadQuote();
  }, []);

  const setClockFormat = async (value) => {
    const use12 = value === '12';
    setHour12(use12);
    await storageSet({ [CLOCK_KEY]: value });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file && onUploadCustom) onUploadCustom(file);
  };

  const toggleMerch = async (visible) => {
    setMerchVisible(visible);
    await storageSet({ [MERCH_HIDDEN_KEY]: visible ? '' : '1' });
    window.dispatchEvent(new CustomEvent('animetab:merch-visibility', { detail: visible }));
    if (analytics) await analytics.track(EVENT_TYPES.MERCH_TOGGLE);
  };

  const openStudio = async () => {
    setShowStudio((s) => !s);
    if (analytics) setStudioMetrics(await analytics.snapshot());
  };

  const theme = themeMode || 'wano';
  const greeting = greetingAt(currentTime.getHours());

  return (
    <div className="wano-dashboard" data-theme={theme} data-growth={rewards.join(' ')}>
      {theme === 'wano' && (
        <motion.div
          className="wano-bg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        >
          <div className="gradient-orb orb-1" />
          <div className="gradient-orb orb-2" />
          <div className="gradient-orb orb-3" />
          <div className="sakura-petal" style={{ left: '10%', animationDelay: '0s' }} />
          <div className="sakura-petal" style={{ left: '30%', animationDelay: '2s' }} />
          <div className="sakura-petal" style={{ left: '50%', animationDelay: '4s' }} />
          <div className="sakura-petal" style={{ left: '70%', animationDelay: '1s' }} />
          <div className="sakura-petal" style={{ left: '90%', animationDelay: '3s' }} />
        </motion.div>
      )}

      <div className="wano-container">
        <motion.header
          className="wano-header"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="greeting-row">
            <div className="greeting-text">
              <span className="greeting-ja">{greeting.ja}</span>
              <span className="greeting-romaji">{greeting.romaji}</span>
            </div>
            {streak > 0 && (
              <span className="streak-pill" title="Days in a row with AnimeTab open">
                🔥 {streak} day{streak === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </motion.header>

        <motion.div
          className="clock-container"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, delay: 0.4, type: 'spring', stiffness: 100 }}
        >
          <div className="clock-text">{formatTime(currentTime, { hour12 })}</div>
          <div className="clock-date">
            {currentTime.toLocaleDateString('en-US', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}
          </div>
        </motion.div>

        <motion.div
          className="search-slot"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <SearchBar />
        </motion.div>

        {/* Wallpaper Studio */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
        <button
          aria-label="Open Wallpaper Studio"
          aria-expanded={showStudio}
          className="corner-studio-btn"
          onClick={openStudio}
        >
          🖼 Wallpaper
        </button>

        {showStudio && (
          <div role="dialog" aria-label="Wallpaper studio" className="corner-studio-panel">
            <div className="studio-head">
              <strong>Wallpaper Studio</strong>
              <button aria-label="Close studio" onClick={() => setShowStudio(false)}>✕</button>
            </div>
            <div className="studio-grid">
              <button type="button" className="wallpaper-btn" onClick={() => fileInputRef.current?.click()}>
                Choose Wallpaper…
              </button>
              <div className="studio-pair">
                <button type="button" className="wallpaper-btn" onClick={onShuffle} title="Fetch a new random wallpaper">
                  🎲 Shuffle
                </button>
                {!customEnabled && (
                  <button
                    type="button"
                    className={`wallpaper-btn ${isPinned ? 'danger' : ''}`}
                    onClick={() => onPin && onPin(!isPinned)}
                    title={isPinned ? 'Unpin and go back to random' : 'Keep this wallpaper'}
                  >
                    {isPinned ? '📌 Unpin' : '📌 Pin'}
                  </button>
                )}
              </div>
              <button type="button" className="wallpaper-btn" onClick={onSaveWallpaper} title="Save the current wallpaper file to disk">
                💾 Save image…
              </button>
              <div className="studio-row">
                <label className="studio-label">Source</label>
                <StyleSelect
                  ariaLabel="Wallpaper source"
                  title="Where wallpapers come from"
                  value={wallpaperSource || 'nekos'}
                  onChange={(v) => onSourceChange && onSourceChange(v)}
                  options={WALLPAPER_SOURCES.map((s) => ({ value: s.id, label: s.label }))}
                />
              </div>
              {(wallpaperSource || 'nekos') === 'nekos' && (
                <div className="studio-row">
                  <label className="studio-label">Type</label>
                  <StyleSelect
                    ariaLabel="Portrait type"
                    title="Portrait category from nekos.best"
                    value={wallpaperCategory || 'any'}
                    onChange={(v) => onCategoryChange && onCategoryChange(v)}
                    options={WALLPAPER_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] || c }))}
                  />
                </div>
              )}
              <div className="studio-row">
                <label className="studio-label">Mood</label>
                <StyleSelect
                  ariaLabel="Mood theme"
                  value={theme}
                  onChange={(v) => onThemeChange && onThemeChange(v, { userAction: true })}
                  options={themeOptions.map((t) => ({ value: t.value, label: t.label }))}
                />
              </div>
              <div className="studio-row">
                <label className="studio-label">Clock</label>
                <StyleSelect
                  ariaLabel="Clock format"
                  value={hour12 ? '12' : '24'}
                  onChange={(v) => setClockFormat(v)}
                  options={[{ value: '24', label: '24-hour' }, { value: '12', label: '12-hour' }]}
                />
              </div>
              <div className="studio-row">
                <label className="studio-label">Focus</label>
                <StyleSelect
                  ariaLabel="Focus session length"
                  title="Focus timer length"
                  value={String(focusMinutes)}
                  onChange={async (v) => {
                    setFocusMinutes(normalizeFocusMinutes(v));
                    await storageSet({ [FOCUS_MINUTES_KEY]: normalizeFocusMinutes(v) });
                  }}
                  options={FOCUS_MINUTE_OPTIONS.map((m) => ({ value: String(m), label: `${m} minutes` }))}
                />
              </div>
              <label className="studio-row studio-check" htmlFor="studio-merch">
                <input
                  id="studio-merch"
                  type="checkbox"
                  checked={merchVisible}
                  onChange={(e) => toggleMerch(e.target.checked)}
                />
                Show merch card
              </label>
              {customEnabled && onRemoveCustom && (
                <button type="button" className="wallpaper-btn danger" onClick={onRemoveCustom}>
                  Reset to wallpapers
                </button>
              )}
              {studioMetrics && (
                <div className="studio-metrics">
                  <strong>Your week (local only):</strong><br />
                  {studioMetrics.weekTotal || 0} fresh tabs ·
                  {' '}{studioMetrics.week?.affiliate_click || 0} merch clicks ·
                  {' '}{studioMetrics.week?.wallpaper_upload || 0} uploads
                </div>
              )}
            </div>
          </div>
        )}

        <QuickLinks analytics={analytics} />

        <motion.section
          className="quote-section"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 1 }}
        >
          <div className="glass-quote-card">
            <div className="quote-header">
              <span className="quote-icon">✧</span>
              <h3 className="quote-title">Word of the Day</h3>
            </div>
            <AnimatePresence mode="wait">
              <motion.blockquote
                key={quote.text}
                className="quote-content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5 }}
              >
                <p className="quote-text">"{quote.text}"</p>
                <footer className="quote-author">— {quote.author}</footer>
              </motion.blockquote>
            </AnimatePresence>
          </div>
        </motion.section>

        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.15 }}
        >
          <AiringCard analytics={analytics} />
        </motion.div>
      </div>

      <motion.div
        className="bottom-right-dock"
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 1.1 }}
      >
        <div className="dock-row">
          <FocusTimer analytics={analytics} />
          <AmbientButton />
          <InviteHub analytics={analytics} />
          {customEnabled && onRemoveCustom && (
            <button
              type="button"
              className="wallpaper-btn danger"
              onClick={onRemoveCustom}
              title="Reset custom wallpaper"
            >
              ✕
            </button>
          )}
          <a
            className="support-btn"
            href="https://ko-fi.com/animeditsnarts"
            target="_blank"
            rel="noopener noreferrer"
            title="Support the developer"
            style={{ marginLeft: 8 }}
          >
            <span className="icon">☕</span>
          </a>
        </div>
      </motion.div>

      {theme === 'wano' && (
        <>
          <div className="kanji-watermark w1">和</div>
          <div className="kanji-watermark w2">野</div>
          <div className="kanji-watermark w3">名</div>
        </>
      )}
    </div>
  );
};

export default WanoArcDashboard;
