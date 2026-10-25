// Generative ambient sound (WebAudio, no audio files shipped): filtered noise
// "rain", vinyl crackle and slow-breathing ocean. Plus a soft completion chime.
//
// Playback always starts from a user click (autoplay-safe). The selected mode
// is remembered but a fresh tab never auto-plays (browser gesture policy).

export const AMBIENT_MODE_KEY = 'ambientMode';
export const AMBIENT_MODES = [
  { id: 'off', label: 'Off', icon: '🔇' },
  { id: 'rain', label: 'Rain', icon: '🌧️' },
  { id: 'vinyl', label: 'Vinyl', icon: '💿' },
  { id: 'ocean', label: 'Ocean', icon: '🌊' }
];

export function normalizeAmbient(value) {
  return AMBIENT_MODES.some((m) => m.id === value) ? value : 'off';
}

export function modeLabel(id) {
  return AMBIENT_MODES.find((m) => m.id === id)?.label || 'Off';
}

const MASTER_LEVEL = 0.55;

function makeNoiseBuffer(ctx, seconds = 4) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    // cheap brown-ish noise for a warmer floor
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5;
  }
  return buffer;
}

function makeCrackleBuffer(ctx, seconds = 4) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const pops = Math.floor(seconds * 14); // sparse ticks
  for (let p = 0; p < pops; p++) {
    const at = Math.floor(Math.random() * (data.length - 400));
    const amp = (0.35 + Math.random() * 0.65) * (Math.random() < 0.5 ? -1 : 1);
    for (let i = 0; i < 240; i++) {
      data[at + i] += amp * Math.exp(-i / 42) * (Math.random() * 2 - 1);
    }
  }
  return buffer;
}

export function createAmbientEngine() {
  let ctx = null;
  let master = null;
  let nodes = [];
  let current = null;

  const ensureCtx = () => {
    if (!ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      ctx = new Ctx();
      master = ctx.createGain();
      master.gain.value = MASTER_LEVEL;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };

  const stopNodes = () => {
    for (const n of nodes) { try { n.stop?.(); n.disconnect?.(); } catch { /* noop */ } }
    nodes = [];
    current = null;
  };

  const play = (kind) => {
    stopNodes();
    if (kind === 'off') return;
    const c = ensureCtx();
    if (!c) return;

    const noise = c.createBufferSource();
    noise.buffer = makeNoiseBuffer(c);
    noise.loop = true;
    const filter = c.createBiquadFilter();
    const gain = c.createGain();

    if (kind === 'rain') {
      filter.type = 'bandpass';
      filter.frequency.value = 1400;
      filter.Q.value = 0.6;
      gain.gain.value = 0.5;
      noise.connect(filter).connect(gain).connect(master);
    } else if (kind === 'vinyl') {
      filter.type = 'lowpass';
      filter.frequency.value = 900;
      gain.gain.value = 0.55;
      noise.connect(filter).connect(gain).connect(master);
      const crackle = c.createBufferSource();
      crackle.buffer = makeCrackleBuffer(c);
      crackle.loop = true;
      const crackleGain = c.createGain();
      crackleGain.gain.value = 0.8;
      crackle.connect(crackleGain).connect(master);
      crackle.start();
      nodes.push(crackle, crackleGain);
    } else if (kind === 'ocean') {
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      gain.gain.value = 0.9;
      const lfo = c.createOscillator();
      const lfoGain = c.createGain();
      lfo.frequency.value = 0.07;
      lfoGain.gain.value = 0.45;
      lfo.connect(lfoGain).connect(gain.gain);
      lfo.start();
      noise.connect(filter).connect(gain).connect(master);
      nodes.push(lfo, lfoGain);
    } else {
      return;
    }

    noise.start();
    nodes.push(noise, filter, gain);
    current = kind;
  };

  return {
    play,
    stop: stopNodes,
    get playing() { return current; },
    chime: () => {
      const c = ensureCtx();
      if (!c) return;
      const t = c.currentTime;
      for (const [freq, at, dur] of [[659, t, 0.18], [880, t + 0.16, 0.3]]) {
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(0.18, at + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
        osc.connect(g).connect(master);
        osc.start(at);
        osc.stop(at + dur + 0.05);
      }
    }
  };
}
