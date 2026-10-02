import type { GameplayConfig } from '../types/game';

export const DEFAULT_CONFIG: GameplayConfig = {
  sessionTime: 120,
  spawnInterval: 4,
  maxPlayerHealth: 100,
  playerSpeed: 190,
  playerRotationSpeed: 2.8,
  playerProjectileSpeed: 440,
  playerProjectileDamage: 25,
  playerProjectileLifetime: 1.25,
  frontCooldown: 0.45,
  sideCooldown: 1.15,
  enemyProjectileSpeed: 260,
  enemyProjectileDamage: 12,
  enemyProjectileLifetime: 2.5,
  chaserHealth: 60,
  chaserSpeed: 82,
  chaserDamage: 30,
  shooterHealth: 45,
  shooterSpeed: 55,
  shooterRange: 380,
  shooterCooldown: 1.8,
  arenaWidth: 1280,
  arenaHeight: 720,
  maxEnemies: 18
};

export const CONFIG_LIMITS = {
  sessionTime: { min: 60, max: 180 },
  spawnInterval: { min: 0.5, max: 15 }
} as const;

const KEY = 'pirate-battle-options';

/** Apenas estas opções são editáveis pelo jogador e persistidas. */
export type UserOptions = Pick<GameplayConfig, 'sessionTime' | 'spawnInterval'>;

const clampFinite = (value: unknown, min: number, max: number, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

/** Garante que dados vindos do localStorage (editáveis pelo usuário) estejam dentro dos limites. */
export function sanitizeOptions(raw: Partial<UserOptions> | null | undefined): UserOptions {
  const { sessionTime, spawnInterval } = CONFIG_LIMITS;
  return {
    sessionTime: clampFinite(raw?.sessionTime, sessionTime.min, sessionTime.max, DEFAULT_CONFIG.sessionTime),
    spawnInterval: clampFinite(raw?.spawnInterval, spawnInterval.min, spawnInterval.max, DEFAULT_CONFIG.spawnInterval)
  };
}

/** Retorna a mensagem de erro, ou `null` se as opções são válidas. */
export function validateOptions(options: UserOptions): string | null {
  const { sessionTime, spawnInterval } = CONFIG_LIMITS;
  if (!Number.isFinite(options.sessionTime) || options.sessionTime < sessionTime.min || options.sessionTime > sessionTime.max) {
    return `Session time must be between ${sessionTime.min} and ${sessionTime.max} seconds.`;
  }
  if (!Number.isFinite(options.spawnInterval) || options.spawnInterval < spawnInterval.min || options.spawnInterval > spawnInterval.max) {
    return `Enemy spawn time must be between ${spawnInterval.min} and ${spawnInterval.max} seconds.`;
  }
  return null;
}

export function loadConfig(): GameplayConfig {
  try {
    const raw = localStorage.getItem(KEY);
    const stored = raw ? (JSON.parse(raw) as Partial<UserOptions>) : null;
    return { ...DEFAULT_CONFIG, ...sanitizeOptions(stored) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: GameplayConfig): void {
  const options: UserOptions = { sessionTime: config.sessionTime, spawnInterval: config.spawnInterval };
  try {
    localStorage.setItem(KEY, JSON.stringify(options));
  } catch {
    /* storage cheio/bloqueado: a opção vale só nesta sessão */
  }
}
