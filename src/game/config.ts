/** Logical design size — matched to Xiaomi Redmi Note 11 (20:9, 1080×2400) */
export const GAME_WIDTH = 360;
export const GAME_HEIGHT = 800;

export const COLORS = {
  bg: 0x1a2332,
  bgDark: 0x0d1219,
  grass: 0x2a3544,
  accent: 0xc23b4a,
  moon: 0xd4e4ff,
  moonGlow: 0x8ab4ff,
  hp: 0xe23d4a,
  xp: 0x5cb85c,
  gold: 0xe8c547,
  player: 0x6b4c3b,
  playerFur: 0x8b6914,
  wolf: 0x4a3728,
  enemy: 0x6b7a8a,
  enemyElite: 0x9a6b4a,
  silver: 0xc0c8d4,
  skill: 0x7b3fa0,
  howl: 0x9b6dff,
  uiPanel: 0x121820,
  white: 0xffffff,
  black: 0x000000,
};

export const BALANCE = {
  playerSpeed: 160,
  playerMaxHp: 100,
  attackInterval: 420,
  attackRange: 90,
  attackDamage: 12,
  projectileSpeed: 320,
  skillChargesStart: 3,
  skillCooldownMs: 600,
  howlRadius: 120,
  howlDamage: 35,
  howlKnockback: 180,
  moonPerKill: 8,
  moonMax: 100,
  transformDurationMs: 8000,
  transformDamageMul: 1.75,
  transformSpeedMul: 1.25,
  xpPerKill: 8,
  xpLevelBase: 20,
  xpLevelScale: 1.35,
  waveTotal: 10,
  currencyPerKill: 1,
};

export type EnemyKind = 'villager' | 'dog' | 'hunter' | 'silver' | 'boss';

export interface EnemyDef {
  kind: EnemyKind;
  hp: number;
  speed: number;
  damage: number;
  radius: number;
  color: number;
  xp: number;
  currency: number;
  isSilver?: boolean;
  isBoss?: boolean;
}

export const ENEMY_DEFS: Record<EnemyKind, EnemyDef> = {
  villager: {
    kind: 'villager',
    hp: 20,
    speed: 55,
    damage: 8,
    radius: 12,
    color: COLORS.enemy,
    xp: 6,
    currency: 1,
  },
  dog: {
    kind: 'dog',
    hp: 14,
    speed: 95,
    damage: 6,
    radius: 10,
    color: 0x8a6a4a,
    xp: 5,
    currency: 1,
  },
  hunter: {
    kind: 'hunter',
    hp: 35,
    speed: 50,
    damage: 12,
    radius: 13,
    color: COLORS.enemyElite,
    xp: 12,
    currency: 2,
  },
  silver: {
    kind: 'silver',
    hp: 40,
    speed: 48,
    damage: 18,
    radius: 13,
    color: COLORS.silver,
    xp: 16,
    currency: 3,
    isSilver: true,
  },
  boss: {
    kind: 'boss',
    hp: 400,
    speed: 40,
    damage: 22,
    radius: 28,
    color: 0xb0b8c8,
    xp: 80,
    currency: 25,
    isSilver: true,
    isBoss: true,
  },
};

/** Wave spawn plan for vertical slice (10 waves) */
export function getWavePlan(wave: number): { kinds: EnemyKind[]; count: number; spawnIntervalMs: number } {
  const w = Math.max(1, Math.min(wave, BALANCE.waveTotal));
  if (w <= 2) return { kinds: ['villager'], count: 8 + w * 3, spawnIntervalMs: 700 };
  if (w <= 4) return { kinds: ['villager', 'dog'], count: 14 + w * 3, spawnIntervalMs: 550 };
  if (w === 5) return { kinds: ['villager', 'dog', 'hunter'], count: 22, spawnIntervalMs: 480 };
  if (w <= 8) return { kinds: ['villager', 'dog', 'hunter', 'silver'], count: 20 + w * 2, spawnIntervalMs: 420 };
  if (w === 9) return { kinds: ['hunter', 'silver', 'dog'], count: 36, spawnIntervalMs: 360 };
  return { kinds: ['hunter', 'silver', 'boss'], count: 20, spawnIntervalMs: 500 };
}
