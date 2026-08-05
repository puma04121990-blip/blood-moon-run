import Phaser from 'phaser';
import { BALANCE, COLORS, GAME_WIDTH } from '../game/config';

export interface HudState {
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  xpToNext: number;
  currency: number;
  wave: number;
  waveTotal: number;
  elapsedSec: number;
  skillCharges: number;
  moon: number;
  transformed: boolean;
  paused: boolean;
}

/**
 * Portrait HUD matching reference layout (Pickle Pete style):
 * top: pause, HP, XP/level, currency, wave, timer
 * bottom-left: skill charges
 */
export class HUD {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container;
  private hpBar: Phaser.GameObjects.Rectangle;
  private xpBar: Phaser.GameObjects.Rectangle;
  private levelText: Phaser.GameObjects.Text;
  private currencyText: Phaser.GameObjects.Text;
  private waveText: Phaser.GameObjects.Text;
  private timerText: Phaser.GameObjects.Text;
  private skillText: Phaser.GameObjects.Text;
  private skillBtn: Phaser.GameObjects.Container;
  private moonBar: Phaser.GameObjects.Rectangle;
  private transformHint: Phaser.GameObjects.Text;
  private pauseBtn: Phaser.GameObjects.Container;
  private onPause: () => void;
  private onSkill: () => void;

  constructor(scene: Phaser.Scene, onPause: () => void, onSkill: () => void) {
    this.scene = scene;
    this.onPause = onPause;
    this.onSkill = onSkill;
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(900);

    // Pause
    this.pauseBtn = this.makeCircleButton(28, 36, 'Ⅱ', () => this.onPause());
    this.root.add(this.pauseBtn);

    // HP bar background
    const barX = 56;
    const barY = 28;
    const hpW = 140;
    this.root.add(scene.add.rectangle(barX + hpW / 2, barY, hpW, 14, 0x222222, 0.85).setOrigin(0.5));
    this.hpBar = scene.add.rectangle(barX, barY, hpW, 14, COLORS.hp, 1).setOrigin(0, 0.5);
    this.root.add(this.hpBar);

    // Level badge + XP
    const xpX = barX + hpW + 8;
    this.levelText = scene.add
      .text(xpX + 12, barY, '1', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#fff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.root.add(scene.add.rectangle(xpX + 12, barY, 24, 16, 0x1a3a1a, 0.95).setStrokeStyle(1, COLORS.xp));
    this.root.add(this.levelText);

    const xpW = 100;
    this.root.add(scene.add.rectangle(xpX + 30 + xpW / 2, barY, xpW, 12, 0x222222, 0.85));
    this.xpBar = scene.add.rectangle(xpX + 30, barY, 0, 12, COLORS.xp, 1).setOrigin(0, 0.5);
    this.root.add(this.xpBar);

    // Currency
    this.root.add(scene.add.circle(28, 64, 8, COLORS.moon, 1));
    this.currencyText = scene.add
      .text(42, 64, '0', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#e8c547',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);
    this.root.add(this.currencyText);

    // Wave + timer (center top)
    const panel = scene.add.rectangle(GAME_WIDTH / 2, 52, 120, 40, COLORS.uiPanel, 0.75).setStrokeStyle(1, 0xffffff, 0.15);
    this.root.add(panel);
    this.waveText = scene.add
      .text(GAME_WIDTH / 2, 42, 'ВОЛНА 1/10', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#e8eef8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.timerText = scene.add
      .text(GAME_WIDTH / 2, 60, '00:00', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#a0aec0',
      })
      .setOrigin(0.5);
    this.root.add(this.waveText);
    this.root.add(this.timerText);

    // Moon bar (beast meter)
    const moonY = 88;
    this.root.add(
      scene.add
        .text(GAME_WIDTH / 2, moonY - 12, 'ЛУНА', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '10px',
          color: '#8ab4ff',
        })
        .setOrigin(0.5),
    );
    this.root.add(scene.add.rectangle(GAME_WIDTH / 2, moonY, 160, 8, 0x222222, 0.85));
    this.moonBar = scene.add.rectangle(GAME_WIDTH / 2 - 80, moonY, 0, 8, COLORS.moonGlow, 1).setOrigin(0, 0.5);
    this.root.add(this.moonBar);
    this.transformHint = scene.add
      .text(GAME_WIDTH / 2, moonY + 14, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#ffb4c0',
      })
      .setOrigin(0.5);
    this.root.add(this.transformHint);

    // Skill button bottom-left
    this.skillBtn = scene.add.container(48, scene.scale.height - 100);
    const skillBg = scene.add.circle(0, 0, 36, 0x2a1a40, 0.9).setStrokeStyle(3, COLORS.howl, 0.9);
    this.skillText = scene.add
      .text(0, 0, '3', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        color: '#fff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const skillLabel = scene.add
      .text(0, 22, 'ВОЙ', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '10px',
        color: '#c9b0ff',
      })
      .setOrigin(0.5);
    // howl icon
    const fang = scene.add.triangle(-14, -8, 0, 12, 10, 0, 0, 0, COLORS.howl, 0.9);
    this.skillBtn.add([skillBg, fang, this.skillText, skillLabel]);
    this.skillBtn.setScrollFactor(0).setDepth(1002);
    this.skillBtn.setSize(72, 72);
    skillBg.setInteractive({ useHandCursor: true });
    skillBg.on('pointerdown', (p: Phaser.Input.Pointer) => {
      p.event.stopPropagation();
      this.onSkill();
    });
    this.root.add(this.skillBtn);

    // Keep skill at bottom on resize
    scene.scale.on('resize', this.layout, this);
    this.layout();
  }

  private makeCircleButton(x: number, y: number, label: string, cb: () => void): Phaser.GameObjects.Container {
    const c = this.scene.add.container(x, y);
    const bg = this.scene.add.circle(0, 0, 18, 0x1a2030, 0.9).setStrokeStyle(2, 0xffffff, 0.35);
    const t = this.scene.add
      .text(0, 0, label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#fff',
      })
      .setOrigin(0.5);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', (p: Phaser.Input.Pointer) => {
      p.event.stopPropagation();
      cb();
    });
    c.add([bg, t]);
    return c;
  }

  private layout = (): void => {
    const h = this.scene.scale.height;
    this.skillBtn.setPosition(48, h - 100);
  };

  update(state: HudState): void {
    const hpRatio = Phaser.Math.Clamp(state.hp / state.maxHp, 0, 1);
    this.hpBar.width = 140 * hpRatio;
    this.hpBar.fillColor = hpRatio < 0.3 ? 0xff3030 : COLORS.hp;

    const xpRatio = state.xpToNext > 0 ? Phaser.Math.Clamp(state.xp / state.xpToNext, 0, 1) : 0;
    this.xpBar.width = 100 * xpRatio;
    this.levelText.setText(String(state.level));

    this.currencyText.setText(String(state.currency));
    this.waveText.setText(`ВОЛНА ${state.wave}/${state.waveTotal}`);
    this.timerText.setText(formatTime(state.elapsedSec));
    this.skillText.setText(String(state.skillCharges));

    const moonRatio = Phaser.Math.Clamp(state.moon / BALANCE.moonMax, 0, 1);
    this.moonBar.width = 160 * moonRatio;
    if (state.transformed) {
      this.transformHint.setText('ЗВЕРИНАЯ ФОРМА!');
      this.moonBar.fillColor = COLORS.accent;
    } else if (moonRatio >= 1) {
      this.transformHint.setText('ГОТОВ К ТРАНСФОРМАЦИИ');
      this.moonBar.fillColor = COLORS.gold;
    } else {
      this.transformHint.setText('');
      this.moonBar.fillColor = COLORS.moonGlow;
    }
  }

  destroy(): void {
    this.scene.scale.off('resize', this.layout, this);
    this.root.destroy(true);
  }
}

function formatTime(sec: number): string {
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}
