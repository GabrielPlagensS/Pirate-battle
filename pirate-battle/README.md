# Pirate Battle — React + PixiJS

Implementação do desafio Game Developer da Jungle Gaming usando React, TypeScript, PixiJS, TanStack Query, Axios, MSW e Playwright.

## Assets reais do desafio

O projeto usa o pacote de assets fornecido no repositório original, preservado em `public/assets/`.

Principais recursos usados no jogo:

- `png/default/ships/ship_1.png` — jogador
- `png/default/ships/ship_2.png` — Chaser
- `png/default/ships/ship_5.png` — Shooter
- `png/default/ship_parts/cannon_ball.png` — projéteis
- `png/default/tiles/tile_73.png` — água
- `png/default/tiles/tile_23.png` — terreno das ilhas
- `png/default/effects/explosion_*.png` — explosões
- `png/default/ui/...` — título, HUD e controles
- `spritesheet/ui_sheet.json` e `ui_sheet_retina.json` — atlas da interface
- `sounds/*.wav` — efeitos e ambiência

## Executar

> **Antes de tudo:** o `public/mockServiceWorker.js` deste projeto é um stub de 294 bytes. Gere o worker real do MSW (uma vez, após o `npm install`):
>
> ```bash
> npx msw init public/ --save
> ```
>
> Sem isso o ranking e o histórico não funcionam.

```bash
npm install
npm run dev
```

Depois abra o endereço exibido pelo Vite.

Build de produção:

```bash
npm run build
npm run preview
```

## Testes

```bash
npm run test        # unitários (vitest): simulação do jogo
npm run test:e2e    # Playwright (sobe o Vite na porta 5173)
npm run typecheck
npm run lint
```

## Controles

- `W` / `↑`: avançar
- `A` / `←`: girar para a esquerda
- `D` / `→`: girar para a direita
- `Space`: disparo frontal
- `Q`: disparo lateral esquerdo com 3 projéteis paralelos
- `E`: disparo lateral direito com 3 projéteis paralelos
- `Esc`: pausar/retomar

Em dispositivos touch, os controles aparecem abaixo da arena.

## Estrutura

- `src/game/Simulation.ts` — simulação determinística por tempo, colisões, inimigos e projéteis.
- `src/game/PixiGame.ts` — renderização PixiJS, input, áudio, efeitos e ciclo de vida.
- `src/game/assets.ts` — manifesto centralizado dos assets reais.
- `src/components/` — telas e UI React.
- `src/api/` — contratos HTTP e cliente Axios.
- `src/mocks/` — API mockada com MSW.
- `src/hooks/` — TanStack Query e cenários de rede.
- `tests/` — testes Playwright.

## Observação sobre Windows

Se o Windows Smart App Control/Code Integrity bloquear o módulo nativo opcional do Rollup durante `npm run dev`, isso é uma política de segurança do Windows e não um asset ausente do projeto. O pacote do desafio não precisa de arquivos executáveis adicionais dentro de `public/assets`.

## Visual assets

The React interface is built around the provided Pirate Battle artwork. Menu and content screens use `ui_scene_background.png`, `panel_menu.png`, `title_pirate_battle.png`, and the supplied primary/secondary button sprites. Gameplay uses the supplied HUD counter, health-bar, pause, close, movement and firing sprites. CSS is used for layout, responsiveness, focus and interaction behavior rather than replacing the artwork with CSS-drawn controls.
