import Phaser from 'phaser';
import { ENEMY_DEFS, type EnemyDef, type EnemyKind } from '../game/config';

const TEXTURE_MAP: Record<EnemyKind, string> = {
  villager: 'enemy_villager',
  dog: 'enemy_dog',
  hunter: 'enemy_hunter',
  silver: 'enemy_silver',
  boss: 'enemy_boss',
};

const DISPLAY: Record<EnemyKind, number> = {
  villager: 44,
  dog: 40,
  hunter: 50,
  silver: 52,
  boss: 88,
};

export class Enemy {
  readonly sprite: Phaser.GameObjects.Image;
  readonly def: EnemyDef;
  hp: number;
  alive = true;
  private hpBarBg: Phaser.GameObjects.Rectangle;
  private hpBar: Phaser.GameObjects.Rectangle;
  private scene: Phaser.Scene;
  private barOffset: number;

  constructor(scene: Phaser.Scene, x: number, y: number, kind: EnemyKind) {
    this.scene = scene;
    this.def = ENEMY_DEFS[kind];
    this.hp = this.def.hp;

    const key = TEXTURE_MAP[kind];
    const size = DISPLAY[kind];
    const hasArt = scene.textures.exists(key);

    this.sprite = scene.add
      .image(x, y, hasArt ? key : '__DEFAULT')
      .setDisplaySize(size, size)
      .setDepth(30);

    if (!hasArt) {
      this.sprite.setTint(this.def.color);
    }

    this.barOffset = size / 2 + 6;
    this.hpBarBg = scene.add.rectangle(x, y - this.barOffset, this.def.radius * 2.2, 4, 0x222222, 0.8).setDepth(31);
    this.hpBar = scene.add.rectangle(x, y - this.barOffset, this.def.radius * 2.2, 4, 0xe23d4a, 1).setDepth(32);
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
    this.sprite.setFlipX(dx > 0);
    this.syncBars();
  }

  private syncBars(): void {
    const ratio = Phaser.Math.Clamp(this.hp / this.def.hp, 0, 1);
    const fullW = this.def.radius * 2.2;
    this.hpBarBg.setPosition(this.x, this.y - this.barOffset);
    this.hpBar.setPosition(this.x - (fullW * (1 - ratio)) / 2, this.y - this.barOffset);
    this.hpBar.width = fullW * ratio;
  }

  takeDamage(amount: number): boolean {
    if (!this.alive) return false;
    this.hp -= amount;
    this.syncBars();
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.45,
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
    this.syncBars();
  }

  destroy(): void {
    this.hpBar.destroy();
    this.hpBarBg.destroy();
    this.sprite.destroy();
  }
}
