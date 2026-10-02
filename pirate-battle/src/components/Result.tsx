import { ASSETS } from "../game/assets";
import type { GameResult } from "../types/game";
import { AssetButton } from "./ui/AssetButton";
import { ScreenPanel } from "./ui/ScreenPanel";

export function Result({
  result,
  saveState,
  onRetry,
  onAgain,
  onMenu,
}: {
  result: GameResult;
  saveState: "idle" | "pending" | "success" | "error";
  onRetry: () => void;
  onAgain: () => void;
  onMenu: () => void;
}) {
  return (
    <main className="screen-page">
      <ScreenPanel className="result-panel">
        <div className="result-content">
          <img
            className="result-title"
            src={ASSETS.ui.title}
            alt="Pirate Battle"
          />
          <p className="result-eyebrow">Batalha completa</p>
          <strong className="result-score">{result.score}</strong>
          <p className="result-meta">
            pontos · {Math.floor(result.duration)}S ·{" "}
            {result.reason === "death" ? "HULL DESTROYED" : "TIME UP"}
          </p>
          <p
            className={
              saveState === "error" ? "error result-save" : "result-save"
            }
            role={saveState === "error" ? "alert" : "status"}
          >
            {saveState === "pending"
              ? "Saving match..."
              : saveState === "success"
                ? "Match registered successfully."
                : saveState === "error"
                  ? "Não foi possível registrar a partida. O resultado permanece disponível para nova tentativa"
                  : "Ready."}
          </p>
          {saveState === "error" && (
            <AssetButton variant="secondary" onClick={onRetry}>
              Salvar
            </AssetButton>
          )}
          <div className="result-actions">
            <AssetButton onClick={onAgain}>Jogar de novo</AssetButton>
            <AssetButton variant="secondary" onClick={onMenu}>
              Menu Principal
            </AssetButton>
          </div>
        </div>
      </ScreenPanel>
    </main>
  );
}
