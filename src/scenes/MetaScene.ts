import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../game/config';
import {
  META_UPGRADES,
  getMetaCached,
  saveMetaNow,
  tryBuy,
  nextCost,
  type MetaState,
  type MetaUpgradeId,
} from '../meta/progress';

/**
 * Meta upgrade shop — spend lunar shards between runs.
 * Fully synchronous create (no async) so UI never freezes.
 */
export class MetaScene extends Phaser.Scene {
  private state!: MetaState;
  private shardsText!: Phaser.GameObjects.Text;
  private toast?: Phaser.GameObjects.Text;

  constructor() {
    super('Meta');
  }

  create(): void {
    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;
    this.cameras.main.setBackgroundColor(COLORS.bgDark);
    this.state = { ...getMetaCached(), levels: { ...getMetaCached().levels } };

    this.add
      .text(w / 2, 36, 'УСИЛЕНИЯ', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '26px',
        color: '#f0f4ff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(w / 2, 64, 'Постоянные бонусы между ночами', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#8899aa',
      })
      .setOrigin(0.5);

    if (this.textures.exists('pickup_moon')) {
      this.add.image(w / 2 - 40, 96, 'pickup_moon').setDisplaySize(28, 28);
    } else {
      this.add.circle(w / 2 - 40, 96, 10, COLORS.moon);
    }
    this.shardsText = this.add
      .text(w / 2 - 20, 96, String(this.state.shards), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: '#e8c547',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    this.add
      .text(w / 2, 124, `Рекорды: волна ${this.state.bestWave} · ранов ${this.state.runs}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#667788',
      })
      .setOrigin(0.5);

    const startY = 160;
    const rowH = 72;
    META_UPGRADES.forEach((def, i) => {
      this.buildRow(def.id, w / 2, startY + i * rowH);
    });

    const backY = Math.min(h - 48, startY + META_UPGRADES.length * rowH + 24);
    const backBg = this.add
      .rectangle(w / 2, backY, 200, 44, 0x1a2838, 1)
      .setStrokeStyle(1, 0xffffff, 0.2)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(w / 2, backY, '← В меню', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#fff',
      })
      .setOrigin(0.5);
    backBg.on('pointerup', () => this.scene.start('Menu'));
  }

  private buildRow(id: MetaUpgradeId, x: number, y: number): void {
    const def = META_UPGRADES.find((u) => u.id === id)!;
    const lv = this.state.levels[id] || 0;
    const cost = nextCost(this.state, id);
    const maxed = cost === null;

    const bg = this.add
      .rectangle(x, y, 350, 64, 0x121a24, 0.95)
      .setStrokeStyle(1, maxed ? 0x5cb85c : 0xffffff, maxed ? 0.35 : 0.12);

    this.add
      .text(x - 160, y - 14, def.name, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        color: '#e8eef8',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    this.add
      .text(x - 160, y + 8, `${def.desc(Math.max(1, lv))} · ур. ${lv}/${def.maxLevel}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#8ab4ff',
      })
      .setOrigin(0, 0.5);

    const btnLabel = maxed ? 'МАКС' : `${cost} ☽`;
    const canBuy = !maxed && this.state.shards >= (cost || 0);
    const btn = this.add
      .rectangle(x + 130, y, 72, 36, maxed ? 0x1a3a1a : canBuy ? COLORS.accent : 0x333344, 1)
      .setStrokeStyle(1, 0xffffff, 0.15);

    this.add
      .text(x + 130, y, btnLabel, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#fff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    if (!maxed) {
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerup', () => {
        const result = tryBuy(this.state, id);
        if (!result.ok) {
          this.showToast(result.reason || 'Нельзя');
          return;
        }
        this.state = result.state;
        saveMetaNow(this.state);
        this.showToast('Куплено!');
        this.scene.restart();
      });
    }

    // silence unused
    void bg;
  }

  private showToast(msg: string): void {
    this.toast?.destroy();
    this.toast = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 100, msg, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#ffd080',
        backgroundColor: '#000000aa',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(500);
    this.time.delayedCall(900, () => {
      this.toast?.destroy();
      this.toast = undefined;
    });
  }
}
