#!/usr/bin/env python3
"""
Gera src/game/tileSeams.ts: o quanto cada par de tiles "encaixa" lado a lado.

O tileset é do tipo Wang: cada tile foi desenhado para encostar em vizinhos
específicos. Valor ≈ 1,5 = emenda invisível; ≥ 8 = emenda visível.

Uso (precisa de Pillow e numpy):  python3 scripts/compute-tile-seams.py
Rode de novo se mudar os tiles candidatos em src/game/islands.ts.
"""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
TILES = ROOT / "public/assets/png/default/tiles"
OUT = ROOT / "src/game/tileSeams.ts"

CANDIDATES = [
    1, 2, 3, 17, 19, 33, 34, 35, 4, 5, 18, 20, 21, 68, 69,      # areia
    6, 7, 8, 9, 22, 25, 38, 41, 54, 55, 56, 57, 23, 24, 39, 40,  # grama
]


def load(n):
    return np.array(Image.open(TILES / f"tile_{n}.png").convert("RGBA")).astype(float)


def seam(a, b, axis):
    """axis 'h': a fica à esquerda de b. axis 'v': a fica acima de b."""
    ea = a[:, -1, :] if axis == "h" else a[-1, :, :]
    eb = b[:, 0, :] if axis == "h" else b[0, :, :]
    opaque = (ea[:, 3] > 200) & (eb[:, 3] > 200)
    color = np.abs(ea[opaque, :3] - eb[opaque, :3]).mean() if opaque.any() else 99.0
    return color + np.abs(ea[:, 3] - eb[:, 3]).mean() * 0.2


tiles = {n: load(n) for n in CANDIDATES}


def table(axis):
    rows = []
    for a in CANDIDATES:
        for b in CANDIDATES:
            rows.append(f"  '{a},{b}': {min(seam(tiles[a], tiles[b], axis), 99):.1f}")
    return ",\n".join(rows)


OUT.write_text(
    "// GERADO por scripts/compute-tile-seams.py — não edite à mão.\n"
    "// Diferença de cor na borda entre dois tiles vizinhos (menor = encaixa melhor).\n\n"
    "/** `a,b`: tile `a` à esquerda de `b`. */\n"
    f"export const SEAM_H: Record<string, number> = {{\n{table('h')}\n}};\n\n"
    "/** `a,b`: tile `a` acima de `b`. */\n"
    f"export const SEAM_V: Record<string, number> = {{\n{table('v')}\n}};\n"
)
print("escrito", OUT, "com", len(CANDIDATES) ** 2, "pares por eixo")
