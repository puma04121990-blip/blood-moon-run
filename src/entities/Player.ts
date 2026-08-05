import Phaser from 'phaser';
import { BALANCE } from '../game/config';
import type { RunBonuses } from '../meta/progress';

type AnimState = 'idle' | 'walk' | 'attack' | 'beast';

export class Player {
  /** Animated sprite when sheets exist; otherwise static image */
  readonly sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  hp: number;
  maxHp: number;
  level = 1;
  xp = 0;
  xpToNext = BALANCE.xpLevelBase;
  currency = 0;
  skillCharges = BALANCE.skillChargesStart;
  moon = 0;
  transformed = false;
  private transformUntil = 0;
  private lastAttack = 0;
  private lastSkill = 0;
  private scene: Phaser.Scene;
  private clawFlash?: Phaser.GameObjects.Arc;
  radius = 18;
  invulnUntil = 0;
  private facing = 1;
  readonly bonuses: RunBonuses;
  private metaDamageMul: number;
  private metaSpeedMul: number;
  private metaMoonMul: number;
  private metaDamageTakenMul: number;
  private animState: AnimState = 'idle';
  private useAnims = false;
  private moving = false;
  private attackUntil = 0;
  private displaySize = 56;

  constructor(scene: Phaser.Scene, x: number, y: number, bonuses?: RunBonuses) {
    this.scene = scene;
    this.bonuses = bonuses ?? {
      maxHp: BALANCE.playerMaxHp,
      speedMul: 1,
      damageMul: 1,
      skillCharges: BALANCE.skillChargesStart,
      moonGainMul: 1,
      shardGainMul: 1,
      damageTakenMul: 1,
    };
    this.metaDamageMul = this.bonuses.damageMul;
    this.metaSpeedMul = this.bonuses.speedMul;
    this.metaMoonMul = this.bonuses.moonGainMul;
    this.metaDamageTakenMul = this.bonuses.damageTakenMul;

    this.maxHp = this.bonuses.maxHp;
    this.hp = this.maxHp;
    this.skillCharges = this.bonuses.skillCharges;

    this.useAnims = scene.textures.exists('player_walk_sheet') && scene.anims.exists('player_walk');

    if (this.useAnims) {
      const spr = scene.add.sprite(x, y, 'player_walk_sheet', 0);
      spr.setDisplaySize(this.displaySize, this.displaySize);
      spr.setDepth(50);
      spr.play('player_idle');
      this.sprite = spr;
    } else {
      const hasArt = scene.textures.exists('player');
      const img = scene.add
        .image(x, y, hasArt ? 'player' : '__DEFAULT')
        .setDisplaySize(this.displaySize, this.displaySize)
        .setDepth(50);
      if (!hasArt) img.setVisible(false);
      this.sprite = img;
    }
  }

  get x(): number {
    return this.sprite.x;
  }
  get y(): number {
    return this.sprite.y;
  }

  setPosition(x: number, y: number): void {
    this.sprite.setPosition(x, y);
  }

  get damageMul(): number {
    const form = this.transformed ? BALANCE.transformDamageMul : 1;
    return form * this.metaDamageMul;
  }

  get speed(): number {
    const form = this.transformed ? BALANCE.transformSpeedMul : 1;
    return BALANCE.playerSpeed * form * this.metaSpeedMul;
  }

  move(dx: number, dy: number, dt: number, bounds: Phaser.Geom.Rectangle): void {
    this.moving = dx !== 0 || dy !== 0;
    if (!this.moving) {
      this.refreshAnim();
      return;
    }
    const len = Math.hypot(dx, dy) || 1;
    const nx = dx / len;
    const ny = dy / len;
    let x = this.sprite.x + nx * this.speed * dt;
    let y = this.sprite.y + ny * this.speed * dt;
    x = Phaser.Math.Clamp(x, bounds.left + this.radius, bounds.right - this.radius);
    y = Phaser.Math.Clamp(y, bounds.top + this.radius, bounds.bottom - this.radius);
    this.sprite.setPosition(x, y);
    if (nx < -0.15) this.facing = -1;
    else if (nx > 0.15) this.facing = 1;
    this.sprite.setFlipX(this.facing < 0);
    this.refreshAnim();
  }

  /** Call every frame to finish attack anim */
  updateAnim(now: number): void {
    if (this.animState === 'attack' && now >= this.attackUntil) {
      this.animState = this.moving ? 'walk' : 'idle';
      this.playAnim(this.animState);
    }
  }

  private refreshAnim(): void {
    if (this.transformed) {
      if (this.animState !== 'beast') {
        this.animState = 'beast';
        this.playAnim('beast');
      }
      return;
    }
    if (this.animState === 'attack') return;
    const next: AnimState = this.moving ? 'walk' : 'idle';
    if (next !== this.animState) {
      this.animState = next;
      this.playAnim(next);
    }
  }

  private playAnim(state: AnimState): void {
    if (!this.useAnims || !(this.sprite instanceof Phaser.GameObjects.Sprite)) {
      // static image fallbacks
      if (state === 'beast' && this.scene.textures.exists('player_beast')) {
        (this.sprite as Phaser.GameObjects.Image).setTexture('player_beast');
        this.sprite.setDisplaySize(68, 68);
      } else if (this.scene.textures.exists('player')) {
        (this.sprite as Phaser.GameObjects.Image).setTexture('player');
        this.sprite.setDisplaySize(this.displaySize, this.displaySize);
      }
      return;
    }

    const spr = this.sprite as Phaser.GameObjects.Sprite;
    if (state === 'beast') {
      if (this.scene.textures.exists('player_beast')) {
        spr.anims.stop();
        spr.setTexture('player_beast');
        spr.setDisplaySize(68, 68);
      }
      return;
    }

    spr.setDisplaySize(this.displaySize, this.displaySize);
    if (state === 'walk' && this.scene.anims.exists('player_walk')) {
      if (spr.anims.currentAnim?.key !== 'player_walk') spr.play('player_walk');
    } else if (state === 'attack' && this.scene.anims.exists('player_attack')) {
      spr.play('player_attack');
    } else if (this.scene.anims.exists('player_idle')) {
      if (spr.anims.currentAnim?.key !== 'player_idle') spr.play('player_idle');
    }
  }

  canAttack(now: number): boolean {
    const interval = this.transformed ? BALANCE.attackInterval * 0.7 : BALANCE.attackInterval;
    return now - this.lastAttack >= interval;
  }

  markAttack(now: number): void {
    this.lastAttack = now;
    this.attackUntil = now + 220;
    if (!this.transformed) {
      this.animState = 'attack';
      this.playAnim('attack');
    }
    if (this.clawFlash) this.clawFlash.destroy();
    this.clawFlash = this.scene.add
      .circle(this.x, this.y, this.transformed ? 40 : 30, 0x9b6dff, 0.35)
      .setDepth(40);
    this.scene.tweens.add({
      targets: this.clawFlash,
      alpha: 0,
      scale: 1.6,
      duration: 180,
      onComplete: () => {
        this.clawFlash?.destroy();
        this.clawFlash = undefined;
      },
    });
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: (this.sprite.scaleX || 1) * 1.08,
      scaleY: (this.sprite.scaleY || 1) * 0.94,
      yoyo: true,
      duration: 80,
    });
  }

  canSkill(now: number): boolean {
    return this.skillCharges > 0 && now - this.lastSkill >= BALANCE.skillCooldownMs;
  }

  useSkill(now: number): boolean {
    if (!this.canSkill(now)) return false;
    this.skillCharges -= 1;
    this.lastSkill = now;
    return true;
  }

  addMoon(amount: number): void {
    if (this.transformed) return;
    const gained = amount * this.metaMoonMul;
    this.moon = Math.min(BALANCE.moonMax, this.moon + gained);
  }

  tryTransform(now: number): boolean {
    if (this.transformed || this.moon < BALANCE.moonMax) return false;
    this.transformed = true;
    this.transformUntil = now + BALANCE.transformDurationMs;
    this.moon = 0;
    this.applyTransformVisual(true);
    return true;
  }

  updateTransform(now: number): void {
    if (this.transformed && now >= this.transformUntil) {
      this.transformed = false;
      this.applyTransformVisual(false);
    }
    this.updateAnim(now);
  }

  private applyTransformVisual(on: boolean): void {
    this.radius = on ? 22 : 18;
    if (on) {
      this.animState = 'beast';
      this.playAnim('beast');
    } else {
      this.animState = this.moving ? 'walk' : 'idle';
      this.playAnim(this.animState);
    }
  }

  takeDamage(amount: number, now: number, isSilver = false): void {
    if (now < this.invulnUntil) return;
    const mul = (isSilver ? 1.5 : 1) * this.metaDamageTakenMul;
    this.hp = Math.max(0, this.hp - amount * mul);
    this.invulnUntil = now + 350;
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.4,
      yoyo: true,
      duration: 80,
      repeat: 2,
      onComplete: () => this.sprite.setAlpha(1),
    });
  }

  heal(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  addXp(amount: number): boolean {
    this.xp += amount;
    if (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level += 1;
      this.xpToNext = Math.floor(BALANCE.xpLevelBase * Math.pow(BALANCE.xpLevelScale, this.level - 1));
      this.maxHp += 8;
      this.hp = Math.min(this.maxHp, this.hp + 20);
      this.skillCharges = Math.min(this.skillCharges + 1, 9);
      return true;
    }
    return false;
  }

  destroy(): void {
    this.clawFlash?.destroy();
    this.sprite.destroy();
  }
}
