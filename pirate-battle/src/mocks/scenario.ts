import type { NetworkScenario } from '../types/game';

const KEY = 'pirate-battle-network-scenario';
const DEFAULT: NetworkScenario = { mode: 'success', latencyMs: 150 };

/**
 * Fica separado de handlers.ts para que a UI (NetworkTools) não importe o MSW
 * no bundle principal — o MSW só é carregado via import() dinâmico no main.tsx.
 */
export function getScenario(): NetworkScenario {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '') as Partial<NetworkScenario>;
    return { ...DEFAULT, ...parsed };
  } catch {
    return { ...DEFAULT };
  }
}

export function setScenario(scenario: NetworkScenario): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(scenario));
  } catch {
    /* ignora */
  }
}
