import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';

interface Column<T> {
  key: keyof T | string;
  sortable?: boolean;
  title: string;
  render?: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
}

export function DataTable<T extends object>({
  columns,
  rows,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const sortedRows = useMemo(() => {
    if (!sortKey) {
      return rows;
    }
    return [...rows].sort((a, b) => {
      const left = String((a as Record<string, unknown>)[sortKey] ?? '');
      const right = String((b as Record<string, unknown>)[sortKey] ?? '');
      return sortDirection === 'asc'
        ? left.localeCompare(right)
        : right.localeCompare(left);
    });
  }, [rows, sortDirection, sortKey]);

  function toggleSort(column: Column<T>) {
    if (column.sortable === false || column.key === 'actions' || column.key === 'bind') {
      return;
    }
    const key = String(column.key);
    if (sortKey === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDirection('asc');
  }

  return (
    <div className="table-shell">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)}>
                <button
                  className="table-sort-button"
                  disabled={column.sortable === false || column.key === 'actions' || column.key === 'bind'}
                  onClick={() => toggleSort(column)}
                  type="button"
                >
                  {column.title}
                  {sortKey === String(column.key) ? <span>{sortDirection === 'asc' ? '↑' : '↓'}</span> : null}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, index) => (
            <tr key={String((row as Record<string, unknown>).id ?? index)}>
              {columns.map((column) => (
                <td key={String(column.key)}>
                  {column.render
                    ? column.render(row)
                    : String(
                        (row as Record<string, unknown>)[String(column.key)] ?? '',
                      )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
