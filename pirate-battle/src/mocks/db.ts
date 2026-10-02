import type { MatchRecord, RankingEntry } from '../types/game';
import { DEFAULT_CONFIG } from '../game/config';
import { PLAYER_ID, PLAYER_NAME } from '../api/contracts';

const KEY = 'pirate-battle-mock-db';

interface Db { matches: MatchRecord[]; }

function seed(): Db {
  const names = ['Black Pearl', 'Sea Wolf', 'Storm Captain', 'Red Kraken', 'Golden Anchor', 'Iron Tide', 'Coral Queen', 'Night Sailor'];
  return {
    matches: names.map((name, i) => ({
      id: `fixture-${i + 1}`,
      playerId: `fixture-player-${i + 1}`,
      date: new Date(Date.now() - i * 86400000).toISOString(),
      score: 20 - i,
      duration: 90 + i * 2,
      reason: 'time',
      config: { ...DEFAULT_CONFIG, sessionTime: 120 }
    }))
  };
}

function read(): Db {
  try {
    const value = localStorage.getItem(KEY);
    if (value) return JSON.parse(value) as Db;
  } catch { /* reset below */ }
  const initial = seed();
  write(initial);
  return initial;
}

function write(db: Db): void { localStorage.setItem(KEY, JSON.stringify(db)); }

export function allMatches(): MatchRecord[] { return read().matches; }

export function addMatch(match: MatchRecord): MatchRecord {
  const db = read();
  const existing = db.matches.find((item) => item.id === match.id);
  if (existing) return existing;
  db.matches.push(match);
  write(db);
  return match;
}

export function ranking(): RankingEntry[] {
  return read().matches
    .map((match) => ({ ...match, playerName: match.playerId === PLAYER_ID ? PLAYER_NAME : `Captain ${match.playerId.replace('fixture-player-', '')}` }))
    .sort((a, b) => b.score - a.score || a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

export function history(): MatchRecord[] {
  return read().matches.filter((match) => match.playerId === PLAYER_ID).sort((a, b) => b.date.localeCompare(a.date));
}

export function resetDb(): void { localStorage.removeItem(KEY); }
