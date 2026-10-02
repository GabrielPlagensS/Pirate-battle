import { useState } from "react";
import { useHistory } from "../hooks/useGameQueries";
import { Pagination } from "./ui/Pagination";
import { ScreenPanel } from "./ui/ScreenPanel";

export function History({ onBack }: { onBack: () => void }) {
  const [page, setPage] = useState(1);
  const q = useHistory(page);
  const retry = () => void q.refetch();

  return (
    <main className="screen-page">
      <ScreenPanel className="content-panel">
        <button className="text-back" onClick={onBack}>
          ← Main Menu
        </button>
        <h1>Match History</h1>
        {q.isLoading ? (
          <p className="state-message">Loading history...</p>
        ) : q.isError ? (
          <p className="error" role="alert">
            Could not load history.{" "}
            <button className="text-back" onClick={retry}>
              Try again
            </button>
          </p>
        ) : q.data?.items?.length ? (
          <>
            <div className="asset-table history-table">
              <div className="table-header">
                <span>Date</span>
                <span>Reason</span>
                <span>Score</span>
              </div>
              {q.data.items.map((x) => (
                <div className="table-row" key={x.id}>
                  <span>{new Date(x.date).toLocaleString()}</span>
                  <span>
                    {x.reason === "death" ? "Hull destroyed" : "Time up"}
                  </span>
                  <strong>{x.score}</strong>
                </div>
              ))}
            </div>
            <Pagination
              page={page}
              totalPages={q.data.totalPages}
              onChange={setPage}
            />
          </>
        ) : (
          <p className="state-message">No completed matches yet.</p>
        )}
      </ScreenPanel>
    </main>
  );
}
