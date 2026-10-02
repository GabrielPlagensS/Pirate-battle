import { useCallback, useEffect, useRef, useState } from "react";

import { PixiGame, type GameSnapshot } from "../game/PixiGame";
import type { GameResult, GameplayConfig, InputAction } from "../types/game";
import { ASSETS } from "../game/assets";
import { AssetButton, RoundButton } from "./ui/AssetButton";

interface Props {
  config: GameplayConfig;
  onFinish: (result: GameResult) => void;
  onExit: () => void;
}

export function GameCanvas({ config, onFinish, onExit }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<PixiGame | null>(null);

  const onFinishRef = useRef(onFinish);
  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  const [snapshot, setSnapshot] = useState<GameSnapshot>({
    score: 0,
    health: config.maxPlayerHealth,
    time: config.sessionTime,
    enemies: 0,
    status: "playing",
  });
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    const stage = stageRef.current;
    if (!stage) return;

    const game = new PixiGame(
      config,
      (next) => {
        if (!active) return;
        setSnapshot(next);
        if (next.result) onFinishRef.current(next.result);
      },
      (isPaused) => {
        if (active) setPaused(isPaused); // Esc, perda de foco e aba oculta também chegam aqui
      },
    );
    gameRef.current = game;

    game
      .mount(stage)
      .then(() => {
        if (active) setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        if (!active) return;
        setLoadError(
          "Could not load the battle assets. Please return to the menu and try again.",
        );
        setLoading(false);
      });

    return () => {
      active = false;
      game.destroy();
      gameRef.current = null;
    };
  }, [config]);

  const togglePause = useCallback(() => gameRef.current?.togglePause(), []);
  const hold = useCallback(
    (action: InputAction, value: boolean) =>
      gameRef.current?.setInput(action, value),
    [],
  );

  return (
    <main className="game-shell">
      <div
        ref={stageRef}
        className="pixi-stage"
        aria-label="Pirate Battle arena"
      />

      <div className="game-hud" aria-label="Game status">
        <div className="hud-stats">
          <HudStat
            icon={ASSETS.ui.heart}
            label="Hull"
            value={`${Math.ceil(snapshot.health)}%`}
          />
          <HudStat
            icon={ASSETS.ui.score}
            label="Score"
            value={`${snapshot.score}`}
          />
          <HudStat
            icon={ASSETS.ui.time}
            label="Time"
            value={`${Math.ceil(snapshot.time)}s`}
          />
          <HudStat label="Enemies" value={`${snapshot.enemies}`} />
        </div>

        <div className="hud-actions">
          <RoundButton
            icon={paused ? ASSETS.ui.iconPlay : ASSETS.ui.iconPause}
            label={paused ? "Resume" : "Pause"}
            onClick={togglePause}
          />
          <RoundButton
            icon={ASSETS.ui.iconClose}
            label="Quit"
            onClick={onExit}
          />
        </div>
      </div>

      {loading && (
        <div className="asset-loading" role="status" aria-live="polite">
          <img src={ASSETS.ui.title} alt="" aria-hidden="true" />
          <strong>Loading battle assets...</strong>
        </div>
      )}

      {loadError && (
        <div className="asset-loading asset-loading-error" role="alert">
          <strong>{loadError}</strong>
          <AssetButton variant="secondary" onClick={onExit}>
            Main Menu
          </AssetButton>
        </div>
      )}

      {paused && !loading && !loadError && (
        <div
          className="asset-loading pause-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Game paused"
        >
          <strong>Paused</strong>
          <AssetButton onClick={togglePause}>Continue</AssetButton>
          <AssetButton variant="secondary" onClick={onExit}>
            Quit
          </AssetButton>
        </div>
      )}

      <div className="touch-controls" aria-label="Touch controls">
        <div className="control-cluster">
          <HoldButton
            icon={ASSETS.ui.iconLeft}
            label="Turn left"
            action="left"
            onHold={hold}
          />
          <HoldButton
            icon={ASSETS.ui.iconForward}
            label="Move forward"
            action="forward"
            onHold={hold}
          />
          <HoldButton
            icon={ASSETS.ui.iconRight}
            label="Turn right"
            action="right"
            onHold={hold}
          />
        </div>
        <div className="control-cluster">
          <HoldButton
            icon={ASSETS.ui.iconFireLeft}
            label="Fire left"
            action="sideLeft"
            onHold={hold}
          />
          <HoldButton
            icon={ASSETS.ui.iconFireFront}
            label="Fire front"
            action="front"
            onHold={hold}
          />
          <HoldButton
            icon={ASSETS.ui.iconFireRight}
            label="Fire right"
            action="sideRight"
            onHold={hold}
          />
        </div>
      </div>
      <div className="semantic-status" aria-live="polite">
        Score {snapshot.score}. Hull {Math.ceil(snapshot.health)} percent.
      </div>
    </main>
  );
}

function HoldButton({
  icon,
  label,
  action,
  onHold,
}: {
  icon: string;
  label: string;
  action: InputAction;
  onHold: (action: InputAction, value: boolean) => void;
}) {
  const release = () => onHold(action, false);
  return (
    <RoundButton
      icon={icon}
      label={label}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        onHold(action, true);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}

function HudStat({
  icon,
  label,
  value,
}: {
  icon?: string;
  label: string;
  value: string;
}) {
  return (
    <div className="hud-counter">
      <img
        className="hud-icon"
        src={icon ?? ASSETS.ui.score}
        alt=""
        aria-hidden="true"
      />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
