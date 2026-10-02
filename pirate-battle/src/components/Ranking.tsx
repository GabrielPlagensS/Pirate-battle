import { useState } from 'react';
import { useRanking } from '../hooks/useGameQueries';
import { Pagination } from './ui/Pagination';
import { ScreenPanel } from './ui/ScreenPanel';

export function Ranking({ onBack }: { onBack: () => void }) {
  const [page, setPage] = useState(1);
  const q = useRanking(page);
  const retry = () => void q.refetch();

  return (
    <main className="screen-page">
      <ScreenPanel className="content-panel">
        <button className="text-back" onClick={onBack}>← Main Menu</button>
        <h1>Ranking</h1>
        {q.isLoading ? <p className="state-message">Loading ranking...</p> : q.isError ? <p className="error" role="alert">Could not load ranking. <button className="text-back" onClick={retry}>Try again</button></p> : q.data?.items?.length ? (
          <>
            <div className="asset-table">
              <div className="table-header"><span>Captain</span><span>Score</span></div>
              {q.data.items.map((x) => (
                <div className="table-row" key={x.id}>
                  <span>{x.playerName}</span>
                  <strong>{x.score}</strong>
                </div>
              ))}
            </div>
            <Pagination page={page} totalPages={q.data.totalPages} onChange={setPage} />
          </>
        ) : <p className="state-message">No ranking entries.</p>}
      </ScreenPanel>
    </main>
  );
}
