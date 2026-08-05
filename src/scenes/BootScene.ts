import Phaser from 'phaser';
import { initVk } from '../vk/bridge';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    // Procedural game — no external assets for vertical slice
  }

  async create(): Promise<void> {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(0x0a0e14);

    this.add
      .text(width / 2, height / 2 - 40, 'НОЧЬ ОБОРОТНЯ', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        color: '#e8eef8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2, 'Blood Moon Run', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#8ab4ff',
      })
      .setOrigin(0.5);

    const status = this.add
      .text(width / 2, height / 2 + 48, 'Аутентификация…', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#a0aec0',
      })
      .setOrigin(0.5);

    const barBg = this.add.rectangle(width / 2, height / 2 + 80, 200, 10, 0x222222);
    const bar = this.add.rectangle(width / 2 - 100, height / 2 + 80, 0, 10, 0x5cb85c).setOrigin(0, 0.5);

    this.tweens.add({
      targets: bar,
      width: 200,
      duration: 900,
      ease: 'Sine.easeInOut',
    });

    await initVk();
    status.setText('Вход в игру…');

    this.time.delayedCall(500, () => {
      this.scene.start('Menu');
    });
  }
}
