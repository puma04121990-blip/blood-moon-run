import type Phaser from 'phaser';

/**
 * Mobile / VK WebView audio unlock.
 * Must run inside a real user gesture (pointerup / touch).
 */

let unlocked = false;
let warmedCtx: AudioContext | null = null;

export function isAudioUnlocked(): boolean {
  return unlocked;
}

/** Shared context created during unlock — SoundManager reuses it */
export function getWarmedContext(): AudioContext | null {
  return warmedCtx;
}

function getAC(): typeof AudioContext | null {
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ||
    null
  );
}

/**
 * Unlock + warm AudioContext inside user gesture.
 * Plays a tiny silent buffer so iOS fully unlocks output.
 */
export function unlockAudio(scene?: Phaser.Scene): void {
  try {
    // Phaser unlock (if any)
    if (scene?.sound) {
      try {
        if (scene.sound.locked) scene.sound.unlock();
        const pc = scene.sound.context as AudioContext | undefined;
        if (pc?.state === 'suspended') void pc.resume();
      } catch {
        /* ignore */
      }
    }

    const AC = getAC();
    if (!AC) {
      unlocked = true;
      return;
    }

    if (!warmedCtx || warmedCtx.state === 'closed') {
      warmedCtx = new AC();
    }

    const ctx = warmedCtx;

    const finish = () => {
      unlocked = true;
      // Silent one-shot — critical for iOS / VK WebView
      try {
        const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
      } catch {
        /* ignore */
      }
      console.info('[Audio] unlocked, state=', ctx.state);
    };

    if (ctx.state === 'suspended') {
      void ctx.resume().then(finish).catch(finish);
    } else {
      finish();
    }
  } catch (e) {
    console.warn('[Audio] unlock failed', e);
    unlocked = true;
  }
}
