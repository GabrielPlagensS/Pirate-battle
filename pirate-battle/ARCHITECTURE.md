# Architecture

## Layers
- `src/game`: deterministic-ish time-based gameplay simulation, input and Pixi rendering.
- `src/components`: React screens and UI controls. React does not render every simulation frame.
- `src/api`: Axios client and typed API contracts.
- `src/mocks`: MSW handlers plus local persistence for fixtures, confirmed matches and failure scenarios.
- `src/hooks`: TanStack Query integration.

## Simulation
`GameSimulation.update(dt, input)` owns movement, collision, projectiles, damage, enemy AI, spawning, score and end conditions. The frame delta is capped and all movement is multiplied by elapsed time. The constructor accepts a seed (`createRng`), so a match is reproducible in tests. The simulation never touches audio or sprites: it queues `SimEvent`s (`playerFire`, `enemyDestroyed`, ...) that `PixiGame` drains each frame to play sounds and spawn explosions.

## Rendering
`PixiGame` owns the Pixi Application, sprites, labels, ticker and event listeners. Textures are cached. Missing image files fall back to generated textures so development can start before the supplied assets are copied.

## React/Pixi boundary
React owns screens and semantic HUD state. Pixi owns continuous world state. A compact snapshot is emitted to React instead of triggering a React render on every frame.

## Persistence
Options are stored in `localStorage`. MSW fixture data and confirmed matches are also stored locally. The game configuration is cloned when a match begins, so changing Options does not mutate an active session.

## Ranking/history
Axios calls `/api/ranking`, `/api/history` and `/api/matches`. TanStack Query provides caching, retry and invalidation. MSW intercepts the requests in both development and production builds.

## Failure scenarios
Use the Network simulation control on the main menu. Available modes: success, empty, slow, variable latency, timeout and HTTP 503. A real production implementation can replace the MSW handlers without changing the UI contracts.

## Known extension points
- Add supplied atlas parsing and sprite-sheet animations in `PixiGame`.
- Persist unsent matches so a retry survives a page reload (today the retry lives in memory on the Result screen; the match id is stable, so retries are idempotent).
- Add automated visual snapshots and performance profiling artifacts.

## Asset integration

The original Jungle Gaming asset pack is copied into `public/assets` without renaming its source hierarchy. `src/game/assets.ts` is the single manifest used by PixiJS for ships, projectiles, tiles, effects, UI and sounds. The UI atlas JSON is kept alongside its PNG so the atlas metadata remains valid.

The game renderer uses the actual ship PNGs, cannon-ball projectile, water/island tiles, explosion frames and WAV sound effects. Missing textures still use a generated fallback so an individual asset failure does not crash the game.

## Visual UI and asset usage

The interface uses the provided visual assets as the primary presentation layer rather than recreating the artwork with CSS. React owns layout, interaction, semantics and responsive behavior; PNG assets provide the visual language. The menu and secondary screens use `panel_menu.png`, `title_pirate_battle.png`, the primary/secondary button sprites and `ui_scene_background.png`. The gameplay HUD uses `counter_panel.png`, HUD icons and the provided round control sprites.

CSS is intentionally limited to layout, sizing, focus states, responsive behavior and interaction feedback. It does not replace the supplied artwork with gradients or CSS-drawn controls.


## Ilhas
`game/islands.ts` define o mapa (em tiles), gera o layout visual de cada ilha (`layoutIsland`) e a forma de colisão (`collisionShape`, retângulo com cantos arredondados). A simulação só usa a colisão; o `PixiGame` só desenha o layout. `tileSeams.ts` é gerado por `scripts/compute-tile-seams.py`.
