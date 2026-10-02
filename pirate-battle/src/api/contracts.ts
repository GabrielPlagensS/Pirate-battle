import type { GameResult, MatchRecord, Page, RankingEntry } from '../types/game';
import { api } from './client';
import { ApiUnavailableError, isPage, MOCK_API_LOST_EVENT } from './guards';

export const PLAYER_ID = 'player-local';
export const PLAYER_NAME = 'Captain Gabriel';

/** Identidade de uma partida, gerada uma única vez quando ela termina. */
export interface MatchMeta {
  id: string;
  date: string;
}

/** `crypto.randomUUID` só existe em contexto seguro (HTTPS/localhost); em http://IP-da-rede some. */
function uniqueId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createMatchMeta(): MatchMeta {
  return { id: `match-${uniqueId()}`, date: new Date().toISOString() };
}

/** Garante uma página válida; se não for, pede a reativação do mock e falha de forma tratável. */
function expectPage<T>(data: unknown, endpoint: string): Page<T> {
  if (isPage<T>(data)) return data;
  window.dispatchEvent(new Event(MOCK_API_LOST_EVENT));
  throw new ApiUnavailableError(endpoint);
}

export async function getRanking(page = 1, pageSize = 8): Promise<Page<RankingEntry>> {
  const { data } = await api.get<unknown>('/ranking', { params: { page, pageSize } });
  return expectPage<RankingEntry>(data, '/ranking');
}

export async function getHistory(page = 1, pageSize = 8): Promise<Page<MatchRecord>> {
  const { data } = await api.get<unknown>('/history', {
    params: { page, pageSize, playerId: PLAYER_ID }
  });
  return expectPage<MatchRecord>(data, '/history');
}

/**
 * O `id` vem de fora (MatchMeta) para que tentativas repetidas da MESMA partida
 * enviem a mesma Idempotency-Key e não gerem registros duplicados.
 */
export async function saveMatch(result: GameResult, meta: MatchMeta): Promise<MatchRecord> {
  const { data } = await api.post<MatchRecord>(
    '/matches',
    { id: meta.id, playerId: PLAYER_ID, playerName: PLAYER_NAME, date: meta.date, ...result },
    { headers: { 'Idempotency-Key': meta.id } }
  );
  return data;
}
