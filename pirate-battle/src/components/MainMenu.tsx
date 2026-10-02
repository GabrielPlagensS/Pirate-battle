import { ASSETS } from "../game/assets";
import { NetworkTools } from "./NetworkTools";
import { AssetButton } from "./ui/AssetButton";
import { ScreenPanel } from "./ui/ScreenPanel";

export function MainMenu({
  onPlay,
  onOptions,
  onRanking,
  onHistory,
}: {
  onPlay: () => void;
  onOptions: () => void;
  onRanking: () => void;
  onHistory: () => void;
}) {
  return (
    <main className="menu-screen">
      <ScreenPanel className="menu-panel">
        <h1 className="menu-heading">
          <img
            className="game-title"
            src={ASSETS.ui.title}
            alt="Pirate Battle"
          />
        </h1>
        <p className="menu-subtitle">SET SAIL. TAKE COMMAND.</p>

        <div className="menu-primary-actions">
          <AssetButton onClick={onPlay}>Play</AssetButton>
          <AssetButton variant="primary" onClick={onOptions}>
            Options
          </AssetButton>
        </div>

        <div className="menu-mascot" aria-hidden="true">
          <img src={ASSETS.ships.player} alt="" />
        </div>

        <p className="menu-hint">Navigate the islands. Survive the battle.</p>

        <div className="menu-secondary-actions">
          <AssetButton variant="secondary" onClick={onRanking}>
            Ranking
          </AssetButton>
          <AssetButton variant="secondary" onClick={onHistory}>
            Match History
          </AssetButton>
        </div>

        <div className="menu-controls">
          <h2>Controls</h2>
          <p>
            <b>W / ↑</b> Move forward · <b>A / D</b> Rotate
          </p>
          <p>
            <b>Space</b> Front cannon · <b>Q / E</b> Side cannons
          </p>
          <p>On mobile, use the touch controls during combat.</p>
        </div>

        <NetworkTools />
      </ScreenPanel>
    </main>
  );
}
