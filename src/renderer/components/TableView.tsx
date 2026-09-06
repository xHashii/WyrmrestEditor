import { useEffect, useRef, useState } from 'react';
import { useStore, gridRows, displayValue } from '../store';
import { DataGrid } from './DataGrid';
import type { FilterClause } from '../../shared/types';

function filterLabel(filter: FilterClause): string {
  const opLabel: Record<string, string> = {
    '=': '=',
    '!=': '≠',
    '>': '>',
    '>=': '≥',
    '<': '<',
    '<=': '≤',
    like: 'LIKE',
    startsWith: 'starts',
    contains: 'contains',
    in: 'IN',
    isNull: 'IS NULL',
    notNull: 'NOT NULL',
    bitAnd: 'has bit',
  };
  const value = Array.isArray(filter.value) ? filter.value.join(', ') : String(filter.value ?? '');
  return `${filter.column} ${opLabel[filter.op] ?? filter.op}${filter.op === 'isNull' || filter.op === 'notNull' ? '' : ` ${value}`}`;
}

export function TableView() {
  const {
    meta,
    result,
    loading,
    queryError,
    search,
    setSearch,
    refresh,
    offset,
    setOffset,
    settings,
    addRow,
    duplicateRow,
    deleteRow,
    revertRow,
    filterByCell,
    filters,
    clearFilters,
    setFilters,
    tableName,
    ledger,
    database,
    selected,
  } = useStore();
  const [showSql, setShowSql] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  // Subscribe to the whole store so the derived grid view (below) re-renders
  // as rows / selection / ledger move. Must be called unconditionally.
  const storeState = useStore();

  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  if (!meta) {
    return (
      <div className="empty">
        <h2>Pick a table</h2>
        <p>Use the sidebar, or press Ctrl+K to search all 766 tables.</p>
      </div>
    );
  }

  const pageSize = settings?.pageSize ?? 100;
  const total = result?.total ?? null;
  const staged = ledger.filter((c) => c.database === database && c.table === tableName).length;
  const readOnly = meta.readOnly;

  // The row / cell the quick-action buttons operate on. `gridRows` derives the
  // live view (staged inserts + fetched page); this component subscribes to the
  // whole store via the destructure above, so it re-renders as those move.
  const rows = gridRows(storeState);
  const selectedRow = selected ? rows.find((r) => r.key === selected.rowKey) ?? null : null;
  const selectedChange = selectedRow?.change ?? null;
  const selectedValue = selectedRow && selected ? displayValue(selectedRow, selected.column) : null;

  const quickAction = (run: () => void) => () => {
    if (!selected) {
      useStore.getState().notify('info', 'Click a cell in the grid first, then use a quick action.');
      return;
    }
    run();
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  return (
    <div className="tableview">
      <div className="table-header">
        <div className="table-title">
          <h1>{meta.label}</h1>
          <code>{meta.name}</code>
          {meta.primaryKey.length > 0 && (
            <span className="pk-badge" title="Primary key">
              PK: {meta.primaryKey.join(', ')}
            </span>
          )}
          {staged > 0 && <span className="tag tag-staged">{staged} staged</span>}
        </div>
        {meta.description && <p className="table-desc">{meta.description}</p>}
      </div>

      <div className="toolbar">
        <input
          ref={searchRef}
          className="search"
          value={search}
          placeholder={`Search ${meta.name}${meta.nameColumn ? ` by ${meta.nameColumn} or id` : ''}…`}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn" onClick={() => void refresh()} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
        <button className="btn btn-accent" onClick={() => void addRow()} disabled={readOnly} title="Stage a new empty row (Ctrl+I)">
          + Row
        </button>
        <div className="toolbar-spacer" />
        <div className="pager">
          <button className="btn btn-ghost" disabled={offset === 0} onClick={() => setOffset(offset - pageSize)}>
            ‹
          </button>
          <span className="pager-label">
            {result ? `${offset + 1}–${offset + result.rows.length}` : '—'}
            {total !== null ? ` of ${total.toLocaleString()}` : ''}
          </span>
          <button
            className="btn btn-ghost"
            disabled={!result || (total !== null && offset + pageSize >= total)}
            onClick={() => setOffset(offset + pageSize)}
          >
            ›
          </button>
        </div>
        <button className="btn btn-ghost" onClick={() => setShowSql((s) => !s)} title="Show the query that produced this page">
          SQL
        </button>
      </div>

      {/* Quick row actions — the spreadsheet-style buttons a database editor
          needs one click away, inspired by WoWDatabaseEditor's toolbar. */}
      <div className="quick-bar">
        <button
          className="btn btn-quick"
          disabled={readOnly || !selectedRow}
          title="Copy the selected row and stage the copy as a new row (Ctrl+D)"
          onClick={quickAction(() => void duplicateRow(selected!.rowKey))}
        >
          ⧉ Duplicate row
        </button>
        <button
          className="btn btn-quick"
          disabled={readOnly || !selectedRow || selectedChange?.kind === 'delete'}
          title="Stage the selected row for deletion (Ctrl+Del)"
          onClick={quickAction(() => void deleteRow(selected!.rowKey))}
        >
          🗑 Delete row
        </button>
        <button
          className="btn btn-quick"
          disabled={!selectedChange}
          title="Discard every staged change on the selected row (Ctrl+R)"
          onClick={quickAction(() => void revertRow(selected!.rowKey))}
        >
          ↺ Revert row
        </button>
        <span className="quick-sep" />
        <button
          className="btn btn-quick"
          disabled={!selectedRow}
          title={`Keep only rows where ${selected?.column ?? 'this column'} matches the selected value`}
          onClick={quickAction(() => void filterByCell(selected!.rowKey, selected!.column))}
        >
          ⚡ Filter by cell
        </button>
        <button className="btn btn-quick" disabled={!filters.length} onClick={() => clearFilters()}>
          ✕ Clear filters
        </button>
        <div className="toolbar-spacer" />
        <span className="quick-hint muted">
          {selected
            ? `selected ${selected.column} = ${selectedValue === null || selectedValue === '' ? 'NULL' : String(selectedValue)}`
            : 'click a cell to target a row'}
        </span>
      </div>

      {filters.length > 0 && (
        <div className="filter-chips">
          {filters.map((filter, i) => (
            <span key={i} className="filter-chip">
              {filterLabel(filter)}
              <button className="filter-chip-x" onClick={() => removeFilter(i)} title="Remove this filter">
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {showSql && result && (
        <pre className="sql-strip">
          {result.sql}
          <span className="sql-timing">{result.durationMs} ms</span>
        </pre>
      )}

      {queryError ? (
        <div className="error-box">
          <strong>Query failed:</strong> {queryError}
        </div>
      ) : (
        <DataGrid />
      )}
    </div>
  );
}
