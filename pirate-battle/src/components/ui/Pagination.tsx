import { AssetButton } from './AssetButton';

interface Props {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onChange }: Props) {
  return (
    <nav className="pagination asset-pagination" aria-label="Pagination">
      <AssetButton variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </AssetButton>
      <span aria-live="polite">Page {page} / {totalPages}</span>
      <AssetButton variant="secondary" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Next
      </AssetButton>
    </nav>
  );
}
