const VOLUME_KEY = 'flashcards-sound-volume';
const ENABLED_KEY = 'flashcards-sound-enabled';
const DEFAULT_VOLUME = 0.5;

let audioContext: AudioContext | null = null;

let comboTickPitch = 600;
let comboTickTimeout: ReturnType<typeof setTimeout> | null = null;

const getContext = (): AudioContext | null => {
  if (typeof AudioContext === 'undefined') return null;
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
};

const getVolume = (): number => {
  try {
    const stored = localStorage.getItem(VOLUME_KEY);
    if (stored !== null) {
      const val = parseFloat(stored);
      return Number.isFinite(val) ? Math.max(0, Math.min(1, val)) : DEFAULT_VOLUME;
    }
  } catch {
    // localStorage unavailable
  }
  return DEFAULT_VOLUME;
};

const setVolume = (volume: number): void => {
  const clamped = Math.max(0, Math.min(1, volume));
  try {
    localStorage.setItem(VOLUME_KEY, String(clamped));
  } catch {
    // localStorage unavailable
  }
};

const isEnabled = (): boolean => {
  try {
    const stored = localStorage.getItem(ENABLED_KEY);
    if (stored !== null) return stored === 'true';
  } catch {
    // localStorage unavailable
  }
  return true;
};

const setEnabled = (enabled: boolean): void => {
  try {
    localStorage.setItem(ENABLED_KEY, String(enabled));
  } catch {
    // localStorage unavailable
  }
};

const getMasterGain = (ctx: AudioContext): GainNode => {
  const gain = ctx.createGain();
  gain.gain.value = getVolume();
  gain.connect(ctx.destination);
  return gain;
};

const playNote = (
  ctx: AudioContext,
  master: GainNode,
  frequency: number,
  type: OscillatorType,
  startTime: number,
  duration: number,
  peakGain: number,
  decayRatio = 0.3
): void => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + duration * 0.05);
  gain.gain.exponentialRampToValueAtTime(peakGain * decayRatio, startTime + duration * 0.5);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gain);
  gain.connect(master);
  osc.start(startTime);
  osc.stop(startTime + duration);
};

const playCorrect = (): void => {
  if (!isEnabled()) return;
  const ctx = getContext();
  if (!ctx) return;
  const master = getMasterGain(ctx);
  const now = ctx.currentTime;
  const notes = [523, 659, 784]; // C5, E5, G5
  const noteDuration = 0.08;

  notes.forEach((freq, i) => {
    playNote(
      ctx,
      master,
      freq,
      'sine',
      now + i * noteDuration,
      noteDuration + 0.06,
      0.4 - i * 0.08
    );
  });
};

const playIncorrect = (): void => {
  if (!isEnabled()) return;
  const ctx = getContext();
  if (!ctx) return;
  const master = getMasterGain(ctx);
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = 180;
  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  osc.connect(gain);
  gain.connect(master);
  osc.start(now);
  osc.stop(now + 0.2);
};

const playCardFlip = (): void => {
  if (!isEnabled()) return;
  const ctx = getContext();
  if (!ctx) return;
  const master = getMasterGain(ctx);
  const now = ctx.currentTime;
  const bufferSize = ctx.sampleRate * 0.1;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 2000;
  filter.Q.value = 1.5;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.35, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  source.start(now);
  source.stop(now + 0.1);
};

const playStreak = (streakCount: number): void => {
  if (!isEnabled()) return;
  const ctx = getContext();
  if (!ctx) return;
  const master = getMasterGain(ctx);
  const now = ctx.currentTime;

  let notes: number[];
  let noteDuration: number;
  let useHarmonics = false;

  if (streakCount >= 15) {
    notes = [523, 587, 659, 784, 1047];
    noteDuration = 0.06;
    useHarmonics = true;
  } else if (streakCount >= 10) {
    notes = [523, 587, 659, 784];
    noteDuration = 0.07;
  } else {
    notes = [523, 659, 784];
    noteDuration = 0.09;
  }

  notes.forEach((freq, i) => {
    playNote(ctx, master, freq, 'triangle', now + i * noteDuration, noteDuration + 0.05, 0.35);
    if (useHarmonics) {
      playNote(
        ctx,
        master,
        freq * 2,
        'triangle',
        now + i * noteDuration,
        noteDuration + 0.03,
        0.12
      );
    }
  });
};

const playLevelUp = (): void => {
  if (!isEnabled()) return;
  const ctx = getContext();
  if (!ctx) return;
  const master = getMasterGain(ctx);
  const now = ctx.currentTime;
  const notes = [262, 330, 392, 523]; // C4, E4, G4, C5
  const step = 0.1;

  notes.forEach((freq, i) => {
    const t = now + i * step;
    const tailDuration = 0.15 + i * 0.05;

    // sine layer
    const oscSine = ctx.createOscillator();
    const gainSine = ctx.createGain();
    oscSine.type = 'sine';
    oscSine.frequency.value = freq;
    gainSine.gain.setValueAtTime(0, t);
    gainSine.gain.linearRampToValueAtTime(0.3, t + 0.01);
    gainSine.gain.exponentialRampToValueAtTime(0.05, t + step + tailDuration);
    gainSine.gain.exponentialRampToValueAtTime(0.001, t + step + tailDuration + 0.1);
    oscSine.connect(gainSine);
    gainSine.connect(master);
    oscSine.start(t);
    oscSine.stop(t + step + tailDuration + 0.1);

    // triangle layer
    const oscTri = ctx.createOscillator();
    const gainTri = ctx.createGain();
    oscTri.type = 'triangle';
    oscTri.frequency.value = freq;
    gainTri.gain.setValueAtTime(0, t);
    gainTri.gain.linearRampToValueAtTime(0.15, t + 0.01);
    gainTri.gain.exponentialRampToValueAtTime(0.03, t + step + tailDuration);
    gainTri.gain.exponentialRampToValueAtTime(0.001, t + step + tailDuration + 0.1);
    oscTri.connect(gainTri);
    gainTri.connect(master);
    oscTri.start(t);
    oscTri.stop(t + step + tailDuration + 0.1);
  });
};

const playAchievement = (): void => {
  if (!isEnabled()) return;
  const ctx = getContext();
  if (!ctx) return;
  const master = getMasterGain(ctx);
  const now = ctx.currentTime;
  const baseFreqs = [1200, 1600, 2000, 2400, 2800];

  baseFreqs.forEach((baseFreq, i) => {
    const t = now + i * 0.08;
    const freq = baseFreq + (Math.random() * 200 - 100);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    // bell-like: sharp attack, long decay
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.02, t + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + 0.5);
  });
};

const playXPGain = (): void => {
  if (!isEnabled()) return;
  const ctx = getContext();
  if (!ctx) return;
  const master = getMasterGain(ctx);
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  osc.connect(gain);
  gain.connect(master);
  osc.start(now);
  osc.stop(now + 0.05);
};

const playSessionComplete = (): void => {
  if (!isEnabled()) return;
  const ctx = getContext();
  if (!ctx) return;
  const master = getMasterGain(ctx);
  const now = ctx.currentTime;

  const chords: { freqs: number[]; start: number; duration: number }[] = [
    { freqs: [262, 330, 392], start: 0, duration: 0.3 }, // C4 chord
    { freqs: [523, 659, 784], start: 0.32, duration: 0.4 }, // C5 chord
  ];

  chords.forEach(({ freqs, start, duration }) => {
    freqs.forEach((freq, j) => {
      const detune = (j - 1) * 3; // slight detune for richness
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.detune.value = detune;
      const t = now + start;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
      gain.gain.setValueAtTime(0.2, t + duration * 0.7);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t);
      osc.stop(t + duration);
    });
  });
};

const playComboTick = (): void => {
  if (!isEnabled()) return;
  const ctx = getContext();
  if (!ctx) return;
  const master = getMasterGain(ctx);
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = comboTickPitch;
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
  osc.connect(gain);
  gain.connect(master);
  osc.start(now);
  osc.stop(now + 0.03);

  comboTickPitch = Math.min(comboTickPitch + 40, 1400);

  if (comboTickTimeout !== null) {
    clearTimeout(comboTickTimeout);
  }
  comboTickTimeout = setTimeout(() => {
    comboTickPitch = 600;
    comboTickTimeout = null;
  }, 500);
};

export const soundEngine = {
  playCorrect,
  playIncorrect,
  playCardFlip,
  playStreak,
  playLevelUp,
  playAchievement,
  playXPGain,
  playSessionComplete,
  playComboTick,
  setVolume,
  getVolume,
  setEnabled,
  isEnabled,
};
