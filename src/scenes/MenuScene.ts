import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../game/config';
import { getUserName, isVkEnvironment } from '../vk/bridge';
import { getMetaCached } from '../meta/progress';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;
    this.cameras.main.setBackgroundColor(COLORS.bgDark);

    const meta = getMetaCached();

    // moon
    this.add.circle(w / 2, h * 0.18, 48, COLORS.moon, 0.95);
    this.add.circle(w / 2 + 18, h * 0.16, 40, COLORS.bgDark, 1);

    if (this.textures.exists('player')) {
      this.add
        .image(w / 2, h * 0.36, 'player')
        .setDisplaySize(130, 130)
        .setDepth(5);
    }

    this.add
      .text(w / 2, h * 0.1, 'НОЧЬ ОБОРОТНЯ', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        color: '#f0f4ff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(w / 2, h * 0.14, 'Blood Moon Run', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#8ab4ff',
      })
      .setOrigin(0.5);

    if (this.textures.exists('pickup_moon')) {
      this.add.image(w / 2 - 28, h * 0.5, 'pickup_moon').setDisplaySize(22, 22);
    } else {
      this.add.circle(w / 2 - 28, h * 0.5, 8, COLORS.moon);
    }
    this.add
      .text(w / 2 - 12, h * 0.5, String(meta.shards), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#e8c547',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    const subtitle = isVkEnvironment() ? 'VK Games' : 'Режим разработки (вне VK)';
    const subText = this.add
      .text(w / 2, h * 0.55, subtitle, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#a0aec0',
      })
      .setOrigin(0.5);

    // Name is optional — never block UI
    void getUserName().then((name) => {
      if (name && subText.active) subText.setText(`Привет, ${name}`);
    });

    this.add
      .text(w / 2, h * 0.59, `Рекорд: волна ${meta.bestWave} · ранов ${meta.runs}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#667788',
      })
      .setOrigin(0.5);

    this.makeButton(w / 2, h * 0.68, 220, 52, 'ИГРАТЬ', COLORS.accent, () => {
      this.scene.start('Game');
    });

    this.makeButton(w / 2, h * 0.77, 220, 48, 'УСИЛЕНИЯ', 0x3a2a60, () => {
      this.scene.start('Meta');
    });

    this.add
      .text(w / 2, h * 0.9, 'WASD · Space = Вой · T = Transform', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#556677',
      })
      .setOrigin(0.5);

    this.add
      .text(w / 2, h * 0.95, 'docs/PLAN.md · VK Mini Apps', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '10px',
        color: '#445566',
      })
      .setOrigin(0.5);
  }

  private makeButton(
    x: number,
    y: number,
    bw: number,
    bh: number,
    label: string,
    color: number,
    onClick: () => void,
  ): void {
    const bg = this.add
      .rectangle(x, y, bw, bh, color, 1)
      .setStrokeStyle(2, 0xffffff, 0.25)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(x, y, label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#fff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const hover = Phaser.Display.Color.IntegerToColor(color);
    hover.brighten(20);
    const hoverColor = hover.color;

    bg.on('pointerover', () => bg.setFillStyle(hoverColor));
    bg.on('pointerout', () => bg.setFillStyle(color));
    // pointerup is more reliable on touch than pointerdown alone
    bg.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (p.leftButtonReleased() || p.wasTouch) {
        onClick();
      }
    });
  }
}
