/**
 * Persistent meta-progression (between runs).
 * Soft currency: lunar shards. Stored via VK Storage / localStorage.
 */
import { storageGet, storageSet } from '../vk/bridge';
import { BALANCE } from '../game/config';

export type MetaUpgradeId =
  | 'vitality'
  | 'swift'
  | 'claws'
  | 'howl_pack'
  | 'moon_blood'
  | 'scavenger'
  | 'thick_hide';

export interface MetaUpgradeDef {
  id: MetaUpgradeId;
  name: string;
  desc: (level: number) => string;
  maxLevel: number;
  /** Cost for purchasing next level (currentLevel -> currentLevel+1) */
  cost: (nextLevel: number) => number;
}

export interface MetaState {
  shards: number;
  levels: Record<MetaUpgradeId, number>;
  bestWave: number;
  runs: number;
}

export const META_UPGRADES: MetaUpgradeDef[] = [
  {
    id: 'vitality',
    name: 'Живучесть',
    desc: (lv) => `+${lv * 15} макс. HP (старт)`,
    maxLevel: 8,
    cost: (n) => 12 + (n - 1) * 10,
  },
  {
    id: 'swift',
    name: 'Рывок зверя',
    desc: (lv) => `+${lv * 8}% скорость`,
    maxLevel: 6,
    cost: (n) => 15 + (n - 1) * 12,
  },
  {
    id: 'claws',
    name: 'Острые когти',
    desc: (lv) => `+${lv * 10}% урон`,
    maxLevel: 8,
    cost: (n) => 14 + (n - 1) * 11,
  },
  {
    id: 'howl_pack',
    name: 'Стая',
    desc: (lv) => `+${lv} заряд Воя на старте`,
    maxLevel: 5,
    cost: (n) => 18 + (n - 1) * 14,
  },
  {
    id: 'moon_blood',
    name: 'Лунная кровь',
    desc: (lv) => `+${lv * 12}% заполнение Луны`,
    maxLevel: 5,
    cost: (n) => 20 + (n - 1) * 15,
  },
  {
    id: 'scavenger',
    name: 'Мародёр',
    desc: (lv) => `+${lv * 15}% осколков с рана`,
    maxLevel: 6,
    cost: (n) => 16 + (n - 1) * 12,
  },
  {
    id: 'thick_hide',
    name: 'Жёсткая шкура',
    desc: (lv) => `−${lv * 6}% входящий урон`,
    maxLevel: 5,
    cost: (n) => 22 + (n - 1) * 16,
  },
];

const STORAGE_KEY = 'meta_v1';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function emptyLevels(): Record<MetaUpgradeId, number> {
  const levels = {} as Record<MetaUpgradeId, number>;
  for (const u of META_UPGRADES) levels[u.id] = 0;
  return levels;
}

export function defaultMeta(): MetaState {
  return { shards: 0, levels: emptyLevels(), bestWave: 0, runs: 0 };
}

export async function loadMeta(): Promise<MetaState> {
  const raw = await storageGet([STORAGE_KEY, 'shards']);
  let state = defaultMeta();

  if (raw[STORAGE_KEY]) {
    try {
      const parsed = JSON.parse(raw[STORAGE_KEY]) as Partial<MetaState>;
      state = {
        shards: Math.max(0, Math.floor(Number(parsed.shards) || 0)),
        levels: { ...emptyLevels(), ...(parsed.levels || {}) },
        bestWave: Math.max(0, Math.floor(Number(parsed.bestWave) || 0)),
        runs: Math.max(0, Math.floor(Number(parsed.runs) || 0)),
      };
      for (const u of META_UPGRADES) {
        state.levels[u.id] = clamp(state.levels[u.id] || 0, 0, u.maxLevel);
      }
    } catch {
      state = defaultMeta();
    }
  } else if (raw.shards) {
    // migrate old shards-only save
    state.shards = Math.max(0, parseInt(raw.shards, 10) || 0);
  }

  return state;
}

export async function saveMeta(state: MetaState): Promise<void> {
  await storageSet(STORAGE_KEY, JSON.stringify(state));
  await storageSet('shards', String(state.shards));
}

export function getUpgrade(id: MetaUpgradeId): MetaUpgradeDef {
  return META_UPGRADES.find((u) => u.id === id)!;
}

export function nextCost(state: MetaState, id: MetaUpgradeId): number | null {
  const def = getUpgrade(id);
  const lv = state.levels[id] || 0;
  if (lv >= def.maxLevel) return null;
  return def.cost(lv + 1);
}

export function tryBuy(
  state: MetaState,
  id: MetaUpgradeId,
): { ok: boolean; state: MetaState; reason?: string } {
  const def = getUpgrade(id);
  const lv = state.levels[id] || 0;
  if (lv >= def.maxLevel) return { ok: false, state, reason: 'Макс. уровень' };
  const cost = def.cost(lv + 1);
  if (state.shards < cost) return { ok: false, state, reason: 'Мало осколков' };
  const next: MetaState = {
    ...state,
    shards: state.shards - cost,
    levels: { ...state.levels, [id]: lv + 1 },
  };
  return { ok: true, state: next };
}

/** Runtime bonuses applied at run start */
export interface RunBonuses {
  maxHp: number;
  speedMul: number;
  damageMul: number;
  skillCharges: number;
  moonGainMul: number;
  shardGainMul: number;
  damageTakenMul: number;
}

export function computeRunBonuses(state: MetaState): RunBonuses {
  const L = state.levels;
  const vitality = L.vitality || 0;
  const swift = L.swift || 0;
  const claws = L.claws || 0;
  const howl = L.howl_pack || 0;
  const moon = L.moon_blood || 0;
  const scav = L.scavenger || 0;
  const hide = L.thick_hide || 0;

  return {
    maxHp: BALANCE.playerMaxHp + vitality * 15,
    speedMul: 1 + swift * 0.08,
    damageMul: 1 + claws * 0.1,
    skillCharges: BALANCE.skillChargesStart + howl,
    moonGainMul: 1 + moon * 0.12,
    shardGainMul: 1 + scav * 0.15,
    damageTakenMul: Math.max(0.4, 1 - hide * 0.06),
  };
}
