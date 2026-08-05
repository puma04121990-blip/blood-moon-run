import Phaser from 'phaser';
import { BALANCE } from '../game/config';

export class Player {
  readonly sprite: Phaser.GameObjects.Image;
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

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.hp = BALANCE.playerMaxHp;
    this.maxHp = BALANCE.playerMaxHp;

    const hasArt = scene.textures.exists('player');
    this.sprite = scene.add
      .image(x, y, hasArt ? 'player' : '__DEFAULT')
      .setDisplaySize(56, 56)
      .setDepth(50);

    if (!hasArt) {
      // fallback circle if texture missing
      this.sprite.setVisible(false);
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
    return this.transformed ? BALANCE.transformDamageMul : 1;
  }

  get speed(): number {
    return BALANCE.playerSpeed * (this.transformed ? BALANCE.transformSpeedMul : 1);
  }

  move(dx: number, dy: number, dt: number, bounds: Phaser.Geom.Rectangle): void {
    if (dx === 0 && dy === 0) return;
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
  }

  canAttack(now: number): boolean {
    const interval = this.transformed ? BALANCE.attackInterval * 0.7 : BALANCE.attackInterval;
    return now - this.lastAttack >= interval;
  }

  markAttack(now: number): void {
    this.lastAttack = now;
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
    // punch scale punch
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: this.sprite.scaleX * 1.12,
      scaleY: this.sprite.scaleY * 0.92,
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
    this.moon = Math.min(BALANCE.moonMax, this.moon + amount);
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
  }

  private applyTransformVisual(on: boolean): void {
    const key = on && this.scene.textures.exists('player_beast') ? 'player_beast' : 'player';
    if (this.scene.textures.exists(key)) {
      this.sprite.setTexture(key);
      this.sprite.setDisplaySize(on ? 68 : 56, on ? 68 : 56);
    }
    this.radius = on ? 22 : 18;
  }

  takeDamage(amount: number, now: number, isSilver = false): void {
    if (now < this.invulnUntil) return;
    const mul = isSilver ? 1.5 : 1;
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
