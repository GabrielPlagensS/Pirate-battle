export type EndReason = 'time' | 'death';
export type EnemyType = 'chaser' | 'shooter';
export type GameStatus = 'idle' | 'playing' | 'paused' | 'ended';

export interface GameplayConfig {
  sessionTime: number;
  spawnInterval: number;
  maxPlayerHealth: number;
  playerSpeed: number;
  playerRotationSpeed: number;
  playerProjectileSpeed: number;
  playerProjectileDamage: number;
  playerProjectileLifetime: number;
  frontCooldown: number;
  sideCooldown: number;
  enemyProjectileSpeed: number;
  enemyProjectileDamage: number;
  enemyProjectileLifetime: number;
  chaserHealth: number;
  chaserSpeed: number;
  chaserDamage: number;
  shooterHealth: number;
  shooterSpeed: number;
  shooterRange: number;
  shooterCooldown: number;
  arenaWidth: number;
  arenaHeight: number;
  maxEnemies: number;
}

export interface InputState {
  forward: boolean;
  left: boolean;
  right: boolean;
  front: boolean;
  sideLeft: boolean;
  sideRight: boolean;
}

export type InputAction = keyof InputState;

export interface GameResult {
  score: number;
  duration: number;
  reason: EndReason;
  config: GameplayConfig;
}

export interface PlayerRecord {
  id: string;
  name: string;
}

export interface MatchRecord {
  id: string;
  playerId: string;
  date: string;
  score: number;
  duration: number;
  reason: EndReason;
  config: GameplayConfig;
}

export interface RankingEntry extends MatchRecord {
  playerName: string;
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface NetworkScenario {
  mode: 'success' | 'empty' | 'slow' | 'variable' | 'timeout' | 'error';
  latencyMs: number;
}
