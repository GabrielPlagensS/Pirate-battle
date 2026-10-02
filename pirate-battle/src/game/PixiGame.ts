import {
  Application,
  Assets,
  Container,
  Graphics,
  Sprite,
  Texture,
  TilingSprite,
} from "pixi.js";
import { ASSETS, tileUrl } from "./assets";
import { layoutIsland, usedTileIds } from "./islands";
import { InputController } from "./Input";
import { GameSimulation, type SimEvent } from "./Simulation";
import type { GameplayConfig, GameResult, InputAction } from "../types/game";

export interface GameSnapshot {
  score: number;
  health: number;
  time: number;
  enemies: number;
  status: "playing" | "ended";
  result?: GameResult;
}

type SoundKey = keyof typeof ASSETS.sounds;

const TILE = 64;
const SHIP_SCALE = 0.55;
const BAR_SCALE = 0.32;
const LOW_HEALTH_RATIO = 0.3;
const TIME_WARNING_SECONDS = 10;
const EXPLOSION_LIFE = 0.45;

// ------------------------------------------------------------------ texturas

const textureCache = new Map<string, Texture>();

async function loadTexture(path: string): Promise<Texture> {
  const cached = textureCache.get(path);
  if (cached) return cached;
  try {
    const texture = await Assets.load<Texture>(path);
    textureCache.set(path, texture);
    return texture;
  } catch (error) {
    // Um asset ausente não deve derrubar a partida: usa um quadrado branco.
    console.warn(`Asset failed to load: ${path}`, error);
    return Texture.WHITE;
  }
}

// --------------------------------------------------------------------- áudio

class AudioManager {
  private readonly sounds = new Map<SoundKey, HTMLAudioElement>();
  private readonly lastPlayed = new Map<SoundKey, number>();
  private ambience?: HTMLAudioElement;

  preload() {
    for (const [key, src] of Object.entries(ASSETS.sounds) as [
      SoundKey,
      string,
    ][]) {
      const audio = new Audio(src);
      audio.preload = "auto";
      this.sounds.set(key, audio);
    }
    this.ambience = this.sounds.get("ambience");
    if (this.ambience) {
      this.ambience.loop = true;
      this.ambience.volume = 0.18;
    }
  }

  /** `minGapMs` evita empilhar o mesmo som dezenas de vezes no mesmo instante (ex.: salva lateral). */
  play(key: SoundKey, volume = 0.55, minGapMs = 60) {
    const source = this.sounds.get(key);
    if (!source) return;
    const now = performance.now();
    if (now - (this.lastPlayed.get(key) ?? -Infinity) < minGapMs) return;
    this.lastPlayed.set(key, now);
    const clone = source.cloneNode(true) as HTMLAudioElement;
    clone.volume = volume;
    void clone.play().catch(() => undefined);
  }

  startAmbience() {
    void this.ambience?.play().catch(() => undefined);
  }

  pauseAmbience() {
    this.ambience?.pause();
  }

  stop() {
    if (!this.ambience) return;
    this.ambience.pause();
    this.ambience.currentTime = 0;
  }
}

// ------------------------------------------------------------------- tipos

interface HealthBar {
  frame: Sprite;
  fill: Sprite;
}
interface Explosion {
  sprite: Sprite;
  life: number;
}

interface Textures {
  player: Texture;
  chaser: Texture;
  shooter: Texture;
  projectile: Texture;
  water: Texture;
  /** Tiles de ilha, indexados pelo número de `tile_N.png`. */
  islandTiles: Map<number, Texture>;
  explosion: Texture[];
  enemyBar: { frame: Texture; green: Texture; red: Texture };
  playerBar: { frame: Texture; green: Texture; amber: Texture; red: Texture };
}

// -------------------------------------------------------------------- jogo

export class PixiGame {
  readonly app = new Application();
  private readonly root = new Container();
  private readonly world = new Container();
  private readonly background = new Container();
  private readonly simulation: GameSimulation;
  private readonly input = new InputController();
  private readonly audio = new AudioManager();

  private readonly enemySprites = new Map<number, Sprite>();
  private readonly enemyBars = new Map<number, HealthBar>();
  private readonly projectileSprites = new Map<number, Sprite>();
  private explosions: Explosion[] = [];
  private waterShimmer?: TilingSprite;
  private playerSprite?: Sprite;
  private playerBar?: HealthBar;
  private textures!: Textures;

  private initialized = false;
  private destroyed = false;
  private running = false;
  private paused = false;
  private lastSnapshot = "";
  private lowHealthPlayed = false;
  private timeWarningPlayed = false;

  constructor(
    config: GameplayConfig,
    private readonly onSnapshot: (snapshot: GameSnapshot) => void,
    private readonly onPausedChange?: (paused: boolean) => void,
  ) {
    this.simulation = new GameSimulation(config);
  }

  // --------------------------------------------------------------- ciclo de vida

  async mount(element: HTMLElement) {
    await this.app.init({
      resizeTo: element,
      background: 0x0a4050,
      antialias: false,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      roundPixels: true,
    });
    this.initialized = true;
    // O componente pode ter sido desmontado enquanto o Pixi inicializava
    // (StrictMode em dev, ou o jogador saiu rápido). Nesse caso só limpa.
    if (this.destroyed) return this.disposeApp();

    element.appendChild(this.app.canvas);
    this.app.stage.addChild(this.root);
    this.root.addChild(this.background, this.world);

    this.textures = await this.loadTextures();
    if (this.destroyed) return;

    this.audio.preload();
    this.drawArena();
    this.createPlayer();

    this.input.attach();
    window.addEventListener("keydown", this.onKeyDown);
    document.addEventListener("visibilitychange", this.onVisibility);
    window.addEventListener("blur", this.onBlur);
    this.app.renderer.on("resize", this.fitWorld);

    this.running = true;
    this.audio.play("start", 0.5);
    this.audio.startAmbience();
    this.app.ticker.add(this.tick);
    this.fitWorld();
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.running = false;
    this.input.detach();
    window.removeEventListener("keydown", this.onKeyDown);
    document.removeEventListener("visibilitychange", this.onVisibility);
    window.removeEventListener("blur", this.onBlur);
    this.audio.stop();
    // Se o init ainda está em andamento, mount() faz a limpeza quando terminar.
    if (this.initialized) this.disposeApp();
  }

  private disposeApp() {
    this.app.ticker.remove(this.tick);
    this.app.renderer.off("resize", this.fitWorld);
    this.app.destroy(true, { children: true, texture: false });
    this.enemySprites.clear();
    this.enemyBars.clear();
    this.projectileSprites.clear();
    this.explosions = [];
    this.playerSprite = undefined;
    this.playerBar = undefined;
    this.waterShimmer = undefined;
  }

  private async loadTextures(): Promise<Textures> {
    const { ships, projectile, tiles, effects, ui } = ASSETS;
    const [
      player,
      chaser,
      shooter,
      ball,
      water,
      ex1,
      ex2,
      ex3,
      eFrame,
      eGreen,
      eRed,
      pFrame,
      pGreen,
      pAmber,
      pRed,
    ] = await Promise.all([
      loadTexture(ships.player),
      loadTexture(ships.chaser),
      loadTexture(ships.shooter),
      loadTexture(projectile),
      loadTexture(tiles.water),
      loadTexture(effects.explosion1),
      loadTexture(effects.explosion2),
      loadTexture(effects.explosion3),
      loadTexture(ui.enemyHealthFrame),
      loadTexture(ui.enemyHealthGreen),
      loadTexture(ui.enemyHealthRed),
      loadTexture(ui.healthFrame),
      loadTexture(ui.healthGreen),
      loadTexture(ui.healthAmber),
      loadTexture(ui.healthRed),
    ]);
    const islandTiles = await this.loadIslandTiles();
    return {
      player,
      chaser,
      shooter,
      projectile: ball,
      water,
      islandTiles,
      explosion: [ex1, ex2, ex3],
      enemyBar: { frame: eFrame, green: eGreen, red: eRed },
      playerBar: { frame: pFrame, green: pGreen, amber: pAmber, red: pRed },
    };
  }

  private async loadIslandTiles(): Promise<Map<number, Texture>> {
    const ids = usedTileIds(this.simulation.islands);
    const textures = await Promise.all(ids.map((id) => loadTexture(tileUrl(id))));
    return new Map(ids.map((id, i) => [id, textures[i]]));
  }

  // ------------------------------------------------------------------- cena

  private drawArena() {
    const { arenaWidth, arenaHeight } = this.simulation.config;
    for (let y = 0; y < arenaHeight; y += TILE) {
      for (let x = 0; x < arenaWidth; x += TILE) {
        const tile = new Sprite(this.textures.water);
        tile.position.set(x, y);
        tile.width = TILE;
        tile.height = TILE;
        this.background.addChild(tile);
      }
    }

    this.drawWaterShimmer();
    this.drawIslands();
  }

  /** Segunda camada de água, semitransparente e em deriva lenta, para o mar não ficar estático. */
  private drawWaterShimmer() {
    const { arenaWidth, arenaHeight } = this.simulation.config;
    const shimmer = new TilingSprite({
      texture: this.textures.water,
      width: arenaWidth,
      height: arenaHeight,
    });
    shimmer.alpha = 0.22;
    shimmer.tileScale.set(1.5);
    this.waterShimmer = shimmer;
    this.background.addChild(shimmer);
  }

  private drawIslands() {
    const { islandTiles } = this.textures;
    for (const island of this.simulation.islands) {
      const layer = new Container();
      layer.position.set(island.x, island.y);

      // Sombra projetada e águas rasas ao redor, para a ilha "assentar" no mar.
      layer.addChild(
        new Graphics()
          .roundRect(-4, 0, island.width + 16, island.height + 16, 34)
          .fill({ color: 0x002846, alpha: 0.18 }),
        new Graphics()
          .roundRect(-6, -6, island.width + 12, island.height + 12, 34)
          .fill({ color: 0xbef5ff, alpha: 0.18 }),
      );

      const { tiles, decorations } = layoutIsland(island);
      for (const { col, row, tile } of tiles) {
        const sprite = new Sprite(islandTiles.get(tile) ?? Texture.WHITE);
        sprite.position.set(col * TILE, row * TILE);
        sprite.width = TILE;
        sprite.height = TILE;
        layer.addChild(sprite);
      }

      for (const deco of decorations) {
        const sprite = new Sprite(islandTiles.get(deco.tile) ?? Texture.WHITE);
        sprite.anchor.set(0.5);
        sprite.position.set(deco.x, deco.y);
        sprite.scale.set(deco.scale);
        sprite.rotation = deco.rotation;
        layer.addChild(sprite);
      }

      this.background.addChild(layer);
    }
  }

  private createPlayer() {
    this.playerSprite = this.makeShip(this.textures.player);
    this.playerBar = this.makeBar(
      this.textures.playerBar.frame,
      this.textures.playerBar.green,
    );
  }

  private makeShip(texture: Texture): Sprite {
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.scale.set(SHIP_SCALE);
    this.world.addChild(sprite);
    return sprite;
  }

  private makeBar(frameTexture: Texture, fillTexture: Texture): HealthBar {
    const frame = new Sprite(frameTexture);
    frame.anchor.set(0.5);
    frame.scale.set(BAR_SCALE);
    const fill = new Sprite(fillTexture);
    fill.anchor.set(0, 0.5);
    fill.scale.set(BAR_SCALE);
    this.world.addChild(frame, fill);
    return { frame, fill };
  }

  /** Posiciona a barra centralizada acima de (x, y) e escala o preenchimento. */
  private updateBar(
    bar: HealthBar,
    x: number,
    y: number,
    ratio: number,
    texture: Texture,
  ) {
    // Usa a largura real da moldura, em vez de números mágicos.
    const width = bar.frame.width;
    bar.frame.position.set(x, y);
    bar.fill.position.set(x - width / 2, y);
    bar.fill.texture = texture;
    bar.fill.width = Math.max(2, width * ratio);
  }

  private fitWorld = () => {
    const { width, height } = this.app.screen;
    if (!width || !height) return;
    const { arenaWidth, arenaHeight } = this.simulation.config;
    const scale = Math.min(width / arenaWidth, height / arenaHeight);
    this.root.scale.set(scale);
    this.root.position.set(
      (width - arenaWidth * scale) / 2,
      (height - arenaHeight * scale) / 2,
    );
  };

  // ------------------------------------------------------------------ entrada

  /** Controles de tela (touch). */
  setInput(action: InputAction, value: boolean) {
    if (this.paused) return;
    this.input.setVirtual(action, value);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.code === "Escape" && !e.repeat) this.togglePause();
  };
  private onVisibility = () => {
    if (document.hidden) this.setPaused(true);
  };
  private onBlur = () => this.setPaused(true);

  setPaused(value: boolean) {
    if (this.paused === value || !this.running) return;
    this.paused = value;
    this.input.reset();
    this.audio.play(value ? "pause" : "resume", 0.35);
    if (value) this.audio.pauseAmbience();
    else this.audio.startAmbience();
    this.onPausedChange?.(value);
  }

  togglePause() {
    this.setPaused(!this.paused);
  }

  get isPaused() {
    return this.paused;
  }

  // --------------------------------------------------------------------- loop

  private tick = () => {
    if (!this.running || this.paused) return;
    const dt = Math.min(this.app.ticker.deltaMS / 1000, 0.05);
    const sim = this.simulation;

    sim.update(dt, this.input.state());
    this.handleEvents(sim.drainEvents());
    this.render(dt);
    this.playWarnings();
    this.emitSnapshot();

    if (sim.status === "ended") this.finish();
  };

  private finish() {
    const died = this.simulation.result.reason === "death";
    this.audio.play(died ? "gameOver" : "complete", 0.5);
    this.audio.stop();
    this.running = false; // a partida acabou: sem mais ticks nem pausa
  }

  private handleEvents(events: SimEvent[]) {
    for (const event of events) {
      switch (event.type) {
        case "playerFire":
          this.audio.play(event.side === "front" ? "cannon" : "broadside", 0.5);
          break;
        case "enemyFire":
          this.audio.play("enemyCannon", 0.3, 120);
          break;
        case "enemyHit":
          this.audio.play("hit", 0.4);
          break;
        case "playerHit":
          this.audio.play("playerHit", 0.6, 120);
          break;
        case "splash":
          this.audio.play("splash", 0.25, 80);
          break;
        case "enemyDestroyed":
          this.spawnExplosion(event.x, event.y);
          this.audio.play("explosion", 0.4);
          if (!event.rammed) this.audio.play("score", 0.4);
          break;
      }
    }
    // Jogador destruído: explosão na posição dele.
    if (this.simulation.player.health <= 0) {
      this.spawnExplosion(this.simulation.player.x, this.simulation.player.y);
    }
  }

  private playWarnings() {
    const { player, remainingTime } = this.simulation;
    if (
      !this.lowHealthPlayed &&
      player.health > 0 &&
      player.health / player.maxHealth < LOW_HEALTH_RATIO
    ) {
      this.lowHealthPlayed = true;
      this.audio.play("healthLow", 0.5);
    }
    if (
      !this.timeWarningPlayed &&
      remainingTime > 0 &&
      remainingTime <= TIME_WARNING_SECONDS
    ) {
      this.timeWarningPlayed = true;
      this.audio.play("timeWarning", 0.5);
    }
  }

  /**
   * Só notifica o React quando algo visível mudou (placar, casco inteiro,
   * segundo inteiro, nº de inimigos) — não 60 vezes por segundo.
   */
  private emitSnapshot() {
    const sim = this.simulation;
    const snapshot: GameSnapshot = {
      score: sim.score,
      health: sim.player.health,
      time: sim.remainingTime,
      enemies: sim.enemies.length,
      status: sim.status,
      result: sim.status === "ended" ? sim.result : undefined,
    };
    const key = `${snapshot.score}|${Math.ceil(snapshot.health)}|${Math.ceil(snapshot.time)}|${snapshot.enemies}|${snapshot.status}`;
    if (key === this.lastSnapshot) return;
    this.lastSnapshot = key;
    this.onSnapshot(snapshot);
  }

  // ------------------------------------------------------------------ render

  private render(dt: number) {
    if (this.waterShimmer) {
      this.waterShimmer.tilePosition.x += dt * 9;
      this.waterShimmer.tilePosition.y += dt * 5;
    }
    this.renderPlayer();
    this.renderEnemies();
    this.renderProjectiles();
    this.renderExplosions(dt);
  }

  private renderPlayer() {
    const p = this.simulation.player;
    const sprite = this.playerSprite;
    if (!sprite || !this.playerBar) return;
    const ratio = Math.max(0, p.health / p.maxHealth);
    sprite.position.set(p.x, p.y);
    sprite.rotation = p.angle + Math.PI / 2;
    sprite.alpha = 0.65 + 0.35 * ratio;
    const { green, amber, red } = this.textures.playerBar;
    this.updateBar(
      this.playerBar,
      p.x,
      p.y - 46,
      ratio,
      ratio < 0.35 ? red : ratio < 0.65 ? amber : green,
    );
  }

  private renderEnemies() {
    const alive = new Set<number>();
    for (const enemy of this.simulation.enemies) {
      alive.add(enemy.id);
      let sprite = this.enemySprites.get(enemy.id);
      let bar = this.enemyBars.get(enemy.id);
      if (!sprite || !bar) {
        sprite = this.makeShip(
          enemy.type === "chaser"
            ? this.textures.chaser
            : this.textures.shooter,
        );
        bar = this.makeBar(
          this.textures.enemyBar.frame,
          this.textures.enemyBar.green,
        );
        this.enemySprites.set(enemy.id, sprite);
        this.enemyBars.set(enemy.id, bar);
      }
      const ratio = Math.max(0, enemy.health / enemy.maxHealth);
      sprite.position.set(enemy.x, enemy.y);
      sprite.rotation = enemy.angle + Math.PI / 2;
      sprite.alpha = 0.65 + 0.35 * ratio;
      const { green, red } = this.textures.enemyBar;
      this.updateBar(
        bar,
        enemy.x,
        enemy.y - 42,
        ratio,
        ratio < 0.35 ? red : green,
      );
    }
    // A explosão é disparada pelo evento 'enemyDestroyed'; aqui só limpamos sprites.
    for (const [id, sprite] of this.enemySprites) {
      if (alive.has(id)) continue;
      sprite.destroy();
      this.enemySprites.delete(id);
      const bar = this.enemyBars.get(id);
      bar?.frame.destroy();
      bar?.fill.destroy();
      this.enemyBars.delete(id);
    }
  }

  private renderProjectiles() {
    const alive = new Set<number>();
    for (const p of this.simulation.projectiles) {
      alive.add(p.id);
      let sprite = this.projectileSprites.get(p.id);
      if (!sprite) {
        sprite = new Sprite(this.textures.projectile);
        sprite.anchor.set(0.5);
        sprite.scale.set(p.owner === "player" ? 0.75 : 0.65);
        sprite.tint = p.owner === "enemy" ? 0xd84c45 : 0xffffff;
        this.world.addChild(sprite);
        this.projectileSprites.set(p.id, sprite);
      }
      sprite.position.set(p.x, p.y);
      sprite.rotation = Math.atan2(p.velocity.y, p.velocity.x);
    }
    for (const [id, sprite] of this.projectileSprites) {
      if (alive.has(id)) continue;
      sprite.destroy();
      this.projectileSprites.delete(id);
    }
  }

  private spawnExplosion(x: number, y: number) {
    const sprite = new Sprite(this.textures.explosion[0]);
    sprite.anchor.set(0.5);
    sprite.position.set(x, y);
    sprite.scale.set(0.35);
    this.world.addChild(sprite);
    this.explosions.push({ sprite, life: EXPLOSION_LIFE });
  }

  /** Percorre os 3 frames de explosão ao longo da vida, crescendo e esmaecendo. */
  private renderExplosions(dt: number) {
    const frames = this.textures.explosion;
    this.explosions = this.explosions.filter((fx) => {
      fx.life -= dt;
      if (fx.life <= 0) {
        fx.sprite.destroy();
        return false;
      }
      const progress = 1 - fx.life / EXPLOSION_LIFE;
      fx.sprite.texture =
        frames[
          Math.min(frames.length - 1, Math.floor(progress * frames.length))
        ];
      fx.sprite.alpha = 1 - progress;
      fx.sprite.scale.set(0.35 + progress * 0.35);
      return true;
    });
  }
}
