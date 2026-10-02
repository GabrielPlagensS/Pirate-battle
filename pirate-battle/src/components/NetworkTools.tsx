import { useNetworkScenario } from '../hooks/useNetworkScenario';

export function NetworkTools() {
  const { scenario, update } = useNetworkScenario();

  return (
    <details className="network-tools">
      <summary>Network simulation</summary>
      <div className="network-tools-grid">
        <label>
          Scenario
          <select
            value={scenario.mode}
            onChange={(e) => update({ ...scenario, mode: e.target.value as typeof scenario.mode })}
          >
            <option value="success">Success</option>
            <option value="empty">Empty</option>
            <option value="slow">Slow</option>
            <option value="variable">Variable latency</option>
            <option value="timeout">Timeout</option>
            <option value="error">HTTP 503</option>
          </select>
        </label>
        <label>
          Latency
          <input
            type="number"
            min="0"
            max="5000"
            value={scenario.latencyMs}
            onChange={(e) => update({ ...scenario, latencyMs: Number(e.target.value) })}
          />
        </label>
      </div>
    </details>
  );
}
