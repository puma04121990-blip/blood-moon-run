import Phaser from 'phaser';
import { COLORS } from '../game/config';
import { getUserName, isVkEnvironment } from '../vk/bridge';
import { getMetaCached } from '../meta/progress';
import { unlockAudio } from '../audio/unlock';
import { SFX } from '../audio/SoundManager';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    this.cameras.main.setBackgroundColor(COLORS.bgDark);

    const meta = getMetaCached();

    // Moon decoration
    this.add.circle(w / 2, h * 0.18, 48, COLORS.moon, 0.95);
    this.add.circle(w / 2 + 18, h * 0.16, 40, COLORS.bgDark, 1);

    if (this.textures.exists('player')) {
      this.add.image(w / 2, h * 0.34, 'player').setDisplaySize(130, 130).setDepth(5);
    }

    this.add
      .text(w / 2, h * 0.08, 'НОЧЬ ОБОРОТНЯ', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        color: '#f0f4ff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(w / 2, h * 0.125, 'Blood Moon Run', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#8ab4ff',
      })
      .setOrigin(0.5);

    if (this.textures.exists('pickup_moon')) {
      this.add.image(w / 2 - 28, h * 0.48, 'pickup_moon').setDisplaySize(22, 22);
    } else {
      this.add.circle(w / 2 - 28, h * 0.48, 8, COLORS.moon);
    }
    this.add
      .text(w / 2 - 12, h * 0.48, String(meta.shards), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#e8c547',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    const subtitle = isVkEnvironment() ? 'VK Games' : 'Режим разработки (вне VK)';
    const subText = this.add
      .text(w / 2, h * 0.54, subtitle, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#a0aec0',
      })
      .setOrigin(0.5);

    void getUserName().then((name) => {
      if (name && subText.active) subText.setText(`Привет, ${name}`);
    });

    this.add
      .text(w / 2, h * 0.58, `Рекорд: волна ${meta.bestWave} · ранов ${meta.runs}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#667788',
      })
      .setOrigin(0.5);

    this.makeButton(w / 2, h * 0.68, Math.min(240, w - 40), 52, 'ИГРАТЬ', COLORS.accent, () => {
      unlockAudio(this);
      SFX.play('ui', this);
      SFX.startMusic(this);
      this.scene.start('Game');
    });

    this.makeButton(w / 2, h * 0.78, Math.min(240, w - 40), 48, 'УСИЛЕНИЯ', 0x3a2a60, () => {
      unlockAudio(this);
      SFX.play('ui', this);
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
      .text(w / 2, h * 0.95, 'VK Mini Apps', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '10px',
        color: '#445566',
      })
      .setOrigin(0.5);

    this.input.once('pointerdown', () => {
      unlockAudio(this);
      SFX.play('ui', this);
    });
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
    bg.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (p.leftButtonReleased() || p.wasTouch) onClick();
    });
  }
}
