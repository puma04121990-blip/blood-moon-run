/**
 * Procedural SFX for Blood Moon Run.
 * No external audio files — pure Web Audio synthesis.
 * Fully commercial-safe (no third-party samples).
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
  | 'hurt';

let muted = false;
let masterVol = 0.7;

function getCtx(scene?: Phaser.Scene): AudioContext | null {
  try {
    if (scene?.sound?.context) {
      const c = scene.sound.context as AudioContext;
      if (c.state === 'suspended') void c.resume();
      return c;
    }
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function noiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * duration);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function playTone(
  ctx: AudioContext,
  {
    freq = 440,
    type = 'sine' as OscillatorType,
    duration = 0.15,
    vol = 0.3,
    attack = 0.01,
    decay = 0.12,
    slideTo,
  }: {
    freq?: number;
    type?: OscillatorType;
    duration?: number;
    vol?: number;
    attack?: number;
    decay?: number;
    slideTo?: number;
  },
): void {
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo != null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + duration);
  }
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol * masterVol, t0 + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

function playNoise(
  ctx: AudioContext,
  {
    duration = 0.12,
    vol = 0.25,
    filterFreq = 1200,
    filterType = 'bandpass' as BiquadFilterType,
  }: {
    duration?: number;
    vol?: number;
    filterFreq?: number;
    filterType?: BiquadFilterType;
  },
): void {
  const t0 = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, duration + 0.05);
  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = filterFreq;
  filter.Q.value = 1.2;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol * masterVol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start(t0);
  src.stop(t0 + duration + 0.05);
}

/** Core SFX library */
function synth(id: SfxId, ctx: AudioContext): void {
  switch (id) {
    case 'ui':
      playTone(ctx, { freq: 880, type: 'square', duration: 0.06, vol: 0.18, attack: 0.005, decay: 0.05 });
      break;

    case 'attack':
      playNoise(ctx, { duration: 0.08, vol: 0.28, filterFreq: 1800, filterType: 'highpass' });
      playTone(ctx, { freq: 320, type: 'sawtooth', duration: 0.1, vol: 0.15, slideTo: 180 });
      break;

    case 'hit':
      playNoise(ctx, { duration: 0.1, vol: 0.3, filterFreq: 600, filterType: 'lowpass' });
      playTone(ctx, { freq: 140, type: 'triangle', duration: 0.12, vol: 0.22, slideTo: 70 });
      break;

    case 'death':
      playNoise(ctx, { duration: 0.18, vol: 0.35, filterFreq: 400, filterType: 'lowpass' });
      playTone(ctx, { freq: 110, type: 'sawtooth', duration: 0.22, vol: 0.2, slideTo: 40 });
      break;

    case 'pickup':
      playTone(ctx, { freq: 660, type: 'sine', duration: 0.08, vol: 0.22 });
      playTone(ctx, { freq: 990, type: 'sine', duration: 0.1, vol: 0.18, attack: 0.02 });
      break;

    case 'levelup':
      playTone(ctx, { freq: 440, type: 'sine', duration: 0.1, vol: 0.2 });
      setTimeout(() => playTone(ctx, { freq: 554, type: 'sine', duration: 0.1, vol: 0.2 }), 70);
      setTimeout(() => playTone(ctx, { freq: 659, type: 'sine', duration: 0.14, vol: 0.22 }), 140);
      setTimeout(() => playTone(ctx, { freq: 880, type: 'sine', duration: 0.2, vol: 0.18 }), 220);
      break;

    case 'howl': {
      // Layered howl: noise body + two gliding tones
      playNoise(ctx, { duration: 0.55, vol: 0.22, filterFreq: 900, filterType: 'bandpass' });
      playTone(ctx, {
        freq: 280,
        type: 'sawtooth',
        duration: 0.65,
        vol: 0.18,
        attack: 0.05,
        slideTo: 160,
      });
      playTone(ctx, {
        freq: 420,
        type: 'triangle',
        duration: 0.55,
        vol: 0.12,
        attack: 0.08,
        slideTo: 220,
      });
      break;
    }

    case 'transform':
      playNoise(ctx, { duration: 0.35, vol: 0.25, filterFreq: 700, filterType: 'bandpass' });
      playTone(ctx, { freq: 90, type: 'sawtooth', duration: 0.4, vol: 0.22, slideTo: 220 });
      playTone(ctx, { freq: 180, type: 'triangle', duration: 0.35, vol: 0.12, slideTo: 360 });
      break;

    case 'wave':
      playTone(ctx, { freq: 330, type: 'sine', duration: 0.15, vol: 0.15 });
      setTimeout(() => playTone(ctx, { freq: 440, type: 'sine', duration: 0.2, vol: 0.18 }), 100);
      break;

    case 'hurt':
      playTone(ctx, { freq: 180, type: 'square', duration: 0.12, vol: 0.2, slideTo: 90 });
      playNoise(ctx, { duration: 0.1, vol: 0.2, filterFreq: 500, filterType: 'lowpass' });
      break;
  }
}

/** Public API */
export const SFX = {
  play(id: SfxId, scene?: Phaser.Scene): void {
    if (muted) return;
    if (!isAudioUnlocked()) {
      unlockAudio(scene);
    }
    const ctx = getCtx(scene);
    if (!ctx) return;
    try {
      synth(id, ctx);
    } catch (e) {
      console.warn('[SFX]', id, e);
    }
  },

  setMuted(v: boolean): void {
    muted = v;
  },

  isMuted(): boolean {
    return muted;
  },

  setVolume(v: number): void {
    masterVol = Math.max(0, Math.min(1, v));
  },
};
