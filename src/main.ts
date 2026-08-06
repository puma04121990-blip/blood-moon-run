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
    // FIT = always show FULL game (menu, HUD, buttons). No crop.
    // Uniform scale — sprites never stretch.
    // Letterbox bars match backgroundColor so they blend on mobile.
    mode: Phaser.Scale.FIT,
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
    const parent = document.getElementById('game-container');
    if (parent) {
      game.scale.parentSize.setSize(parent.clientWidth, parent.clientHeight);
    } else {
      const w = window.visualViewport?.width ?? window.innerWidth;
      const h = window.visualViewport?.height ?? window.innerHeight;
      game.scale.parentSize.setSize(w, h);
    }
    game.scale.refresh();
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
  setTimeout(refreshScale, 100);
  setTimeout(refreshScale, 500);
});
