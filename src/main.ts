import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './game/config';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { MetaScene } from './scenes/MetaScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#0a0e14',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  scale: {
    // ENVELOP = cover entire parent (no side bars). Uniform scale, may crop top/bottom slightly.
    // Does NOT stretch sprites.
    mode: Phaser.Scale.ENVELOP,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    autoRound: true,
  },
  input: {
    activePointers: 3,
    keyboard: true,
  },
  scene: [BootScene, MenuScene, MetaScene, GameScene],
  fps: {
    target: 60,
    forceSetTimeOut: false,
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: true,
    powerPreference: 'high-performance',
  },
};

// Prevent pull-to-refresh / overscroll on mobile
document.addEventListener(
  'touchmove',
  (e) => {
    e.preventDefault();
  },
  { passive: false },
);

// Block pinch-zoom gestures
document.addEventListener('gesturestart', (e) => e.preventDefault());

const game = new Phaser.Game(config);

/** Refresh scale when mobile browser chrome shows/hides or orientation changes */
function refreshScale(): void {
  try {
    // Prefer visualViewport size when available (more accurate with browser chrome)
    const w = window.visualViewport?.width ?? window.innerWidth;
    const h = window.visualViewport?.height ?? window.innerHeight;
    game.scale.parentSize.setSize(w, h);
    game.scale.refresh();
  } catch {
    /* game not ready */
  }
}

window.addEventListener('resize', refreshScale);
window.addEventListener('orientationchange', () => {
  setTimeout(refreshScale, 150);
  setTimeout(refreshScale, 400);
});

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', refreshScale);
  window.visualViewport.addEventListener('scroll', refreshScale);
}

requestAnimationFrame(() => {
  refreshScale();
  setTimeout(refreshScale, 100);
  setTimeout(refreshScale, 500);
});
