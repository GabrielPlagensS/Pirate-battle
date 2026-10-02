import { useState } from 'react';
import { getScenario, setScenario } from '../mocks/scenario';
import type { NetworkScenario } from '../types/game';

export function useNetworkScenario() {
  const [scenario, setLocal] = useState<NetworkScenario>(() => getScenario());
  const update = (next: NetworkScenario) => { setScenario(next); setLocal(next); };
  return { scenario, update };
}
