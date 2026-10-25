import React, { useEffect, useRef, useState } from 'react';
import { AMBIENT_MODE_KEY, AMBIENT_MODES, normalizeAmbient, createAmbientEngine } from '../lib/ambient.mjs';
import { storageGet, storageSet } from '../lib/platform.mjs';
import './HabitDock.css';

/**
 * Generative ambient sound toggle: rain / vinyl / ocean, synthesized in
 * WebAudio (no audio assets). Off by default; the choice is remembered but a
 * new tab never auto-plays (browser gesture policy).
 */
export default function AmbientButton() {
  const [mode, setMode] = useState('off');
  const engineRef = useRef(null);

  useEffect(() => {
    (async () => {
      const stored = (await storageGet([AMBIENT_MODE_KEY]))[AMBIENT_MODE_KEY];
      setMode(normalizeAmbient(stored)); // selection remembered, no autoplay
    })();
    return () => { engineRef.current?.stop(); };
  }, []);

  const cycle = async () => {
    const ids = ['off', ...AMBIENT_MODES.filter((m) => m.id !== 'off').map((m) => m.id)];
    const next = ids[(ids.indexOf(mode) + 1) % ids.length];
    setMode(next);
    await storageSet({ [AMBIENT_MODE_KEY]: next });
    engineRef.current ||= createAmbientEngine();
    if (next === 'off') engineRef.current.stop();
    else engineRef.current.play(next);
  };

  const info = AMBIENT_MODES.find((m) => m.id === mode) || AMBIENT_MODES[0];

  return (
    <button
      type="button"
      className={`ambient-btn ${mode !== 'off' ? 'active' : ''}`}
      onClick={cycle}
      title={`Ambient sound: ${info.label} (click to change)`}
    >
      <span className="icon">{info.icon}</span> {info.label}
    </button>
  );
}
