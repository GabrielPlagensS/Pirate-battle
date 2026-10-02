import { describe, expect, it } from 'vitest';
import { isPage } from './guards';

describe('isPage', () => {
  it('aceita uma página válida (inclusive vazia)', () => {
    expect(isPage({ items: [], page: 1, pageSize: 8, total: 0, totalPages: 1 })).toBe(true);
    expect(isPage({ items: [{ id: 'a' }], page: 2, totalPages: 3 })).toBe(true);
  });

  it('rejeita o index.html que o Vite devolve quando o mock está inativo', () => {
    expect(isPage('<!doctype html><html><body><div id="root"></div></body></html>')).toBe(false);
  });

  it('rejeita formatos quebrados', () => {
    expect(isPage(null)).toBe(false);
    expect(isPage(undefined)).toBe(false);
    expect(isPage({})).toBe(false);
    expect(isPage({ items: 'x', page: 1, totalPages: 1 })).toBe(false);
    expect(isPage({ items: [], page: '1', totalPages: 1 })).toBe(false);
  });
});
