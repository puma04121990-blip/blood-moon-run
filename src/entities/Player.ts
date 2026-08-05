import Phaser from 'phaser';
import { BALANCE, COLORS } from '../game/config';

export class Player {
  readonly body: Phaser.GameObjects.Container;
  readonly sprite: Phaser.GameObjects.Container;
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
  private bodyGfx: Phaser.GameObjects.Arc;
  private earL: Phaser.GameObjects.Triangle;
  private earR: Phaser.GameObjects.Triangle;
  private face: Phaser.GameObjects.Arc;
  private clawFlash?: Phaser.GameObjects.Arc;
  radius = 16;
  invulnUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.hp = BALANCE.playerMaxHp;
    this.maxHp = BALANCE.playerMaxHp;

    this.sprite = scene.add.container(x, y);
    this.bodyGfx = scene.add.circle(0, 0, this.radius, COLORS.playerFur, 1).setStrokeStyle(2, 0x2a1a0a);
    this.earL = scene.add.triangle(-10, -14, 0, 14, 10, 0, 0, 0, COLORS.playerFur, 1);
    this.earR = scene.add.triangle(10, -14, 0, 14, 10, 0, 0, 0, COLORS.playerFur, 1);
    this.face = scene.add.circle(0, 2, 8, 0xf5d0a9, 1);
    const eyeL = scene.add.circle(-4, 0, 2, 0x111111);
    const eyeR = scene.add.circle(4, 0, 2, 0x111111);
    this.sprite.add([this.earL, this.earR, this.bodyGfx, this.face, eyeL, eyeR]);
    this.sprite.setDepth(50);
    this.body = this.sprite;
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
    // face move direction lightly
    this.sprite.setScale(nx < -0.1 ? -1 : 1, 1);
  }

  canAttack(now: number): boolean {
    const interval = this.transformed ? BALANCE.attackInterval * 0.7 : BALANCE.attackInterval;
    return now - this.lastAttack >= interval;
  }

  markAttack(now: number): void {
    this.lastAttack = now;
    // visual slash
    if (this.clawFlash) this.clawFlash.destroy();
    this.clawFlash = this.scene.add
      .circle(this.x, this.y, this.transformed ? 36 : 28, COLORS.howl, 0.35)
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
    this.bodyGfx.setFillStyle(on ? 0x3a2818 : COLORS.playerFur);
    this.bodyGfx.setRadius(on ? 20 : this.radius);
    this.earL.setScale(on ? 1.3 : 1);
    this.earR.setScale(on ? 1.3 : 1);
    this.face.setVisible(!on);
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
    this.sprite.destroy(true);
  }
}
