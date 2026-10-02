import { useState, type FormEvent } from "react";
import { CONFIG_LIMITS, saveConfig, validateOptions } from "../game/config";
import type { GameplayConfig } from "../types/game";
import { AssetButton } from "./ui/AssetButton";
import { ScreenPanel } from "./ui/ScreenPanel";

export function Options({
  config,
  onSave,
  onBack,
}: {
  config: GameplayConfig;
  onSave: (c: GameplayConfig) => void;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState(config);
  const [error, setError] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const problem = validateOptions(draft);
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    saveConfig(draft);
    onSave(draft);
  };

  return (
    <main className="screen-page">
      <ScreenPanel className="content-panel options-panel">
        <button className="text-back" onClick={onBack}>
          ← Main Menu
        </button>
        <h1>Options</h1>
        <form onSubmit={submit} className="asset-form" noValidate>
          <label>
            Game session time
            <span className="field-unit">Seconds</span>
            <input
              type="number"
              min={CONFIG_LIMITS.sessionTime.min}
              max={CONFIG_LIMITS.sessionTime.max}
              value={draft.sessionTime}
              onChange={(e) =>
                setDraft({ ...draft, sessionTime: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Enemy spawn time
            <span className="field-unit">Seconds</span>
            <input
              type="number"
              min={CONFIG_LIMITS.spawnInterval.min}
              max={CONFIG_LIMITS.spawnInterval.max}
              step="0.5"
              value={draft.spawnInterval}
              onChange={(e) =>
                setDraft({ ...draft, spawnInterval: Number(e.target.value) })
              }
            />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <AssetButton type="submit">Salvar opção</AssetButton>
        </form>
      </ScreenPanel>
    </main>
  );
}
