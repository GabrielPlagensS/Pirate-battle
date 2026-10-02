import type { EnemyType, GameResult, GameplayConfig, InputState } from '../types/game';
import { ISLANDS, collisionShape, type Island } from './islands';
import {
  angleVector,
  circleRoundedRectCollision,
  clamp,
  createRng,
  distance,
  normalize,
  rotate,
  type Rng,
  type Vec
} from './math';

export interface Entity extends Vec {
  id: number;
  radius: number;
  angle: number;
  health: number;
  maxHealth: number;
  type?: EnemyType;
  speed: number;
  cooldown: number;
  /** Tempo restante contornando um obstáculo (0 = indo direto ao alvo). */
  detour?: number;
  /** Lado do desvio: 1 = sentido horário, -1 = anti-horário. */
  detourSide?: 1 | -1;
}

export interface Projectile extends Vec {
  id: number;
  velocity: Vec;
  radius: number;
  damage: number;
  ttl: number;
  owner: 'player' | 'enemy';
}

export type { Island };

/** Eventos emitidos pela simulação para o renderizador reagir (som, explosões). */
export type SimEvent =
  | { type: 'playerFire'; side: 'front' | 'broadside' }
  | { type: 'enemyFire' }
  | { type: 'enemyHit'; x: number; y: number }
  | { type: 'enemyDestroyed'; x: number; y: number; rammed: boolean }
  | { type: 'playerHit' }
  | { type: 'splash'; x: number; y: number };

const MAX_STEP = 0.05;
const PROJECTILE_RADIUS = 6;
const SPAWN_MARGIN = 50;
const MIN_SPAWN_DISTANCE = 320;
const CHASER_RATIO = 0.55;
/** Distância à frente usada para detectar uma ilha no caminho do inimigo. */
const PROBE_DISTANCE = 56;
/** Quanto o desvio continua depois que o caminho à frente liberou (evita ziguezague). */
const DETOUR_LINGER = 0.3;
/** Fração do passo abaixo da qual consideramos que o inimigo não saiu do lugar. */
const BLOCKED_PROGRESS = 0.3;

export class GameSimulation {
  readonly config: GameplayConfig;
  readonly islands: Island[] = ISLANDS.map((island) => ({ ...island }));
  player: Entity;
  enemies: Entity[] = [];
  projectiles: Projectile[] = [];
  score = 0;
  elapsed = 0;
  spawnTimer = 0;
  nextId = 1;
  private events: SimEvent[] = [];
  private frontTimer = 0;
  private sideTimer = 0;
  private ended = false;
  private readonly rng: Rng;

  /**
   * @param seed semente opcional; sem ela usa uma semente aleatória. Passar uma
   * semente torna a simulação reproduzível (útil em testes).
   */
  constructor(config: GameplayConfig, seed: number = (Math.random() * 0xffffffff) >>> 0) {
    this.config = structuredClone(config);
    this.rng = createRng(seed);
    this.player = this.makePlayer();
  }

  /** Retorna e limpa os eventos acumulados desde a última chamada. */
  drainEvents(): SimEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  update(dt: number, input: InputState): void {
    if (this.ended) return;
    const step = Math.min(dt, MAX_STEP);
    this.elapsed += step;
    this.frontTimer = Math.max(0, this.frontTimer - step);
    this.sideTimer = Math.max(0, this.sideTimer - step);
    this.spawnTimer += step;

    this.updatePlayer(step, input);
    this.handleSpawn();
    this.updateEnemies(step);
    this.updateProjectiles(step);
    // Inimigos abatidos por um tiro neste frame saem da lista já, para não agirem
    // (abalroar, atirar) mais um frame depois de mortos.
    this.enemies = this.enemies.filter((enemy) => enemy.health > 0);

    if (this.player.health <= 0 || this.elapsed >= this.config.sessionTime) this.ended = true;
  }

  // ---------------------------------------------------------------- player

  private makePlayer(): Entity {
    const { maxPlayerHealth, playerSpeed } = this.config;
    const radius = 28;
    const spawn = this.findSafeSpawn(radius);
    return {
      id: 0,
      x: spawn.x,
      y: spawn.y,
      radius,
      angle: -Math.PI / 2,
      health: maxPlayerHealth,
      maxHealth: maxPlayerHealth,
      speed: playerSpeed,
      cooldown: 0
    };
  }

  /**
   * Procura o ponto livre mais próximo do centro da arena. O centro em si cai
   * dentro de uma ilha, o que deixaria o navio preso (todo movimento colidiria).
   */
  private findSafeSpawn(radius: number): Vec {
    const { arenaWidth: w, arenaHeight: h } = this.config;
    const center = { x: w / 2, y: h / 2 };
    const clearance = radius + 12;
    let best: Vec | null = null;
    let bestDist = Infinity;
    for (let y = clearance; y <= h - clearance; y += 10) {
      for (let x = clearance; x <= w - clearance; x += 10) {
        const d = distance({ x, y }, center);
        if (d < bestDist && !this.collidesIsland({ x, y }, clearance)) {
          best = { x, y };
          bestDist = d;
        }
      }
    }
    return best ?? center;
  }

  private updatePlayer(step: number, input: InputState) {
    const p = this.player;
    const turn = (input.left ? -1 : 0) + (input.right ? 1 : 0);
    p.angle += turn * this.config.playerRotationSpeed * step;

    if (input.forward) {
      const dir = angleVector(p.angle);
      this.moveWithSlide(p, dir.x * p.speed * step, dir.y * p.speed * step);
    }

    if (input.front && this.frontTimer <= 0) {
      this.fireFront();
      this.frontTimer = this.config.frontCooldown;
    }
    if ((input.sideLeft || input.sideRight) && this.sideTimer <= 0) {
      this.fireSide(input.sideLeft ? -1 : 1);
      this.sideTimer = this.config.sideCooldown;
    }
  }

  private fireFront() {
    const d = angleVector(this.player.angle);
    this.pushProjectile(
      { x: this.player.x + d.x * 34, y: this.player.y + d.y * 34 },
      d,
      'player'
    );
    this.events.push({ type: 'playerFire', side: 'front' });
  }

  private fireSide(sign: -1 | 1) {
    const forward = angleVector(this.player.angle);
    const side = angleVector(this.player.angle + (sign * Math.PI) / 2);
    for (const offset of [-1, 0, 1]) {
      this.pushProjectile(
        {
          x: this.player.x + side.x * 24 + forward.x * offset * 12,
          y: this.player.y + side.y * 24 + forward.y * offset * 12
        },
        side,
        'player'
      );
    }
    this.events.push({ type: 'playerFire', side: 'broadside' });
  }

  private pushProjectile(origin: Vec, dir: Vec, owner: Projectile['owner']) {
    const player = owner === 'player';
    const speed = player ? this.config.playerProjectileSpeed : this.config.enemyProjectileSpeed;
    this.projectiles.push({
      id: this.nextId++,
      x: origin.x,
      y: origin.y,
      velocity: { x: dir.x * speed, y: dir.y * speed },
      radius: PROJECTILE_RADIUS,
      damage: player ? this.config.playerProjectileDamage : this.config.enemyProjectileDamage,
      ttl: player ? this.config.playerProjectileLifetime : this.config.enemyProjectileLifetime,
      owner
    });
  }

  // --------------------------------------------------------------- enemies

  private handleSpawn() {
    if (this.spawnTimer < this.config.spawnInterval) return;
    // Zera o timer mesmo no limite de inimigos, senão um spawn "acumulado" aparece
    // instantaneamente quando um inimigo morre.
    this.spawnTimer = 0;
    if (this.enemies.length < this.config.maxEnemies) this.spawnEnemy();
  }

  private spawnEnemy() {
    const { arenaWidth: w, arenaHeight: h } = this.config;
    const type: EnemyType = this.rng() < CHASER_RATIO ? 'chaser' : 'shooter';
    const corners: Vec[] = [
      { x: SPAWN_MARGIN, y: SPAWN_MARGIN },
      { x: w - SPAWN_MARGIN, y: SPAWN_MARGIN },
      { x: SPAWN_MARGIN, y: h - SPAWN_MARGIN },
      { x: w - SPAWN_MARGIN, y: h - SPAWN_MARGIN }
    ].filter((c) => !this.collidesIsland(c, 30));

    const far = corners.filter((c) => distance(c, this.player) > MIN_SPAWN_DISTANCE);
    // Se o jogador está longe de nenhum canto livre, usa o canto mais distante em vez
    // de nascer em cima dele.
    const pool = far.length
      ? far
      : [...corners].sort((a, b) => distance(b, this.player) - distance(a, this.player)).slice(0, 1);
    const spot = pool[Math.floor(this.rng() * pool.length)] ?? { x: SPAWN_MARGIN, y: SPAWN_MARGIN };

    const health = type === 'chaser' ? this.config.chaserHealth : this.config.shooterHealth;
    this.enemies.push({
      id: this.nextId++,
      x: spot.x,
      y: spot.y,
      radius: 26,
      angle: 0,
      health,
      maxHealth: health,
      type,
      speed: type === 'chaser' ? this.config.chaserSpeed : this.config.shooterSpeed,
      cooldown: 0
    });
  }

  private updateEnemies(dt: number) {
    for (const enemy of this.enemies) {
      if (enemy.health <= 0) continue;
      const toPlayer = { x: this.player.x - enemy.x, y: this.player.y - enemy.y };
      const dir = normalize(toPlayer);
      const dist = Math.hypot(toPlayer.x, toPlayer.y);
      enemy.angle = Math.atan2(dir.y, dir.x);
      enemy.cooldown = Math.max(0, enemy.cooldown - dt);

      if (enemy.type === 'chaser' || dist > this.config.shooterRange) {
        const heading = this.steer(enemy, dir, dt);
        let progress = this.advance(enemy, heading, dt);
        if (enemy.detour && progress < BLOCKED_PROGRESS) {
          // Tangente bloqueada (ex.: corredor estreito entre ilha e borda da arena):
          // tenta o caminho direto, que desliza pela parede, antes de trocar de lado.
          progress = this.advance(enemy, dir, dt);
          if (progress < BLOCKED_PROGRESS) enemy.detourSide = enemy.detourSide === 1 ? -1 : 1;
        }
      }

      if (enemy.type === 'shooter' && dist <= this.config.shooterRange && enemy.cooldown <= 0) {
        this.pushProjectile({ x: enemy.x + dir.x * 28, y: enemy.y + dir.y * 28 }, dir, 'enemy');
        enemy.cooldown = this.config.shooterCooldown;
        this.events.push({ type: 'enemyFire' });
      }

      if (enemy.type === 'chaser' && dist < enemy.radius + this.player.radius) {
        this.damagePlayer(this.config.chaserDamage);
        enemy.health = 0; // abalroou: some sem pontuar
        this.events.push({ type: 'enemyDestroyed', x: enemy.x, y: enemy.y, rammed: true });
      }
    }

    this.separateEnemies();
    this.enemies = this.enemies.filter((enemy) => enemy.health > 0);
  }

  /** Move o inimigo e devolve a fração do passo que de fato andou (0 = parado). */
  private advance(enemy: Entity, heading: Vec, dt: number): number {
    const step = enemy.speed * dt;
    if (step <= 0) return 1;
    const before = { x: enemy.x, y: enemy.y };
    this.moveWithSlide(enemy, heading.x * step, heading.y * step);
    return distance(before, enemy) / step;
  }

  /**
   * Direção efetiva do inimigo. Indo direto ao jogador, quem está do lado oposto de
   * uma ilha só deslizava por um eixo e parava para sempre. Agora, se há uma ilha à
   * frente, ele anda tangente à parede, para o lado da quina mais próxima, até o
   * caminho direto liberar.
   */
  private steer(enemy: Entity, dir: Vec, dt: number): Vec {
    const ahead = { x: enemy.x + dir.x * PROBE_DISTANCE, y: enemy.y + dir.y * PROBE_DISTANCE };
    const blockedBy = this.islands.find((island) =>
      circleRoundedRectCollision(ahead, enemy.radius, collisionShape(island))
    );

    if (blockedBy) {
      if (!enemy.detourSide) enemy.detourSide = this.detourSide(enemy, dir, blockedBy);
      enemy.detour = DETOUR_LINGER;
    } else if (enemy.detour) {
      enemy.detour = Math.max(0, enemy.detour - dt);
      if (enemy.detour === 0) enemy.detourSide = undefined;
    }

    if (!enemy.detour || !enemy.detourSide) return dir;
    return rotate(dir, (enemy.detourSide * Math.PI) / 2);
  }

  /** Escolhe o lado que leva à quina da ilha mais próxima do inimigo. */
  private detourSide(enemy: Entity, dir: Vec, island: Island): 1 | -1 {
    const center = { x: island.x + island.width / 2, y: island.y + island.height / 2 };
    const offset = { x: enemy.x - center.x, y: enemy.y - center.y };
    const clockwise = rotate(dir, Math.PI / 2);
    const dot = clockwise.x * offset.x + clockwise.y * offset.y;
    if (Math.abs(dot) < 1e-6) return this.rng() < 0.5 ? 1 : -1; // exatamente de frente
    return dot > 0 ? 1 : -1;
  }

  /** Evita que inimigos se empilhem no mesmo ponto. */
  private separateEnemies() {
    const list = this.enemies;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (a.health <= 0 || b.health <= 0) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        const min = a.radius + b.radius;
        if (d >= min) continue;
        // Mesma posição exata: empurra num eixo arbitrário determinístico.
        const nx = d > 0.001 ? dx / d : 1;
        const ny = d > 0.001 ? dy / d : 0;
        const push = (min - d) / 2;
        this.moveWithSlide(a, -nx * push, -ny * push);
        this.moveWithSlide(b, nx * push, ny * push);
      }
    }
  }

  // ----------------------------------------------------------- projectiles

  private updateProjectiles(dt: number) {
    const { arenaWidth: w, arenaHeight: h } = this.config;
    for (const p of this.projectiles) {
      p.x += p.velocity.x * dt;
      p.y += p.velocity.y * dt;
      p.ttl -= dt;

      const outOfBounds = p.x < 0 || p.y < 0 || p.x > w || p.y > h;
      if (p.ttl <= 0 || outOfBounds || this.collidesIsland(p, p.radius)) {
        if (p.owner === 'player') this.events.push({ type: 'splash', x: p.x, y: p.y });
        p.ttl = 0;
        continue;
      }

      if (p.owner === 'player') this.resolvePlayerShot(p);
      else this.resolveEnemyShot(p);
    }
    this.projectiles = this.projectiles.filter((p) => p.ttl > 0);
  }

  private resolvePlayerShot(p: Projectile) {
    const hit = this.enemies.find(
      (enemy) => enemy.health > 0 && distance(p, enemy) < p.radius + enemy.radius
    );
    if (!hit) return;
    hit.health -= p.damage;
    p.ttl = 0;
    if (hit.health <= 0) {
      this.score += 1;
      this.events.push({ type: 'enemyDestroyed', x: hit.x, y: hit.y, rammed: false });
    } else {
      this.events.push({ type: 'enemyHit', x: hit.x, y: hit.y });
    }
  }

  private resolveEnemyShot(p: Projectile) {
    if (distance(p, this.player) >= p.radius + this.player.radius) return;
    this.damagePlayer(p.damage);
    p.ttl = 0;
  }

  private damagePlayer(amount: number) {
    this.player.health = Math.max(0, this.player.health - amount);
    this.events.push({ type: 'playerHit' });
  }

  // ------------------------------------------------------------- collision

  /**
   * Move a entidade por eixo: se um eixo está bloqueado por uma ilha, o outro
   * continua livre, então o navio "desliza" na costa em vez de travar.
   */
  private moveWithSlide(entity: Entity, dx: number, dy: number) {
    const { arenaWidth: w, arenaHeight: h } = this.config;
    const r = entity.radius;
    const nx = clamp(entity.x + dx, r, w - r);
    if (!this.collidesIsland({ x: nx, y: entity.y }, r)) entity.x = nx;
    const ny = clamp(entity.y + dy, r, h - r);
    if (!this.collidesIsland({ x: entity.x, y: ny }, r)) entity.y = ny;
  }

  private collidesIsland(point: Vec, radius: number) {
    return this.islands.some((island) => circleRoundedRectCollision(point, radius, collisionShape(island)));
  }

  // ---------------------------------------------------------------- status

  get status(): 'playing' | 'ended' {
    return this.ended ? 'ended' : 'playing';
  }

  get remainingTime() {
    return Math.max(0, this.config.sessionTime - this.elapsed);
  }

  get result(): GameResult {
    return {
      score: this.score,
      duration: Math.min(this.elapsed, this.config.sessionTime),
      reason: this.player.health <= 0 ? 'death' : 'time',
      config: this.config
    };
  }
}
