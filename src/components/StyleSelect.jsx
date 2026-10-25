import React, { useCallback, useEffect, useRef, useState } from 'react';
import './StyleSelect.css';

/**
 * Dark-styled dropdown replacing native <select> popups (which stay white
 * in Chromium regardless of color-scheme when the control is styled).
 * Keyboard accessible: Enter/Space open, ArrowUp/Down move, Enter pick,
 * Escape closes, click-outside closes.
 */
export default function StyleSelect({ value, onChange, options, ariaLabel, id, title, className = '' }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const btnRef = useRef(null);
  const listRef = useRef(null);

  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const current = options[selectedIndex] || options[0];

  const toggle = useCallback((next) => {
    setOpen((prev) => {
      const opening = next !== undefined ? next : !prev;
      if (opening) setActive(selectedIndex);
      return opening;
    });
  }, [selectedIndex]);

  const pick = useCallback((opt) => {
    if (!opt) { toggle(false); return; }
    setOpen(false);
    onChange && onChange(opt.value);
    btnRef.current?.focus();
  }, [onChange, toggle]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onDocDown = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus(); } };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const onKeyDown = (e) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        toggle(true);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(options.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pick(options[active]);
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={`ss-root ${className}`}>
      <button
        type="button"
        id={id}
        ref={btnRef}
        className={`ss-btn ${open ? 'open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        title={title || ariaLabel}
        onClick={() => toggle()}
        onKeyDown={onKeyDown}
      >
        <span className="ss-value">{current?.label}</span>
        <span className="ss-chevron" aria-hidden="true" />
      </button>
      {open && (
        <ul ref={listRef} className="ss-list" role="listbox" aria-label={ariaLabel}>
          {options.map((opt, i) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              data-active={i === active}
              className={`ss-opt ${opt.value === value ? 'selected' : ''}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(opt)}
            >
              <span>{opt.label}</span>
              {opt.value === value && <span className="ss-check" aria-hidden="true">✓</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
