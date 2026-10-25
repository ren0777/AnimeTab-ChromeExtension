import React, { useEffect, useState } from 'react';
import { storageGet, storageSet } from '../lib/platform.mjs';
import './FirstRunToast.css';

const SEEN_KEY = 'welcomeShownV1';

/** One-time welcome hint (features are easy to miss otherwise). */
export default function FirstRunToast() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = (await storageGet([SEEN_KEY]))[SEEN_KEY];
      if (stored) return;
      setShow(true);
      // Only on first paint: mark as seen so later tabs skip it.
      await storageSet({ [SEEN_KEY]: '1' });
      const id = setTimeout(() => setShow(false), 10000);
      return () => clearTimeout(id);
    })();
  }, []);

  if (!show) return null;

  return (
    <div className="welcome-toast" role="status">
      <strong>✨ Welcome to AnimeTab!</strong>
      <p>
        Wallpapers, moods, links &amp; sounds — everything lives in the <b>🖼 Wallpaper Studio</b> (top-right).
        Invite friends 🎁 to unlock neon rain &amp; hologram perks.
      </p>
    </div>
  );
}
