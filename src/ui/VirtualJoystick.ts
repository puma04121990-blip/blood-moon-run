import Phaser from 'phaser';
import { COLORS } from '../game/config';

/**
 * Bottom-center virtual joystick (portrait mobile).
 * Outputs normalized vector in [-1, 1].
 */
export class VirtualJoystick {
  private scene: Phaser.Scene;
  private base: Phaser.GameObjects.Arc;
  private thumb: Phaser.GameObjects.Arc;
  private baseX: number;
  private baseY: number;
  private maxRadius: number;
  private pointerId: number | null = null;
  private _vector = new Phaser.Math.Vector2(0, 0);
  private active = false;

  constructor(scene: Phaser.Scene, x: number, y: number, maxRadius = 56) {
    this.scene = scene;
    this.baseX = x;
    this.baseY = y;
    this.maxRadius = maxRadius;

    this.base = scene.add
      .circle(x, y, maxRadius, COLORS.white, 0.12)
      .setStrokeStyle(2, COLORS.white, 0.25)
      .setScrollFactor(0)
      .setDepth(1000);

    this.thumb = scene.add
      .circle(x, y, 22, 0x4a90d9, 0.85)
      .setStrokeStyle(2, COLORS.white, 0.4)
      .setScrollFactor(0)
      .setDepth(1001);

    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.input.on('pointerupoutside', this.onUp, this);
  }

  get vector(): Phaser.Math.Vector2 {
    return this._vector;
  }

  get isActive(): boolean {
    return this.active;
  }

  setPosition(x: number, y: number): void {
    this.baseX = x;
    this.baseY = y;
    this.base.setPosition(x, y);
    if (!this.active) {
      this.thumb.setPosition(x, y);
    }
  }

  destroy(): void {
    this.scene.input.off('pointerdown', this.onDown, this);
    this.scene.input.off('pointermove', this.onMove, this);
    this.scene.input.off('pointerup', this.onUp, this);
    this.scene.input.off('pointerupoutside', this.onUp, this);
    this.base.destroy();
    this.thumb.destroy();
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    // Only bottom half / near joystick zone for movement
    if (this.pointerId !== null) return;
    const dy = pointer.y - this.baseY;
    const dx = pointer.x - this.baseX;
    // Accept if near base or bottom third of screen
    const near = Math.hypot(dx, dy) < this.maxRadius * 2.2;
    const bottom = pointer.y > this.scene.scale.height * 0.55;
    // Exclude skill button area (bottom-left)
    if (pointer.x < 90 && pointer.y > this.scene.scale.height - 120) return;
    if (!near && !bottom) return;

    this.pointerId = pointer.id;
    this.active = true;
    this.updateThumb(pointer.x, pointer.y);
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    if (this.pointerId !== pointer.id) return;
    this.updateThumb(pointer.x, pointer.y);
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    if (this.pointerId !== pointer.id) return;
    this.pointerId = null;
    this.active = false;
    this._vector.set(0, 0);
    this.thumb.setPosition(this.baseX, this.baseY);
  }

  private updateThumb(px: number, py: number): void {
    let dx = px - this.baseX;
    let dy = py - this.baseY;
    const len = Math.hypot(dx, dy) || 1;
    if (len > this.maxRadius) {
      dx = (dx / len) * this.maxRadius;
      dy = (dy / len) * this.maxRadius;
    }
    this.thumb.setPosition(this.baseX + dx, this.baseY + dy);
    this._vector.set(dx / this.maxRadius, dy / this.maxRadius);
  }
}
