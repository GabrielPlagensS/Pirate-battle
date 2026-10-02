import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from './config';
import { GameSimulation } from './Simulation';
import { ISLAND_INSET } from './islands';
import type { InputState } from '../types/game';

const IDLE: InputState = {
  forward: false,
  left: false,
  right: false,
  front: false,
  sideLeft: false,
  sideRight: false
};

const make = (overrides: Partial<typeof DEFAULT_CONFIG> = {}, seed = 1) =>
  new GameSimulation({ ...DEFAULT_CONFIG, ...overrides }, seed);

function run(sim: GameSimulation, seconds: number, input: InputState = IDLE) {
  const dt = 1 / 60;
  for (let t = 0; t < seconds && sim.status === 'playing'; t += dt) sim.update(dt, input);
}

describe('GameSimulation', () => {
  it('é determinística com a mesma semente', () => {
    const a = make({}, 42);
    const b = make({}, 42);
    run(a, 30, { ...IDLE, forward: true, front: true });
    run(b, 30, { ...IDLE, forward: true, front: true });
    expect(a.enemies.map((e) => [e.type, Math.round(e.x), Math.round(e.y)])).toEqual(
      b.enemies.map((e) => [e.type, Math.round(e.x), Math.round(e.y)])
    );
    expect(a.player.health).toBe(b.player.health);
  });

  it('encerra por tempo com a duração configurada', () => {
    const sim = make({ sessionTime: 60, chaserDamage: 0, enemyProjectileDamage: 0 });
    run(sim, 61);
    expect(sim.status).toBe('ended');
    expect(sim.result.reason).toBe('time');
    expect(sim.result.duration).toBeCloseTo(60, 0);
  });

  it('respeita o intervalo de spawn configurado', () => {
    const sim = make({ spawnInterval: 5 });
    run(sim, 4.9);
    expect(sim.enemies).toHaveLength(0);
    run(sim, 0.3);
    expect(sim.enemies).toHaveLength(1);
  });

  it('nunca ultrapassa maxEnemies', () => {
    const sim = make({ spawnInterval: 0.5, maxEnemies: 3, chaserDamage: 0, enemyProjectileDamage: 0 });
    run(sim, 40);
    expect(sim.enemies.length).toBeLessThanOrEqual(3);
  });

  it('limita o delta time para evitar tunneling', () => {
    const sim = make();
    sim.update(10, IDLE);
    expect(sim.elapsed).toBeCloseTo(0.05, 5);
  });

  it('aplica cooldown no tiro frontal', () => {
    const sim = make();
    run(sim, 0.2, { ...IDLE, front: true });
    expect(sim.projectiles.filter((p) => p.owner === 'player')).toHaveLength(1);
    run(sim, 0.5, { ...IDLE, front: true });
    expect(sim.projectiles.length + sim.drainEvents().filter((e) => e.type === 'splash').length).toBeGreaterThan(1);
  });

  it('tiro lateral dispara 3 projéteis paralelos', () => {
    const sim = make();
    sim.update(1 / 60, { ...IDLE, sideLeft: true });
    const shots = sim.projectiles.filter((p) => p.owner === 'player');
    expect(shots).toHaveLength(3);
    const [first] = shots;
    for (const s of shots) {
      expect(s.velocity.x).toBeCloseTo(first.velocity.x, 5);
      expect(s.velocity.y).toBeCloseTo(first.velocity.y, 5);
    }
  });

  it('o jogador não atravessa ilhas e desliza pela costa', () => {
    const sim = make();
    const island = sim.islands[2]; // ilha central (areia)
    sim.player.x = island.x + island.width / 2;
    sim.player.y = island.y - sim.player.radius - 2;
    sim.player.angle = Math.PI / 4; // diagonal: bloqueia em Y, livre em X
    const startX = sim.player.x;
    run(sim, 0.3, { ...IDLE, forward: true });
    expect(sim.player.y).toBeLessThanOrEqual(island.y + ISLAND_INSET - sim.player.radius + 0.001);
    expect(sim.player.x).toBeGreaterThan(startX + 20); // deslizou
  });

  it('o jogador nasce em águas livres, fora de qualquer ilha', () => {
    const sim = make();
    const { x, y, radius } = sim.player;
    const touching = sim.islands.some((i) => {
      const cx = Math.max(i.x, Math.min(x, i.x + i.width));
      const cy = Math.max(i.y, Math.min(y, i.y + i.height));
      return Math.hypot(x - cx, y - cy) <= radius;
    });
    expect(touching).toBe(false);
  });

  it('o jogador consegue se mover logo ao iniciar', () => {
    const sim = make();
    const { x, y } = sim.player;
    run(sim, 0.5, { ...IDLE, forward: true });
    expect(Math.hypot(sim.player.x - x, sim.player.y - y)).toBeGreaterThan(50);
  });

  it('mantém o jogador dentro da arena', () => {
    const sim = make();
    sim.player.angle = 0;
    run(sim, 20, { ...IDLE, forward: true });
    expect(sim.player.x).toBeLessThanOrEqual(sim.config.arenaWidth - sim.player.radius);
  });

  it('pontua e emite evento ao destruir um inimigo', () => {
    const sim = make({ spawnInterval: 15 });
    sim.enemies.push({
      id: 999, x: sim.player.x, y: sim.player.y - 120, radius: 26, angle: 0,
      health: 10, maxHealth: 10, type: 'shooter', speed: 0, cooldown: 99
    });
    run(sim, 1, { ...IDLE, front: true }); // player aponta para cima (-π/2)
    expect(sim.score).toBe(1);
    expect(sim.drainEvents().some((e) => e.type === 'enemyDestroyed' && !e.rammed)).toBe(true);
  });

  it('abalroada de chaser causa dano mas não pontua', () => {
    const sim = make({ spawnInterval: 15 });
    sim.enemies.push({
      id: 999, x: sim.player.x + 10, y: sim.player.y, radius: 26, angle: 0,
      health: 60, maxHealth: 60, type: 'chaser', speed: 0, cooldown: 0
    });
    sim.update(1 / 60, IDLE);
    expect(sim.player.health).toBe(DEFAULT_CONFIG.maxPlayerHealth - DEFAULT_CONFIG.chaserDamage);
    expect(sim.score).toBe(0);
    expect(sim.enemies).toHaveLength(0);
  });

  it('termina por morte e reporta o motivo', () => {
    const sim = make({ spawnInterval: 15 });
    sim.player.health = 1;
    sim.enemies.push({
      id: 999, x: sim.player.x + 10, y: sim.player.y, radius: 26, angle: 0,
      health: 60, maxHealth: 60, type: 'chaser', speed: 0, cooldown: 0
    });
    sim.update(1 / 60, IDLE);
    expect(sim.status).toBe('ended');
    expect(sim.result.reason).toBe('death');
  });

  it('inimigos não ficam empilhados na mesma posição', () => {
    const sim = make({ spawnInterval: 15 });
    for (const id of [1, 2]) {
      sim.enemies.push({
        id, x: 100, y: 600, radius: 26, angle: 0, health: 60, maxHealth: 60,
        type: 'shooter', speed: 0, cooldown: 99
      });
    }
    run(sim, 0.5);
    const [a, b] = sim.enemies;
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(a.radius + b.radius - 1);
  });

  it('inimigo do lado oposto de uma ilha dá a volta e alcança o jogador', () => {
    // Regressão: andando direto, ele só deslizava por um eixo e parava para sempre.
    const sim = make({ spawnInterval: 1e9 });
    const island = sim.islands[4]; // ilha ao sul, com o centro livre acima dela
    const cx = island.x + island.width / 2;
    sim.player.x = cx;
    sim.player.y = 690; // água abaixo da ilha
    sim.enemies.push({
      id: 999, x: cx, y: island.y - 120, radius: 26, angle: 0,
      health: 60, maxHealth: 60, type: 'chaser', speed: sim.config.chaserSpeed, cooldown: 0
    });
    run(sim, 30);
    expect(sim.player.health).toBeLessThan(sim.player.maxHealth); // abalroou
    expect(sim.enemies).toHaveLength(0);
  });

  it('inimigo abatido por um tiro sai da lista no mesmo frame', () => {
    // Regressão: ele ficava mais um frame e ainda podia abalroar ou atirar.
    const sim = make({ spawnInterval: 1e9 });
    sim.enemies.push({
      id: 999, x: sim.player.x, y: sim.player.y - 60, radius: 26, angle: 0,
      health: 1, maxHealth: 1, type: 'shooter', speed: 0, cooldown: 99
    });
    sim.update(1 / 60, { ...IDLE, front: true });
    expect(sim.score).toBe(1);
    expect(sim.enemies).toHaveLength(0);
  });
});
