import Phaser from 'phaser';
import { BALANCE, COLORS } from '../game/config';

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

/** Portrait HUD — positions use real scale width/height (RESIZE mode). */
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
  private wavePanel!: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, onPause: () => void, onSkill: () => void) {
    this.scene = scene;
    this.onPause = onPause;
    this.onSkill = onSkill;
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(900);

    const topY = 28;

    this.pauseBtn = this.makeCircleButton(28, topY + 8, 'Ⅱ', () => this.onPause());
    this.root.add(this.pauseBtn);

    const barX = 56;
    const hpW = 120;
    this.root.add(scene.add.rectangle(barX + hpW / 2, topY, hpW, 14, 0x222222, 0.85).setOrigin(0.5));
    this.hpBar = scene.add.rectangle(barX, topY, hpW, 14, COLORS.hp, 1).setOrigin(0, 0.5);
    this.root.add(this.hpBar);

    const xpX = barX + hpW + 8;
    this.levelText = scene.add
      .text(xpX + 12, topY, '1', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#fff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.root.add(scene.add.rectangle(xpX + 12, topY, 24, 16, 0x1a3a1a, 0.95).setStrokeStyle(1, COLORS.xp));
    this.root.add(this.levelText);

    const xpW = 80;
    this.root.add(scene.add.rectangle(xpX + 30 + xpW / 2, topY, xpW, 12, 0x222222, 0.85));
    this.xpBar = scene.add.rectangle(xpX + 30, topY, 0, 12, COLORS.xp, 1).setOrigin(0, 0.5);
    this.root.add(this.xpBar);

    this.root.add(scene.add.circle(28, topY + 36, 8, COLORS.moon, 1));
    this.currencyText = scene.add
      .text(42, topY + 36, '0', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#e8c547',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);
    this.root.add(this.currencyText);

    const panelY = topY + 24;
    this.wavePanel = scene.add
      .rectangle(0, panelY, 120, 40, COLORS.uiPanel, 0.75)
      .setStrokeStyle(1, 0xffffff, 0.15);
    this.root.add(this.wavePanel);
    this.waveText = scene.add
      .text(0, panelY - 10, 'ВОЛНА 1/10', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#e8eef8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.timerText = scene.add
      .text(0, panelY + 8, '00:00', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#a0aec0',
      })
      .setOrigin(0.5);
    this.root.add(this.waveText);
    this.root.add(this.timerText);

    const moonY = panelY + 40;
    this.root.add(
      scene.add
        .text(0, moonY - 12, 'ЛУНА', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '10px',
          color: '#8ab4ff',
        })
        .setOrigin(0.5)
        .setName('moonLabel'),
    );
    this.root.add(scene.add.rectangle(0, moonY, 160, 8, 0x222222, 0.85).setName('moonBg'));
    this.moonBar = scene.add.rectangle(-80, moonY, 0, 8, COLORS.moonGlow, 1).setOrigin(0, 0.5);
    this.root.add(this.moonBar);
    this.transformHint = scene.add
      .text(0, moonY + 14, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#ffb4c0',
      })
      .setOrigin(0.5);
    this.root.add(this.transformHint);

    this.skillBtn = scene.add.container(48, 0);
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
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const cx = w / 2;

    this.wavePanel.setX(cx);
    this.waveText.setX(cx);
    this.timerText.setX(cx);

    const moonLabel = this.root.getByName('moonLabel') as Phaser.GameObjects.Text | null;
    const moonBg = this.root.getByName('moonBg') as Phaser.GameObjects.Rectangle | null;
    if (moonLabel) moonLabel.setX(cx);
    if (moonBg) moonBg.setX(cx);
    this.moonBar.setX(cx - 80);
    this.transformHint.setX(cx);

    this.skillBtn.setPosition(48, h - 100);
  };

  update(state: HudState): void {
    const hpRatio = Phaser.Math.Clamp(state.hp / state.maxHp, 0, 1);
    this.hpBar.width = 120 * hpRatio;
    this.hpBar.fillColor = hpRatio < 0.3 ? 0xff3030 : COLORS.hp;

    const xpRatio = state.xpToNext > 0 ? Phaser.Math.Clamp(state.xp / state.xpToNext, 0, 1) : 0;
    this.xpBar.width = 80 * xpRatio;
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
