import Phaser from 'phaser';
import { initVk } from '../vk/bridge';

const SPRITES = [
  'player',
  'player_beast',
  'player_idle',
  'player_walk1',
  'player_walk2',
  'player_attack',
  'enemy_villager',
  'enemy_dog',
  'enemy_hunter',
  'enemy_silver',
  'enemy_boss',
  'pickup_moon',
] as const;

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(0x0a0e14);

    this.add
      .text(width / 2, height / 2 - 60, 'НОЧЬ ОБОРОТНЯ', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        color: '#e8eef8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const status = this.add
      .text(width / 2, height / 2 + 20, 'Загрузка…', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#a0aec0',
      })
      .setOrigin(0.5);

    this.add.rectangle(width / 2, height / 2 + 56, 200, 10, 0x222222);
    const bar = this.add.rectangle(width / 2 - 100, height / 2 + 56, 0, 10, 0x5cb85c).setOrigin(0, 0.5);

    this.load.on('progress', (v: number) => {
      bar.width = 200 * v;
      status.setText(`Загрузка… ${Math.floor(v * 100)}%`);
    });

    for (const key of SPRITES) {
      this.load.image(key, `assets/sprites/${key}.png`);
    }

    // Sprite sheets for animations (frame size 128×128)
    this.load.spritesheet('player_walk_sheet', 'assets/sprites/player_walk_sheet.png', {
      frameWidth: 128,
      frameHeight: 128,
    });
    this.load.spritesheet('player_attack_sheet', 'assets/sprites/player_attack_sheet.png', {
      frameWidth: 128,
      frameHeight: 128,
    });
  }

  async create(): Promise<void> {
    // Register animations once textures exist
    if (this.textures.exists('player_walk_sheet') && !this.anims.exists('player_walk')) {
      this.anims.create({
        key: 'player_walk',
        frames: this.anims.generateFrameNumbers('player_walk_sheet', { start: 0, end: 3 }),
        frameRate: 8,
        repeat: -1,
      });
    }
    if (this.textures.exists('player_attack_sheet') && !this.anims.exists('player_attack')) {
      this.anims.create({
        key: 'player_attack',
        frames: this.anims.generateFrameNumbers('player_attack_sheet', { start: 0, end: 1 }),
        frameRate: 10,
        repeat: 0,
      });
    }
    if (this.textures.exists('player_walk_sheet') && !this.anims.exists('player_idle')) {
      this.anims.create({
        key: 'player_idle',
        frames: [{ key: 'player_walk_sheet', frame: 0 }],
        frameRate: 1,
        repeat: -1,
      });
    }

    const { width, height } = this.scale;
    const status = this.add
      .text(width / 2, height / 2 + 90, 'Аутентификация…', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#a0aec0',
      })
      .setOrigin(0.5);

    await initVk();
    status.setText('Вход в игру…');

    this.time.delayedCall(350, () => {
      this.scene.start('Menu');
    });
  }
}
