import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../game/config';
import { getUserName, isVkEnvironment } from '../vk/bridge';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  async create(): Promise<void> {
    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;
    this.cameras.main.setBackgroundColor(COLORS.bgDark);

    // moon
    this.add.circle(w / 2, h * 0.2, 48, COLORS.moon, 0.95);
    this.add.circle(w / 2 + 18, h * 0.18, 40, COLORS.bgDark, 1);

    // hero art
    if (this.textures.exists('player')) {
      this.add
        .image(w / 2, h * 0.4, 'player')
        .setDisplaySize(140, 140)
        .setDepth(5);
    } else {
      const wolf = this.add.container(w / 2, h * 0.42);
      wolf.add(this.add.circle(0, 0, 36, COLORS.playerFur));
      wolf.add(this.add.triangle(-18, -28, 0, 24, 16, 0, 0, 0, COLORS.playerFur));
      wolf.add(this.add.triangle(18, -28, 0, 24, 16, 0, 0, 0, COLORS.playerFur));
    }

    this.add
      .text(w / 2, h * 0.12, 'НОЧЬ ОБОРОТНЯ', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '30px',
        color: '#f0f4ff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(w / 2, h * 0.16, 'Blood Moon Run', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#8ab4ff',
      })
      .setOrigin(0.5);

    const name = await getUserName();
    const subtitle = name
      ? `Привет, ${name}`
      : isVkEnvironment()
        ? 'VK Games'
        : 'Режим разработки (вне VK)';

    this.add
      .text(w / 2, h * 0.55, subtitle, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#a0aec0',
      })
      .setOrigin(0.5);

    this.add
      .text(w / 2, h * 0.6, 'Джойстик — движение\nАвто-атака · Вой · Трансформация', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#8899aa',
        align: 'center',
      })
      .setOrigin(0.5);

    const btn = this.add.container(w / 2, h * 0.72);
    const bg = this.add
      .rectangle(0, 0, 220, 52, COLORS.accent, 1)
      .setStrokeStyle(2, 0xffffff, 0.25)
      .setInteractive({ useHandCursor: true });
    const label = this.add
      .text(0, 0, 'ИГРАТЬ', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: '#fff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    btn.add([bg, label]);

    bg.on('pointerover', () => bg.setFillStyle(0xd44a5a));
    bg.on('pointerout', () => bg.setFillStyle(COLORS.accent));
    bg.on('pointerdown', () => {
      this.scene.start('Game');
    });

    // keyboard / desktop help
    this.add
      .text(w / 2, h * 0.88, 'WASD / стрелки · Space = Вой · T = Transform', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#556677',
      })
      .setOrigin(0.5);

    this.add
      .text(w / 2, h * 0.94, 'План: docs/PLAN.md · VK Mini Apps', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '10px',
        color: '#445566',
      })
      .setOrigin(0.5);
  }
}
