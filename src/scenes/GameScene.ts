import Phaser from 'phaser';
import {
  BALANCE,
  COLORS,
  GAME_HEIGHT,
  GAME_WIDTH,
  getWavePlan,
  type EnemyKind,
} from '../game/config';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { VirtualJoystick } from '../ui/VirtualJoystick';
import { HUD } from '../ui/HUD';
import { shareScore, showRewardedAd, storageGet, storageSet } from '../vk/bridge';

interface Pickup {
  sprite: Phaser.GameObjects.Arc;
  value: number;
}

/**
 * Vertical slice: joystick move, auto-attack, waves, howl skill,
 * moon transform, level-up, death + continue (rewarded).
 */
export class GameScene extends Phaser.Scene {
  private player!: Player;
  private joystick!: VirtualJoystick;
  private hud!: HUD;
  private enemies: Enemy[] = [];
  private pickups: Pickup[] = [];
  private keys!: {
    w: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
    up: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    space: Phaser.Input.Keyboard.Key;
    t: Phaser.Input.Keyboard.Key;
  };
  private worldBounds!: Phaser.Geom.Rectangle;
  private wave = 1;
  private waveKillsLeft = 0;
  private waveSpawning = false;
  private spawnTimer?: Phaser.Time.TimerEvent;
  private elapsed = 0;
  private paused = false;
  private gameOver = false;
  private overlay?: Phaser.GameObjects.Container;
  private levelUpOpen = false;
  private metaShards = 0;

  constructor() {
    super('Game');
  }

  async create(): Promise<void> {
    this.enemies = [];
    this.pickups = [];
    this.wave = 1;
    this.elapsed = 0;
    this.paused = false;
    this.gameOver = false;
    this.levelUpOpen = false;

    const stored = await storageGet(['shards']);
    this.metaShards = parseInt(stored.shards || '0', 10) || 0;

    // Arena larger than screen for camera follow feel
    const mapW = GAME_WIDTH * 1.6;
    const mapH = GAME_HEIGHT * 1.4;
    this.worldBounds = new Phaser.Geom.Rectangle(-mapW / 2 + GAME_WIDTH / 2, -mapH / 2 + GAME_HEIGHT / 2, mapW, mapH);

    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.drawGround();

    // Ambient moon
    this.add.circle(GAME_WIDTH * 0.8, 100, 30, COLORS.moon, 0.15).setScrollFactor(0.2).setDepth(0);

    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT / 2);
    this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.08);
    this.cameras.main.setBounds(
      this.worldBounds.x,
      this.worldBounds.y,
      this.worldBounds.width,
      this.worldBounds.height,
    );

    this.joystick = new VirtualJoystick(this, GAME_WIDTH / 2, GAME_HEIGHT - 90, 56);
    this.hud = new HUD(
      this,
      () => this.togglePause(),
      () => this.tryHowl(),
    );

    const kb = this.input.keyboard!;
    this.keys = {
      w: kb.addKey('W'),
      a: kb.addKey('A'),
      s: kb.addKey('S'),
      d: kb.addKey('D'),
      up: kb.addKey('UP'),
      left: kb.addKey('LEFT'),
      down: kb.addKey('DOWN'),
      right: kb.addKey('RIGHT'),
      space: kb.addKey('SPACE'),
      t: kb.addKey('T'),
    };

    this.keys.space.on('down', () => this.tryHowl());
    this.keys.t.on('down', () => this.tryTransform());

    this.startWave(1);
  }

  private drawGround(): void {
    const g = this.add.graphics().setDepth(0);
    g.fillStyle(COLORS.grass, 1);
    g.fillRect(
      this.worldBounds.x,
      this.worldBounds.y,
      this.worldBounds.width,
      this.worldBounds.height,
    );
    // subtle dots like reference
    g.fillStyle(0x1a2332, 0.35);
    for (let i = 0; i < 180; i++) {
      const x = this.worldBounds.x + Math.random() * this.worldBounds.width;
      const y = this.worldBounds.y + Math.random() * this.worldBounds.height;
      g.fillCircle(x, y, Math.random() * 2 + 0.5);
    }
    // props
    for (let i = 0; i < 12; i++) {
      const x = this.worldBounds.x + 40 + Math.random() * (this.worldBounds.width - 80);
      const y = this.worldBounds.y + 40 + Math.random() * (this.worldBounds.height - 80);
      g.fillStyle(0x3a2a1a, 0.6);
      g.fillCircle(x, y, 8 + Math.random() * 10);
    }
  }

  private startWave(n: number): void {
    this.wave = n;
    const plan = getWavePlan(n);
    this.waveKillsLeft = plan.count + (n === BALANCE.waveTotal ? 1 : 0);
    this.waveSpawning = true;

    let spawned = 0;
    this.spawnTimer?.remove(false);
    this.spawnTimer = this.time.addEvent({
      delay: plan.spawnIntervalMs,
      loop: true,
      callback: () => {
        if (this.paused || this.gameOver || this.levelUpOpen) return;
        if (spawned >= plan.count) {
          this.spawnTimer?.remove(false);
          this.waveSpawning = false;
          if (n === BALANCE.waveTotal) {
            this.spawnEnemy('boss');
          }
          return;
        }
        const kind = plan.kinds[spawned % plan.kinds.length] as EnemyKind;
        this.spawnEnemy(kind);
        spawned += 1;
      },
    });
  }

  private spawnEnemy(kind: EnemyKind): void {
    const edge = Phaser.Math.Between(0, 3);
    let x = this.player.x;
    let y = this.player.y;
    const margin = 40;
    switch (edge) {
      case 0:
        x = this.worldBounds.left + margin;
        y = Phaser.Math.Between(this.worldBounds.top, this.worldBounds.bottom);
        break;
      case 1:
        x = this.worldBounds.right - margin;
        y = Phaser.Math.Between(this.worldBounds.top, this.worldBounds.bottom);
        break;
      case 2:
        y = this.worldBounds.top + margin;
        x = Phaser.Math.Between(this.worldBounds.left, this.worldBounds.right);
        break;
      default:
        y = this.worldBounds.bottom - margin;
        x = Phaser.Math.Between(this.worldBounds.left, this.worldBounds.right);
    }
    // keep off player
    if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 120) {
      x = this.player.x + (Math.random() > 0.5 ? 180 : -180);
      y = this.player.y + (Math.random() > 0.5 ? 180 : -180);
    }
    this.enemies.push(new Enemy(this, x, y, kind));
  }

  update(_time: number, delta: number): void {
    if (this.gameOver || this.paused || this.levelUpOpen) {
      this.syncHud();
      return;
    }

    const dt = delta / 1000;
    this.elapsed += dt;
    const now = this.time.now;

    // movement
    let mx = this.joystick.vector.x;
    let my = this.joystick.vector.y;
    if (this.keys.a.isDown || this.keys.left.isDown) mx -= 1;
    if (this.keys.d.isDown || this.keys.right.isDown) mx += 1;
    if (this.keys.w.isDown || this.keys.up.isDown) my -= 1;
    if (this.keys.s.isDown || this.keys.down.isDown) my += 1;
    this.player.move(mx, my, dt, this.worldBounds);
    this.player.updateTransform(now);

    // auto-attack nearest
    if (this.player.canAttack(now) && this.enemies.length) {
      const range = this.player.transformed ? BALANCE.attackRange * 1.25 : BALANCE.attackRange;
      const t = this.nearestEnemy(range);
      if (t) {
        this.player.markAttack(now);
        const dmg = BALANCE.attackDamage * this.player.damageMul;
        const dead = t.takeDamage(dmg);
        this.spawnSlash(t.x, t.y);
        if (dead) this.killEnemy(t);
      }
    }

    // enemies chase + contact damage
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.chase(this.player.x, this.player.y, dt);
      const dist = Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y);
      if (dist < e.radius + this.player.radius) {
        this.player.takeDamage(e.def.damage, now, e.def.isSilver);
        e.knockback(this.player.x, this.player.y, 40);
      }
    }

    // pickups
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      const dist = Phaser.Math.Distance.Between(p.sprite.x, p.sprite.y, this.player.x, this.player.y);
      if (dist < 28) {
        this.player.currency += p.value;
        p.sprite.destroy();
        this.pickups.splice(i, 1);
      } else if (dist < 100) {
        // magnet
        p.sprite.x += (this.player.x - p.sprite.x) * 4 * dt;
        p.sprite.y += (this.player.y - p.sprite.y) * 4 * dt;
      }
    }

    // auto-transform when full moon
    if (this.player.moon >= BALANCE.moonMax) {
      this.player.tryTransform(now);
    }

    if (this.player.hp <= 0) {
      this.onDeath();
    }

    // wave clear
    if (!this.waveSpawning && this.enemies.every((e) => !e.alive) && this.enemies.length === 0) {
      // already cleared via kill path
    }

    this.syncHud();
  }

  private nearestEnemy(range: number): Enemy | null {
    let best: Enemy | null = null;
    let bestD = range;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  private spawnSlash(x: number, y: number): void {
    const c = this.add.circle(x, y, 10, COLORS.howl, 0.7).setDepth(45);
    this.tweens.add({
      targets: c,
      alpha: 0,
      scale: 2,
      duration: 160,
      onComplete: () => c.destroy(),
    });
  }

  private killEnemy(e: Enemy): void {
    const idx = this.enemies.indexOf(e);
    if (idx >= 0) this.enemies.splice(idx, 1);

    // VFX
    const splash = this.add.circle(e.x, e.y, e.radius, 0x9b2a4a, 0.8).setDepth(40);
    this.tweens.add({
      targets: splash,
      alpha: 0,
      scale: 2.2,
      duration: 220,
      onComplete: () => splash.destroy(),
    });

    // drops
    const drop = this.add.circle(e.x, e.y, 6, COLORS.moon, 1).setDepth(20);
    this.pickups.push({ sprite: drop, value: e.def.currency });

    this.player.addMoon(BALANCE.moonPerKill + (e.def.isBoss ? 40 : 0));
    const leveled = this.player.addXp(e.def.xp);
    e.destroy();

    this.waveKillsLeft = Math.max(0, this.waveKillsLeft - 1);

    if (leveled) {
      this.openLevelUp();
    }

    // wave progression when all dead and not spawning
    this.time.delayedCall(100, () => {
      if (this.gameOver) return;
      if (!this.waveSpawning && this.enemies.length === 0) {
        if (this.wave >= BALANCE.waveTotal) {
          this.onVictory();
        } else {
          this.showWaveClear();
        }
      }
    });
  }

  private tryHowl(): void {
    if (this.paused || this.gameOver || this.levelUpOpen) return;
    const now = this.time.now;
    if (!this.player.useSkill(now)) return;

    const ring = this.add
      .circle(this.player.x, this.player.y, 20, COLORS.howl, 0.35)
      .setDepth(42)
      .setStrokeStyle(3, COLORS.moon, 0.8);
    this.tweens.add({
      targets: ring,
      scale: BALANCE.howlRadius / 20,
      alpha: 0,
      duration: 320,
      onComplete: () => ring.destroy(),
    });

    for (const e of [...this.enemies]) {
      if (!e.alive) continue;
      const d = Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y);
      if (d <= BALANCE.howlRadius) {
        e.knockback(this.player.x, this.player.y, BALANCE.howlKnockback);
        const dead = e.takeDamage(BALANCE.howlDamage * this.player.damageMul);
        if (dead) this.killEnemy(e);
      }
    }
  }

  private tryTransform(): void {
    if (this.paused || this.gameOver) return;
    this.player.tryTransform(this.time.now);
  }

  private openLevelUp(): void {
    if (this.levelUpOpen || this.gameOver) return;
    this.levelUpOpen = true;
    this.physics?.pause?.();

    const cam = this.cameras.main;
    const cx = cam.scrollX + GAME_WIDTH / 2;
    const cy = cam.scrollY + GAME_HEIGHT / 2;

    const choices = [
      { title: 'Острые когти', desc: '+15% урон', apply: () => { /* baked via level */ } },
      { title: 'Живучесть', desc: '+25 HP', apply: () => this.player.heal(25) },
      { title: 'Заряд воя', desc: '+2 Вой', apply: () => { this.player.skillCharges += 2; } },
    ];
    // randomize order
    Phaser.Utils.Array.Shuffle(choices);

    const panel = this.add.container(cx, cy).setDepth(2000).setScrollFactor(1);
    panel.add(this.add.rectangle(0, 0, 320, 360, 0x0a0e14, 0.92).setStrokeStyle(2, COLORS.moonGlow));
    panel.add(
      this.add
        .text(0, -150, 'УРОВЕНЬ ' + this.player.level, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '20px',
          color: '#fff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    );
    panel.add(
      this.add
        .text(0, -120, 'Выбери усиление', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '13px',
          color: '#a0aec0',
        })
        .setOrigin(0.5),
    );

    choices.forEach((c, i) => {
      const y = -60 + i * 80;
      const btn = this.add
        .rectangle(0, y, 260, 64, 0x1a2838, 1)
        .setStrokeStyle(1, 0xffffff, 0.2)
        .setInteractive({ useHandCursor: true });
      const t = this.add
        .text(0, y - 10, c.title, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '16px',
          color: '#e8eef8',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      const d = this.add
        .text(0, y + 12, c.desc, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '12px',
          color: '#8ab4ff',
        })
        .setOrigin(0.5);
      panel.add([btn, t, d]);
      btn.on('pointerdown', () => {
        c.apply();
        panel.destroy(true);
        this.levelUpOpen = false;
      });
    });
  }

  private showWaveClear(): void {
    const cam = this.cameras.main;
    const t = this.add
      .text(cam.scrollX + GAME_WIDTH / 2, cam.scrollY + GAME_HEIGHT / 2, `Ночь ${this.wave} пережита`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        color: '#d4e4ff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(1500)
      .setAlpha(0);
    this.tweens.add({
      targets: t,
      alpha: 1,
      y: t.y - 20,
      duration: 400,
      yoyo: true,
      hold: 600,
      onComplete: () => {
        t.destroy();
        this.startWave(this.wave + 1);
      },
    });
  }

  private togglePause(): void {
    if (this.gameOver || this.levelUpOpen) return;
    this.paused = !this.paused;
    if (this.paused) {
      this.showOverlay(
        'ПАУЗА',
        'Продолжить · В меню',
        [
          { label: 'Продолжить', action: () => { this.paused = false; this.clearOverlay(); } },
          {
            label: 'В меню',
            action: () => {
              this.cleanup();
              this.scene.start('Menu');
            },
          },
        ],
      );
    } else {
      this.clearOverlay();
    }
  }

  private async onDeath(): Promise<void> {
    if (this.gameOver) return;
    this.gameOver = true;
    this.spawnTimer?.remove(false);

    const shards = this.player.currency + this.wave * 2;
    this.metaShards += shards;
    await storageSet('shards', String(this.metaShards));

    this.showOverlay(
      'ТЫ ПАЛ',
      `Волна ${this.wave} · Осколки +${shards} (всего ${this.metaShards})`,
      [
        {
          label: 'Воскреснуть (реклама)',
          action: async () => {
            const ok = await showRewardedAd();
            if (ok) {
              this.clearOverlay();
              this.gameOver = false;
              this.player.hp = Math.floor(this.player.maxHp * 0.5);
              this.player.invulnUntil = this.time.now + 2000;
              this.player.skillCharges += 1;
            }
          },
        },
        {
          label: 'Заново',
          action: () => {
            this.cleanup();
            this.scene.restart();
          },
        },
        {
          label: 'В меню',
          action: () => {
            this.cleanup();
            this.scene.start('Menu');
          },
        },
      ],
    );
  }

  private async onVictory(): Promise<void> {
    if (this.gameOver) return;
    this.gameOver = true;
    this.spawnTimer?.remove(false);
    const shards = this.player.currency + 50;
    this.metaShards += shards;
    await storageSet('shards', String(this.metaShards));
    const msg = `Ночь Оборотня: я пережил ${BALANCE.waveTotal} волн! 🐺🌕`;

    this.showOverlay(
      'РАССВЕТ',
      `Ты выжил! +${shards} осколков`,
      [
        {
          label: 'Поделиться',
          action: () => shareScore(msg),
        },
        {
          label: 'Ещё раз',
          action: () => {
            this.cleanup();
            this.scene.restart();
          },
        },
        {
          label: 'В меню',
          action: () => {
            this.cleanup();
            this.scene.start('Menu');
          },
        },
      ],
    );
  }

  private showOverlay(
    title: string,
    subtitle: string,
    buttons: { label: string; action: () => void | Promise<void> }[],
  ): void {
    this.clearOverlay();
    const cam = this.cameras.main;
    const cx = cam.scrollX + GAME_WIDTH / 2;
    const cy = cam.scrollY + GAME_HEIGHT / 2;
    const root = this.add.container(cx, cy).setDepth(3000);
    root.add(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65));
    root.add(
      this.add
        .text(0, -120, title, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '28px',
          color: '#fff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    );
    root.add(
      this.add
        .text(0, -70, subtitle, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '14px',
          color: '#a0aec0',
          align: 'center',
          wordWrap: { width: 300 },
        })
        .setOrigin(0.5),
    );

    buttons.forEach((b, i) => {
      const y = -10 + i * 56;
      const bg = this.add
        .rectangle(0, y, 240, 44, i === 0 ? COLORS.accent : 0x1a2838, 1)
        .setStrokeStyle(1, 0xffffff, 0.2)
        .setInteractive({ useHandCursor: true });
      const t = this.add
        .text(0, y, b.label, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '15px',
          color: '#fff',
        })
        .setOrigin(0.5);
      root.add([bg, t]);
      bg.on('pointerdown', () => void b.action());
    });

    this.overlay = root;
  }

  private clearOverlay(): void {
    this.overlay?.destroy(true);
    this.overlay = undefined;
  }

  private syncHud(): void {
    this.hud.update({
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      level: this.player.level,
      xp: this.player.xp,
      xpToNext: this.player.xpToNext,
      currency: this.player.currency,
      wave: this.wave,
      waveTotal: BALANCE.waveTotal,
      elapsedSec: this.elapsed,
      skillCharges: this.player.skillCharges,
      moon: this.player.moon,
      transformed: this.player.transformed,
      paused: this.paused,
    });
  }

  private cleanup(): void {
    this.spawnTimer?.remove(false);
    this.enemies.forEach((e) => e.destroy());
    this.pickups.forEach((p) => p.sprite.destroy());
    this.player?.destroy();
    this.joystick?.destroy();
    this.hud?.destroy();
    this.clearOverlay();
  }
}
