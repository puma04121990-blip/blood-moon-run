/**
 * High-quality procedural audio for Blood Moon Run.
 * Pure Web Audio — no external files, fully commercial-safe.
 *
 * - Layered SFX with better envelopes, filters, short tails
 * - Atmospheric night ambient (drone + wind + slow pulse)
 */
import type Phaser from 'phaser';
import { unlockAudio, isAudioUnlocked } from './unlock';

type SfxId =
  | 'ui'
  | 'attack'
  | 'hit'
  | 'death'
  | 'pickup'
  | 'levelup'
  | 'howl'
  | 'transform'
  | 'wave'
  | 'hurt'
  | 'victory'
  | 'defeat';

let muted = false;
let sfxVol = 0.75;
let musicVol = 0.32;

let sharedCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let sfxBus: GainNode | null = null;
let musicBus: GainNode | null = null;

// Ambient state
let ambientRunning = false;
let ambientNodes: AudioNode[] = [];
let ambientTimers: number[] = [];

function ensureCtx(scene?: Phaser.Scene): AudioContext | null {
  try {
    if (sharedCtx && sharedCtx.state !== 'closed') {
      if (sharedCtx.state === 'suspended') void sharedCtx.resume();
      return sharedCtx;
    }

    // Prefer Phaser context when available
    if (scene?.sound?.context) {
      sharedCtx = scene.sound.context as AudioContext;
    } else {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      sharedCtx = new AC();
    }

    if (sharedCtx.state === 'suspended') void sharedCtx.resume();

    masterGain = sharedCtx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(sharedCtx.destination);

    sfxBus = sharedCtx.createGain();
    sfxBus.gain.value = sfxVol;
    sfxBus.connect(masterGain);

    musicBus = sharedCtx.createGain();
    musicBus.gain.value = musicVol;
    musicBus.connect(masterGain);

    return sharedCtx;
  } catch {
    return null;
  }
}

function noiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
  const len = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    // Slightly filtered-feeling noise (less harsh)
    data[i] = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.sin(i * 0.002));
  }
  return buf;
}

function envGain(
  ctx: AudioContext,
  peak: number,
  attack: number,
  hold: number,
  release: number,
  dest: AudioNode,
): GainNode {
  const g = ctx.createGain();
  const t0 = ctx.currentTime;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), t0 + attack);
  g.gain.setValueAtTime(Math.max(0.0001, peak), t0 + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + hold + release);
  g.connect(dest);
  return g;
}

function tone(
  ctx: AudioContext,
  {
    freq,
    type = 'sine',
    duration,
    vol = 0.2,
    attack = 0.01,
    release,
    slideTo,
    detune = 0,
    filterFreq,
    filterType = 'lowpass',
    bus = sfxBus!,
  }: {
    freq: number;
    type?: OscillatorType;
    duration: number;
    vol?: number;
    attack?: number;
    release?: number;
    slideTo?: number;
    detune?: number;
    filterFreq?: number;
    filterType?: BiquadFilterType;
    bus?: GainNode;
  },
): void {
  const t0 = ctx.currentTime;
  const rel = release ?? duration * 0.55;
  const hold = Math.max(0, duration - attack - rel);

  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (detune) osc.detune.setValueAtTime(detune, t0);
  if (slideTo != null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + duration);
  }

  let last: AudioNode = osc;
  if (filterFreq != null) {
    const f = ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.setValueAtTime(filterFreq, t0);
    f.Q.value = 0.9;
    osc.connect(f);
    last = f;
  }

  const g = envGain(ctx, vol, attack, hold, rel, bus);
  last.connect(g);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

function noiseBurst(
  ctx: AudioContext,
  {
    duration,
    vol = 0.2,
    filterFreq = 1000,
    filterType = 'bandpass',
    Q = 1.4,
    bus = sfxBus!,
  }: {
    duration: number;
    vol?: number;
    filterFreq?: number;
    filterType?: BiquadFilterType;
    Q?: number;
    bus?: GainNode;
  },
): void {
  const t0 = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, duration + 0.08);

  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = filterFreq;
  filter.Q.value = Q;

  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  src.connect(filter);
  filter.connect(g);
  g.connect(bus);
  src.start(t0);
  src.stop(t0 + duration + 0.08);
}

/** Short feedback delay for atmosphere (not full reverb) */
function shortTail(ctx: AudioContext, inputVol: number, delayTime = 0.11, feedback = 0.22): GainNode {
  const bus = sfxBus!;
  const delay = ctx.createDelay(0.4);
  delay.delayTime.value = delayTime;
  const fb = ctx.createGain();
  fb.gain.value = feedback;
  const wet = ctx.createGain();
  wet.gain.value = inputVol;

  delay.connect(fb);
  fb.connect(delay);
  delay.connect(wet);
  wet.connect(bus);
  return delay; // connect source into this
}

function synth(id: SfxId, ctx: AudioContext): void {
  if (!sfxBus) return;

  switch (id) {
    case 'ui': {
      tone(ctx, { freq: 920, type: 'triangle', duration: 0.05, vol: 0.14, attack: 0.004, release: 0.04 });
      tone(ctx, { freq: 1380, type: 'sine', duration: 0.04, vol: 0.08, attack: 0.002, release: 0.03 });
      break;
    }

    case 'attack': {
      // Sharp transient + body
      noiseBurst(ctx, { duration: 0.06, vol: 0.32, filterFreq: 2400, filterType: 'highpass', Q: 0.7 });
      tone(ctx, {
        freq: 380,
        type: 'sawtooth',
        duration: 0.11,
        vol: 0.16,
        attack: 0.004,
        slideTo: 160,
        filterFreq: 1600,
      });
      tone(ctx, { freq: 190, type: 'triangle', duration: 0.09, vol: 0.1, slideTo: 90 });
      break;
    }

    case 'hit': {
      noiseBurst(ctx, { duration: 0.09, vol: 0.28, filterFreq: 700, filterType: 'lowpass', Q: 1.0 });
      tone(ctx, {
        freq: 155,
        type: 'triangle',
        duration: 0.14,
        vol: 0.2,
        attack: 0.005,
        slideTo: 65,
        filterFreq: 500,
      });
      break;
    }

    case 'death': {
      noiseBurst(ctx, { duration: 0.2, vol: 0.34, filterFreq: 380, filterType: 'lowpass', Q: 0.8 });
      tone(ctx, {
        freq: 120,
        type: 'sawtooth',
        duration: 0.28,
        vol: 0.18,
        attack: 0.01,
        slideTo: 38,
        filterFreq: 400,
      });
      tone(ctx, { freq: 70, type: 'triangle', duration: 0.32, vol: 0.12, slideTo: 30 });
      break;
    }

    case 'pickup': {
      tone(ctx, { freq: 700, type: 'sine', duration: 0.07, vol: 0.18, attack: 0.005 });
      tone(ctx, { freq: 1050, type: 'sine', duration: 0.1, vol: 0.16, attack: 0.01 });
      tone(ctx, { freq: 1400, type: 'triangle', duration: 0.12, vol: 0.1, attack: 0.02, release: 0.09 });
      break;
    }

    case 'levelup': {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
      notes.forEach((f, i) => {
        setTimeout(() => {
          tone(ctx, {
            freq: f,
            type: 'sine',
            duration: 0.18,
            vol: 0.16 - i * 0.015,
            attack: 0.01,
            release: 0.12,
          });
          tone(ctx, {
            freq: f * 2,
            type: 'triangle',
            duration: 0.14,
            vol: 0.05,
            attack: 0.015,
          });
        }, i * 75);
      });
      break;
    }

    case 'howl': {
      // Long layered howl with body noise + two gliding formants
      noiseBurst(ctx, {
        duration: 0.7,
        vol: 0.2,
        filterFreq: 850,
        filterType: 'bandpass',
        Q: 2.2,
      });
      tone(ctx, {
        freq: 310,
        type: 'sawtooth',
        duration: 0.85,
        vol: 0.17,
        attack: 0.08,
        release: 0.35,
        slideTo: 145,
        filterFreq: 900,
        filterType: 'lowpass',
      });
      tone(ctx, {
        freq: 460,
        type: 'triangle',
        duration: 0.75,
        vol: 0.11,
        attack: 0.12,
        release: 0.3,
        slideTo: 210,
        detune: -8,
      });
      tone(ctx, {
        freq: 180,
        type: 'sine',
        duration: 0.9,
        vol: 0.09,
        attack: 0.15,
        release: 0.4,
        slideTo: 95,
      });
      break;
    }

    case 'transform': {
      noiseBurst(ctx, { duration: 0.4, vol: 0.26, filterFreq: 650, filterType: 'bandpass', Q: 1.6 });
      tone(ctx, {
        freq: 75,
        type: 'sawtooth',
        duration: 0.5,
        vol: 0.22,
        attack: 0.04,
        slideTo: 240,
        filterFreq: 700,
      });
      tone(ctx, {
        freq: 150,
        type: 'triangle',
        duration: 0.45,
        vol: 0.12,
        attack: 0.06,
        slideTo: 420,
      });
      // rising shimmer
      tone(ctx, {
        freq: 400,
        type: 'sine',
        duration: 0.35,
        vol: 0.08,
        attack: 0.1,
        slideTo: 900,
      });
      break;
    }

    case 'wave': {
      tone(ctx, { freq: 290, type: 'sine', duration: 0.18, vol: 0.12, attack: 0.02 });
      setTimeout(() => {
        tone(ctx, { freq: 365, type: 'sine', duration: 0.22, vol: 0.14, attack: 0.02 });
        tone(ctx, { freq: 730, type: 'triangle', duration: 0.2, vol: 0.06 });
      }, 90);
      break;
    }

    case 'hurt': {
      tone(ctx, {
        freq: 200,
        type: 'square',
        duration: 0.11,
        vol: 0.16,
        attack: 0.004,
        slideTo: 85,
        filterFreq: 800,
      });
      noiseBurst(ctx, { duration: 0.1, vol: 0.18, filterFreq: 450, filterType: 'lowpass' });
      break;
    }

    case 'victory': {
      const seq = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      seq.forEach((f, i) => {
        setTimeout(() => {
          tone(ctx, { freq: f, type: 'sine', duration: 0.28, vol: 0.15, attack: 0.02, release: 0.18 });
        }, i * 100);
      });
      break;
    }

    case 'defeat': {
      tone(ctx, { freq: 220, type: 'sawtooth', duration: 0.4, vol: 0.14, slideTo: 90, filterFreq: 500 });
      tone(ctx, { freq: 165, type: 'triangle', duration: 0.5, vol: 0.1, slideTo: 55 });
      noiseBurst(ctx, { duration: 0.35, vol: 0.15, filterFreq: 300, filterType: 'lowpass' });
      break;
    }
  }
}

/* ───────────────── Ambient night music ───────────────── */

function stopAmbientInternal(): void {
  ambientTimers.forEach((id) => clearTimeout(id));
  ambientTimers = [];
  ambientNodes.forEach((n) => {
    try {
      if ('stop' in n && typeof (n as OscillatorNode).stop === 'function') {
        (n as OscillatorNode).stop();
      }
      n.disconnect();
    } catch {
      /* already stopped */
    }
  });
  ambientNodes = [];
  ambientRunning = false;
}

function startAmbient(ctx: AudioContext): void {
  if (ambientRunning || !musicBus) return;
  stopAmbientInternal();
  ambientRunning = true;

  const t0 = ctx.currentTime;

  // 1) Deep drone (two detuned sines)
  const makeDrone = (freq: number, vol: number, detune = 0) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.detune.value = detune;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 3.5); // slow fade-in
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 280;
    osc.connect(filter);
    filter.connect(g);
    g.connect(musicBus!);
    osc.start(t0);
    ambientNodes.push(osc, g, filter);
    return { osc, g };
  };

  makeDrone(55, 0.11); // A1
  makeDrone(82.5, 0.07, 6); // E2 slightly detuned
  makeDrone(110, 0.045, -4); // A2

  // 2) Slow LFO on a mid pad
  const pad = ctx.createOscillator();
  pad.type = 'triangle';
  pad.frequency.value = 164.8; // E3
  const padGain = ctx.createGain();
  padGain.gain.value = 0.035;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.07; // very slow
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.025;
  lfo.connect(lfoGain);
  lfoGain.connect(padGain.gain);
  const padFilter = ctx.createBiquadFilter();
  padFilter.type = 'lowpass';
  padFilter.frequency.value = 420;
  pad.connect(padFilter);
  padFilter.connect(padGain);
  padGain.connect(musicBus!);
  pad.start(t0);
  lfo.start(t0);
  ambientNodes.push(pad, padGain, lfo, lfoGain, padFilter);

  // 3) Wind / forest noise bed
  const windSrc = ctx.createBufferSource();
  windSrc.buffer = noiseBuffer(ctx, 4);
  windSrc.loop = true;
  const windFilter = ctx.createBiquadFilter();
  windFilter.type = 'bandpass';
  windFilter.frequency.value = 550;
  windFilter.Q.value = 0.6;
  const windGain = ctx.createGain();
  windGain.gain.setValueAtTime(0.0001, t0);
  windGain.gain.linearRampToValueAtTime(0.045, t0 + 4);
  // slow modulation of wind level
  const windLfo = ctx.createOscillator();
  windLfo.frequency.value = 0.04;
  const windLfoG = ctx.createGain();
  windLfoG.gain.value = 0.02;
  windLfo.connect(windLfoG);
  windLfoG.connect(windGain.gain);
  windSrc.connect(windFilter);
  windFilter.connect(windGain);
  windGain.connect(musicBus!);
  windSrc.start(t0);
  windLfo.start(t0);
  ambientNodes.push(windSrc, windFilter, windGain, windLfo, windLfoG);

  // 4) Occasional distant low pulse (heartbeat-like, very subtle)
  const schedulePulse = () => {
    if (!ambientRunning || !musicBus) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 48;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.06, now + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 120;
    osc.connect(f);
    f.connect(g);
    g.connect(musicBus);
    osc.start(now);
    osc.stop(now + 0.6);
    // next pulse in 3.5–6.5 s
    const next = 3500 + Math.random() * 3000;
    const tid = window.setTimeout(schedulePulse, next);
    ambientTimers.push(tid);
  };
  const firstPulse = window.setTimeout(schedulePulse, 5000);
  ambientTimers.push(firstPulse);

  // 5) Rare distant high shimmer (stars / cold air)
  const scheduleShimmer = () => {
    if (!ambientRunning || !musicBus) return;
    const now = ctx.currentTime;
    const base = 1200 + Math.random() * 800;
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = base * (1 + i * 0.5);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now + i * 0.04);
      g.gain.exponentialRampToValueAtTime(0.025, now + i * 0.04 + 0.15);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.04 + 1.2);
      osc.connect(g);
      g.connect(musicBus);
      osc.start(now + i * 0.04);
      osc.stop(now + i * 0.04 + 1.3);
    }
    const next = 9000 + Math.random() * 12000;
    const tid = window.setTimeout(scheduleShimmer, next);
    ambientTimers.push(tid);
  };
  const firstShim = window.setTimeout(scheduleShimmer, 8000);
  ambientTimers.push(firstShim);
}

/** Public API */
export const SFX = {
  play(id: SfxId, scene?: Phaser.Scene): void {
    if (muted) return;
    if (!isAudioUnlocked()) unlockAudio(scene);
    const ctx = ensureCtx(scene);
    if (!ctx || !sfxBus) return;
    try {
      synth(id, ctx);
    } catch (e) {
      console.warn('[SFX]', id, e);
    }
  },

  /** Start atmospheric night ambient (call after unlock, e.g. on Game start) */
  startMusic(scene?: Phaser.Scene): void {
    if (muted) return;
    if (!isAudioUnlocked()) unlockAudio(scene);
    const ctx = ensureCtx(scene);
    if (!ctx) return;
    try {
      startAmbient(ctx);
    } catch (e) {
      console.warn('[Music] start failed', e);
    }
  },

  stopMusic(): void {
    stopAmbientInternal();
  },

  /** Soft pause: lower music bus without killing drones */
  setMusicPaused(paused: boolean): void {
    if (!musicBus || !sharedCtx) return;
    const t = sharedCtx.currentTime;
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.linearRampToValueAtTime(paused ? 0.0001 : musicVol, t + 0.35);
  },

  setMuted(v: boolean): void {
    muted = v;
    if (v) {
      stopAmbientInternal();
    }
    if (masterGain && sharedCtx) {
      masterGain.gain.setValueAtTime(v ? 0.0001 : 1, sharedCtx.currentTime);
    }
  },

  isMuted(): boolean {
    return muted;
  },

  setSfxVolume(v: number): void {
    sfxVol = Math.max(0, Math.min(1, v));
    if (sfxBus) sfxBus.gain.value = sfxVol;
  },

  setMusicVolume(v: number): void {
    musicVol = Math.max(0, Math.min(1, v));
    if (musicBus && !muted) musicBus.gain.value = musicVol;
  },
};
