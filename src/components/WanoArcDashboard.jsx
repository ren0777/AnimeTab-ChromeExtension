import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './WanoArcDashboard.css';

const WanoArcDashboard = ({
  onSearch,
  customEnabled,
  onUploadCustom,
  onRemoveCustom,
  wallpaperUrl,
  themeMode,
  onThemeChange
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [quote, setQuote] = useState({ text: '', author: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef(null);
  const [showStudio, setShowStudio] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
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
          text: 'If you don\'t take risks, you can\'t create a future.',
          author: 'Monkey D. Luffy'
        });
      }
    };
    loadQuote();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      if (onSearch) onSearch(searchQuery);
      else window.location.href = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file && onUploadCustom) {
      const lowerName = (file.name || '').toLowerCase();
      if (onThemeChange) {
        if (lowerName.includes('lofi')) onThemeChange('lofi');
        else if (lowerName.includes('cute')) onThemeChange('cute');
        else if (lowerName.includes('romance') || lowerName.includes('romantic')) onThemeChange('romantic');
        else if (lowerName.includes('fight') || lowerName.includes('battle')) onThemeChange('fighting');
      }
      onUploadCustom(file);
    }
  };

  const themeOptions = [
    { value: 'wano', label: 'Wano' },
    { value: 'lofi', label: 'LoFi' },
    { value: 'cute', label: 'Cute' },
    { value: 'romantic', label: 'Romantic' },
    { value: 'fighting', label: 'Fighting' }
  ];

  const quickLinks = [
    { id: 1, name: 'Crunchyroll', url: 'https://crunchyroll.com', icon: '📺', color: 'from-orange-500 to-red-500' },
    { id: 2, name: 'Netflix', url: 'https://netflix.com', icon: '🎬', color: 'from-red-600 to-red-800' },
    { id: 3, name: 'MyAnimeList', url: 'https://myanimelist.net', icon: '📋', color: 'from-blue-500 to-indigo-600' },
    { id: 4, name: 'AniList', url: 'https://anilist.co', icon: '📊', color: 'from-blue-400 to-cyan-500' },
    { id: 5, name: 'YouTube', url: 'https://youtube.com', icon: '▶️', color: 'from-red-500 to-pink-600' },
    { id: 6, name: 'Twitter', url: 'https://x.com', icon: '🐦', color: 'from-sky-400 to-blue-500' },
    { id: 7, name: 'Reddit', url: 'https://reddit.com/r/anime', icon: '🔗', color: 'from-orange-600 to-amber-600' },
    { id: 8, name: 'Discord', url: 'https://discord.com', icon: '💬', color: 'from-indigo-500 to-purple-600' },
  ];

  const formatTime = (date) => date.toLocaleTimeString('en-GB', { hour12: false });

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return { ja: 'おはよう', romaji: 'Ohayou' };
    if (hour < 17) return { ja: 'こんにちは', romaji: 'Konnichiwa' };
    if (hour < 21) return { ja: 'こんばんは', romaji: 'Konbanwa' };
    return { ja: 'おやすみ', romaji: 'Oyasumi' };
  };

  const greeting = getGreeting();

  const openWallpaperPicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="wano-dashboard" data-theme={themeMode || 'wano'}>
      { (themeMode || 'wano') === 'wano' && (
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
      ) }

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
          <div className="clock-text">{formatTime(currentTime)}</div>
          <div className="clock-date">
            {currentTime.toLocaleDateString('en-US', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}
          </div>
        </motion.div>

        <motion.form
          className="search-container"
          onSubmit={handleSearch}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search the web..."
              className="search-input"
              aria-label="Search query"
            />
          </div>
        </motion.form>

        {/* Compact corner studio: hidden by default, minimal overlay when opened */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
        <div>
          <button
            aria-label="Open Wallpaper Studio"
            className="corner-studio-btn"
            onClick={() => setShowStudio((s) => !s)}
            style={{
              position: 'fixed', top: 16, right: 16, zIndex: 800, borderRadius: 8,
              padding: '8px 12px', background: 'linear-gradient(90deg,#ff8a65,#ff6b8a)', color: '#fff', border: 'none', boxShadow: '0 6px 20px rgba(0,0,0,0.4)'
            }}
          >
            🖼 Wallpaper
          </button>

          {showStudio && (
            <div
              role="dialog"
              aria-label="Wallpaper studio"
              className="corner-studio-panel"
              style={{
                position: 'fixed', top: 64, right: 16, zIndex: 801, width: 320, padding: 12,
                background: 'rgba(12,12,18,0.9)', borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <strong style={{ color: '#fff' }}>Wallpaper Studio</strong>
                <button aria-label="Close studio" onClick={() => setShowStudio(false)} style={{ background: 'transparent', border: 'none', color: '#fff' }}>✕</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  type="button"
                  className="wallpaper-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose Wallpaper
                </button>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label style={{ color: '#ddd', minWidth: 48 }}>Mood</label>
                  <select
                    className="theme-select"
                    value={themeMode || 'wano'}
                    onChange={(e) => onThemeChange && onThemeChange(e.target.value)}
                  >
                    {themeOptions.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                  {customEnabled && onRemoveCustom && (
                    <button type="button" className="wallpaper-btn danger" onClick={onRemoveCustom}>Reset</button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <motion.section
          className="quick-links-section"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <h2 className="section-title">Quick Links</h2>
          <div className="quick-links-grid">
            {quickLinks.map((link) => (
              <motion.a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`quick-link-card bg-gradient-to-br ${link.color}`}
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  delay: 0.8 + (link.id - 1) * 0.05,
                  type: 'spring', stiffness: 260, damping: 20
                }}
                whileHover={{ scale: 1.05, rotate: 2, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="link-icon">{link.icon}</div>
                <div className="link-name">{link.name}</div>
              </motion.a>
            ))}
          </div>
        </motion.section>

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

        {/* Premium upsell removed per request */}
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
            onClick={openWallpaperPicker}
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

      { (themeMode || 'wano') === 'wano' && (
        <>
          <div className="kanji-watermark w1">和</div>
          <div className="kanji-watermark w2">野</div>
          <div className="kanji-watermark w3">名</div>
        </>
      ) }
    </div>
  );
};

export default WanoArcDashboard;
