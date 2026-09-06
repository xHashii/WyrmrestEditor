import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { DataGrid } from './DataGrid';

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
    tableName,
    ledger,
    database,
  } = useStore();
  const [showSql, setShowSql] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

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
        <button className="btn btn-accent" onClick={() => void addRow()} disabled={meta.readOnly}>
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
