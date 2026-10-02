import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from './config';
import {
  ISLANDS,
  ISLAND_CORNER,
  ISLAND_INSET,
  TILE,
  collisionShape,
  layoutIsland,
  usedTileIds,
  type Island
} from './islands';
import { circleRoundedRectCollision } from './math';
import { SEAM_H, SEAM_V } from './tileSeams';

const cellsOf = (island: Island) => ({
  cols: Math.round(island.width / TILE),
  rows: Math.round(island.height / TILE)
});

/** Distância entre dois retângulos (0 se encostam ou se sobrepõem). */
function gap(a: Island, b: Island) {
  const dx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.width, b.x + b.width));
  const dy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.height, b.y + b.height));
  return Math.hypot(dx, dy);
}

describe('mapa de ilhas', () => {
  it('alinha todas as ilhas à grade de tiles', () => {
    for (const i of ISLANDS) {
      expect(i.x % TILE).toBe(0);
      expect(i.y % TILE).toBe(0);
      expect(i.width % TILE).toBe(0);
      expect(i.height % TILE).toBe(0);
    }
  });

  it('mantém as ilhas dentro da arena com folga para o navio passar', () => {
    for (const i of ISLANDS) {
      expect(i.x).toBeGreaterThanOrEqual(TILE);
      expect(i.y).toBeGreaterThanOrEqual(TILE);
      expect(DEFAULT_CONFIG.arenaWidth - (i.x + i.width)).toBeGreaterThanOrEqual(TILE);
      expect(DEFAULT_CONFIG.arenaHeight - (i.y + i.height)).toBeGreaterThanOrEqual(TILE - 1);
    }
  });

  it('deixa corredores navegáveis entre as ilhas (maiores que o casco de 56px)', () => {
    for (let a = 0; a < ISLANDS.length; a++) {
      for (let b = a + 1; b < ISLANDS.length; b++) {
        expect(gap(ISLANDS[a], ISLANDS[b])).toBeGreaterThanOrEqual(56);
      }
    }
  });

  it('não bloqueia nenhum dos 4 cantos de spawn dos inimigos', () => {
    const { arenaWidth: w, arenaHeight: h } = DEFAULT_CONFIG;
    const corners = [
      { x: 50, y: 50 },
      { x: w - 50, y: 50 },
      { x: 50, y: h - 50 },
      { x: w - 50, y: h - 50 }
    ];
    for (const c of corners) {
      for (const i of ISLANDS) expect(circleRoundedRectCollision(c, 30, collisionShape(i))).toBe(false);
    }
  });
});

describe('layoutIsland', () => {
  it('preenche toda a grade exatamente uma vez', () => {
    for (const island of ISLANDS) {
      const { cols, rows } = cellsOf(island);
      const { tiles } = layoutIsland(island);
      expect(tiles).toHaveLength(cols * rows);
      expect(new Set(tiles.map((t) => `${t.col},${t.row}`)).size).toBe(cols * rows);
    }
  });

  it('é determinística', () => {
    for (const island of ISLANDS) {
      expect(layoutIsland(island)).toEqual(layoutIsland(island));
    }
  });

  it('só usa tiles que existem no tileset (1–96)', () => {
    for (const id of usedTileIds()) {
      expect(id).toBeGreaterThanOrEqual(1);
      expect(id).toBeLessThanOrEqual(96);
    }
  });

  it('usa os cantos de areia corretos', () => {
    for (const island of ISLANDS) {
      const { cols, rows } = cellsOf(island);
      const grid = new Map(layoutIsland(island).tiles.map((t) => [`${t.col},${t.row}`, t.tile]));
      const corners = [
        grid.get('0,0'),
        grid.get(`${cols - 1},0`),
        grid.get(`0,${rows - 1}`),
        grid.get(`${cols - 1},${rows - 1}`)
      ];
      const expected = island.style === 'grass' ? [6, 9, 54, 57] : [1, 3, 33, 35];
      expect(corners).toEqual(expected);
    }
  });

  it('não deixa emendas visíveis entre tiles vizinhos', () => {
    // Na tabela, ≈1,5 encaixa perfeito. O tileset não tem combinação melhor que ~11,8
    // para a ilha de grama 3×3 (confirmado por busca exaustiva); acima disso é regressão.
    for (const island of ISLANDS) {
      const { cols, rows } = cellsOf(island);
      const grid = new Map(layoutIsland(island).tiles.map((t) => [`${t.col},${t.row}`, t.tile]));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const here = grid.get(`${c},${r}`)!;
          const right = grid.get(`${c + 1},${r}`);
          const below = grid.get(`${c},${r + 1}`);
          if (right) expect(SEAM_H[`${normalize(here)},${normalize(right)}`] ?? 99).toBeLessThanOrEqual(12);
          if (below) expect(SEAM_V[`${normalize(here)},${normalize(below)}`] ?? 99).toBeLessThanOrEqual(12);
        }
      }
    }
  });

  it('mantém as decorações dentro da ilha', () => {
    for (const island of ISLANDS) {
      for (const d of layoutIsland(island).decorations) {
        expect(d.x).toBeGreaterThanOrEqual(0);
        expect(d.y).toBeGreaterThanOrEqual(0);
        expect(d.x).toBeLessThanOrEqual(island.width);
        expect(d.y).toBeLessThanOrEqual(island.height);
      }
    }
  });
});

/** Barco/canhão/pedra na praia têm as mesmas emendas do tile comum que substituem. */
function normalize(tile: number) {
  const items: Record<number, number> = { 81: 34, 83: 34, 85: 34, 82: 55, 84: 55, 86: 55 };
  return items[tile] ?? tile;
}

describe('colisão arredondada', () => {
  const island = ISLANDS[2];
  const shape = collisionShape(island);

  it('usa o inset e o raio de canto definidos', () => {
    expect(shape.x).toBe(island.x + ISLAND_INSET);
    expect(shape.corner).toBe(ISLAND_CORNER);
  });

  it('bloqueia o meio das bordas', () => {
    const topMiddle = { x: island.x + island.width / 2, y: shape.y - 5 };
    expect(circleRoundedRectCollision(topMiddle, 6, shape)).toBe(true);
  });

  it('libera a água no "vão" do canto arredondado', () => {
    // Quina do retângulo: dentro dele, mas fora da areia arredondada.
    const corner = { x: shape.x + 2, y: shape.y + 2 };
    expect(circleRoundedRectCollision(corner, 2, shape)).toBe(false);
  });

  it('bloqueia o interior da ilha', () => {
    const center = { x: island.x + island.width / 2, y: island.y + island.height / 2 };
    expect(circleRoundedRectCollision(center, 6, shape)).toBe(true);
  });
});
