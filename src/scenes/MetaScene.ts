import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../game/config';
import {
  META_UPGRADES,
  loadMeta,
  saveMeta,
  tryBuy,
  nextCost,
  type MetaState,
} from '../meta/progress';

/**
 * Meta upgrade shop — spend lunar shards between runs.
 */
export class MetaScene extends Phaser.Scene {
  private state!: MetaState;
  private shardsText!: Phaser.GameObjects.Text;
  private rows: Phaser.GameObjects.Container[] = [];
  private toast?: Phaser.GameObjects.Text;

  constructor() {
    super('Meta');
  }

  async create(): Promise<void> {
    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;
    this.cameras.main.setBackgroundColor(COLORS.bgDark);
    this.state = await loadMeta();
    this.rows = [];

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

    // shards header
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

    // scrollable-ish list
    const startY = 160;
    const rowH = 72;
    META_UPGRADES.forEach((def, i) => {
      const y = startY + i * rowH;
      const row = this.buildRow(def.id, w / 2, y);
      this.rows.push(row);
    });

    // back button
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
    backBg.on('pointerdown', () => this.scene.start('Menu'));
  }

  private buildRow(id: (typeof META_UPGRADES)[number]['id'], x: number, y: number): Phaser.GameObjects.Container {
    const def = META_UPGRADES.find((u) => u.id === id)!;
    const lv = this.state.levels[id] || 0;
    const cost = nextCost(this.state, id);
    const maxed = cost === null;

    const c = this.add.container(x, y);
    const bg = this.add
      .rectangle(0, 0, 350, 64, 0x121a24, 0.95)
      .setStrokeStyle(1, maxed ? 0x5cb85c : 0xffffff, maxed ? 0.35 : 0.12);
    const title = this.add
      .text(-160, -14, def.name, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        color: '#e8eef8',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);
    const desc = this.add
      .text(-160, 8, `${def.desc(Math.max(1, lv))} · ур. ${lv}/${def.maxLevel}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#8ab4ff',
      })
      .setOrigin(0, 0.5);

    const btnLabel = maxed ? 'МАКС' : `${cost} ☽`;
    const canBuy = !maxed && this.state.shards >= (cost || 0);
    const btn = this.add
      .rectangle(130, 0, 72, 36, maxed ? 0x1a3a1a : canBuy ? COLORS.accent : 0x333344, 1)
      .setStrokeStyle(1, 0xffffff, 0.15)
      .setInteractive({ useHandCursor: !maxed });
    const btnText = this.add
      .text(130, 0, btnLabel, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#fff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    c.add([bg, title, desc, btn, btnText]);
    c.setData('id', id);

    if (!maxed) {
      btn.on('pointerdown', async () => {
        const result = tryBuy(this.state, id);
        if (!result.ok) {
          this.showToast(result.reason || 'Нельзя');
          return;
        }
        this.state = result.state;
        await saveMeta(this.state);
        this.refreshAll();
        this.showToast('Куплено!');
      });
    }

    return c;
  }

  private refreshAll(): void {
    this.shardsText.setText(String(this.state.shards));
    // rebuild rows simply by restarting scene content
    this.scene.restart();
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
