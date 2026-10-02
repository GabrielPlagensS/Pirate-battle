import type { Page } from '../types/game';

/**
 * Valida o formato de uma resposta paginada. Sem isso, qualquer resposta 200 que
 * não seja a esperada (ex.: o `index.html` que o Vite devolve quando o mock da API
 * não está ativo) entra no cache como se fosse válida e quebra a tela com
 * "Cannot read properties of undefined".
 */
export function isPage<T>(value: unknown): value is Page<T> {
  if (typeof value !== 'object' || value === null) return false;
  const page = value as Partial<Page<T>>;
  return (
    Array.isArray(page.items) &&
    typeof page.page === 'number' &&
    typeof page.totalPages === 'number'
  );
}

/** Erro lançado quando a API respondeu, mas não com o formato esperado. */
export class ApiUnavailableError extends Error {
  constructor(endpoint: string) {
    super(`Unexpected response from ${endpoint}`);
    this.name = 'ApiUnavailableError';
  }
}

/** Evento global: o mock da API (MSW) precisa ser reativado. Ver `main.tsx`. */
export const MOCK_API_LOST_EVENT = 'pirate-battle:mock-api-lost';
