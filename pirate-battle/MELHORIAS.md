# Melhorias aplicadas

## Bugs corrigidos
1. **O navio nascia dentro da ilha central e ficava travado.** O spawn era `(640, 360)` e a ilha ocupa `x 520–730, y 330–455`; qualquer passo ainda colidia, e os tiros morriam ao sair. Agora `findSafeSpawn()` escolhe o ponto livre mais próximo do centro.
2. **A partida podia ser recriada no meio do jogo.** `GameCanvas` tinha `onFinish` nas dependências do `useEffect`, e `finish` dependia do objeto inteiro da mutation (instável). Agora o callback vai por `ref` e `App` usa `mutate` (estável).
3. **Crash no unmount durante o `init` do Pixi** (StrictMode em dev / sair rápido do jogo): `destroy()` chamava `app.destroy()` antes de o `init` terminar. Agora há flags `initialized`/`destroyed` e a limpeza ocorre no fim do `mount`.
4. **O app não abria se o Service Worker do MSW falhasse** (`await worker.start()` sem try/catch). Agora o jogo sobe mesmo assim.
5. **Retry de salvamento criava partida duplicada**: o `id` era gerado a cada chamada (`Date.now()`), quebrando a `Idempotency-Key`. O id agora é gerado uma vez por partida; a tela de resultado ganhou o botão **Retry saving** (a mensagem já prometia "retry", mas não existia).
6. **Estado de pausa dessincronizado**: Esc, perda de foco e aba oculta pausavam o Pixi, mas o botão do React continuava em "Pause". Agora o Pixi notifica o React (`onPausedChange`) e há um overlay de pausa.
7. **Botões touch ficavam "presos"** ao arrastar o dedo para fora (só havia `pointerup`). Agora usam pointer capture + `lostpointercapture`, `touch-action: none` e bloqueio do menu de contexto.
8. **`playwright.config.ts`**: `baseURL` na porta 4173, mas o `webServer` sobe na 5173. Unificado. O teste `getByText('Hull')` era ambíguo (casava com o texto de acessibilidade) e foi corrigido com `exact: true`.
9. **`localStorage` sem validação**: valores fora dos limites/NaN entravam direto na partida. Agora `sanitizeOptions` faz clamp, e só `sessionTime`/`spawnInterval` são persistidos (assim novos defaults do jogo não ficam sobrescritos por configs antigas).
10. `AudioManager.stop()` tinha uma expressão solta (`a && (b = 0)`) que o lint rejeita.

## Gameplay
- Colisão com **deslizamento**: bloqueado num eixo, o navio continua no outro (jogador e inimigos), em vez de travar na costa.
- Inimigos **não se empilham** mais (separação por sobreposição).
- Spawn: o timer zera no limite de `maxEnemies` (evita spawn "acumulado") e, sem canto distante, usa o mais afastado em vez de nascer em cima do jogador.
- Sons que existiam nos assets mas nunca tocavam: tiro frontal/lateral/inimigo, acerto, respingo, dano ao jogador, vida baixa, aviso de tempo e vitória (`game_complete`, antes tocava `score_point`).
- Explosão agora anima os 3 frames (antes só o primeiro) e o jogador destruído também explode.

## Arquitetura / qualidade
- `Simulation` emite **eventos** (`drainEvents()`); o renderizador reage a eles em vez de inferir "sprite sumiu = explosão".
- **RNG com semente** (`createRng`) → simulação reproduzível e testável.
- `InputController` (antes código morto) agora é usado: teclado + touch em mapas separados, `preventDefault` em Space/setas (evita scroll).
- Snapshot para o React só quando algo visível muda (antes: ~60 re-renders/s, contradizendo o ARCHITECTURE.md). O `aria-live` deixou de anunciar o tempo a cada segundo.
- Barras de vida usam a largura real da moldura (antes: números mágicos `-41` / `-25.5`).
- Redimensionamento via evento `resize` do renderer (antes: recalculado todo frame).
- `mocks/scenario.ts` separa o cenário de rede do MSW → o MSW não entra mais no bundle principal pela UI.
- `Pagination` extraída (estava duplicada em Ranking/History); botão "Try again" nos erros; `reason` legível no histórico.
- Removidos: `Modal.tsx` (não usado), `beforeunload`/`sessionStorage` sem leitor, import morto em `handlers.ts`.

## Testes
- `src/game/Simulation.test.ts` (vitest, 15 casos): determinismo, tempo, spawn, limites, cooldown, salva lateral, ilhas/deslizamento, spawn seguro, pontuação, abalroada, morte, separação.
- E2E novos: validação de opções, `localStorage` corrompido, pausa por Esc, fim de partida e retry de salvamento.

## O que NÃO foi verificado aqui
Sem `node_modules`/rede no ambiente: validei com `tsc --strict` e rodei os 15 testes unitários só no núcleo (`src/game/*`, sem Pixi). O código React/Pixi foi revisado à mão, e os testes Playwright **não foram executados**. Rode `npm install && npm run typecheck && npm run lint && npm test && npm run test:e2e`. Os dois e2e que usam `page.clock` (fim de partida / retry) são os mais sensíveis a ajuste.

## Observação sobre o zip
O zip original tinha ~121 MB por incluir `node_modules` (~14 mil arquivos) e `dist`. Ambos estão no `.gitignore`; não precisam ir no entregável.


---

# Rodada 2 — ilhas novas

Antes, cada ilha era um retângulo verde com o **mesmo tile (`tile_23`) repetido**. Agora o mapa é montado com o tileset de areia/grama (ver `docs/mapa-ilhas.png`).

## O que mudou
- **`src/game/islands.ts` (novo):** define o mapa em células de tile e gera, de forma determinística (seed por ilha), os tiles e a decoração de cada ilha: praia de areia em volta, grama no miolo (cantos `6/9/54/57`, bordas `7-8`, `55-56`, `22/38`, `25/41`), palmeiras, plantinhas, pedras (cinza na areia, com musgo na grama) e **barco / canhão / pedra encalhados** na praia. São 6 ilhas, de grama e de areia.
- **Sem emendas feias:** o tileset é do tipo *Wang* (cada tile só encaixa bem em vizinhos específicos). `scripts/compute-tile-seams.py` mede o encaixe de cada par de tiles a partir dos PNGs e gera `tileSeams.ts`; o layout escolhe a combinação ótima por busca exaustiva (8 ms no total). A pior emenda restante (11,8 na ilha de grama 3×3) é o melhor que o tileset permite.
- **Por isso toda ilha tem 3 colunas e 3–4 linhas:** com 4+ colunas aparece uma emenda `8→8` inevitável, e com 2 linhas as bordas de cima e de baixo se encostam.
- **Colisão acompanha o desenho:** a areia tem uma folga de 4 px de água e cantos arredondados (raio 26), então o navio não "bate no ar" nos cantos (`circleRoundedRectCollision`).
- **Visual:** sombra e águas rasas ao redor de cada ilha, e uma segunda camada de água semitransparente em deriva lenta (`TilingSprite`).
- **Centro do mapa livre:** com uma ilha no meio, o navio nascia colado na parede, virado para ela. Um teste pegou isso (o navio andava 19 px e os tiros morriam na hora).

## Testes
- `src/game/islands.test.ts` (14 casos): grade alinhada, ilhas dentro da arena, corredores ≥ 56 px, cantos de spawn livres, layout completo e determinístico, cantos de areia corretos, limite de emendas, decoração dentro da ilha e colisão arredondada.
- `Simulation.test.ts` ajustado para o inset da areia. Total no núcleo: **29/29 passando**.

## Não verificado aqui
Sem `node_modules`/rede, rodei os testes só no núcleo (`src/game`, sem Pixi) e conferi o visual **renderizando o mesmo layout com os mesmos PNGs em PIL**. O `PixiGame.ts` passou em `tsc --strict` contra um stub do `pixi.js`, mas **não foi executado**. O ponto mais sensível é o `TilingSprite` (API do Pixi v8: `new TilingSprite({ texture, width, height })`); se der erro no console, comente a linha `this.drawWaterShimmer();` em `drawArena()` e as ilhas continuam funcionando.

## Para ajustar o mapa
Edite `DEFS` em `islands.ts` (em tiles). Se mudar os tiles candidatos, rode `python3 scripts/compute-tile-seams.py` (precisa de Pillow e numpy) e `npm test`.


---

# Rodada 3 — caça a bugs

## Bug reportado: `Cannot read properties of undefined (reading 'length')` no Ranking
**Causa:** o navegador encerra Service Workers ociosos. Ao acordar, o worker do MSW perde a lista de abas ativas (`activeClientIds`, só em memória) e deixa as requisições passarem direto para o Vite, que responde ao `/api/ranking` com o `index.html` e status **200**. O axios entregava essa string como `data` e `q.data?.items.length` quebrava.

**Correção (3 camadas):**
1. `api/guards.ts`: toda resposta paginada é validada (`isPage`). Se não for válida, vira um erro tratável: a tela mostra "Could not load ranking" com "Try again", em vez de quebrar.
2. `main.tsx`: ao detectar uma resposta inválida (ou quando a aba volta a ficar visível e `/api/health` não responde), o mock é reativado com `worker.stop()` + `start()`. O "Try again" passa a funcionar sozinho.
3. `Ranking.tsx` / `History.tsx`: `items?.length` como defesa extra.

## Outros bugs encontrados
Rodei **120 partidas completas de 180 s com entrada aleatória** (picos de lag incluídos), checando invariantes (posições finitas, dentro da arena, fora das ilhas, vida em [0, max], ids únicos, limite de inimigos):

| Bug | Antes | Depois |
|---|---|---|
| Inimigos travados atrás de ilhas (o oposto do jogador) | **30,3 %** (448 de 1480) | **0 %** |
| Inimigo abatido por tiro ainda agia 1 frame (podia abalroar/atirar) | 65 ocorrências | 0 |
| `crypto.randomUUID` quebrava o fim da partida em `http://IP-da-rede` (celular na LAN) | quebrava | fallback |
| Resultado da partida anterior ("registrada com sucesso") aparecia na tela da nova | acontecia | usa o id da partida |

Os inimigos agora contornam a ilha pela quina mais próxima (`steer`/`detourSide` em `Simulation.ts`) e, em corredor estreito entre ilha e borda da arena, caem para o movimento com deslize.

Nenhuma violação de invariante: o jogador nunca sai da arena nem entra em ilha, e não há NaN.

## Testes novos
- `Simulation.test.ts`: ilha no caminho e abatido no mesmo frame. Os dois **falham no código antigo** (verificado) e passam no novo.
- `api/guards.test.ts`: aceita páginas válidas, rejeita HTML e formatos quebrados.
- e2e: reproduz o seu erro (Service Worker bloqueado) e verifica que a tela não quebra.
- Seletores e2e atualizados para os textos traduzidos ("Salvar opção", "Batalha completa", "Salvar", "Hora da sessão de jogo").
- Núcleo: **34/34** testes passando.

## Limitações conhecidas
- Atiradores usam alcance de 380 px e ficam parados ao alcançá-lo: é o comportamento esperado.
- O desvio é local (sonda à frente), não um pathfinding completo. Funciona bem para o mapa atual (ilhas retangulares com folga ≥ 64 px).
