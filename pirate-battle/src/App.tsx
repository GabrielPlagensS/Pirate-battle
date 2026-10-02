import { useCallback, useState } from 'react';
import { MainMenu } from './components/MainMenu';
import { Options } from './components/Options';
import { Ranking } from './components/Ranking';
import { History } from './components/History';
import { GameCanvas } from './components/GameCanvas';
import { Result } from './components/Result';
import { createMatchMeta, type MatchMeta } from './api/contracts';
import { loadConfig } from './game/config';
import { useSaveMatch } from './hooks/useGameQueries';
import type { GameResult, GameplayConfig } from './types/game';

type SaveState = 'idle' | 'pending' | 'success' | 'error';

/**
 * A mutation é a mesma entre partidas: logo após terminar uma nova, ela ainda guarda o
 * resultado da anterior. Só confiamos no status se ele for desta partida.
 */
function saveStateFor(
  matchId: string,
  mutationMatchId: string | undefined,
  status: { isPending: boolean; isSuccess: boolean; isError: boolean }
): SaveState {
  if (mutationMatchId !== matchId) return 'pending';
  if (status.isPending) return 'pending';
  if (status.isSuccess) return 'success';
  if (status.isError) return 'error';
  return 'idle';
}

type Screen = 'menu' | 'options' | 'ranking' | 'history' | 'game' | 'result';

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [config, setConfig] = useState<GameplayConfig>(() => loadConfig());
  const [match, setMatch] = useState<{ result: GameResult; meta: MatchMeta } | null>(null);
  const { mutate: saveMatch, isPending, isSuccess, isError, variables } = useSaveMatch();

  // `mutate` é estável entre renders; assim `finish` também é, e o GameCanvas
  // não recria a partida a cada mudança do estado da mutation.
  const finish = useCallback(
    (result: GameResult) => {
      const next = { result, meta: createMatchMeta() };
      setMatch(next);
      setScreen('result');
      saveMatch(next);
    },
    [saveMatch]
  );

  const retrySave = useCallback(() => {
    if (match) saveMatch(match);
  }, [match, saveMatch]);

  const start = () => {
    setMatch(null);
    setScreen('game');
  };
  const toMenu = () => setScreen('menu');

  switch (screen) {
    case 'options':
      return (
        <Options
          config={config}
          onSave={(next) => {
            setConfig(next);
            toMenu();
          }}
          onBack={toMenu}
        />
      );
    case 'ranking':
      return <Ranking onBack={toMenu} />;
    case 'history':
      return <History onBack={toMenu} />;
    case 'game':
      return <GameCanvas config={config} onFinish={finish} onExit={toMenu} />;
    case 'result':
      if (match) {
        return (
          <Result
            result={match.result}
            saveState={saveStateFor(match.meta.id, variables?.meta.id, { isPending, isSuccess, isError })}
            onRetry={retrySave}
            onAgain={start}
            onMenu={toMenu}
          />
        );
      }
      return <MainMenu onPlay={start} onOptions={() => setScreen('options')} onRanking={() => setScreen('ranking')} onHistory={() => setScreen('history')} />;
    default:
      return <MainMenu onPlay={start} onOptions={() => setScreen('options')} onRanking={() => setScreen('ranking')} onHistory={() => setScreen('history')} />;
  }
}
