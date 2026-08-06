import type Phaser from 'phaser';

/**
 * Mobile / VK WebView audio unlock.
 * Browsers keep AudioContext in 'suspended' until a real user gesture.
 * Call this from pointerup / touch handlers before playing any sound.
 */

let unlocked = false;

export function isAudioUnlocked(): boolean {
  return unlocked;
}

/**
 * Unlock Phaser Sound Manager + underlying AudioContext.
 * Safe to call multiple times.
 */
export function unlockAudio(scene?: Phaser.Scene): void {
  if (unlocked) return;

  // Phaser 3 helper
  if (scene?.sound) {
    try {
      if (scene.sound.locked) {
        scene.sound.unlock();
      }
      const ctx = scene.sound.context as AudioContext | undefined;
      if (ctx?.state === 'suspended') {
        void ctx.resume().catch(() => {
          /* still locked — will retry on next gesture */
        });
      }
    } catch (e) {
      console.warn('[Audio] Phaser unlock failed', e);
    }
  }

  // Fallback: force a short-lived context (helps some Android WebViews)
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AC) {
      const tmp = new AC();
      if (tmp.state === 'suspended') {
        void tmp.resume().finally(() => {
          void tmp.close().catch(() => {});
        });
      } else {
        void tmp.close().catch(() => {});
      }
    }
  } catch {
    /* ignore */
  }

  unlocked = true;
  console.info('[Audio] unlocked');
}
