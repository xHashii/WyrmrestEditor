import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useStore } from '../store';
import type { StagedChange } from '../../shared/types';

function describe(change: StagedChange): string {
  const key = Object.entries(change.key)
    .map(([k, v]) => `${k}=${v ?? 'NULL'}`)
    .join(', ');
  if (change.kind === 'insert') return `new row (${key})`;
  if (change.kind === 'delete') return `delete (${key})`;
  return `${key}`;
}

export function LedgerPanel() {
  const { ledger, revert, clearLedger, openTable, setDialog, applyToDatabase, status } = useStore();
  const live = status?.mode === 'live';
  const [sql, setSql] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const grouped = useMemo(() => {
    const map = new Map<string, StagedChange[]>();
    for (const change of ledger) {
      const key = `${change.database}.${change.table}`;
      const list = map.get(key) ?? [];
      list.push(change);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [ledger]);

  useEffect(() => {
    if (!ledger.length) {
      setSql('');
      return;
    }
    api
      .previewSql(selected.length ? selected : undefined)
      .then(setSql)
      .catch((err) => setSql(`-- preview failed: ${(err as Error).message}`));
  }, [ledger, selected]);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <section className="ledger">
      <header className="ledger-head">
        <h2>
          Staged changes <span className="badge">{ledger.length}</span>
        </h2>
        <div className="spacer" />
        {selected.length > 0 && (
          <button className="btn btn-ghost" onClick={() => setSelected([])}>
            Clear selection ({selected.length})
          </button>
        )}
        <button
          className="btn btn-ghost"
          disabled={!ledger.length}
          onClick={() => {
            if (confirm('Discard every staged change? This cannot be undone.')) void clearLedger();
          }}
        >
          Discard all
        </button>
        <button
          className="btn"
          disabled={!ledger.length || !live}
          title={
            live
              ? 'Run the staged statements against the connected server'
              : 'Connect to a server to apply changes directly'
          }
          onClick={() => {
            const ids = selected.length ? selected : undefined;
            const count = ids?.length ?? ledger.length;
            if (confirm(`Apply ${count} staged change${count === 1 ? '' : 's'} to the live database?`)) {
              void applyToDatabase(ids);
              setSelected([]);
            }
          }}
        >
          Apply to server
        </button>
        <button className="btn btn-accent" disabled={!ledger.length} onClick={() => setDialog('export')}>
          Export…
        </button>
        <button className="btn btn-ghost" onClick={() => useStore.setState({ showLedger: false })}>
          ✕
        </button>
      </header>

      <div className="ledger-body">
        <div className="ledger-list">
          {!ledger.length && <p className="muted">Nothing staged yet. Edits you make are collected here.</p>}
          {grouped.map(([table, changes]) => (
            <div key={table} className="ledger-group">
              <button className="ledger-group-head" onClick={() => void openTable(changes[0].database, changes[0].table)}>
                {table} <span className="count">{changes.length}</span>
              </button>
              {changes.map((change) => (
                <div key={change.id} className={`ledger-item kind-${change.kind}`}>
                  <label className="ledger-select">
                    <input
                      type="checkbox"
                      checked={selected.includes(change.id)}
                      onChange={() => toggle(change.id)}
                    />
                  </label>
                  <span className={`kind kind-${change.kind}`}>{change.kind}</span>
                  <div className="ledger-detail">
                    <div className="ledger-key">{describe(change)}</div>
                    {change.kind === 'update' && (
                      <div className="ledger-values">
                        {Object.entries(change.values).map(([column, delta]) => (
                          <span key={column} className="delta">
                            <b>{column}</b>
                            <s>{String(delta.before ?? 'NULL')}</s>→<i>{String(delta.after ?? 'NULL')}</i>
                          </span>
                        ))}
                      </div>
                    )}
                    {change.note && <div className="muted small">{change.note}</div>}
                  </div>
                  <button className="btn btn-ghost" title="Revert this change" onClick={() => void revert([change.id])}>
                    ↺
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="ledger-sql">
          <div className="ledger-sql-head">
            <span>SQL preview{selected.length ? ` (${selected.length} selected)` : ''}</span>
            <button
              className="btn btn-ghost"
              onClick={() => {
                void navigator.clipboard?.writeText(sql);
                useStore.getState().notify('success', 'SQL copied to clipboard');
              }}
            >
              Copy
            </button>
          </div>
          <pre>{sql || '-- nothing staged'}</pre>
        </div>
      </div>
    </section>
  );
}
