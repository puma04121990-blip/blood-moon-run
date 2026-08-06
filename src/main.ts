import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { MetaScene } from './scenes/MetaScene';

/**
 * RESIZE = canvas always matches the real device viewport.
 * No letterbox bars. Layout uses this.scale.width / height in scenes.
 */
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#0a0e14',
  // Initial size — immediately replaced by RESIZE to real viewport
  width: 360,
  height: 800,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 360,
    height: 800,
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

document.addEventListener(
  'touchmove',
  (e) => {
    e.preventDefault();
  },
  { passive: false },
);

document.addEventListener('gesturestart', (e) => e.preventDefault());

const game = new Phaser.Game(config);

function refreshScale(): void {
  try {
    game.scale.resize(
      window.visualViewport?.width ?? window.innerWidth,
      window.visualViewport?.height ?? window.innerHeight,
    );
  } catch {
    /* not ready */
  }
}

window.addEventListener('resize', refreshScale);
window.addEventListener('orientationchange', () => {
  setTimeout(refreshScale, 150);
  setTimeout(refreshScale, 400);
});

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', refreshScale);
}

requestAnimationFrame(() => {
  refreshScale();
  setTimeout(refreshScale, 50);
  setTimeout(refreshScale, 300);
});
