/**
 * Procedural SFX + night ambient for Blood Moon Run.
 * Own AudioContext (not Phaser) — more reliable on mobile / VK WebView.
 */
import type Phaser from 'phaser';
import { unlockAudio, isAudioUnlocked, getWarmedContext } from './unlock';

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
let sfxVol = 1.0;
let musicVol = 0.55;

let sharedCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let sfxBus: GainNode | null = null;
let musicBus: GainNode | null = null;

let ambientRunning = false;
let ambientNodes: AudioNode[] = [];
let ambientTimers: number[] = [];

function getAC(): typeof AudioContext | null {
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ||
    null
  );
}

/** Always ensure context + buses exist and are resumed */
function ensureCtx(_scene?: Phaser.Scene): AudioContext | null {
  try {
    // Prefer context warmed during user-gesture unlock
    const warmed = getWarmedContext();
    if (warmed && warmed.state !== 'closed') {
      sharedCtx = warmed;
    }

    if (!sharedCtx || sharedCtx.state === 'closed') {
      const AC = getAC();
      if (!AC) return null;
      sharedCtx = new AC();
    }

    if (sharedCtx.state === 'suspended') {
      void sharedCtx.resume();
    }

    // (Re)create buses if missing
    if (!masterGain || !sfxBus || !musicBus) {
      masterGain = sharedCtx.createGain();
      masterGain.gain.value = muted ? 0.0001 : 1;
      masterGain.connect(sharedCtx.destination);

      sfxBus = sharedCtx.createGain();
      sfxBus.gain.value = sfxVol;
      sfxBus.connect(masterGain);

      musicBus = sharedCtx.createGain();
      musicBus.gain.value = musicVol;
      musicBus.connect(masterGain);
    }

    return sharedCtx;
  } catch (e) {
    console.warn('[Audio] ensureCtx failed', e);
    return null;
  }
}

function noiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
  const len = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = (Math.random() * 2 - 1) * (0.55 + 0.45 * Math.sin(i * 0.0015));
  }
  return buf;
}

function tone(
  ctx: AudioContext,
  bus: GainNode,
  {
    freq,
    type = 'sine',
    duration,
    vol = 0.25,
    attack = 0.01,
    release,
    slideTo,
    detune = 0,
    filterFreq,
    filterType = 'lowpass',
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
  },
): void {
  const t0 = ctx.currentTime;
  const rel = release ?? Math.max(0.04, duration * 0.5);
  const hold = Math.max(0, duration - attack - rel);
  const peak = Math.max(0.0001, vol);

  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (detune) osc.detune.setValueAtTime(detune, t0);
  if (slideTo != null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + duration);
  }

  let node: AudioNode = osc;
  if (filterFreq != null) {
    const f = ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.setValueAtTime(filterFreq, t0);
    f.Q.value = 0.85;
    osc.connect(f);
    node = f;
  }

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + Math.max(0.005, attack));
  g.gain.setValueAtTime(peak, t0 + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + hold + rel);

  node.connect(g);
  g.connect(bus);
  osc.start(t0);
  osc.stop(t0 + duration + 0.08);
}

function noiseBurst(
  ctx: AudioContext,
  bus: GainNode,
  {
    duration,
    vol = 0.25,
    filterFreq = 1000,
    filterType = 'bandpass',
    Q = 1.3,
  }: {
    duration: number;
    vol?: number;
    filterFreq?: number;
    filterType?: BiquadFilterType;
    Q?: number;
  },
): void {
  const t0 = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, duration + 0.1);

  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = filterFreq;
  filter.Q.value = Q;

  const g = ctx.createGain();
  g.gain.setValueAtTime(Math.max(0.0001, vol), t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  src.connect(filter);
  filter.connect(g);
  g.connect(bus);
  src.start(t0);
  src.stop(t0 + duration + 0.1);
}

function synth(id: SfxId, ctx: AudioContext, bus: GainNode): void {
  switch (id) {
    case 'ui':
      tone(ctx, bus, { freq: 980, type: 'triangle', duration: 0.07, vol: 0.28, attack: 0.004, release: 0.05 });
      tone(ctx, bus, { freq: 1480, type: 'sine', duration: 0.05, vol: 0.14, attack: 0.002 });
      break;

    case 'attack':
      noiseBurst(ctx, bus, { duration: 0.07, vol: 0.45, filterFreq: 2600, filterType: 'highpass', Q: 0.6 });
      tone(ctx, bus, { freq: 400, type: 'sawtooth', duration: 0.12, vol: 0.28, attack: 0.003, slideTo: 150, filterFreq: 1800 });
      tone(ctx, bus, { freq: 200, type: 'triangle', duration: 0.1, vol: 0.16, slideTo: 90 });
      break;

    case 'hit':
      noiseBurst(ctx, bus, { duration: 0.1, vol: 0.4, filterFreq: 650, filterType: 'lowpass', Q: 1 });
      tone(ctx, bus, { freq: 160, type: 'triangle', duration: 0.15, vol: 0.32, attack: 0.004, slideTo: 60, filterFreq: 480 });
      break;

    case 'death':
      noiseBurst(ctx, bus, { duration: 0.22, vol: 0.48, filterFreq: 360, filterType: 'lowpass', Q: 0.7 });
      tone(ctx, bus, { freq: 130, type: 'sawtooth', duration: 0.3, vol: 0.3, attack: 0.01, slideTo: 40, filterFreq: 380 });
      tone(ctx, bus, { freq: 75, type: 'triangle', duration: 0.35, vol: 0.18, slideTo: 32 });
      break;

    case 'pickup':
      tone(ctx, bus, { freq: 720, type: 'sine', duration: 0.08, vol: 0.3, attack: 0.004 });
      tone(ctx, bus, { freq: 1080, type: 'sine', duration: 0.11, vol: 0.26, attack: 0.01 });
      tone(ctx, bus, { freq: 1440, type: 'triangle', duration: 0.14, vol: 0.16, attack: 0.02, release: 0.1 });
      break;

    case 'levelup': {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((f, i) => {
        setTimeout(() => {
          if (!sfxBus || !sharedCtx) return;
          tone(sharedCtx, sfxBus, { freq: f, type: 'sine', duration: 0.2, vol: 0.26 - i * 0.02, attack: 0.01, release: 0.12 });
          tone(sharedCtx, sfxBus, { freq: f * 2, type: 'triangle', duration: 0.15, vol: 0.08, attack: 0.015 });
        }, i * 75);
      });
      break;
    }

    case 'howl':
      noiseBurst(ctx, bus, { duration: 0.75, vol: 0.35, filterFreq: 820, filterType: 'bandpass', Q: 2 });
      tone(ctx, bus, {
        freq: 300,
        type: 'sawtooth',
        duration: 0.9,
        vol: 0.3,
        attack: 0.08,
        release: 0.35,
        slideTo: 140,
        filterFreq: 950,
        filterType: 'lowpass',
      });
      tone(ctx, bus, {
        freq: 450,
        type: 'triangle',
        duration: 0.8,
        vol: 0.18,
        attack: 0.12,
        release: 0.3,
        slideTo: 200,
        detune: -10,
      });
      tone(ctx, bus, { freq: 170, type: 'sine', duration: 0.95, vol: 0.14, attack: 0.15, release: 0.4, slideTo: 90 });
      break;

    case 'transform':
      noiseBurst(ctx, bus, { duration: 0.42, vol: 0.38, filterFreq: 620, filterType: 'bandpass', Q: 1.5 });
      tone(ctx, bus, { freq: 70, type: 'sawtooth', duration: 0.55, vol: 0.34, attack: 0.04, slideTo: 250, filterFreq: 720 });
      tone(ctx, bus, { freq: 140, type: 'triangle', duration: 0.5, vol: 0.18, attack: 0.06, slideTo: 440 });
      tone(ctx, bus, { freq: 380, type: 'sine', duration: 0.4, vol: 0.12, attack: 0.1, slideTo: 950 });
      break;

    case 'wave':
      tone(ctx, bus, { freq: 300, type: 'sine', duration: 0.2, vol: 0.22, attack: 0.02 });
      setTimeout(() => {
        if (!sfxBus || !sharedCtx) return;
        tone(sharedCtx, sfxBus, { freq: 380, type: 'sine', duration: 0.24, vol: 0.24, attack: 0.02 });
        tone(sharedCtx, sfxBus, { freq: 760, type: 'triangle', duration: 0.2, vol: 0.1 });
      }, 90);
      break;

    case 'hurt':
      tone(ctx, bus, { freq: 210, type: 'square', duration: 0.12, vol: 0.28, attack: 0.003, slideTo: 80, filterFreq: 900 });
      noiseBurst(ctx, bus, { duration: 0.11, vol: 0.28, filterFreq: 420, filterType: 'lowpass' });
      break;

    case 'victory': {
      const seq = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      seq.forEach((f, i) => {
        setTimeout(() => {
          if (!sfxBus || !sharedCtx) return;
          tone(sharedCtx, sfxBus, { freq: f, type: 'sine', duration: 0.3, vol: 0.24, attack: 0.02, release: 0.18 });
        }, i * 100);
      });
      break;
    }

    case 'defeat':
      tone(ctx, bus, { freq: 220, type: 'sawtooth', duration: 0.45, vol: 0.26, slideTo: 85, filterFreq: 480 });
      tone(ctx, bus, { freq: 160, type: 'triangle', duration: 0.55, vol: 0.16, slideTo: 50 });
      noiseBurst(ctx, bus, { duration: 0.38, vol: 0.22, filterFreq: 280, filterType: 'lowpass' });
      break;
  }
}

function stopAmbientInternal(): void {
  ambientTimers.forEach((id) => clearTimeout(id));
  ambientTimers = [];
  ambientNodes.forEach((n) => {
    try {
      if ('stop' in n && typeof (n as OscillatorNode).stop === 'function') {
        try {
          (n as OscillatorNode).stop();
        } catch {
          /* already stopped */
        }
      }
      n.disconnect();
    } catch {
      /* ignore */
    }
  });
  ambientNodes = [];
  ambientRunning = false;
}

function startAmbient(ctx: AudioContext): void {
  if (!musicBus) return;
  stopAmbientInternal();
  ambientRunning = true;

  // Force resume again right before starting nodes
  if (ctx.state === 'suspended') void ctx.resume();

  const t0 = ctx.currentTime;
  const bus = musicBus;

  const makeDrone = (freq: number, vol: number, detune = 0) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.detune.value = detune;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 2.2);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    osc.connect(filter);
    filter.connect(g);
    g.connect(bus);
    osc.start(t0);
    ambientNodes.push(osc, g, filter);
  };

  // Louder drones for mobile speakers
  makeDrone(55, 0.22);
  makeDrone(82.5, 0.14, 7);
  makeDrone(110, 0.09, -5);

  // Pad
  const pad = ctx.createOscillator();
  pad.type = 'triangle';
  pad.frequency.value = 164.8;
  const padGain = ctx.createGain();
  padGain.gain.setValueAtTime(0.0001, t0);
  padGain.gain.linearRampToValueAtTime(0.08, t0 + 2.5);
  const padFilter = ctx.createBiquadFilter();
  padFilter.type = 'lowpass';
  padFilter.frequency.value = 480;
  pad.connect(padFilter);
  padFilter.connect(padGain);
  padGain.connect(bus);
  pad.start(t0);
  ambientNodes.push(pad, padGain, padFilter);

  // Wind noise
  const windSrc = ctx.createBufferSource();
  windSrc.buffer = noiseBuffer(ctx, 4);
  windSrc.loop = true;
  const windFilter = ctx.createBiquadFilter();
  windFilter.type = 'bandpass';
  windFilter.frequency.value = 600;
  windFilter.Q.value = 0.55;
  const windGain = ctx.createGain();
  windGain.gain.setValueAtTime(0.0001, t0);
  windGain.gain.linearRampToValueAtTime(0.1, t0 + 3);
  windSrc.connect(windFilter);
  windFilter.connect(windGain);
  windGain.connect(bus);
  windSrc.start(t0);
  ambientNodes.push(windSrc, windFilter, windGain);

  // Pulse
  const schedulePulse = () => {
    if (!ambientRunning || !musicBus || !sharedCtx) return;
    const now = sharedCtx.currentTime;
    const osc = sharedCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 50;
    const g = sharedCtx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.12, now + 0.07);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    const f = sharedCtx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 130;
    osc.connect(f);
    f.connect(g);
    g.connect(musicBus);
    osc.start(now);
    osc.stop(now + 0.55);
    const tid = window.setTimeout(schedulePulse, 3200 + Math.random() * 2800);
    ambientTimers.push(tid);
  };
  ambientTimers.push(window.setTimeout(schedulePulse, 2500));

  // Shimmer
  const scheduleShimmer = () => {
    if (!ambientRunning || !musicBus || !sharedCtx) return;
    const now = sharedCtx.currentTime;
    const base = 1100 + Math.random() * 900;
    for (let i = 0; i < 3; i++) {
      const osc = sharedCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = base * (1 + i * 0.48);
      const g = sharedCtx.createGain();
      const st = now + i * 0.05;
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(0.05, st + 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, st + 1.1);
      osc.connect(g);
      g.connect(musicBus);
      osc.start(st);
      osc.stop(st + 1.2);
    }
    const tid = window.setTimeout(scheduleShimmer, 7000 + Math.random() * 10000);
    ambientTimers.push(tid);
  };
  ambientTimers.push(window.setTimeout(scheduleShimmer, 5000));

  console.info('[Music] ambient started, ctx=', ctx.state);
}

export const SFX = {
  play(id: SfxId, scene?: Phaser.Scene): void {
    if (muted) return;
    if (!isAudioUnlocked()) unlockAudio(scene);
    const ctx = ensureCtx(scene);
    if (!ctx || !sfxBus) {
      console.warn('[SFX] no ctx/bus');
      return;
    }
    if (ctx.state === 'suspended') void ctx.resume();
    try {
      synth(id, ctx, sfxBus);
    } catch (e) {
      console.warn('[SFX]', id, e);
    }
  },

  /** Call from user gesture when possible (Play button) */
  startMusic(scene?: Phaser.Scene): void {
    if (muted) return;
    if (!isAudioUnlocked()) unlockAudio(scene);
    const ctx = ensureCtx(scene);
    if (!ctx || !musicBus) {
      console.warn('[Music] no ctx/bus');
      return;
    }
    if (ctx.state === 'suspended') {
      void ctx.resume().then(() => startAmbient(ctx));
      return;
    }
    try {
      startAmbient(ctx);
    } catch (e) {
      console.warn('[Music] start failed', e);
    }
  },

  stopMusic(): void {
    stopAmbientInternal();
  },

  setMusicPaused(paused: boolean): void {
    if (!musicBus || !sharedCtx) return;
    const t = sharedCtx.currentTime;
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.linearRampToValueAtTime(paused ? 0.0001 : musicVol, t + 0.3);
  },

  setMuted(v: boolean): void {
    muted = v;
    if (v) stopAmbientInternal();
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
