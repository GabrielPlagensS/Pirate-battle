import { createRng, type Rng } from './math';
import { SEAM_H, SEAM_V } from './tileSeams';

/** Lado do tile do tileset (todos os tiles são 64×64, sem margem). */
export const TILE = 64;
/** A areia não ocupa o tile inteiro: sobra uma borda de água de ~4px. */
export const ISLAND_INSET = 4;
/** Raio dos cantos arredondados da areia, para a colisão acompanhar o desenho. */
export const ISLAND_CORNER = 26;

export type IslandStyle = 'grass' | 'sand';

export interface Island {
  x: number;
  y: number;
  width: number;
  height: number;
  style: IslandStyle;
  seed: number;
}

/** Posição da ilha em células de tile (mais fácil de alinhar que pixels). */
interface IslandDef {
  col: number;
  row: number;
  cols: number;
  rows: number;
  style: IslandStyle;
}

export interface TilePlacement {
  /** Coluna/linha relativas ao canto da ilha. */
  col: number;
  row: number;
  /** Número do arquivo `tile_N.png`. */
  tile: number;
}

export interface Decoration {
  /** Posição em pixels, relativa ao canto da ilha. */
  x: number;
  y: number;
  tile: number;
  scale: number;
  rotation: number;
}

export interface IslandLayout {
  tiles: TilePlacement[];
  decorations: Decoration[];
}

/**
 * Mapa. Tamanhos em tiles (arena 20×11,25). Mantém corredores ≥ 1 tile entre ilhas,
 * longe dos 4 cantos de spawn dos inimigos e com o centro livre: é onde o jogador
 * nasce, e ele não pode começar encostado numa parede de areia. Toda ilha tem exatamente 3 colunas e
 * 3–4 linhas: com menos que isso as bordas de areia se encostam e, com mais colunas,
 * o tileset (Wang) não tem como encadear dois tiles de borda iguais sem emenda.
 */
const DEFS: readonly IslandDef[] = [
  { col: 2, row: 1, cols: 3, rows: 3, style: 'grass' }, // noroeste
  { col: 11, row: 1, cols: 3, rows: 3, style: 'sand' }, // norte
  { col: 15, row: 1, cols: 3, rows: 4, style: 'grass' }, // nordeste
  { col: 2, row: 6, cols: 3, rows: 4, style: 'grass' }, // sudoeste
  { col: 9, row: 7, cols: 3, rows: 3, style: 'grass' }, // sul
  { col: 15, row: 7, cols: 3, rows: 3, style: 'sand' } // sudeste
];

export const ISLANDS: readonly Island[] = DEFS.map((d, i) => ({
  x: d.col * TILE,
  y: d.row * TILE,
  width: d.cols * TILE,
  height: d.rows * TILE,
  style: d.style,
  seed: 1000 + i * 7919
}));

// ------------------------------------------------------------------ tilesets
// Números de `public/assets/png/default/tiles/tile_N.png`.

interface TileSet {
  tl: number[]; tr: number[]; bl: number[]; br: number[];
  top: number[]; bottom: number[]; left: number[]; right: number[]; center: number[];
  /** Bordas inferiores com barco/canhão/pedra: mesmas emendas do tile que substituem. */
  bottomItems: number[];
}

const GRASS: TileSet = {
  tl: [6], tr: [9], bl: [54], br: [57],
  top: [7, 8],
  bottom: [55, 56],
  left: [22, 38],
  right: [25, 41],
  center: [23, 39, 40, 24],
  bottomItems: [82, 84, 86]
};

const SAND: TileSet = {
  tl: [1], tr: [3], bl: [33], br: [35],
  top: [2],
  bottom: [34],
  left: [17],
  right: [19],
  center: [4, 5, 18, 20, 21, 68, 69],
  bottomItems: [81, 83, 85]
};

const PLANT_BIG = 71;
const PLANT_MEDIUM = 70;
const PLANT_SMALL = 72;
const SPROUTS = [87, 88];
const ROCKS_GREY = [49, 50, 51];
const ROCKS_MOSSY = [65, 66, 67];

const pick = <T,>(rng: Rng, list: readonly T[]): T => list[Math.floor(rng() * list.length)];
const range = (rng: Rng, min: number, max: number) => min + rng() * (max - min);

// ------------------------------------------------------------------- layout

/** Gera (de forma determinística, a partir da `seed`) os tiles e a decoração da ilha. */
export function layoutIsland(island: Island): IslandLayout {
  const rng = createRng(island.seed);
  const cols = Math.round(island.width / TILE);
  const rows = Math.round(island.height / TILE);
  const set = island.style === 'grass' ? GRASS : SAND;

  const grid = solveTiles(set, cols, rows, rng);
  const tiles: TilePlacement[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) tiles.push({ col, row, tile: grid[row][col] });
  }

  placeItemTile(set, tiles, cols, rows, rng);
  return { tiles, decorations: decorate(island, tiles, cols, rows, rng) };
}

function candidatesFor(set: TileSet, col: number, row: number, cols: number, rows: number): number[] {
  const top = row === 0;
  const bottom = row === rows - 1;
  const left = col === 0;
  const right = col === cols - 1;
  if (top && left) return set.tl;
  if (top && right) return set.tr;
  if (bottom && left) return set.bl;
  if (bottom && right) return set.br;
  if (top) return set.top;
  if (bottom) return set.bottom;
  if (left) return set.left;
  if (right) return set.right;
  return set.center;
}

const seamH = (a: number, b: number) => SEAM_H[`${a},${b}`] ?? 99;
const seamV = (a: number, b: number) => SEAM_V[`${a},${b}`] ?? 99;

function shuffled<T>(rng: Rng, list: readonly T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * O tileset é do tipo Wang: cada tile só encaixa bem em vizinhos específicos.
 * Em vez de sortear, escolhemos a combinação com menos emendas visíveis, usando a
 * tabela de `tileSeams.ts`. As grades são pequenas (poucas opções por célula), então
 * dá para buscar o ótimo: uma descida de coordenadas dá um limite inicial e uma
 * busca em profundidade com poda procura algo melhor. A ordem das opções é
 * embaralhada pela seed, então ilhas de mesmo tamanho não ficam idênticas quando há empate.
 */
function solveTiles(set: TileSet, cols: number, rows: number, rng: Rng): number[][] {
  const options = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => shuffled(rng, candidatesFor(set, c, r, cols, rows)))
  );

  // Penaliza ao quadrado: uma emenda forte pesa mais que várias leves.
  const penalty = (seam: number) => seam * seam;
  const gridCost = (grid: number[][]) => {
    let cost = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (c < cols - 1) cost += penalty(seamH(grid[r][c], grid[r][c + 1]));
        if (r < rows - 1) cost += penalty(seamV(grid[r][c], grid[r + 1][c]));
      }
    }
    return cost;
  };

  let best = descend(options, cols, rows);
  let bestCost = gridCost(best);

  // Busca em profundidade com poda (limite de nós como rede de segurança).
  const current: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  let nodes = 0;
  const NODE_LIMIT = 300_000;
  const search = (index: number, cost: number) => {
    if (nodes++ > NODE_LIMIT || cost >= bestCost) return;
    if (index === rows * cols) {
      best = current.map((line) => [...line]);
      bestCost = cost;
      return;
    }
    const r = Math.floor(index / cols);
    const c = index % cols;
    for (const tile of options[r][c]) {
      let add = 0;
      if (c > 0) add += penalty(seamH(current[r][c - 1], tile));
      if (r > 0) add += penalty(seamV(current[r - 1][c], tile));
      current[r][c] = tile;
      search(index + 1, cost + add);
    }
  };
  search(0, 0);
  return best;
}

/** Solução inicial: escolhe, célula a célula, o tile que melhor encaixa nos vizinhos. */
function descend(options: number[][][], cols: number, rows: number): number[][] {
  const grid = options.map((line) => line.map((list) => list[0]));
  const costAt = (r: number, c: number, tile: number) => {
    let cost = 0;
    if (c > 0) cost += seamH(grid[r][c - 1], tile);
    if (c < cols - 1) cost += seamH(tile, grid[r][c + 1]);
    if (r > 0) cost += seamV(grid[r - 1][c], tile);
    if (r < rows - 1) cost += seamV(tile, grid[r + 1][c]);
    return cost;
  };
  for (let sweep = 0; sweep < 6; sweep++) {
    let changed = false;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let best = grid[r][c];
        let bestCost = costAt(r, c, best);
        for (const tile of options[r][c]) {
          const cost = costAt(r, c, tile);
          if (cost < bestCost - 1e-9) {
            best = tile;
            bestCost = cost;
          }
        }
        if (best !== grid[r][c]) {
          grid[r][c] = best;
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
  return grid;
}

/**
 * Troca UMA borda inferior por uma "praia com item" (barco, canhão, pedra). Esses
 * tiles têm as mesmas emendas do tile que substituem, então não criam costura.
 */
function placeItemTile(set: TileSet, tiles: TilePlacement[], cols: number, rows: number, rng: Rng) {
  if (cols < 3) return;
  const candidates = tiles.filter((t) => t.row === rows - 1 && t.col > 0 && t.col < cols - 1);
  if (candidates.length && rng() < 0.85) pick(rng, candidates).tile = pick(rng, set.bottomItems);
}

function decorate(island: Island, tiles: TilePlacement[], cols: number, rows: number, rng: Rng): Decoration[] {
  const itemCells = new Set(
    tiles.filter((t) => GRASS.bottomItems.includes(t.tile) || SAND.bottomItems.includes(t.tile)).map((t) => `${t.col},${t.row}`)
  );
  const out: Decoration[] = [];
  const add = (x: number, y: number, tile: number, scaleMin: number, scaleMax: number) =>
    out.push({ x, y, tile, scale: range(rng, scaleMin, scaleMax), rotation: rng() * Math.PI * 2 });

  const grass = island.style === 'grass';
  const rocks = grass ? ROCKS_MOSSY : ROCKS_GREY;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x0 = col * TILE;
      const y0 = row * TILE;
      const cx = x0 + TILE / 2;
      const cy = y0 + TILE / 2;
      const interior = col > 0 && col < cols - 1 && row > 0 && row < rows - 1;
      const edge = !interior && !((col === 0 || col === cols - 1) && (row === 0 || row === rows - 1));

      if (grass && interior) {
        if (rng() < 0.7) add(cx + range(rng, -8, 8), cy + range(rng, -8, 8), PLANT_BIG, 0.95, 1.2);
        if (rng() < 0.45) add(cx + range(rng, -22, 22), cy + range(rng, -22, 22), PLANT_SMALL, 0.8, 1.1);
        if (rng() < 0.3) add(cx + range(rng, -20, 20), cy + range(rng, -20, 20), PLANT_MEDIUM, 0.7, 0.95);
        if (rng() < 0.35) add(cx + range(rng, -24, 24), cy + range(rng, -24, 24), pick(rng, SPROUTS), 0.9, 1.2);
      } else if (!grass && interior) {
        if (rng() < 0.55) add(cx + range(rng, -10, 10), cy + range(rng, -10, 10), PLANT_SMALL, 1.05, 1.3);
        else add(cx + range(rng, -16, 16), cy + range(rng, -16, 16), pick(rng, ROCKS_GREY), 0.55, 0.8);
      }

      // Pedras só na faixa de areia (nunca na água).
      if (edge && !itemCells.has(`${col},${row}`) && rng() < 0.28) {
        const top = row === 0 && !(rows === 1);
        const bottom = row === rows - 1;
        const left = col === 0;
        const right = col === cols - 1;
        const x = left ? x0 + 24 : right ? x0 + 40 : cx + range(rng, -14, 14);
        const y = top ? y0 + 24 : bottom ? y0 + 40 : cy + range(rng, -14, 14);
        add(x, y, pick(rng, rocks), 0.5, 0.75);
      }
    }
  }
  return out;
}

/** Todos os números de tile usados por um conjunto de ilhas (para pré-carregar texturas). */
export function usedTileIds(islands: readonly Island[] = ISLANDS): number[] {
  const ids = new Set<number>();
  for (const island of islands) {
    const layout = layoutIsland(island);
    for (const t of layout.tiles) ids.add(t.tile);
    for (const d of layout.decorations) ids.add(d.tile);
  }
  return [...ids].sort((a, b) => a - b);
}

/** Retângulo (com cantos arredondados) que representa a areia, usado na colisão. */
export function collisionShape(island: Island) {
  return {
    x: island.x + ISLAND_INSET,
    y: island.y + ISLAND_INSET,
    width: island.width - ISLAND_INSET * 2,
    height: island.height - ISLAND_INSET * 2,
    corner: ISLAND_CORNER
  };
}
