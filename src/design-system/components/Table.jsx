import './Table.css';
import { Button } from './Button.jsx';

// §7.3 — admin tables that can grow unbounded (appointments, payments, clients, activity
// log) must paginate from day one. Table only renders one page; callers own the fetch
// for `page`/`pageSize` and pass the already-paginated `rows` plus `total`.
export function Table({ columns, rows, getRowKey, emptyMessage = 'No records found.' }) {
  return (
    <div className="ds-table__wrapper">
      <table className="ds-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} scope="col">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="ds-table__empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={getRowKey(row)}>
                {columns.map((col) => (
                  <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ page, pageSize, total, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <nav className="ds-pagination" aria-label="Table pagination">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
      >
        Previous
      </Button>
      <span className="ds-pagination__status">
        Page {page} of {totalPages}
      </span>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
      >
        Next
      </Button>
    </nav>
  );
}
