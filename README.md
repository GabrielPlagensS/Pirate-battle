# 🏴‍☠️ Pirate Battle

Um jogo de batalha naval desenvolvido com **React, TypeScript e PixiJS**, inspirado no desafio de Game Developer da **Jungle Gaming**.

O jogador controla um navio pirata em uma arena marítima, enfrenta diferentes tipos de inimigos, utiliza diferentes ataques e precisa sobreviver para obter a maior pontuação possível.

O projeto também conta com **ranking, histórico de partidas, configurações de gameplay, simulação de API, testes unitários e testes end-to-end**.

---

## 🎮 Demonstração

> Jogue diretamente pelo navegador após iniciar o projeto com Vite.
---

## ✨ Funcionalidades

### ⚓ Gameplay

* Controle de um navio pirata.
* Movimentação em diferentes direções.
* Sistema de colisão com o cenário.
* Sistema de projéteis.
* Diferentes tipos de disparos.
* Inimigos com comportamentos distintos.
* Sistema de dano e vida.
* Sistema de pontuação.
* Explosões e efeitos visuais.
* Sons e efeitos de gameplay.
* Condições de vitória e derrota.
* Pausa durante a partida.
* Suporte a controles por teclado e dispositivos touch.

### 🎯 Tipos de ataque

O jogador possui diferentes formas de ataque:

* **Disparo frontal:** `Space`
* **Disparo lateral esquerdo:** `Q`
* **Disparo lateral direito:** `E`

Os ataques laterais lançam três projéteis paralelos.

### 👾 Inimigos

O jogo possui diferentes tipos de navios inimigos, incluindo:

* **Chaser** — inimigo que persegue o jogador.
* **Shooter** — inimigo especializado em ataques à distância.

### 🏆 Ranking e histórico

O projeto possui uma API simulada para:

* Salvar resultados das partidas.
* Consultar ranking.
* Consultar histórico de partidas.
* Simular diferentes condições de rede.

Os dados são mantidos localmente através do **Mock Service Worker (MSW)**.

### 🌐 Simulação de rede

O menu possui ferramentas para testar diferentes cenários de comunicação com a API:

* `Success`
* `Empty`
* `Slow`
* `Variable latency`
* `Timeout`
* `HTTP 503`

Isso permite testar o comportamento da aplicação em situações semelhantes às encontradas em uma aplicação real.

---

## 🛠️ Tecnologias utilizadas

### Front-end

* **React 19**
* **TypeScript**
* **Vite**
* **PixiJS 8**
* **@pixi/react**

### Dados e comunicação

* **Axios**
* **TanStack Query**
* **Mock Service Worker (MSW)**

### Testes

* **Vitest**
* **Playwright**

### Qualidade de código

* **ESLint**
* **TypeScript**

---

## 🏗️ Arquitetura

O projeto utiliza uma separação entre a interface React e o motor de gameplay desenvolvido com PixiJS.

```text
React
 │
 ├── Telas e navegação
 │
 ├── HUD
 │
 ├── Menu
 │
 ├── Ranking
 │
 ├── Histórico
 │
 └── Configurações
       │
       ▼
    PixiJS
       │
       ├── Renderização
       ├── Sprites
       ├── Animações
       ├── Efeitos
       └── Áudio
       │
       ▼
 Simulation
       │
       ├── Movimento
       ├── Colisões
       ├── Projéteis
       ├── Dano
       ├── Inimigos
       ├── Spawn
       ├── Pontuação
       └── Condições de término
       │
       ▼
 MSW / API Mock
       │
       ├── Ranking
       ├── Histórico
       └── Partidas
```

A simulação do jogo é separada da renderização. Isso permite testar a lógica do gameplay sem depender diretamente do PixiJS ou dos elementos visuais.

---

## 📁 Estrutura do projeto

```text
pirate-battle/
│
├── public/
│   └── assets/
│       ├── png/
│       ├── spritesheet/
│       └── sounds/
│
├── src/
│   ├── api/
│   │   ├── client.ts
│   │   ├── contracts.ts
│   │   ├── guards.ts
│   │   └── guards.test.ts
│   │
│   ├── components/
│   │   ├── GameCanvas.tsx
│   │   ├── History.tsx
│   │   ├── MainMenu.tsx
│   │   ├── NetworkTools.tsx
│   │   ├── Options.tsx
│   │   ├── Ranking.tsx
│   │   ├── Result.tsx
│   │   └── ui/
│   │
│   ├── game/
│   │   ├── assets.ts
│   │   ├── config.ts
│   │   ├── Input.ts
│   │   ├── islands.ts
│   │   ├── math.ts
│   │   ├── PixiGame.ts
│   │   ├── Simulation.ts
│   │   └── tileSeams.ts
│   │
│   ├── hooks/
│   │   ├── useGameQueries.ts
│   │   └── useNetworkScenario.ts
│   │
│   ├── mocks/
│   │   ├── browser.ts
│   │   ├── db.ts
│   │   ├── handlers.ts
│   │   └── scenario.ts
│   │
│   ├── styles/
│   │   └── global.css
│   │
│   ├── types/
│   │   └── game.ts
│   │
│   ├── App.tsx
│   └── main.tsx
│
├── tests/
│   ├── gameplay.spec.ts
│   └── navigation.spec.ts
│
├── ARCHITECTURE.md
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 🎮 Controles

| Tecla     | Ação                     |
| --------- | ------------------------ |
| `W` / `↑` | Avançar                  |
| `A` / `←` | Girar para a esquerda    |
| `D` / `→` | Girar para a direita     |
| `Space`   | Disparo frontal          |
| `Q`       | Disparo lateral esquerdo |
| `E`       | Disparo lateral direito  |
| `Esc`     | Pausar / continuar       |

Em dispositivos com tela touch, os controles são disponibilizados na própria interface do jogo.

---

## 🚀 Como executar

### 1. Clone o projeto

```bash
git clone https://github.com/SEU-USUARIO/pirate-battle.git
```

Entre na pasta:

```bash
cd pirate-battle
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure o Mock Service Worker

O projeto utiliza **MSW** para simular a API responsável pelo ranking, histórico e armazenamento das partidas.

Execute:

```bash
npx msw init public/ --save
```

Esse comando deve ser executado uma vez após a instalação das dependências.

### 4. Execute o projeto

```bash
npm run dev
```

O Vite exibirá no terminal o endereço local da aplicação, normalmente:

```text
http://localhost:5173
```

---

## 📦 Build de produção

Para gerar a versão otimizada:

```bash
npm run build
```

Para visualizar o build:

```bash
npm run preview
```

---

## 🧪 Testes

### Testes unitários

O projeto utiliza **Vitest** para testar principalmente a lógica da simulação.

```bash
npm run test
```

Para executar os testes em modo de observação:

```bash
npm run test:watch
```

### Testes End-to-End

Os testes E2E utilizam **Playwright**.

```bash
npm run test:e2e
```

Para executar com a interface do Playwright:

```bash
npm run test:e2e:ui
```

Para visualizar o relatório:

```bash
npm run test:e2e:report
```

### TypeScript

Para verificar os tipos:

```bash
npm run typecheck
```

### ESLint

Para verificar problemas de código:

```bash
npm run lint
```

---

## 🧠 Sistema de simulação

A lógica principal do jogo está localizada em:

```text
src/game/Simulation.ts
```

A classe `GameSimulation` é responsável por controlar:

* Movimento do jogador.
* Movimento dos inimigos.
* Inteligência dos inimigos.
* Colisões.
* Projéteis.
* Dano.
* Destruição de inimigos.
* Spawn de inimigos.
* Pontuação.
* Condições de término da partida.

A simulação utiliza o tempo decorrido (`dt`) para calcular os movimentos, evitando que a velocidade do jogo dependa diretamente da quantidade de frames renderizados.

Além disso, a simulação pode receber uma **seed**, permitindo reproduzir determinadas partidas durante os testes.

---

## 🎨 Renderização

O arquivo:

```text
src/game/PixiGame.ts
```

é responsável pela integração com o **PixiJS**.

Ele controla:

* Canvas do jogo.
* Sprites.
* Texturas.
* Animações.
* HUD.
* Efeitos visuais.
* Sons.
* Eventos de teclado.
* Ciclo de renderização.

A lógica de gameplay permanece separada da renderização, facilitando a manutenção e os testes.

---

## 🗺️ Sistema de ilhas

O mapa utiliza tiles para construir o cenário.

O arquivo:

```text
src/game/islands.ts
```

define a configuração das ilhas, incluindo:

* Layout visual.
* Tiles utilizados.
* Área de colisão.

A renderização visual e a lógica de colisão são tratadas separadamente.

---

## 🖼️ Assets

O projeto utiliza os assets fornecidos no desafio original.

Alguns dos principais recursos incluem:

```text
public/assets/
├── png/
│   └── default/
│       ├── ships/
│       ├── ship_parts/
│       ├── tiles/
│       ├── effects/
│       └── ui/
├── spritesheet/
└── sounds/
```

Entre os recursos utilizados estão:

* Navios.
* Canhões.
* Projéteis.
* Ilhas.
* Água.
* Explosões.
* Interface.
* Botões.
* Controles.
* Efeitos sonoros.

O arquivo:

```text
src/game/assets.ts
```

centraliza o manifesto dos assets utilizados pelo jogo.

---

## 💾 Persistência

As configurações do jogo são armazenadas utilizando:

```text
localStorage
```

O MSW também utiliza armazenamento local para manter dados relacionados às partidas, ranking e histórico durante a execução da aplicação.

---

## 🔌 API simulada

A comunicação da aplicação é estruturada para funcionar como uma API real.

As principais rotas simuladas são:

```text
/api/ranking
/api/history
/api/matches
/api/health
```

O **Axios** é utilizado como cliente HTTP, enquanto o **TanStack Query** gerencia:

* Requisições.
* Cache.
* Estados de loading.
* Erros.
* Invalidação de dados.
* Atualização das informações.

O MSW intercepta as requisições no navegador e fornece as respostas simuladas.

---

## 📱 Responsividade

A interface foi desenvolvida para funcionar em diferentes tamanhos de tela.

Além dos controles tradicionais de teclado, o jogo possui controles touch para dispositivos móveis.

O React é responsável pelo layout e comportamento da interface, enquanto o PixiJS gerencia o ambiente contínuo de gameplay.

---

## 🧩 Possíveis melhorias

Alguns pontos podem ser evoluídos futuramente:

* Implementação de uma API/backend real.
* Persistência das partidas enviadas durante quedas de conexão.
* Sistema de autenticação.
* Multiplayer online.
* Novos tipos de inimigos.
* Novos mapas.
* Mais tipos de navios.
* Sistema de upgrades.
* Ranking global.
* Sistema de conquistas.
* Animações utilizando os spritesheets fornecidos.
* Testes visuais automatizados.
* Monitoramento de performance.

---

## 📚 Documentação

A arquitetura técnica do projeto está documentada em:

```text
ARCHITECTURE.md
```

Esse arquivo apresenta detalhes sobre:

* Arquitetura da aplicação.
* Simulação.
* Renderização.
* Comunicação React/PixiJS.
* Persistência.
* API mockada.
* Integração dos assets.
* Possíveis pontos de extensão.

---

## 👨‍💻 Desenvolvimento

Projeto desenvolvido como implementação de um desafio de **Game Developer da Jungle Gaming**, utilizando tecnologias modernas do ecossistema JavaScript/TypeScript.

### Principais conceitos aplicados

* Desenvolvimento de jogos 2D.
* Game loop.
* Simulação baseada em tempo.
* Detecção de colisões.
* Inteligência de inimigos.
* Renderização gráfica.
* Gerenciamento de estado.
* Comunicação HTTP.
* Mock de APIs.
* Testes unitários.
* Testes End-to-End.
* Arquitetura baseada em componentes.
* TypeScript.
* Responsividade.

---

## 📄 Licença

Este projeto foi desenvolvido para fins educacionais e como implementação de desafio técnico.

Os assets utilizados no projeto pertencem aos seus respectivos autores e foram utilizados conforme disponibilizados para o desafio.
