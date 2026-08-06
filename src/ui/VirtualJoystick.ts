import Phaser from 'phaser';

/**
 * Virtual joystick — bottom center, portrait mobile.
 * Position adapts on resize; stays above home-indicator zone.
 */
export class VirtualJoystick {
  readonly vector = new Phaser.Math.Vector2(0, 0);
  private scene: Phaser.Scene;
  private base: Phaser.GameObjects.Arc;
  private thumb: Phaser.GameObjects.Arc;
  private originX: number;
  private originY: number;
  private radius: number;
  private pointerId: number | null = null;
  private active = false;

  constructor(scene: Phaser.Scene, x: number, y: number, radius = 56) {
    this.scene = scene;
    this.originX = x;
    this.originY = y;
    this.radius = radius;

    this.base = scene.add
      .circle(x, y, radius, 0xffffff, 0.12)
      .setStrokeStyle(2, 0xffffff, 0.25)
      .setScrollFactor(0)
      .setDepth(950);

    this.thumb = scene.add
      .circle(x, y, radius * 0.42, 0x4a9eff, 0.85)
      .setStrokeStyle(2, 0xffffff, 0.35)
      .setScrollFactor(0)
      .setDepth(951);

    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.input.on('pointerupoutside', this.onUp, this);

    scene.scale.on('resize', this.onResize, this);
    this.onResize();
  }

  private onResize = (): void => {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    // Center-bottom, leave room for home bar (~24–40px in game units)
    this.originX = w / 2;
    this.originY = h - 90;
    if (!this.active) {
      this.base.setPosition(this.originX, this.originY);
      this.thumb.setPosition(this.originX, this.originY);
    }
  };

  private onDown = (pointer: Phaser.Input.Pointer): void => {
    if (this.pointerId !== null) return;
    // Only lower half of screen (don't steal HUD taps)
    if (pointer.y < this.scene.scale.height * 0.45) return;
    // Prefer right/center area; left is skill button
    if (pointer.x < 100) return;

    this.pointerId = pointer.id;
    this.active = true;
    this.originX = pointer.x;
    this.originY = Math.min(pointer.y, this.scene.scale.height - 50);
    this.base.setPosition(this.originX, this.originY);
    this.thumb.setPosition(this.originX, this.originY);
    this.vector.set(0, 0);
  };

  private onMove = (pointer: Phaser.Input.Pointer): void => {
    if (!this.active || pointer.id !== this.pointerId) return;
    const dx = pointer.x - this.originX;
    const dy = pointer.y - this.originY;
    const len = Math.hypot(dx, dy) || 1;
    const clamped = Math.min(len, this.radius);
    const nx = (dx / len) * clamped;
    const ny = (dy / len) * clamped;
    this.thumb.setPosition(this.originX + nx, this.originY + ny);
    this.vector.set(nx / this.radius, ny / this.radius);
  };

  private onUp = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.id !== this.pointerId) return;
    this.pointerId = null;
    this.active = false;
    this.vector.set(0, 0);
    // Snap back to default bottom-center
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    this.originX = w / 2;
    this.originY = h - 90;
    this.base.setPosition(this.originX, this.originY);
    this.thumb.setPosition(this.originX, this.originY);
  };

  destroy(): void {
    this.scene.input.off('pointerdown', this.onDown, this);
    this.scene.input.off('pointermove', this.onMove, this);
    this.scene.input.off('pointerup', this.onUp, this);
    this.scene.input.off('pointerupoutside', this.onUp, this);
    this.scene.scale.off('resize', this.onResize, this);
    this.base.destroy();
    this.thumb.destroy();
  }
}
