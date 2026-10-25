import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SearchBar from './SearchBar';
import QuickLinks from './QuickLinks';
import AiringCard from './AiringCard';
import { formatTime, greetingAt } from '../lib/clock.mjs';
import { storageGet, storageSet } from '../lib/platform.mjs';
import { createAnalytics } from '../lib/analytics.mjs';
import './StudioPanel.css';
import './WanoArcDashboard.css';

const CLOCK_KEY = 'clockFormat';

const themeOptions = [
  { value: 'wano', label: 'Wano' },
  { value: 'lofi', label: 'LoFi' },
  { value: 'cute', label: 'Cute' },
  { value: 'romantic', label: 'Romantic' },
  { value: 'fighting', label: 'Fighting' }
];

const WanoArcDashboard = ({
  customEnabled,
  isPinned,
  onUploadCustom,
  onRemoveCustom,
  onShuffle,
  onPin,
  themeMode,
  onThemeChange,
  analytics = createAnalytics({ get: async () => ({}), set: async () => ({}) })
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [quote, setQuote] = useState({ text: '', author: '' });
  const [hour12, setHour12] = useState(false);
  const [showStudio, setShowStudio] = useState(false);
  const [studioMetrics, setStudioMetrics] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    (async () => {
      const stored = (await storageGet([CLOCK_KEY]))[CLOCK_KEY];
      setHour12(stored === '12');
    })();
  }, []);

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

  const openStudio = async () => {
    setShowStudio((s) => !s);
    if (analytics) setStudioMetrics(await analytics.snapshot());
  };

  const theme = themeMode || 'wano';
  const greeting = greetingAt(currentTime.getHours());

  return (
    <div className="wano-dashboard" data-theme={theme}>
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
          <div className="greeting-text">
            <span className="greeting-ja">{greeting.ja}</span>
            <span className="greeting-romaji">{greeting.romaji}</span>
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
                <button
                  type="button"
                  className={`wallpaper-btn ${isPinned ? 'danger' : ''}`}
                  onClick={() => onPin && onPin(!isPinned)}
                  title={isPinned ? 'Unpin and go back to random' : 'Keep this wallpaper'}
                >
                  {isPinned ? '📌 Unpin' : '📌 Pin'}
                </button>
              </div>
              <div className="studio-row">
                <label className="studio-label" htmlFor="studio-mood">Mood</label>
                <select
                  id="studio-mood"
                  className="studio-select"
                  value={theme}
                  onChange={(e) => onThemeChange && onThemeChange(e.target.value)}
                >
                  {themeOptions.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="studio-row">
                <label className="studio-label" htmlFor="studio-clock">Clock</label>
                <select
                  id="studio-clock"
                  className="studio-select"
                  value={hour12 ? '12' : '24'}
                  onChange={(e) => setClockFormat(e.target.value)}
                >
                  <option value="24">24-hour</option>
                  <option value="12">12-hour</option>
                </select>
              </div>
              {customEnabled && onRemoveCustom && (
                <button type="button" className="wallpaper-btn danger" onClick={onRemoveCustom}>
                  Reset to wallpapers
                </button>
              )}
              {studioMetrics && (
                <div className="studio-metrics">
                  <strong>Your week (local only):</strong><br />
                  {studioMetrics.weekTotal || 0} fresh tabs ·
                  {' '}{studioMetrics.week?.affiliate_clicks || 0} merch clicks ·
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
          <AiringCard />
        </motion.div>
      </div>

      <motion.div
        className="bottom-right-dock"
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 1.1 }}
      >
        <div className="dock-row">
          <button
            type="button"
            className="wallpaper-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Upload custom wallpaper"
          >
            🖼️ Change Wallpaper
          </button>
          {customEnabled && onRemoveCustom && (
            <button
              type="button"
              className="wallpaper-btn danger"
              onClick={onRemoveCustom}
              title="Remove custom wallpaper"
            >
              ✕ Reset
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
            Support
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
