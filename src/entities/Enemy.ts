import Phaser from 'phaser';
import { ENEMY_DEFS, type EnemyDef, type EnemyKind } from '../game/config';

export class Enemy {
  readonly sprite: Phaser.GameObjects.Container;
  readonly def: EnemyDef;
  hp: number;
  alive = true;
  private bodyGfx: Phaser.GameObjects.Arc;
  private hpBarBg: Phaser.GameObjects.Rectangle;
  private hpBar: Phaser.GameObjects.Rectangle;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, x: number, y: number, kind: EnemyKind) {
    this.scene = scene;
    this.def = ENEMY_DEFS[kind];
    this.hp = this.def.hp;

    this.sprite = scene.add.container(x, y);
    this.bodyGfx = scene.add
      .circle(0, 0, this.def.radius, this.def.color, 1)
      .setStrokeStyle(2, this.def.isSilver ? 0xffffff : 0x1a1a1a, 0.8);

    // simple face
    const eyeL = scene.add.circle(-4, -2, this.def.isBoss ? 4 : 2.5, 0xff4444);
    const eyeR = scene.add.circle(4, -2, this.def.isBoss ? 4 : 2.5, 0xff4444);

    this.hpBarBg = scene.add.rectangle(0, -this.def.radius - 8, this.def.radius * 2, 4, 0x222222, 0.8);
    this.hpBar = scene.add.rectangle(0, -this.def.radius - 8, this.def.radius * 2, 4, 0xe23d4a, 1);
    this.sprite.add([this.bodyGfx, eyeL, eyeR, this.hpBarBg, this.hpBar]);
    this.sprite.setDepth(30);

    if (this.def.isBoss) {
      const crown = scene.add.rectangle(0, -this.def.radius - 4, 16, 6, 0xc0c8d4, 1);
      this.sprite.add(crown);
    }
  }

  get x(): number {
    return this.sprite.x;
  }
  get y(): number {
    return this.sprite.y;
  }
  get radius(): number {
    return this.def.radius;
  }

  chase(tx: number, ty: number, dt: number): void {
    if (!this.alive) return;
    const dx = tx - this.x;
    const dy = ty - this.y;
    const len = Math.hypot(dx, dy) || 1;
    this.sprite.x += (dx / len) * this.def.speed * dt;
    this.sprite.y += (dy / len) * this.def.speed * dt;
  }

  takeDamage(amount: number): boolean {
    if (!this.alive) return false;
    this.hp -= amount;
    const ratio = Phaser.Math.Clamp(this.hp / this.def.hp, 0, 1);
    this.hpBar.width = this.def.radius * 2 * ratio;
    this.hpBar.x = -this.def.radius + this.hpBar.width / 2;
    this.scene.tweens.add({
      targets: this.bodyGfx,
      alpha: 0.4,
      yoyo: true,
      duration: 50,
    });
    if (this.hp <= 0) {
      this.alive = false;
      return true;
    }
    return false;
  }

  knockback(fromX: number, fromY: number, force: number): void {
    const dx = this.x - fromX;
    const dy = this.y - fromY;
    const len = Math.hypot(dx, dy) || 1;
    this.sprite.x += (dx / len) * force * 0.016;
    this.sprite.y += (dy / len) * force * 0.016;
  }

  destroy(): void {
    this.sprite.destroy(true);
  }
}
